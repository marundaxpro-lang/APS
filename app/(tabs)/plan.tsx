
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
import { generateWorkoutSplit } from '@/data/workouts';
import ParticleBackground from '@/components/ParticleBackground';
import { FitnessProfile, WorkoutDay, WeeklyTask } from '@/types/fitness';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PlanScreen() {
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const [workoutSplit, setWorkoutSplit] = useState<WorkoutDay[]>([]);
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  useEffect(() => {
    loadProfile();
    loadWeeklyTasks();
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
    const workout = getDayWorkout(dayIndex);
    const today = new Date().getDay();
    
    if (dayIndex !== today && workout) {
      // Show warning if clicking on a different day
      console.log('Warning: This is not today\'s workout');
    }
    
    setSelectedDay(dayIndex);
  };

  const getDayWorkout = (dayIndex: number): WorkoutDay | null => {
    return workoutSplit.find(day => day.dayIndex === dayIndex) || null;
  };

  const getDayTasks = (dayIndex: number): WeeklyTask[] => {
    return weeklyTasks.filter(task => task.dayOfWeek === dayIndex);
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
            {DAYS[selectedDay]} - {selectedDay === new Date().getDay() ? 'Today' : 'Upcoming'}
          </Text>

          {/* Workout for selected day */}
          {getDayWorkout(selectedDay) ? (
            <View style={styles.workoutCard}>
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
                  </View>
                ))}
                {(getDayWorkout(selectedDay)?.exercises.length || 0) > 3 && (
                  <Text style={styles.moreText}>
                    +{(getDayWorkout(selectedDay)?.exercises.length || 0) - 3} more exercises
                  </Text>
                )}
              </View>
            </View>
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
                  <View key={task.id} style={styles.taskItem}>
                    <IconSymbol 
                      ios_icon_name={task.completed ? "checkmark.circle.fill" : "circle"}
                      android_material_icon_name={task.completed ? "check-circle" : "radio-button-unchecked"}
                      size={20} 
                      color={task.completed ? colors.primary : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.taskText,
                      task.completed && styles.taskCompleted
                    ]}>
                      {task.title}
                    </Text>
                  </View>
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
  moreText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
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
  taskText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
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
});
