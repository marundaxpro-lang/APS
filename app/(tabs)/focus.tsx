
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/styles/commonStyles';
import { FocusTask, WeeklyTask } from '@/types/fitness';
import { IconSymbol } from '@/components/IconSymbol';
import ParticleBackground from '@/components/ParticleBackground';
import { authenticatedPost } from '@/utils/api';

export default function FocusScreen() {
  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [dayStreak, setDayStreak] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<'study' | 'work' | 'workout' | 'personal'>('study');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const storedTasks = await AsyncStorage.getItem('focusTasks');
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      }

      const storedStats = await AsyncStorage.getItem('dashboardStats');
      if (storedStats) {
        const stats = JSON.parse(storedStats);
        setTotalHours(stats.weeklyStudyHours || 0);
        setDayStreak(stats.currentStreak || 0);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveFocusSession = useCallback(async (duration: number) => {
    try {
      // TODO: Backend Integration - Save focus session to backend
      await authenticatedPost('/api/focus/sessions', {
        duration,
        completed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to save focus session:', error);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            const sessionMinutes = 25;
            saveFocusSession(sessionMinutes);
            setTotalHours((prev) => prev + sessionMinutes / 60);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
      setTimeLeft(25 * 60);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft, saveFocusSession]);

  const addTask = async () => {
    if (newTaskTitle.trim()) {
      const newTask: FocusTask = {
        id: Date.now().toString(),
        title: newTaskTitle,
        type: newTaskType,
        completed: false,
        priority: newTaskPriority,
      };
      const updatedTasks = [...tasks, newTask];
      setTasks(updatedTasks);
      await AsyncStorage.setItem('focusTasks', JSON.stringify(updatedTasks));
      
      setNewTaskTitle('');
      setNewTaskType('study');
      setNewTaskPriority('medium');
      setShowAddModal(false);
    }
  };

  const toggleTask = async (id: string) => {
    const updatedTasks = tasks.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    await AsyncStorage.setItem('focusTasks', JSON.stringify(updatedTasks));
  };

  const startTimer = () => {
    setTimeLeft(25 * 60);
    setIsTimerRunning(true);
    setShowTimerModal(true);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    setShowTimerModal(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const incompleteTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <View style={styles.container}>
      <ParticleBackground />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Focus Hub</Text>
          <Text style={styles.subtitle}>Balance fitness & studies</Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={24} color="#fff" />
            <Text style={styles.buttonText}>Add Task</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.startButton} onPress={startTimer}>
            <IconSymbol ios_icon_name="timer" android_material_icon_name="timer" size={24} color="#fff" />
            <Text style={styles.buttonText}>Start Timer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <IconSymbol ios_icon_name="clock.fill" android_material_icon_name="schedule" size={28} color={colors.primary} />
            <Text style={styles.statValue}>{totalHours.toFixed(1)}h</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statCard}>
            <IconSymbol ios_icon_name="flame.fill" android_material_icon_name="local-fire-department" size={28} color="#f59e0b" />
            <Text style={styles.statValue}>{dayStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check-circle" size={28} color={colors.success} />
            <Text style={styles.statValue}>{completedTasks.length}/{tasks.length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {incompleteTasks.length > 0 && (
          <View style={styles.tasksSection}>
            <Text style={styles.sectionTitle}>Active Tasks</Text>
            {incompleteTasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.taskItem}
                onPress={() => toggleTask(task.id)}
              >
                <View style={styles.taskRow}>
                  <View style={styles.checkbox}>
                    <View style={styles.checkboxInner} />
                  </View>
                  <View style={styles.taskContent}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <View style={styles.taskMeta}>
                      <View style={[
                        styles.typeBadge,
                        task.type === 'study' && styles.typeStudy,
                        task.type === 'work' && styles.typeWork,
                        task.type === 'workout' && styles.typeWorkout,
                      ]}>
                        <Text style={styles.typeBadgeText}>{task.type}</Text>
                      </View>
                      <View style={[
                        styles.priorityBadge,
                        task.priority === 'high' && styles.priorityHigh,
                        task.priority === 'medium' && styles.priorityMedium,
                      ]}>
                        <Text style={styles.priorityBadgeText}>{task.priority}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {completedTasks.length > 0 && (
          <View style={styles.tasksSection}>
            <Text style={styles.sectionTitle}>Completed</Text>
            {completedTasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={[styles.taskItem, styles.taskItemCompleted]}
                onPress={() => toggleTask(task.id)}
              >
                <View style={styles.taskRow}>
                  <View style={[styles.checkbox, styles.checkboxChecked]}>
                    <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={16} color="#fff" />
                  </View>
                  <View style={styles.taskContent}>
                    <Text style={[styles.taskTitle, styles.taskTitleCompleted]}>{task.title}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {tasks.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol ios_icon_name="list.bullet" android_material_icon_name="list" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptySubtext}>Add your first task to get started</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Task Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Task</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Task title"
              placeholderTextColor="#666"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />

            <Text style={styles.inputLabel}>Type</Text>
            <View style={styles.optionRow}>
              {(['study', 'work', 'workout', 'personal'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.optionButton,
                    newTaskType === type && styles.optionButtonActive,
                  ]}
                  onPress={() => setNewTaskType(type)}
                >
                  <Text style={[
                    styles.optionButtonText,
                    newTaskType === type && styles.optionButtonTextActive,
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Priority</Text>
            <View style={styles.optionRow}>
              {(['low', 'medium', 'high'] as const).map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.optionButton,
                    newTaskPriority === priority && styles.optionButtonActive,
                  ]}
                  onPress={() => setNewTaskPriority(priority)}
                >
                  <Text style={[
                    styles.optionButtonText,
                    newTaskPriority === priority && styles.optionButtonTextActive,
                  ]}>
                    {priority}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={addTask}
              >
                <Text style={styles.buttonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Timer Modal */}
      <Modal visible={showTimerModal} animationType="slide">
        <View style={styles.timerModal}>
          <ParticleBackground />
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
          <Text style={styles.timerLabel}>Focus Session</Text>
          <View style={styles.timerButtons}>
            <TouchableOpacity style={styles.timerButton} onPress={stopTimer}>
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timerButton, styles.timerButtonPrimary]}
              onPress={() => setIsTimerRunning(!isTimerRunning)}
            >
              <Text style={styles.buttonText}>{isTimerRunning ? 'Pause' : 'Resume'}</Text>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  addButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tasksSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  taskItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  taskItemCompleted: {
    opacity: 0.6,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
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
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  typeStudy: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  typeWork: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  typeWorkout: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  priorityHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  priorityMedium: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'uppercase',
  },
  emptyState: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 60,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1d21',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  timerModal: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  timerText: {
    fontSize: 80,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 12,
  },
  timerLabel: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 60,
  },
  timerButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  timerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  timerButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
