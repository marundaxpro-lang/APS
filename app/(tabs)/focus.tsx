
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  AppState,
  AppStateStatus,
  Platform,
  Animated,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ParticleBackground from '@/components/ParticleBackground';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost, authenticatedPut, authenticatedDelete } from '@/utils/api';
import CustomModal from '@/components/ui/Modal';

interface UserTask {
  id: string;
  title: string;
  category: 'study' | 'work' | 'fitness' | 'personal' | 'other';
  completed: boolean;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface TimerPreset {
  id: string;
  name: string;
  duration: number;
  description: string;
  icon: string;
}

interface TimerState {
  isRunning: boolean;
  timeLeft: number;
  startTime: number;
  presetId: string;
}

const TIMER_PRESETS: TimerPreset[] = [
  { id: 'pomodoro', name: 'Pomodoro', duration: 25 * 60, description: '25 minutes', icon: 'timer' },
  { id: 'short-break', name: 'Short Break', duration: 5 * 60, description: '5 minutes', icon: 'coffee' },
  { id: 'long-break', name: 'Long Break', duration: 15 * 60, description: '15 minutes', icon: 'self-improvement' },
  { id: 'deep-work', name: 'Deep Work', duration: 90 * 60, description: '90 minutes', icon: 'psychology' },
  { id: 'custom', name: 'Custom Timer', duration: 0, description: 'Set your own time', icon: 'edit' },
];

const CATEGORY_COLORS = {
  study: '#3b82f6',
  work: '#8b5cf6',
  fitness: colors.primary,
  personal: '#f59e0b',
  other: '#6b7280',
};

const CATEGORY_ICONS = {
  study: 'school',
  work: 'work',
  fitness: 'fitness-center',
  personal: 'person',
  other: 'more-horiz',
};

export default function DisciplineModeScreen() {
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showCustomTimerModal, setShowCustomTimerModal] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState<TimerPreset | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Add task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<UserTask['category']>('personal');

  // Custom timer state
  const [customMinutes, setCustomMinutes] = useState('25');

  const saveTimerState = useCallback(async (running: boolean, time: number) => {
    try {
      const state: TimerState = {
        isRunning: running,
        timeLeft: time,
        startTime: Date.now(),
        presetId: selectedPreset?.id || '',
      };
      await AsyncStorage.setItem('disciplineTimerState', JSON.stringify(state));
      console.log('[Discipline] Timer state saved:', state);
    } catch (error) {
      console.error('[Discipline] Error saving timer state:', error);
    }
  }, [selectedPreset]);

  const loadTimerState = useCallback(async () => {
    try {
      const stateStr = await AsyncStorage.getItem('disciplineTimerState');
      if (stateStr) {
        const state: TimerState = JSON.parse(stateStr);
        if (state.isRunning) {
          const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
          const newTimeLeft = Math.max(0, state.timeLeft - elapsed);
          
          console.log('[Discipline] Restored timer state. Elapsed:', elapsed, 'Time left:', newTimeLeft);
          
          setTimeLeft(newTimeLeft);
          setIsTimerRunning(newTimeLeft > 0);
          
          const preset = TIMER_PRESETS.find(p => p.id === state.presetId);
          if (preset) {
            setSelectedPreset(preset);
          }
        }
      }
    } catch (error) {
      console.error('[Discipline] Error loading timer state:', error);
    }
  }, []);

  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    console.log('[Discipline] App state changed to:', nextAppState);
    if (nextAppState === 'active') {
      await loadTimerState();
    } else if (nextAppState === 'background') {
      await saveTimerState(isTimerRunning, timeLeft);
    }
  }, [isTimerRunning, timeLeft, loadTimerState, saveTimerState]);

  useEffect(() => {
    loadTasks();
    loadStreak();
    loadTimerState();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange, loadTimerState]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            console.log('[Discipline] Timer completed!');
            setIsTimerRunning(false);
            saveTimerState(false, 0);
          } else {
            saveTimerState(true, newTime);
          }
          return newTime;
        });
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      saveTimerState(false, 0);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft, saveTimerState]);

  useEffect(() => {
    if (isTimerRunning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isTimerRunning, pulseAnim]);

  const loadTasks = async () => {
    console.log('[Discipline] Loading tasks...');
    try {
      const response = await authenticatedGet('/api/tasks');
      if (response && Array.isArray(response)) {
        console.log('[Discipline] Loaded tasks from backend:', response);
        setTasks(response);
      } else {
        console.log('[Discipline] No tasks found, using empty array');
        setTasks([]);
      }
    } catch (error) {
      console.error('[Discipline] Error loading tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStreak = async () => {
    try {
      const stored = await AsyncStorage.getItem('disciplineStreak');
      if (stored) {
        const data = JSON.parse(stored);
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (data.lastCompletedDate === today) {
          setStreak(data.streak);
        } else if (data.lastCompletedDate === yesterday) {
          setStreak(data.streak);
        } else {
          setStreak(0);
        }
      }
    } catch (error) {
      console.error('[Discipline] Error loading streak:', error);
    }
  };

  const toggleTask = async (taskId: string) => {
    console.log('[Discipline] User toggled task:', taskId);
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedCompleted = !task.completed;
    
    // Optimistic update
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, completed: updatedCompleted } : t)));

    try {
      await authenticatedPut(`/api/tasks/${taskId}`, { completed: updatedCompleted });
      console.log('[Discipline] Task updated successfully');
      
      // Update streak if all tasks completed
      const allCompleted = tasks.every(t => t.id === taskId ? updatedCompleted : t.completed);
      if (allCompleted && tasks.length > 0) {
        const stored = await AsyncStorage.getItem('disciplineStreak');
        const data = stored ? JSON.parse(stored) : { streak: 0, lastCompletedDate: '' };
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (data.lastCompletedDate === yesterday) {
          data.streak += 1;
        } else if (data.lastCompletedDate !== today) {
          data.streak = 1;
        }
        
        data.lastCompletedDate = today;
        await AsyncStorage.setItem('disciplineStreak', JSON.stringify(data));
        setStreak(data.streak);
      }
    } catch (error) {
      console.error('[Discipline] Error updating task:', error);
      // Revert optimistic update
      setTasks(tasks.map((t) => (t.id === taskId ? task : t)));
    }
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) {
      setErrorMessage('Please enter a task title');
      setShowErrorModal(true);
      return;
    }

    console.log('[Discipline] User adding task:', newTaskTitle, newTaskCategory);

    try {
      const newTask = await authenticatedPost('/api/tasks', {
        title: newTaskTitle.trim(),
        category: newTaskCategory,
      });

      if (newTask) {
        console.log('[Discipline] Task created successfully:', newTask);
        setTasks([...tasks, newTask]);
        setNewTaskTitle('');
        setNewTaskCategory('personal');
        setShowAddTaskModal(false);
      }
    } catch (error) {
      console.error('[Discipline] Error creating task:', error);
      setErrorMessage('Failed to create task. Please try again.');
      setShowErrorModal(true);
    }
  };

  const deleteTask = async (taskId: string) => {
    console.log('[Discipline] User deleting task:', taskId);
    
    // Optimistic update
    const taskToDelete = tasks.find(t => t.id === taskId);
    setTasks(tasks.filter(t => t.id !== taskId));

    try {
      await authenticatedDelete(`/api/tasks/${taskId}`);
      console.log('[Discipline] Task deleted successfully');
    } catch (error) {
      console.error('[Discipline] Error deleting task:', error);
      // Revert optimistic update
      if (taskToDelete) {
        setTasks([...tasks, taskToDelete]);
      }
      setErrorMessage('Failed to delete task. Please try again.');
      setShowErrorModal(true);
    }
  };

  const startTimer = (preset: TimerPreset) => {
    if (preset.id === 'custom') {
      setShowTimerModal(false);
      setShowCustomTimerModal(true);
      return;
    }

    console.log('[Discipline] User started timer:', preset.name);
    setSelectedPreset(preset);
    setTimeLeft(preset.duration);
    setIsTimerRunning(true);
    setShowTimerModal(false);
    saveTimerState(true, preset.duration);
  };

  const startCustomTimer = () => {
    const minutes = parseInt(customMinutes);
    if (isNaN(minutes) || minutes <= 0) {
      setErrorMessage('Please enter a valid number of minutes');
      setShowErrorModal(true);
      return;
    }

    const customPreset: TimerPreset = {
      id: 'custom',
      name: 'Custom Timer',
      duration: minutes * 60,
      description: `${minutes} minutes`,
      icon: 'timer',
    };

    console.log('[Discipline] User started custom timer:', minutes, 'minutes');
    setSelectedPreset(customPreset);
    setTimeLeft(minutes * 60);
    setIsTimerRunning(true);
    setShowCustomTimerModal(false);
    saveTimerState(true, minutes * 60);
  };

  const stopTimer = () => {
    console.log('[Discipline] User stopped timer');
    setIsTimerRunning(false);
    saveTimerState(false, 0);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const completedTasksCount = tasks.filter(t => t.completed).length;
  const totalTasksCount = tasks.length;
  const progressPercentage = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;

  const getCategoryColor = (category: UserTask['category']) => CATEGORY_COLORS[category];
  const getCategoryIcon = (category: UserTask['category']) => CATEGORY_ICONS[category];

  return (
    <View style={styles.container}>
      <ParticleBackground />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Tasks & Focus</Text>
          <Text style={styles.subtitle}>Stay disciplined and productive</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <IconSymbol 
              ios_icon_name="flame.fill" 
              android_material_icon_name="local-fire-department" 
              size={32} 
              color="#ef4444" 
            />
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          
          <View style={styles.statCard}>
            <IconSymbol 
              ios_icon_name="checkmark.circle.fill" 
              android_material_icon_name="check-circle" 
              size={32} 
              color={colors.primary} 
            />
            <Text style={styles.statValue}>{completedTasksCount}/{totalTasksCount}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          
          <View style={styles.statCard}>
            <IconSymbol 
              ios_icon_name="chart.bar.fill" 
              android_material_icon_name="bar-chart" 
              size={32} 
              color="#10b981" 
            />
            <Text style={styles.statValue}>{Math.round(progressPercentage)}%</Text>
            <Text style={styles.statLabel}>Progress</Text>
          </View>
        </View>

        {/* Timer Card */}
        <Animated.View style={[styles.timerCard, { transform: [{ scale: pulseAnim }] }]}>
          {isTimerRunning ? (
            <>
              <View style={styles.timerActiveHeader}>
                <IconSymbol 
                  ios_icon_name="timer" 
                  android_material_icon_name="timer" 
                  size={40} 
                  color={colors.primary} 
                />
                <Text style={styles.timerLabel}>{selectedPreset?.name}</Text>
              </View>
              <Text style={styles.timerDisplay}>{formatTime(timeLeft)}</Text>
              <View style={styles.timerProgress}>
                <View 
                  style={[
                    styles.timerProgressFill, 
                    { width: `${((selectedPreset?.duration || 1) - timeLeft) / (selectedPreset?.duration || 1) * 100}%` }
                  ]} 
                />
              </View>
              <TouchableOpacity
                style={styles.stopButton}
                onPress={stopTimer}
              >
                <IconSymbol 
                  ios_icon_name="stop.fill" 
                  android_material_icon_name="stop" 
                  size={20} 
                  color="#fff" 
                />
                <Text style={styles.buttonText}>Stop Timer</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.timerIdleContent}>
                <IconSymbol 
                  ios_icon_name="timer" 
                  android_material_icon_name="timer" 
                  size={64} 
                  color={colors.primary} 
                />
                <Text style={styles.timerIdleTitle}>Ready to Focus?</Text>
                <Text style={styles.timerIdleSubtitle}>Choose a timer to begin your session</Text>
              </View>
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => setShowTimerModal(true)}
              >
                <IconSymbol 
                  ios_icon_name="play.fill" 
                  android_material_icon_name="play-arrow" 
                  size={20} 
                  color="#fff" 
                />
                <Text style={styles.buttonText}>Start Timer</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

        {/* Tasks Section */}
        <View style={styles.tasksSection}>
          <View style={styles.tasksSectionHeader}>
            <Text style={styles.sectionTitle}>Your Tasks</Text>
            <TouchableOpacity
              style={styles.addTaskButton}
              onPress={() => setShowAddTaskModal(true)}
            >
              <IconSymbol 
                ios_icon_name="plus.circle.fill" 
                android_material_icon_name="add-circle" 
                size={28} 
                color={colors.primary} 
              />
            </TouchableOpacity>
          </View>

          {loading ? (
            <Text style={styles.emptyText}>Loading tasks...</Text>
          ) : tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol 
                ios_icon_name="tray" 
                android_material_icon_name="inbox" 
                size={48} 
                color={colors.grey} 
              />
              <Text style={styles.emptyText}>No tasks yet</Text>
              <Text style={styles.emptySubtext}>Tap the + button to add your first task</Text>
            </View>
          ) : (
            tasks.map((task) => (
              <View key={task.id} style={styles.taskCard}>
                <TouchableOpacity
                  style={styles.taskLeft}
                  onPress={() => toggleTask(task.id)}
                >
                  <View style={[
                    styles.checkbox,
                    task.completed && styles.checkboxChecked,
                    { 
                      borderColor: getCategoryColor(task.category), 
                      backgroundColor: task.completed ? getCategoryColor(task.category) : 'transparent' 
                    },
                  ]}>
                    {task.completed && (
                      <IconSymbol 
                        ios_icon_name="checkmark" 
                        android_material_icon_name="check" 
                        size={16} 
                        color="#fff" 
                      />
                    )}
                  </View>
                  <View style={styles.taskContent}>
                    <Text style={[
                      styles.taskTitle,
                      task.completed && styles.taskTitleCompleted,
                    ]}>
                      {task.title}
                    </Text>
                    <View style={styles.taskMeta}>
                      <IconSymbol 
                        ios_icon_name={getCategoryIcon(task.category)} 
                        android_material_icon_name={getCategoryIcon(task.category)} 
                        size={14} 
                        color={getCategoryColor(task.category)} 
                      />
                      <Text style={[styles.taskCategory, { color: getCategoryColor(task.category) }]}>
                        {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteTask(task.id)}
                >
                  <IconSymbol 
                    ios_icon_name="trash" 
                    android_material_icon_name="delete" 
                    size={20} 
                    color="#ef4444" 
                  />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Motivation Card */}
        {tasks.length > 0 && (
          <View style={styles.motivationCard}>
            <IconSymbol 
              ios_icon_name="bolt.fill" 
              android_material_icon_name="flash-on" 
              size={32} 
              color={colors.primary} 
            />
            <View style={styles.motivationContent}>
              <Text style={styles.motivationTitle}>Keep Going!</Text>
              <Text style={styles.motivationText}>
                {completedTasksCount === 0 && "Start your day strong. Complete your first task!"}
                {completedTasksCount > 0 && completedTasksCount < totalTasksCount && `${totalTasksCount - completedTasksCount} more to go. You've got this!`}
                {completedTasksCount === totalTasksCount && "Perfect day! All tasks completed. 🎉"}
              </Text>
            </View>
          </View>
        )}
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
            <Text style={styles.modalTitle}>Choose Timer</Text>
            {TIMER_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.id}
                style={styles.timerOption}
                onPress={() => startTimer(preset)}
              >
                <View style={styles.timerOptionLeft}>
                  <IconSymbol 
                    ios_icon_name={preset.icon} 
                    android_material_icon_name={preset.icon} 
                    size={24} 
                    color={colors.primary} 
                  />
                  <View>
                    <Text style={styles.timerOptionName}>{preset.name}</Text>
                    <Text style={styles.timerOptionDesc}>{preset.description}</Text>
                  </View>
                </View>
                <IconSymbol 
                  ios_icon_name="chevron.right" 
                  android_material_icon_name="chevron-right" 
                  size={20} 
                  color={colors.grey} 
                />
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

      {/* Custom Timer Modal */}
      <Modal
        visible={showCustomTimerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomTimerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Custom Timer</Text>
            <Text style={styles.inputLabel}>Duration (minutes)</Text>
            <TextInput
              style={styles.input}
              placeholder="25"
              placeholderTextColor={colors.grey}
              keyboardType="numeric"
              value={customMinutes}
              onChangeText={setCustomMinutes}
            />
            <TouchableOpacity
              style={styles.startButton}
              onPress={startCustomTimer}
            >
              <Text style={styles.buttonText}>Start Timer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCustomTimerModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Task Modal */}
      <Modal
        visible={showAddTaskModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddTaskModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Task</Text>
            
            <Text style={styles.inputLabel}>Task Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter task title"
              placeholderTextColor={colors.grey}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />

            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {(['study', 'work', 'fitness', 'personal', 'other'] as const).map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryOption,
                    newTaskCategory === category && styles.categoryOptionSelected,
                    { borderColor: getCategoryColor(category) },
                    newTaskCategory === category && { backgroundColor: getCategoryColor(category) },
                  ]}
                  onPress={() => setNewTaskCategory(category)}
                >
                  <IconSymbol 
                    ios_icon_name={getCategoryIcon(category)} 
                    android_material_icon_name={getCategoryIcon(category)} 
                    size={20} 
                    color={newTaskCategory === category ? '#fff' : getCategoryColor(category)} 
                  />
                  <Text style={[
                    styles.categoryOptionText,
                    { color: newTaskCategory === category ? '#fff' : getCategoryColor(category) },
                  ]}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.startButton}
              onPress={addTask}
            >
              <Text style={styles.buttonText}>Add Task</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowAddTaskModal(false);
                setNewTaskTitle('');
                setNewTaskCategory('personal');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <CustomModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        type="error"
        title="Error"
        message={errorMessage}
        confirmText="OK"
      />
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
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    padding: 20,
    paddingBottom: 120,
  },
  headerSection: {
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
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  timerCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timerActiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  timerLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  timerDisplay: {
    fontSize: 64,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 16,
  },
  timerProgress: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 24,
  },
  timerProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  timerIdleContent: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerIdleTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  timerIdleSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
  },
  stopButton: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tasksSection: {
    marginBottom: 24,
  },
  tasksSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  addTaskButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.grey,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.grey,
    marginTop: 4,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderWidth: 0,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 6,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.grey,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskCategory: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
  },
  motivationCard: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(69, 155, 155, 0.3)',
  },
  motivationContent: {
    flex: 1,
  },
  motivationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  motivationText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
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
  timerOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  timerOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  timerOptionDesc: {
    fontSize: 13,
    color: colors.grey,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 20,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
  },
  categoryOptionSelected: {
    borderWidth: 0,
  },
  categoryOptionText: {
    fontSize: 13,
    fontWeight: '600',
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
