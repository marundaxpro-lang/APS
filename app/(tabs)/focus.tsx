
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { FocusTask } from '@/types/fitness';
import { authenticatedPost } from '@/utils/api';
import AIAssistant from '@/components/AIAssistant';

export default function FocusScreen() {
  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timerMinutes * 60);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
      saveFocusSession();
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const saveFocusSession = async () => {
    try {
      const sessionData = {
        duration_minutes: timerMinutes,
        completed_at: new Date().toISOString(),
      };
      
      await authenticatedPost('/api/focus-sessions', sessionData);
      console.log('[Focus] Focus session saved successfully');
    } catch (error) {
      console.error('[Focus] Error saving focus session:', error);
    }
  };

  const addTask = async () => {
    if (newTaskTitle.trim()) {
      const newTask: FocusTask = {
        id: Date.now().toString(),
        title: newTaskTitle,
        completed: false,
        created_at: new Date().toISOString(),
      };
      
      // Optimistically update UI
      setTasks([...tasks, newTask]);
      setNewTaskTitle('');
      
      // Save to backend
      try {
        const taskData = {
          title: newTaskTitle,
          completed: false,
        };
        
        await authenticatedPost('/api/tasks', taskData);
        console.log('[Focus] Task saved successfully');
      } catch (error) {
        console.error('[Focus] Error saving task:', error);
      }
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    // Optimistically update UI
    setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
    
    // Update in backend
    try {
      const updateData = {
        task_id: id,
        completed: !task.completed,
      };
      
      await authenticatedPost('/api/tasks/update', updateData);
      console.log('[Focus] Task status updated successfully');
    } catch (error) {
      console.error('[Focus] Error updating task:', error);
    }
  };

  const startTimer = (minutes: number) => {
    setTimerMinutes(minutes);
    setTimeLeft(minutes * 60);
    setIsTimerRunning(true);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    setTimeLeft(timerMinutes * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Focus</Text>
            <Text style={styles.subtitle}>Stay productive and focused</Text>
          </View>
          <TouchableOpacity
            style={styles.aiButton}
            onPress={() => setShowAIAssistant(true)}
          >
            <IconSymbol
              ios_icon_name="sparkles"
              android_material_icon_name="auto-awesome"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>Focus Timer</Text>
          <Text style={styles.timerDisplay}>{formatTime(timeLeft)}</Text>

          {!isTimerRunning ? (
            <View style={styles.timerButtons}>
              <TouchableOpacity style={styles.timerButton} onPress={() => startTimer(25)}>
                <Text style={styles.timerButtonText}>25 min</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timerButton} onPress={() => startTimer(45)}>
                <Text style={styles.timerButtonText}>45 min</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timerButton} onPress={() => startTimer(60)}>
                <Text style={styles.timerButtonText}>60 min</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.stopButton} onPress={stopTimer}>
              <IconSymbol
                ios_icon_name="stop.fill"
                android_material_icon_name="stop"
                size={24}
                color="#ffffff"
              />
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tasksSection}>
          <Text style={styles.sectionTitle}>Tasks</Text>

          <View style={styles.addTaskContainer}>
            <TextInput
              style={styles.taskInput}
              placeholder="Add a new task..."
              placeholderTextColor={colors.textSecondary}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              onSubmitEditing={addTask}
            />
            <TouchableOpacity style={styles.addTaskButton} onPress={addTask}>
              <IconSymbol
                ios_icon_name="plus.circle.fill"
                android_material_icon_name="add-circle"
                size={28}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskItem}
              onPress={() => toggleTask(task.id)}
            >
              <IconSymbol
                ios_icon_name={task.completed ? 'checkmark.circle.fill' : 'circle'}
                android_material_icon_name={task.completed ? 'check-circle' : 'radio-button-unchecked'}
                size={24}
                color={task.completed ? colors.success : colors.textSecondary}
              />
              <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
                {task.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.aiCoachCard}>
          <View style={styles.aiCoachHeader}>
            <IconSymbol
              ios_icon_name="sparkles"
              android_material_icon_name="auto-awesome"
              size={28}
              color={colors.primary}
            />
            <Text style={styles.aiCoachTitle}>AI Coach Tips</Text>
          </View>
          <Text style={styles.aiCoachText}>
            💪 Great progress this week! You&apos;ve completed 5 workouts and maintained a 7-day streak.
          </Text>
          <Text style={styles.aiCoachText}>
            🎯 Tip: Focus on progressive overload by increasing weight by 2.5-5% each week.
          </Text>
          <Text style={styles.aiCoachText}>
            🥗 Your protein intake is on track. Consider adding more vegetables for micronutrients.
          </Text>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => setShowAIAssistant(true)}
          >
            <Text style={styles.chatButtonText}>Chat with AI Coach</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AIAssistant
        visible={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        context="general"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  aiButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  timerDisplay: {
    fontSize: 64,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 24,
  },
  timerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  timerButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  timerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  stopButton: {
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  tasksSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  addTaskContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  taskInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  addTaskButton: {
    justifyContent: 'center',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  aiCoachCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  aiCoachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  aiCoachTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  aiCoachText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  chatButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
