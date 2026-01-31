
import React, { useState, useEffect, useCallback } from 'react';
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
  Platform,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeeklyTask, TimerType } from '@/types/fitness';
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

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface TimerState {
  isRunning: boolean;
  timeLeft: number;
  startTime: number;
  timerType: string;
  customDuration: number;
}

export default function FocusScreen() {
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [newTask, setNewTask] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'study' | 'work' | 'personal'>('study');
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedTimer, setSelectedTimer] = useState<TimerType | null>(null);
  const [customMinutes, setCustomMinutes] = useState('');
  const [customHours, setCustomHours] = useState('');
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [taskTime, setTaskTime] = useState('');
  const [pulseAnim] = useState(new Animated.Value(1));

  const saveTimerState = useCallback(async (running: boolean, time: number) => {
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
  }, [selectedTimer]);

  const loadTimerState = useCallback(async () => {
    try {
      const stateStr = await AsyncStorage.getItem('timerState');
      if (stateStr) {
        const state: TimerState = JSON.parse(stateStr);
        if (state.isRunning) {
          const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
          const newTimeLeft = Math.max(0, state.timeLeft - elapsed);
          
          setTimeLeft(newTimeLeft);
          setIsTimerRunning(newTimeLeft > 0);
          
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
    } else if (timeLeft === 0 && isTimerRunning && selectedTimer?.id !== 'stopwatch') {
      setIsTimerRunning(false);
      saveTimerState(false, 0);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft, selectedTimer, saveTimerState]);

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
      const data = await AsyncStorage.getItem('focusTasks');
      if (data) setTasks(JSON.parse(data));
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const saveTasks = async (updatedTasks: WeeklyTask[]) => {
    try {
      await AsyncStorage.setItem('focusTasks', JSON.stringify(updatedTasks));
      setTasks(updatedTasks);
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  };

  const openTaskModal = () => {
    console.log('User tapped Add Task button');
    setNewTask('');
    setTaskTime('');
    setSelectedDay(new Date().getDay());
    setSelectedCategory('study');
    setSelectedHour(9);
    setSelectedMinute(0);
    setShowTaskModal(true);
  };

  const openTimePicker = () => {
    console.log('User opened time picker');
    setShowTimePickerModal(true);
  };

  const confirmTime = () => {
    const hourStr = selectedHour.toString().padStart(2, '0');
    const minuteStr = selectedMinute.toString().padStart(2, '0');
    const timeString = `${hourStr}:${minuteStr}`;
    console.log('User selected time:', timeString);
    setTaskTime(timeString);
    setShowTimePickerModal(false);
  };

  const addTask = () => {
    if (!newTask.trim() || !taskTime) {
      console.log('Cannot add task - missing title or time');
      return;
    }
    
    console.log('Adding task:', { title: newTask, time: taskTime, day: DAYS[selectedDay] });
    
    const task: WeeklyTask = {
      id: Date.now().toString(),
      title: newTask,
      completed: false,
      category: selectedCategory,
      dayOfWeek: selectedDay,
      startTime: taskTime,
    };
    
    saveTasks([...tasks, task]);
    setShowTaskModal(false);
    setNewTask('');
    setTaskTime('');
  };

  const toggleTask = (id: string) => {
    console.log('User toggled task:', id);
    saveTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const deleteTask = (id: string) => {
    console.log('User deleted task:', id);
    saveTasks(tasks.filter((t) => t.id !== id));
  };

  const startTimer = (timer: TimerType) => {
    console.log('User started timer:', timer.name);
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

    console.log('User started custom timer:', { hours, minutes });

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
    console.log('User stopped timer');
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

  const tasksByDay = tasks.reduce((acc, task) => {
    const day = task.dayOfWeek ?? -1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(task);
    return acc;
  }, {} as Record<number, WeeklyTask[]>);

  const canAddTask = newTask.trim() && taskTime;

  const completedTasksCount = tasks.filter(t => t.completed).length;
  const totalTasksCount = tasks.length;
  const progressPercentage = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;

  return (
    <View style={styles.container}>
      <ParticleBackground />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Focus Hub</Text>
          <Text style={styles.subtitle}>Your productivity command center</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check-circle" size={32} color={colors.primary} />
            <Text style={styles.statValue}>{completedTasksCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          
          <View style={styles.statCard}>
            <IconSymbol ios_icon_name="list.bullet" android_material_icon_name="list" size={32} color={colors.warning} />
            <Text style={styles.statValue}>{totalTasksCount - completedTasksCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          
          <View style={styles.statCard}>
            <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar-chart" size={32} color={colors.success} />
            <Text style={styles.statValue}>{Math.round(progressPercentage)}%</Text>
            <Text style={styles.statLabel}>Progress</Text>
          </View>
        </View>

        <Animated.View style={[styles.timerCard, { transform: [{ scale: pulseAnim }] }]}>
          {isTimerRunning ? (
            <>
              <View style={styles.timerActiveHeader}>
                <IconSymbol ios_icon_name="timer" android_material_icon_name="timer" size={40} color={colors.primary} />
                <Text style={styles.timerLabel}>{selectedTimer?.name}</Text>
              </View>
              <Text style={styles.timerDisplay}>{formatTime(timeLeft)}</Text>
              <View style={styles.timerProgress}>
                <View 
                  style={[
                    styles.timerProgressFill, 
                    { width: `${((selectedTimer?.duration || 1) - timeLeft) / (selectedTimer?.duration || 1) * 100}%` }
                  ]} 
                />
              </View>
              <TouchableOpacity
                style={styles.stopButton}
                onPress={stopTimer}
              >
                <IconSymbol ios_icon_name="stop.fill" android_material_icon_name="stop" size={20} color="#fff" />
                <Text style={styles.buttonText}>Stop Session</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.timerIdleContent}>
                <IconSymbol ios_icon_name="timer" android_material_icon_name="timer" size={80} color={colors.primary} />
                <Text style={styles.timerIdleTitle}>Ready to Focus?</Text>
                <Text style={styles.timerIdleSubtitle}>Choose a timer to start your session</Text>
              </View>
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => setShowTimerModal(true)}
              >
                <IconSymbol ios_icon_name="play.fill" android_material_icon_name="play-arrow" size={20} color="#fff" />
                <Text style={styles.buttonText}>Start Focus Session</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

        <TouchableOpacity style={styles.addTaskButton} onPress={openTaskModal}>
          <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add-circle" size={24} color="#fff" />
          <Text style={styles.addTaskButtonText}>Add Task to Weekly Plan</Text>
        </TouchableOpacity>

        <View style={styles.tasksSection}>
          <Text style={styles.sectionTitle}>Weekly Tasks</Text>
          {Object.keys(tasksByDay).length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol ios_icon_name="tray" android_material_icon_name="inbox" size={60} color={colors.grey} />
              <Text style={styles.emptyText}>No tasks scheduled</Text>
              <Text style={styles.emptySubtext}>Add your first task to get started!</Text>
            </View>
          ) : (
            Object.entries(tasksByDay)
              .sort(([dayA], [dayB]) => parseInt(dayA) - parseInt(dayB))
              .map(([day, dayTasks]) => {
                const dayIndex = parseInt(day);
                if (dayIndex === -1) return null;
                
                return (
                  <View key={day} style={styles.daySection}>
                    <Text style={styles.dayTitle}>{DAYS[dayIndex]}</Text>
                    {dayTasks.map((task) => (
                      <View key={task.id} style={styles.taskCard}>
                        <TouchableOpacity
                          style={styles.taskMain}
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
                            <View style={styles.taskMeta}>
                              <Text style={styles.taskCategory}>{task.category}</Text>
                              {task.startTime && (
                                <Text style={styles.taskTime}>• {task.startTime}</Text>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => deleteTask(task.id)}
                        >
                          <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                );
              })
          )}
        </View>
      </ScrollView>

      {/* Add Task Modal */}
      <Modal
        visible={showTaskModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTaskModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Task</Text>
            
            <Text style={styles.inputLabel}>Task Description</Text>
            <TextInput
              style={styles.textInput}
              placeholder="What do you need to do?"
              placeholderTextColor={colors.grey}
              value={newTask}
              onChangeText={setNewTask}
            />

            <Text style={styles.inputLabel}>Day</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
              {DAYS.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayChip,
                    selectedDay === index && styles.dayChipActive,
                  ]}
                  onPress={() => setSelectedDay(index)}
                >
                  <Text style={[
                    styles.dayChipText,
                    selectedDay === index && styles.dayChipTextActive,
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>
              Time
              <Text style={styles.requiredStar}> *</Text>
            </Text>
            <TouchableOpacity
              style={styles.timePickerButton}
              onPress={openTimePicker}
            >
              <IconSymbol ios_icon_name="clock" android_material_icon_name="access-time" size={20} color={colors.text} />
              <Text style={styles.timePickerButtonText}>
                {taskTime || 'Select time'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Category</Text>
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

            <TouchableOpacity
              style={[styles.addButton, !canAddTask && styles.addButtonDisabled]}
              onPress={addTask}
              disabled={!canAddTask}
            >
              <Text style={styles.buttonText}>Add Task</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowTaskModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerModal}>
            <Text style={styles.modalTitle}>Select Time</Text>
            
            <View style={styles.timePickerContainer}>
              <View style={styles.timePickerColumn}>
                <Text style={styles.timePickerLabel}>Hour</Text>
                <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                    <TouchableOpacity
                      key={hour}
                      style={[
                        styles.timePickerOption,
                        selectedHour === hour && styles.timePickerOptionSelected,
                      ]}
                      onPress={() => setSelectedHour(hour)}
                    >
                      <Text style={[
                        styles.timePickerOptionText,
                        selectedHour === hour && styles.timePickerOptionTextSelected,
                      ]}>
                        {hour.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.timePickerSeparator}>:</Text>

              <View style={styles.timePickerColumn}>
                <Text style={styles.timePickerLabel}>Minute</Text>
                <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                    <TouchableOpacity
                      key={minute}
                      style={[
                        styles.timePickerOption,
                        selectedMinute === minute && styles.timePickerOptionSelected,
                      ]}
                      onPress={() => setSelectedMinute(minute)}
                    >
                      <Text style={[
                        styles.timePickerOptionText,
                        selectedMinute === minute && styles.timePickerOptionTextSelected,
                      ]}>
                        {minute.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <TouchableOpacity
              style={styles.confirmTimeButton}
              onPress={confirmTime}
            >
              <Text style={styles.buttonText}>Confirm Time</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowTimePickerModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    padding: 20,
    paddingBottom: 100,
  },
  headerSection: {
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
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  timerDisplay: {
    fontSize: 72,
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
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  timerIdleSubtitle: {
    fontSize: 16,
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
  addTaskButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  addTaskButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tasksSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
  daySection: {
    marginBottom: 24,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  taskMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    marginBottom: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.grey,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskCategory: {
    fontSize: 12,
    color: colors.grey,
  },
  taskTime: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.grey,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  requiredStar: {
    color: '#ef4444',
    fontSize: 16,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  daySelector: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginRight: 8,
  },
  dayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayChipText: {
    color: colors.grey,
    fontSize: 14,
    fontWeight: '600',
  },
  dayChipTextActive: {
    color: '#fff',
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timePickerButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  timePickerModal: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  timePickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  timePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  timePickerScroll: {
    maxHeight: 200,
    width: '100%',
  },
  timePickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
  },
  timePickerOptionSelected: {
    backgroundColor: colors.primary,
  },
  timePickerOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  timePickerOptionTextSelected: {
    color: '#fff',
  },
  timePickerSeparator: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 24,
  },
  confirmTimeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  categorySelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
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
  addButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonDisabled: {
    opacity: 0.5,
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
