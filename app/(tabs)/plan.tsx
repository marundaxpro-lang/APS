
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

// Time slots for the day (24-hour format)
const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00'
];

interface ScheduledItem {
  id: string;
  type: 'workout' | 'task';
  title: string;
  time: string;
  duration: number; // in minutes
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
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutDay | null>(null);
  const [selectedTime, setSelectedTime] = useState('09:00');

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

  const scheduleWorkout = (workout: WorkoutDay, time: string) => {
    const dayKey = `${workout.dayIndex}`;
    const newItem: ScheduledItem = {
      id: `workout-${Date.now()}`,
      type: 'workout',
      title: workout.name,
      time: time,
      duration: 60, // Default 60 minutes
      data: workout,
    };

    const updatedItems = {
      ...scheduledItems,
      [dayKey]: [...(scheduledItems[dayKey] || []), newItem].sort((a, b) => a.time.localeCompare(b.time)),
    };

    saveScheduledItems(updatedItems);
    setShowScheduleModal(false);
  };

  const scheduleTask = (task: WeeklyTask, time: string) => {
    const dayKey = `${task.dayOfWeek}`;
    const newItem: ScheduledItem = {
      id: `task-${Date.now()}`,
      type: 'task',
      title: task.title,
      time: time,
      duration: 30, // Default 30 minutes
      data: task,
    };

    const updatedItems = {
      ...scheduledItems,
      [dayKey]: [...(scheduledItems[dayKey] || []), newItem].sort((a, b) => a.time.localeCompare(b.time)),
    };

    saveScheduledItems(updatedItems);
  };

  const removeScheduledItem = (dayIndex: number, itemId: string) => {
    const dayKey = `${dayIndex}`;
    const updatedItems = {
      ...scheduledItems,
      [dayKey]: (scheduledItems[dayKey] || []).filter(item => item.id !== itemId),
    };
    saveScheduledItems(updatedItems);
  };

  const openScheduleModal = (workout: WorkoutDay) => {
    setSelectedWorkout(workout);
    setSelectedTime('09:00');
    setShowScheduleModal(true);
  };

  const handleItemPress = (item: ScheduledItem) => {
    if (item.type === 'workout' && item.data) {
      // Navigate to workout session
      router.push('/(tabs)/training');
    }
  };

  const dayItems = getScheduledItemsForDay(selectedDay);
  const dayWorkout = getDayWorkout(selectedDay);
  const dayTasks = getDayTasks(selectedDay);

  // Check if workout is already scheduled
  const isWorkoutScheduled = dayWorkout && dayItems.some(item => item.type === 'workout' && item.data?.name === dayWorkout.name);

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

        {/* Week Calendar */}
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

        {/* Day View - Calendar Style */}
        <View style={styles.dayViewContainer}>
          <View style={styles.dayViewHeader}>
            <Text style={styles.dayViewTitle}>
              {FULL_DAYS[selectedDay]}
            </Text>
            <Text style={styles.dayViewDate}>
              {selectedDay === new Date().getDay() ? 'Today' : ''}
            </Text>
          </View>

          {/* Available Workout for this day */}
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

          {/* Timeline View */}
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
                          onPress={() => handleItemPress(item)}
                          onLongPress={() => removeScheduledItem(selectedDay, item.id)}
                        >
                          <View style={styles.scheduledItemHeader}>
                            <IconSymbol 
                              ios_icon_name={item.type === 'workout' ? 'dumbbell.fill' : 'checkmark.circle.fill'} 
                              android_material_icon_name={item.type === 'workout' ? 'fitness-center' : 'check-circle'} 
                              size={16} 
                              color="#fff" 
                            />
                            <Text style={styles.scheduledItemTitle}>{item.title}</Text>
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

          {/* Unscheduled Tasks */}
          {dayTasks.length > 0 && (
            <View style={styles.unscheduledSection}>
              <Text style={styles.unscheduledTitle}>Unscheduled Tasks</Text>
              {dayTasks.map((task) => {
                const isScheduled = dayItems.some(item => item.type === 'task' && item.data?.id === task.id);
                if (isScheduled) return null;
                
                return (
                  <View key={task.id} style={styles.unscheduledTaskCard}>
                    <View style={styles.unscheduledTaskInfo}>
                      <IconSymbol 
                        ios_icon_name="circle" 
                        android_material_icon_name="radio-button-unchecked" 
                        size={16} 
                        color={colors.textSecondary} 
                      />
                      <Text style={styles.unscheduledTaskTitle}>{task.title}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.scheduleTaskButton}
                      onPress={() => {
                        // Quick schedule at next available time
                        const nextTime = TIME_SLOTS.find(time => {
                          const itemsAtTime = dayItems.filter(item => item.time === time);
                          return itemsAtTime.length === 0;
                        }) || '09:00';
                        scheduleTask(task, nextTime);
                      }}
                    >
                      <Text style={styles.scheduleTaskButtonText}>Schedule</Text>
                    </TouchableOpacity>
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
                <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                  {TIME_SLOTS.map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeOption,
                        selectedTime === time && styles.timeOptionSelected,
                      ]}
                      onPress={() => setSelectedTime(time)}
                    >
                      <Text style={[
                        styles.timeOptionText,
                        selectedTime === time && styles.timeOptionTextSelected,
                      ]}>
                        {time}
                      </Text>
                      {selectedTime === time && (
                        <IconSymbol 
                          ios_icon_name="checkmark.circle.fill" 
                          android_material_icon_name="check-circle" 
                          size={20} 
                          color={colors.primary} 
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => selectedWorkout && scheduleWorkout(selectedWorkout, selectedTime)}
                >
                  <Text style={styles.confirmButtonText}>Schedule Workout</Text>
                </TouchableOpacity>
              </>
            )}
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
  unscheduledTaskTitle: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
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
  timePickerScroll: {
    maxHeight: 300,
    marginBottom: 20,
  },
  timeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  timeOptionSelected: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    borderColor: colors.primary,
  },
  timeOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  timeOptionTextSelected: {
    color: colors.primary,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
