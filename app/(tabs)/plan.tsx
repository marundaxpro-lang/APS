
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { generateWorkoutSplit } from '@/data/workouts';
import ParticleBackground from '@/components/ParticleBackground';
import { FitnessProfile, WorkoutDay, WeeklyTask } from '@/types/fitness';
import { useRouter } from 'expo-router';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ScheduledItem {
  id: string;
  type: 'workout' | 'task';
  title: string;
  time: string;
  duration: number;
  data?: any;
}

export default function PlanScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const [workoutSplit, setWorkoutSplit] = useState<WorkoutDay[]>([]);
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [scheduledItems, setScheduledItems] = useState<{ [key: string]: ScheduledItem[] }>({});
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutDay | null>(null);
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [editingItem, setEditingItem] = useState<ScheduledItem | null>(null);
  const [editDuration, setEditDuration] = useState('');

  useEffect(() => {
    loadProfile();
    loadWeeklyTasks();
    loadScheduledItems();
  }, []);

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem('fitnessProfile');
      if (stored) {
        const profileData = JSON.parse(stored);
        console.log('Loaded profile in plan screen:', profileData);
        setProfile(profileData);
        const split = generateWorkoutSplit(profileData);
        console.log('Generated split in plan screen:', split);
        setWorkoutSplit(split);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadWeeklyTasks = async () => {
    try {
      const stored = await AsyncStorage.getItem('focusTasks');
      if (stored) {
        const tasks: WeeklyTask[] = JSON.parse(stored);
        const tasksWithDays = tasks.filter(task => task.dayOfWeek !== undefined);
        setWeeklyTasks(tasksWithDays);
      }
    } catch (error) {
      console.error('Error loading weekly tasks:', error);
    }
  };

  const loadScheduledItems = async () => {
    try {
      const stored = await AsyncStorage.getItem('scheduledItems');
      if (stored) {
        setScheduledItems(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading scheduled items:', error);
    }
  };

  const saveScheduledItems = async (items: { [key: string]: ScheduledItem[] }) => {
    try {
      await AsyncStorage.setItem('scheduledItems', JSON.stringify(items));
      setScheduledItems(items);
    } catch (error) {
      console.error('Error saving scheduled items:', error);
    }
  };

  const handleDayPress = (dayIndex: number) => {
    console.log('User selected day:', FULL_DAYS[dayIndex]);
    setSelectedDay(dayIndex);
  };

  const getDayWorkout = (dayIndex: number): WorkoutDay | null => {
    return workoutSplit.find(day => day.dayIndex === dayIndex) || null;
  };

  const getDayTasks = (dayIndex: number): WeeklyTask[] => {
    return weeklyTasks.filter(task => task.dayOfWeek === dayIndex);
  };

  const getScheduledItemsForDay = (dayIndex: number): ScheduledItem[] => {
    const key = `${dayIndex}`;
    return scheduledItems[key] || [];
  };

  const openScheduleModal = (workout: WorkoutDay) => {
    console.log('User opened schedule modal for workout:', workout.name);
    setSelectedWorkout(workout);
    setSelectedHour(9);
    setSelectedMinute(0);
    setShowScheduleModal(true);
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
    
    if (selectedWorkout) {
      scheduleWorkout(selectedWorkout, timeString);
    }
    
    setShowTimePickerModal(false);
  };

  const scheduleWorkout = (workout: WorkoutDay, time: string) => {
    console.log('Scheduling workout:', workout.name, 'at', time);
    const dayKey = `${workout.dayIndex}`;
    const newItem: ScheduledItem = {
      id: `workout-${Date.now()}`,
      type: 'workout',
      title: workout.name,
      time: time,
      duration: 60,
      data: workout,
    };

    const updatedItems = {
      ...scheduledItems,
      [dayKey]: [...(scheduledItems[dayKey] || []), newItem].sort((a, b) => a.time.localeCompare(b.time)),
    };

    saveScheduledItems(updatedItems);
    setShowScheduleModal(false);
  };

  const scheduleTask = (task: WeeklyTask) => {
    if (!task.startTime) {
      console.log('Cannot schedule task without time');
      return;
    }
    
    console.log('Scheduling task:', task.title, 'at', task.startTime);
    const dayKey = `${task.dayOfWeek}`;
    const newItem: ScheduledItem = {
      id: `task-${Date.now()}`,
      type: 'task',
      title: task.title,
      time: task.startTime,
      duration: task.duration || 30,
      data: task,
    };

    const updatedItems = {
      ...scheduledItems,
      [dayKey]: [...(scheduledItems[dayKey] || []), newItem].sort((a, b) => a.time.localeCompare(b.time)),
    };

    saveScheduledItems(updatedItems);
  };

  const openEditModal = (item: ScheduledItem) => {
    console.log('User opened edit modal for:', item.title);
    setEditingItem(item);
    setEditDuration(item.duration.toString());
    const [hour, minute] = item.time.split(':').map(Number);
    setSelectedHour(hour);
    setSelectedMinute(minute);
    setShowEditModal(true);
  };

  const saveEditedItem = () => {
    if (!editingItem) return;
    
    const hourStr = selectedHour.toString().padStart(2, '0');
    const minuteStr = selectedMinute.toString().padStart(2, '0');
    const newTime = `${hourStr}:${minuteStr}`;
    const newDuration = parseInt(editDuration) || editingItem.duration;
    
    console.log('Saving edited item:', editingItem.title, 'new time:', newTime, 'new duration:', newDuration);
    
    const dayKey = `${selectedDay}`;
    const updatedItems = {
      ...scheduledItems,
      [dayKey]: (scheduledItems[dayKey] || []).map(item => 
        item.id === editingItem.id 
          ? { ...item, time: newTime, duration: newDuration }
          : item
      ).sort((a, b) => a.time.localeCompare(b.time)),
    };
    
    saveScheduledItems(updatedItems);
    setShowEditModal(false);
    setEditingItem(null);
  };

  const removeScheduledItem = (dayIndex: number, itemId: string) => {
    console.log('User removed scheduled item:', itemId);
    const dayKey = `${dayIndex}`;
    const updatedItems = {
      ...scheduledItems,
      [dayKey]: (scheduledItems[dayKey] || []).filter(item => item.id !== itemId),
    };
    saveScheduledItems(updatedItems);
  };

  const handleItemPress = (item: ScheduledItem) => {
    console.log('User tapped scheduled item:', item.title);
    if (item.type === 'workout' && item.data) {
      router.push('/(tabs)/training');
    }
  };

  const dayItems = getScheduledItemsForDay(selectedDay);
  const dayWorkout = getDayWorkout(selectedDay);
  const dayTasks = getDayTasks(selectedDay);

  const isWorkoutScheduled = dayWorkout && dayItems.some(item => item.type === 'workout' && item.data?.name === dayWorkout.name);

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  const TIME_SLOTS = generateTimeSlots();

  return (
    <View style={styles.container}>
      <ParticleBackground />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Weekly Planner</Text>
          <Text style={styles.subtitle}>Schedule your workouts and tasks</Text>
        </View>

        <View style={styles.weekContainer}>
          {DAYS.map((day, index) => {
            const isToday = index === new Date().getDay();
            const isSelected = index === selectedDay;
            const itemCount = getScheduledItemsForDay(index).length;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCard,
                  isToday && styles.todayCard,
                  isSelected && styles.selectedCard,
                ]}
                onPress={() => handleDayPress(index)}
              >
                <Text style={[
                  styles.dayText,
                  isToday && styles.todayText,
                  isSelected && styles.selectedText,
                ]}>
                  {day}
                </Text>
                {itemCount > 0 && (
                  <View style={styles.itemCountBadge}>
                    <Text style={styles.itemCountText}>{itemCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.dayViewContainer}>
          <View style={styles.dayViewHeader}>
            <Text style={styles.dayViewTitle}>
              {FULL_DAYS[selectedDay]}
            </Text>
            <Text style={styles.dayViewDate}>
              {selectedDay === new Date().getDay() ? 'Today' : ''}
            </Text>
          </View>

          {dayWorkout && !isWorkoutScheduled && (
            <View style={styles.availableWorkoutCard}>
              <View style={styles.availableWorkoutHeader}>
                <IconSymbol 
                  ios_icon_name="dumbbell.fill" 
                  android_material_icon_name="fitness-center" 
                  size={20} 
                  color={colors.primary} 
                />
                <Text style={styles.availableWorkoutText}>Workout Available</Text>
              </View>
              <Text style={styles.availableWorkoutName}>{dayWorkout.name}</Text>
              <TouchableOpacity
                style={styles.scheduleWorkoutButton}
                onPress={() => openScheduleModal(dayWorkout)}
              >
                <IconSymbol 
                  ios_icon_name="plus.circle.fill" 
                  android_material_icon_name="add-circle" 
                  size={18} 
                  color="#fff" 
                />
                <Text style={styles.scheduleWorkoutButtonText}>Schedule Workout</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.timeline}>
            {TIME_SLOTS.map((timeSlot) => {
              const itemsAtTime = dayItems.filter(item => item.time === timeSlot);
              
              return (
                <View key={timeSlot} style={styles.timeSlotRow}>
                  <View style={styles.timeSlotLabel}>
                    <Text style={styles.timeSlotText}>{timeSlot}</Text>
                  </View>
                  <View style={styles.timeSlotContent}>
                    {itemsAtTime.length > 0 ? (
                      itemsAtTime.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.scheduledItemCard,
                            item.type === 'workout' ? styles.workoutItemCard : styles.taskItemCard,
                          ]}
                          onPress={() => openEditModal(item)}
                        >
                          <View style={styles.scheduledItemHeader}>
                            <IconSymbol 
                              ios_icon_name={item.type === 'workout' ? 'dumbbell.fill' : 'checkmark.circle.fill'} 
                              android_material_icon_name={item.type === 'workout' ? 'fitness-center' : 'check-circle'} 
                              size={16} 
                              color="#fff" 
                            />
                            <Text style={styles.scheduledItemTitle}>{item.title}</Text>
                            <TouchableOpacity
                              style={styles.removeItemButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                removeScheduledItem(selectedDay, item.id);
                              }}
                            >
                              <IconSymbol 
                                ios_icon_name="xmark.circle.fill" 
                                android_material_icon_name="cancel" 
                                size={18} 
                                color="rgba(255,255,255,0.8)" 
                              />
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.scheduledItemDuration}>{item.duration} min</Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.emptyTimeSlot} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {dayTasks.length > 0 && (
            <View style={styles.unscheduledSection}>
              <Text style={styles.unscheduledTitle}>Tasks for this day</Text>
              {dayTasks.map((task) => {
                const isScheduled = dayItems.some(item => item.type === 'task' && item.data?.id === task.id);
                
                return (
                  <View key={task.id} style={styles.unscheduledTaskCard}>
                    <View style={styles.unscheduledTaskInfo}>
                      <IconSymbol 
                        ios_icon_name="circle" 
                        android_material_icon_name="radio-button-unchecked" 
                        size={16} 
                        color={colors.textSecondary} 
                      />
                      <View style={styles.unscheduledTaskTextContainer}>
                        <Text style={styles.unscheduledTaskTitle}>{task.title}</Text>
                        {task.startTime && (
                          <Text style={styles.unscheduledTaskTime}>Scheduled for {task.startTime}</Text>
                        )}
                      </View>
                    </View>
                    {!isScheduled && task.startTime && (
                      <TouchableOpacity
                        style={styles.scheduleTaskButton}
                        onPress={() => scheduleTask(task)}
                      >
                        <Text style={styles.scheduleTaskButtonText}>Add to Plan</Text>
                      </TouchableOpacity>
                    )}
                    {isScheduled && (
                      <View style={styles.scheduledBadge}>
                        <IconSymbol 
                          ios_icon_name="checkmark.circle.fill" 
                          android_material_icon_name="check-circle" 
                          size={16} 
                          color={colors.primary} 
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Schedule Workout Modal */}
      <Modal
        visible={showScheduleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Workout</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowScheduleModal(false)}
              >
                <IconSymbol 
                  ios_icon_name="xmark" 
                  android_material_icon_name="close" 
                  size={24} 
                  color={colors.text} 
                />
              </TouchableOpacity>
            </View>
            
            {selectedWorkout && (
              <>
                <Text style={styles.modalWorkoutName}>{selectedWorkout.name}</Text>
                <Text style={styles.modalWorkoutInfo}>
                  {selectedWorkout.exercises.length} exercises • ~60 minutes
                </Text>

                <Text style={styles.modalLabel}>Select Time</Text>
                <TouchableOpacity
                  style={styles.timePickerButton}
                  onPress={openTimePicker}
                >
                  <IconSymbol 
                    ios_icon_name="clock" 
                    android_material_icon_name="access-time" 
                    size={20} 
                    color={colors.text} 
                  />
                  <Text style={styles.timePickerButtonText}>
                    {`${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Schedule</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowEditModal(false)}
              >
                <IconSymbol 
                  ios_icon_name="xmark" 
                  android_material_icon_name="close" 
                  size={24} 
                  color={colors.text} 
                />
              </TouchableOpacity>
            </View>
            
            {editingItem && (
              <>
                <Text style={styles.modalWorkoutName}>{editingItem.title}</Text>
                <Text style={styles.modalWorkoutInfo}>
                  {editingItem.type === 'workout' ? 'Workout' : 'Task'}
                </Text>

                <Text style={styles.modalLabel}>Time</Text>
                <TouchableOpacity
                  style={styles.timePickerButton}
                  onPress={openTimePicker}
                >
                  <IconSymbol 
                    ios_icon_name="clock" 
                    android_material_icon_name="access-time" 
                    size={20} 
                    color={colors.text} 
                  />
                  <Text style={styles.timePickerButtonText}>
                    {`${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.modalLabel}>Duration (minutes)</Text>
                <TextInput
                  style={styles.durationInput}
                  keyboardType="number-pad"
                  placeholder="60"
                  placeholderTextColor={colors.grey}
                  value={editDuration}
                  onChangeText={setEditDuration}
                />

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={saveEditedItem}
                >
                  <Text style={styles.confirmButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </>
            )}
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
              style={styles.confirmButton}
              onPress={confirmTime}
            >
              <Text style={styles.confirmButtonText}>Confirm Time</Text>
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
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  dayCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 70,
    justifyContent: 'center',
  },
  todayCard: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
  },
  selectedCard: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  todayText: {
    color: colors.primary,
  },
  selectedText: {
    color: colors.primary,
  },
  itemCountBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  itemCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  dayViewContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dayViewHeader: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dayViewTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  dayViewDate: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  availableWorkoutCard: {
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  availableWorkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  availableWorkoutText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  availableWorkoutName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  scheduleWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  scheduleWorkoutButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  timeline: {
    gap: 0,
  },
  timeSlotRow: {
    flexDirection: 'row',
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  timeSlotLabel: {
    width: 60,
    paddingTop: 8,
    paddingRight: 12,
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timeSlotContent: {
    flex: 1,
    paddingVertical: 4,
    gap: 4,
  },
  emptyTimeSlot: {
    height: 52,
  },
  scheduledItemCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  workoutItemCard: {
    backgroundColor: colors.primary,
  },
  taskItemCard: {
    backgroundColor: '#f59e0b',
  },
  scheduledItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  scheduledItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  removeItemButton: {
    padding: 4,
  },
  scheduledItemDuration: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  unscheduledSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  unscheduledTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  unscheduledTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  unscheduledTaskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  unscheduledTaskTextContainer: {
    flex: 1,
  },
  unscheduledTaskTitle: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  unscheduledTaskTime: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
  scheduleTaskButton: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scheduleTaskButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  scheduledBadge: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.backgroundAlt,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  modalWorkoutName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  modalWorkoutInfo: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
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
    marginBottom: 20,
  },
  timePickerButtonText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '700',
  },
  durationInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  timePickerModal: {
    backgroundColor: colors.backgroundAlt,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
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
  confirmButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.grey,
  },
});
