
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { FitnessProfile, WorkoutDay, WeeklyTask } from '@/types/fitness';
import { generateWorkoutSplit } from '@/data/workouts';
import ParticleBackground from '@/components/ParticleBackground';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function PlanScreen() {
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const [workoutSplit, setWorkoutSplit] = useState<WorkoutDay[]>([]);
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const today = new Date().getDay();

  useEffect(() => {
    loadProfile();
    loadWeeklyTasks();
  }, []);

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem('fitnessProfile');
      if (stored) {
        const profileData = JSON.parse(stored);
        setProfile(profileData);
        const split = generateWorkoutSplit(profileData);
        setWorkoutSplit(split);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadWeeklyTasks = async () => {
    try {
      const stored = await AsyncStorage.getItem('weeklyTasks');
      if (stored) {
        setWeeklyTasks(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading weekly tasks:', error);
    }
  };

  const handleDayPress = (dayIndex: number) => {
    setSelectedDay(dayIndex);
  };

  const getDayWorkout = (dayIndex: number): WorkoutDay | null => {
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayMap[dayIndex];
    return workoutSplit.find(w => w.day === dayName) || null;
  };

  const getDayTasks = (dayIndex: number): WeeklyTask[] => {
    return weeklyTasks.filter(t => t.dayOfWeek === dayIndex);
  };

  const selectedDayWorkout = selectedDay !== null ? getDayWorkout(selectedDay) : null;
  const selectedDayTasks = selectedDay !== null ? getDayTasks(selectedDay) : [];

  return (
    <View style={styles.container}>
      <ParticleBackground />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Weekly Plan</Text>
        <Text style={styles.subtitle}>Training & Study Schedule</Text>

        <View style={styles.weekContainer}>
          {DAYS.map((day, index) => {
            const dayIndex = index === 6 ? 0 : index + 1;
            const isToday = dayIndex === today;
            const hasWorkout = getDayWorkout(dayIndex) !== null;
            const hasTasks = getDayTasks(dayIndex).length > 0;
            const isSelected = selectedDay === dayIndex;

            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  isToday && styles.dayButtonToday,
                  isSelected && styles.dayButtonSelected,
                ]}
                onPress={() => handleDayPress(dayIndex)}
              >
                <Text style={[
                  styles.dayText,
                  (isToday || isSelected) && styles.dayTextActive
                ]}>
                  {day}
                </Text>
                <View style={styles.indicators}>
                  {hasWorkout && (
                    <View style={[styles.indicator, styles.indicatorWorkout]} />
                  )}
                  {hasTasks && (
                    <View style={[styles.indicator, styles.indicatorTask]} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedDay !== null ? (
          <View style={styles.dayDetails}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][selectedDay]}
              </Text>
              {selectedDay === today && (
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>Today</Text>
                </View>
              )}
            </View>

            {/* Workout Section */}
            {selectedDayWorkout ? (
              <View style={styles.workoutSection}>
                <View style={styles.sectionHeader}>
                  <IconSymbol 
                    ios_icon_name="dumbbell.fill" 
                    android_material_icon_name="fitness-center" 
                    size={24} 
                    color={colors.primary} 
                  />
                  <Text style={styles.sectionTitle}>Workout</Text>
                </View>

                <View style={styles.workoutCard}>
                  <Text style={styles.workoutName}>{selectedDayWorkout.name}</Text>
                  <Text style={styles.workoutMeta}>
                    {selectedDayWorkout.exercises.length} exercises • ~45 min
                  </Text>

                  <View style={styles.exerciseList}>
                    {selectedDayWorkout.exercises.map((exercise, index) => (
                      <View key={exercise.id} style={styles.exerciseItem}>
                        <View style={styles.exerciseNumber}>
                          <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                        </View>
                        <View style={styles.exerciseInfo}>
                          <Text style={styles.exerciseName}>{exercise.name}</Text>
                          <Text style={styles.exerciseDetails}>
                            {exercise.sets} × {exercise.reps}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.restSection}>
                <IconSymbol 
                  ios_icon_name="moon.stars.fill" 
                  android_material_icon_name="bedtime" 
                  size={48} 
                  color={colors.primary} 
                />
                <Text style={styles.restTitle}>Rest Day</Text>
                <Text style={styles.restText}>No workout scheduled</Text>
              </View>
            )}

            {/* Tasks Section */}
            {selectedDayTasks.length > 0 && (
              <View style={styles.tasksSection}>
                <View style={styles.sectionHeader}>
                  <IconSymbol 
                    ios_icon_name="list.bullet" 
                    android_material_icon_name="list" 
                    size={24} 
                    color="#8b5cf6" 
                  />
                  <Text style={styles.sectionTitle}>Tasks & Study</Text>
                </View>

                <View style={styles.tasksList}>
                  {selectedDayTasks.map((task) => (
                    <View key={task.id} style={styles.taskCard}>
                      <View style={styles.taskTime}>
                        <Text style={styles.taskTimeText}>{task.startTime}</Text>
                      </View>
                      <View style={styles.taskInfo}>
                        <Text style={styles.taskTitle}>{task.title}</Text>
                        <Text style={styles.taskMeta}>
                          {task.type} • {task.duration} min
                        </Text>
                      </View>
                      <View style={[
                        styles.taskTypeBadge,
                        task.type === 'study' && styles.taskTypeStudy,
                        task.type === 'work' && styles.taskTypeWork,
                      ]}>
                        <IconSymbol 
                          ios_icon_name={task.type === 'study' ? 'book.fill' : 'briefcase.fill'}
                          android_material_icon_name={task.type === 'study' ? 'menu-book' : 'work'}
                          size={16} 
                          color="#fff" 
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <IconSymbol 
              ios_icon_name="calendar" 
              android_material_icon_name="calendar-today" 
              size={64} 
              color={colors.textSecondary} 
            />
            <Text style={styles.emptyText}>Select a day to view details</Text>
          </View>
        )}
      </ScrollView>
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
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 28,
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  dayButton: {
    width: 44,
    height: 72,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dayButtonToday: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
  },
  dayButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dayTextActive: {
    color: '#fff',
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
  indicatorWorkout: {
    backgroundColor: colors.primary,
  },
  indicatorTask: {
    backgroundColor: '#8b5cf6',
  },
  dayDetails: {
    gap: 20,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  todayBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  todayBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  workoutSection: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  workoutCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  workoutName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  workoutMeta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  exerciseList: {
    gap: 10,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
  },
  exerciseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  exerciseDetails: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  restSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  restTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 4,
  },
  restText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  tasksSection: {
    gap: 16,
  },
  tasksList: {
    gap: 12,
  },
  taskCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskTime: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  taskTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  taskMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  taskTypeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskTypeStudy: {
    backgroundColor: '#8b5cf6',
  },
  taskTypeWork: {
    backgroundColor: '#f59e0b',
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
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
});
