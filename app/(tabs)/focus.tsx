
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  AppState,
  AppStateStatus,
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
  { id: 'custom', name: 'Custom Timer', duration: 0, description: 'Set your own duration' },
];

interface TimerState {
  isRunning: boolean;
  timeLeft: number;
  startTime: number;
  timerType: string;
  customDuration: number;
}

export default function FocusScreen() {
  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [newTask, setNewTask] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'study' | 'work' | 'personal'>('study');
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedTimer, setSelectedTimer] = useState<TimerType | null>(null);
  const [customMinutes, setCustomMinutes] = useState('');
  const [customHours, setCustomHours] = useState('');

  useEffect(() => {
    loadTasks();
    loadTimerState();

    // Handle app state changes (background/foreground)
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          saveTimerState(true, newTime);
          return newTime;
        });
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning && selectedTimer?.id !== 'stopwatch') {
      setIsTimerRunning(false);
      saveTimerState(false, 0);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft, selectedTimer]);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to foreground - recalculate timer
      await loadTimerState();
    } else if (nextAppState === 'background') {
      // App went to background - save current state
      await saveTimerState(isTimerRunning, timeLeft);
    }
  };

  const saveTimerState = async (running: boolean, time: number) => {
    try {
      const state: TimerState = {
        isRunning: running,
        timeLeft: time,
        startTime: Date.now(),
        timerType: selectedTimer?.id || '',
        customDuration: selectedTimer?.duration || 0,
      };
      await AsyncStorage.setItem('timerState', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving timer state:', error);
    }
  };

  const loadTimerState = async () => {
    try {
      const stateStr = await AsyncStorage.getItem('timerState');
      if (stateStr) {
        const state: TimerState = JSON.parse(stateStr);
        if (state.isRunning) {
          // Calculate elapsed time since app was backgrounded
          const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
          const newTimeLeft = Math.max(0, state.timeLeft - elapsed);
          
          setTimeLeft(newTimeLeft);
          setIsTimerRunning(newTimeLeft > 0);
          
          // Restore timer type
          const timer = TIMER_TYPES.find(t => t.id === state.timerType);
          if (timer) {
            setSelectedTimer({
              ...timer,
              duration: state.customDuration || timer.duration,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading timer state:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const data = await AsyncStorage.getItem('focusTasks');
      if (data) setTasks(JSON.parse(data));
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const saveTasks = async (updatedTasks: FocusTask[]) => {
    try {
      await AsyncStorage.setItem('focusTasks', JSON.stringify(updatedTasks));
      setTasks(updatedTasks);
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
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
    if (timer.id === 'custom') {
      setShowTimerModal(false);
      setShowCustomModal(true);
      return;
    }

    setSelectedTimer(timer);
    setTimeLeft(timer.duration);
    setIsTimerRunning(true);
    setShowTimerModal(false);
    saveTimerState(true, timer.duration);
  };

  const startCustomTimer = () => {
    const hours = parseInt(customHours) || 0;
    const minutes = parseInt(customMinutes) || 0;
    
    if (hours === 0 && minutes === 0) {
      return;
    }

    const totalSeconds = (hours * 3600) + (minutes * 60);
    const customTimer: TimerType = {
      id: 'custom',
      name: 'Custom Timer',
      duration: totalSeconds,
      description: `${hours > 0 ? hours + 'h ' : ''}${minutes}min`,
    };

    setSelectedTimer(customTimer);
    setTimeLeft(totalSeconds);
    setIsTimerRunning(true);
    setShowCustomModal(false);
    setCustomHours('');
    setCustomMinutes('');
    saveTimerState(true, totalSeconds);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    saveTimerState(false, 0);
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
                onPress={stopTimer}
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
          <Text style={styles.sectionTitle}>Today&apos;s Tasks</Text>
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

      {/* Custom Timer Modal */}
      <Modal
        visible={showCustomModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Custom Timer</Text>
            <Text style={styles.modalSubtitle}>Set your own duration</Text>
            
            <View style={styles.customInputContainer}>
              <View style={styles.customInputGroup}>
                <Text style={styles.customInputLabel}>Hours</Text>
                <TextInput
                  style={styles.customInput}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.grey}
                  value={customHours}
                  onChangeText={setCustomHours}
                  maxLength={2}
                />
              </View>

              <Text style={styles.customInputSeparator}>:</Text>

              <View style={styles.customInputGroup}>
                <Text style={styles.customInputLabel}>Minutes</Text>
                <TextInput
                  style={styles.customInput}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.grey}
                  value={customMinutes}
                  onChangeText={setCustomMinutes}
                  maxLength={2}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.startCustomButton,
                (!customHours && !customMinutes) && styles.startCustomButtonDisabled,
              ]}
              onPress={startCustomTimer}
              disabled={!customHours && !customMinutes}
            >
              <Text style={styles.buttonText}>Start Timer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowCustomModal(false);
                setCustomHours('');
                setCustomMinutes('');
              }}
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
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.grey,
    marginBottom: 24,
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
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  customInputGroup: {
    alignItems: 'center',
    gap: 8,
  },
  customInputLabel: {
    fontSize: 14,
    color: colors.grey,
    fontWeight: '600',
  },
  customInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    width: 100,
  },
  customInputSeparator: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 24,
  },
  startCustomButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  startCustomButtonDisabled: {
    opacity: 0.5,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.grey,
    fontSize: 16,
    fontWeight: '600',
  },
});
