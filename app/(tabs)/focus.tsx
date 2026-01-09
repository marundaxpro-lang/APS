
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FocusTask, TimerType } from '@/types/fitness';
import ParticleBackground from '@/components/ParticleBackground';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

const TIMER_TYPES: TimerType[] = [
  { id: 'pomodoro', name: 'Pomodoro', duration: 25 * 60, description: '25 min focus + 5 min break' },
  { id: 'short', name: 'Short Focus', duration: 15 * 60, description: '15 minutes' },
  { id: 'long', name: 'Deep Work', duration: 90 * 60, description: '90 minutes' },
  { id: 'stopwatch', name: 'Stopwatch', duration: 0, description: 'Count up from zero' },
];

export default function FocusScreen() {
  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [newTask, setNewTask] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'study' | 'work' | 'personal'>('study');
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedTimer, setSelectedTimer] = useState<TimerType | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning && selectedTimer?.id !== 'stopwatch') {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const loadTasks = async () => {
    const data = await AsyncStorage.getItem('focusTasks');
    if (data) setTasks(JSON.parse(data));
  };

  const saveTasks = async (updatedTasks: FocusTask[]) => {
    await AsyncStorage.setItem('focusTasks', JSON.stringify(updatedTasks));
    setTasks(updatedTasks);
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    const task: FocusTask = {
      id: Date.now().toString(),
      title: newTask,
      completed: false,
      category: selectedCategory,
    };
    saveTasks([...tasks, task]);
    setNewTask('');
  };

  const toggleTask = (id: string) => {
    saveTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const startTimer = (timer: TimerType) => {
    setSelectedTimer(timer);
    setTimeLeft(timer.duration);
    setIsTimerRunning(true);
    setShowTimerModal(false);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <ParticleBackground />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Focus Hub</Text>

        {/* Timer Section */}
        <View style={styles.timerCard}>
          {isTimerRunning ? (
            <>
              <Text style={styles.timerLabel}>{selectedTimer?.name}</Text>
              <Text style={styles.timerDisplay}>{formatTime(timeLeft)}</Text>
              <TouchableOpacity
                style={styles.stopButton}
                onPress={() => setIsTimerRunning(false)}
              >
                <Text style={styles.buttonText}>Stop</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <IconSymbol ios_icon_name="timer" android_material_icon_name="timer" size={60} color={colors.primary} />
              <Text style={styles.timerLabel}>Ready to focus?</Text>
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => setShowTimerModal(true)}
              >
                <Text style={styles.buttonText}>Choose Timer</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Task Input */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Add Task</Text>
          <View style={styles.categorySelector}>
            {(['study', 'work', 'personal'] as const).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === cat && styles.categoryTextActive,
                ]}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="What do you need to do?"
              placeholderTextColor={colors.grey}
              value={newTask}
              onChangeText={setNewTask}
            />
            <TouchableOpacity style={styles.addButton} onPress={addTask}>
              <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tasks List */}
        <View style={styles.tasksSection}>
          <Text style={styles.sectionTitle}>Today's Tasks</Text>
          {tasks.length === 0 ? (
            <Text style={styles.emptyText}>No tasks yet. Add one above!</Text>
          ) : (
            tasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.taskCard}
                onPress={() => toggleTask(task.id)}
              >
                <View style={[
                  styles.checkbox,
                  task.completed && styles.checkboxChecked,
                ]}>
                  {task.completed && (
                    <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={16} color="#fff" />
                  )}
                </View>
                <View style={styles.taskContent}>
                  <Text style={[
                    styles.taskTitle,
                    task.completed && styles.taskTitleCompleted,
                  ]}>
                    {task.title}
                  </Text>
                  <Text style={styles.taskCategory}>{task.category}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Timer Selection Modal */}
      <Modal
        visible={showTimerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Timer Type</Text>
            {TIMER_TYPES.map((timer) => (
              <TouchableOpacity
                key={timer.id}
                style={styles.timerOption}
                onPress={() => startTimer(timer)}
              >
                <View>
                  <Text style={styles.timerOptionName}>{timer.name}</Text>
                  <Text style={styles.timerOptionDesc}>{timer.description}</Text>
                </View>
                <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={20} color={colors.grey} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowTimerModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
  },
  timerCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timerLabel: {
    fontSize: 18,
    color: colors.grey,
    marginTop: 16,
    marginBottom: 8,
  },
  timerDisplay: {
    fontSize: 64,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  stopButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  categorySelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    color: colors.grey,
    fontSize: 14,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tasksSection: {
    marginBottom: 24,
  },
  emptyText: {
    color: colors.grey,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.grey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.grey,
  },
  taskCategory: {
    fontSize: 12,
    color: colors.grey,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  timerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    marginBottom: 12,
  },
  timerOptionName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  timerOptionDesc: {
    fontSize: 14,
    color: colors.grey,
    marginTop: 4,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: colors.grey,
    fontSize: 16,
    fontWeight: '600',
  },
});
