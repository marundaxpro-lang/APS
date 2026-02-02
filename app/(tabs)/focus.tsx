
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ParticleBackground from '@/components/ParticleBackground';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

interface FitnessTask {
  id: string;
  title: string;
  completed: boolean;
  type: 'workout' | 'meals' | 'steps' | 'mobility';
  icon: string;
  color: string;
}

interface TimerPreset {
  id: string;
  name: string;
  duration: number;
  description: string;
  icon: string;
}

const FITNESS_TASKS: Omit<FitnessTask, 'id' | 'completed'>[] = [
  { title: 'Complete Today\'s Workout', type: 'workout', icon: 'fitness-center', color: colors.primary },
  { title: 'Log All Meals', type: 'meals', icon: 'restaurant', color: '#f59e0b' },
  { title: 'Hit 10,000 Steps', type: 'steps', icon: 'directions-walk', color: '#10b981' },
  { title: '10 Min Mobility Work', type: 'mobility', icon: 'self-improvement', color: '#8b5cf6' },
];

const TIMER_PRESETS: TimerPreset[] = [
  { id: 'rest', name: 'Workout Rest Timer', duration: 90, description: '90 seconds', icon: 'timer' },
  { id: 'meal-prep', name: 'Meal Prep', duration: 25 * 60, description: '25 minutes', icon: 'restaurant' },
  { id: 'mobility', name: 'Mobility', duration: 10 * 60, description: '10 minutes', icon: 'self-improvement' },
];

interface TimerState {
  isRunning: boolean;
  timeLeft: number;
  startTime: number;
  presetId: string;
}

export default function DisciplineModeScreen() {
  const [tasks, setTasks] = useState<FitnessTask[]>([]);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState<TimerPreset | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [streak, setStreak] = useState(0);

  const saveTimerState = useCallback(async (running: boolean, time: number) => {
    try {
      const state: TimerState = {
        isRunning: running,
        timeLeft: time,
        startTime: Date.now(),
        presetId: selectedPreset?.id || '',
      };
      await AsyncStorage.setItem('disciplineTimerState', JSON.stringify(state));
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
          saveTimerState(true, newTime);
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
    try {
      const today = new Date().toDateString();
      const stored = await AsyncStorage.getItem('disciplineTasks');
      
      if (stored) {
        const data = JSON.parse(stored);
        
        // Reset tasks if it's a new day
        if (data.date !== today) {
          const newTasks = FITNESS_TASKS.map((task, index) => ({
            ...task,
            id: `task-${index}`,
            completed: false,
          }));
          await AsyncStorage.setItem('disciplineTasks', JSON.stringify({ date: today, tasks: newTasks }));
          setTasks(newTasks);
        } else {
          setTasks(data.tasks);
        }
      } else {
        const newTasks = FITNESS_TASKS.map((task, index) => ({
          ...task,
          id: `task-${index}`,
          completed: false,
        }));
        await AsyncStorage.setItem('disciplineTasks', JSON.stringify({ date: today, tasks: newTasks }));
        setTasks(newTasks);
      }
    } catch (error) {
      console.error('[Discipline] Error loading tasks:', error);
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

  const saveTasks = async (updatedTasks: FitnessTask[]) => {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem('disciplineTasks', JSON.stringify({ date: today, tasks: updatedTasks }));
      setTasks(updatedTasks);
      
      // Update streak if all tasks completed
      const allCompleted = updatedTasks.every(t => t.completed);
      if (allCompleted) {
        const stored = await AsyncStorage.getItem('disciplineStreak');
        const data = stored ? JSON.parse(stored) : { streak: 0, lastCompletedDate: '' };
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
      console.error('[Discipline] Error saving tasks:', error);
    }
  };

  const toggleTask = (id: string) => {
    console.log('[Discipline] User toggled task:', id);
    saveTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const startTimer = (preset: TimerPreset) => {
    console.log('[Discipline] User started timer:', preset.name);
    setSelectedPreset(preset);
    setTimeLeft(preset.duration);
    setIsTimerRunning(true);
    setShowTimerModal(false);
    saveTimerState(true, preset.duration);
  };

  const stopTimer = () => {
    console.log('[Discipline] User stopped timer');
    setIsTimerRunning(false);
    saveTimerState(false, 0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const completedTasksCount = tasks.filter(t => t.completed).length;
  const totalTasksCount = tasks.length;
  const progressPercentage = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;

  return (
    <View style={styles.container}>
      <ParticleBackground />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Discipline Mode</Text>
          <Text style={styles.subtitle}>Build unstoppable fitness habits</Text>
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
                <Text style={styles.timerIdleSubtitle}>Choose a timer preset to begin</Text>
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

        {/* Fitness Checklist */}
        <View style={styles.tasksSection}>
          <Text style={styles.sectionTitle}>Today&apos;s Fitness Checklist</Text>
          {tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              onPress={() => toggleTask(task.id)}
            >
              <View style={[
                styles.checkbox,
                task.completed && styles.checkboxChecked,
                { borderColor: task.color, backgroundColor: task.completed ? task.color : 'transparent' },
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
                    ios_icon_name={task.icon} 
                    android_material_icon_name={task.icon} 
                    size={14} 
                    color={task.color} 
                  />
                  <Text style={[styles.taskType, { color: task.color }]}>
                    {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Motivation Card */}
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
            <Text style={styles.modalTitle}>Choose Timer Preset</Text>
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
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
  taskType: {
    fontSize: 12,
    fontWeight: '600',
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
