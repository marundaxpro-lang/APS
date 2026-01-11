
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
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

export default function PlanScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const [workoutSplit, setWorkoutSplit] = useState<WorkoutDay[]>([]);
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutDay | null>(null);

  useEffect(() => {
    loadProfile();
    loadWeeklyTasks();
  }, []);

  useEffect(() => {
    // Reload tasks when screen comes into focus
    const interval = setInterval(() => {
      loadWeeklyTasks();
    }, 1000);

    return () => clearInterval(interval);
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

  const handleDayPress = (dayIndex: number) => {
    setSelectedDay(dayIndex);
  };

  const handleWorkoutPress = (workout: WorkoutDay) => {
    const today = new Date().getDay();
    
    if (workout.dayIndex === today) {
      // Navigate to training screen to start workout
      router.push('/(tabs)/training');
    } else {
      // Show workout details in modal
      setSelectedWorkout(workout);
      setShowWorkoutModal(true);
    }
  };

  const getDayWorkout = (dayIndex: number): WorkoutDay | null => {
    return workoutSplit.find(day => day.dayIndex === dayIndex) || null;
  };

  const getDayTasks = (dayIndex: number): WeeklyTask[] => {
    return weeklyTasks.filter(task => task.dayOfWeek === dayIndex);
  };

  const toggleTask = async (taskId: string) => {
    const updatedTasks = weeklyTasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setWeeklyTasks(updatedTasks);
    try {
      await AsyncStorage.setItem('focusTasks', JSON.stringify(updatedTasks));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ParticleBackground />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Weekly Plan</Text>
          <Text style={styles.subtitle}>Your training schedule and tasks</Text>
        </View>

        {/* Week Calendar */}
        <View style={styles.weekContainer}>
          {DAYS.map((day, index) => {
            const isToday = index === new Date().getDay();
            const isSelected = index === selectedDay;
            const hasWorkout = getDayWorkout(index) !== null;
            const hasTasks = getDayTasks(index).length > 0;

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
                <View style={styles.indicators}>
                  {hasWorkout && (
                    <View style={[styles.indicator, styles.workoutIndicator]} />
                  )}
                  {hasTasks && (
                    <View style={[styles.indicator, styles.taskIndicator]} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Day Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>
            {FULL_DAYS[selectedDay]} - {selectedDay === new Date().getDay() ? 'Today' : 'Upcoming'}
          </Text>

          {/* Workout for selected day */}
          {getDayWorkout(selectedDay) ? (
            <TouchableOpacity 
              style={styles.workoutCard}
              onPress={() => {
                const workout = getDayWorkout(selectedDay);
                if (workout) handleWorkoutPress(workout);
              }}
            >
              <View style={styles.cardHeader}>
                <IconSymbol 
                  ios_icon_name="dumbbell.fill" 
                  android_material_icon_name="fitness-center" 
                  size={24} 
                  color={colors.primary} 
                />
                <Text style={styles.cardTitle}>
                  {getDayWorkout(selectedDay)?.name}
                </Text>
              </View>
              <Text style={styles.exerciseCount}>
                {getDayWorkout(selectedDay)?.exercises.length} exercises
              </Text>
              <View style={styles.exerciseList}>
                {getDayWorkout(selectedDay)?.exercises.slice(0, 3).map((exercise, idx) => (
                  <View key={exercise.id} style={styles.exerciseItem}>
                    <Text style={styles.exerciseNumber}>{idx + 1}</Text>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseReps}>{exercise.sets}×{exercise.reps}</Text>
                  </View>
                ))}
                {(getDayWorkout(selectedDay)?.exercises.length || 0) > 3 && (
                  <Text style={styles.moreText}>
                    +{(getDayWorkout(selectedDay)?.exercises.length || 0) - 3} more exercises
                  </Text>
                )}
              </View>
              <View style={styles.viewDetailsButton}>
                <Text style={styles.viewDetailsText}>
                  {selectedDay === new Date().getDay() ? 'Start Workout' : 'View Details'}
                </Text>
                <IconSymbol 
                  ios_icon_name="chevron.right" 
                  android_material_icon_name="chevron-right" 
                  size={20} 
                  color={colors.primary} 
                />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.restCard}>
              <IconSymbol 
                ios_icon_name="bed.double.fill" 
                android_material_icon_name="hotel" 
                size={32} 
                color={colors.textSecondary} 
              />
              <Text style={styles.restText}>Rest Day</Text>
              <Text style={styles.restSubtext}>Recovery is important!</Text>
              
              {/* Show other workouts available */}
              {workoutSplit.length > 0 && (
                <View style={styles.otherWorkoutsSection}>
                  <Text style={styles.otherWorkoutsTitle}>View Other Workouts:</Text>
                  <View style={styles.otherWorkoutsList}>
                    {workoutSplit.slice(0, 3).map((workout) => (
                      <TouchableOpacity
                        key={workout.dayIndex}
                        style={styles.otherWorkoutChip}
                        onPress={() => {
                          setSelectedWorkout(workout);
                          setShowWorkoutModal(true);
                        }}
                      >
                        <Text style={styles.otherWorkoutText}>{workout.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Tasks for selected day */}
          {getDayTasks(selectedDay).length > 0 && (
            <View style={styles.tasksCard}>
              <View style={styles.cardHeader}>
                <IconSymbol 
                  ios_icon_name="checklist" 
                  android_material_icon_name="check-circle" 
                  size={24} 
                  color="#f59e0b" 
                />
                <Text style={styles.cardTitle}>Tasks</Text>
              </View>
              <View style={styles.tasksList}>
                {getDayTasks(selectedDay).map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.taskItem}
                    onPress={() => toggleTask(task.id)}
                  >
                    <IconSymbol 
                      ios_icon_name={task.completed ? "checkmark.circle.fill" : "circle"}
                      android_material_icon_name={task.completed ? "check-circle" : "radio-button-unchecked"}
                      size={20} 
                      color={task.completed ? colors.primary : colors.textSecondary} 
                    />
                    <View style={styles.taskTextContainer}>
                      <Text style={[
                        styles.taskText,
                        task.completed && styles.taskCompleted
                      ]}>
                        {task.title}
                      </Text>
                      {task.startTime && (
                        <Text style={styles.taskTimeText}>{task.startTime}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Weekly Summary */}
        {profile && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Weekly Summary</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <IconSymbol 
                  ios_icon_name="calendar" 
                  android_material_icon_name="calendar-today" 
                  size={20} 
                  color={colors.primary} 
                />
                <Text style={styles.summaryValue}>{profile.trainingDays}</Text>
                <Text style={styles.summaryLabel}>Training Days</Text>
              </View>
              <View style={styles.summaryItem}>
                <IconSymbol 
                  ios_icon_name="flame.fill" 
                  android_material_icon_name="local-fire-department" 
                  size={20} 
                  color="#f59e0b" 
                />
                <Text style={styles.summaryValue}>{workoutSplit.length}</Text>
                <Text style={styles.summaryLabel}>Workouts</Text>
              </View>
              <View style={styles.summaryItem}>
                <IconSymbol 
                  ios_icon_name="checkmark.circle.fill" 
                  android_material_icon_name="check-circle" 
                  size={20} 
                  color="#8b5cf6" 
                />
                <Text style={styles.summaryValue}>{weeklyTasks.length}</Text>
                <Text style={styles.summaryLabel}>Tasks</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Workout Details Modal */}
      <Modal
        visible={showWorkoutModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWorkoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedWorkout?.name}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowWorkoutModal(false)}
              >
                <IconSymbol 
                  ios_icon_name="xmark" 
                  android_material_icon_name="close" 
                  size={24} 
                  color={colors.text} 
                />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSubtitle}>
                {selectedWorkout?.exercises.length} exercises • {FULL_DAYS[selectedWorkout?.dayIndex || 0]}
              </Text>
              
              <View style={styles.exerciseDetailsList}>
                {selectedWorkout?.exercises.map((exercise, idx) => (
                  <View key={exercise.id} style={styles.exerciseDetailCard}>
                    <View style={styles.exerciseDetailHeader}>
                      <Text style={styles.exerciseDetailNumber}>{idx + 1}</Text>
                      <View style={styles.exerciseDetailInfo}>
                        <Text style={styles.exerciseDetailName}>{exercise.name}</Text>
                        <Text style={styles.exerciseDetailSets}>
                          {exercise.sets} sets × {exercise.reps} reps
                        </Text>
                      </View>
                    </View>
                    {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
                      <View style={styles.muscleGroupTags}>
                        {exercise.muscleGroups.map((muscle, i) => (
                          <View key={i} style={styles.muscleTag}>
                            <Text style={styles.muscleTagText}>{muscle}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowWorkoutModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
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
    marginBottom: 28,
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
    marginBottom: 28,
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
    marginBottom: 8,
  },
  todayText: {
    color: colors.primary,
  },
  selectedText: {
    color: colors.primary,
  },
  indicators: {
    flexDirection: 'row',
    gap: 4,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  workoutIndicator: {
    backgroundColor: colors.primary,
  },
  taskIndicator: {
    backgroundColor: '#f59e0b',
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  workoutCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  exerciseCount: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  exerciseList: {
    gap: 10,
    marginBottom: 16,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
  },
  exerciseName: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  exerciseReps: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  moreText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  restCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    marginBottom: 16,
  },
  restText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  restSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  otherWorkoutsSection: {
    width: '100%',
    marginTop: 8,
  },
  otherWorkoutsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  otherWorkoutsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  otherWorkoutChip: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  otherWorkoutText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  tasksCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tasksList: {
    gap: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskTextContainer: {
    flex: 1,
  },
  taskText: {
    fontSize: 14,
    color: colors.text,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  taskTimeText: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    gap: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  modalScroll: {
    maxHeight: '70%',
  },
  exerciseDetailsList: {
    gap: 12,
  },
  exerciseDetailCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  exerciseDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  exerciseDetailNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
  },
  exerciseDetailInfo: {
    flex: 1,
  },
  exerciseDetailName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  exerciseDetailSets: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  muscleGroupTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  muscleTag: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  muscleTagText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  closeModalButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  closeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
