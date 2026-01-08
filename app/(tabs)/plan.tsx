
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
import { FitnessProfile, WorkoutDay } from '@/types/fitness';
import { generateWorkoutSplit } from '@/data/workouts';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function PlanScreen() {
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const [workoutSplit, setWorkoutSplit] = useState<WorkoutDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const today = new Date().getDay();

  useEffect(() => {
    loadProfile();
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

  const handleDayPress = (dayIndex: number) => {
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayMap[dayIndex];
    const workout = workoutSplit.find(w => w.day === dayName);
    
    if (workout) {
      setSelectedDay(workout);
    } else {
      setSelectedDay({ day: dayName, type: 'Rest Day', exercises: [] });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Weekly Plan</Text>

      <View style={styles.weekContainer}>
        {DAYS.map((day, index) => {
          const dayIndex = index === 6 ? 0 : index + 1; // Adjust for Sunday
          const isToday = dayIndex === today;
          const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const hasWorkout = workoutSplit.some(w => w.day === dayMap[dayIndex]);

          return (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayButton,
                isToday && styles.dayButtonToday,
                selectedDay?.day === dayMap[dayIndex] && styles.dayButtonSelected,
              ]}
              onPress={() => handleDayPress(dayIndex)}
            >
              <Text style={[styles.dayText, isToday && styles.dayTextToday]}>
                {day}
              </Text>
              {hasWorkout && (
                <View style={[styles.indicator, isToday && styles.indicatorToday]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedDay && (
        <View style={styles.workoutCard}>
          <View style={styles.workoutHeader}>
            <Text style={styles.workoutDay}>{selectedDay.day}</Text>
            <Text style={styles.workoutType}>{selectedDay.type}</Text>
          </View>

          {selectedDay.exercises.length > 0 ? (
            <View style={styles.exerciseList}>
              {selectedDay.exercises.map((exercise, index) => (
                <View key={exercise.id} style={styles.exerciseItem}>
                  <View style={styles.exerciseNumber}>
                    <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.exerciseDetails}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseInfo}>
                      {exercise.sets} sets × {exercise.reps} reps • Rest: {exercise.restTime}s
                    </Text>
                  </View>
                  <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={20} color={colors.textSecondary} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.restDay}>
              <IconSymbol ios_icon_name="moon.stars.fill" android_material_icon_name="bedtime" size={48} color={colors.primary} />
              <Text style={styles.restDayText}>Rest Day</Text>
              <Text style={styles.restDaySubtext}>Recovery is just as important as training</Text>
            </View>
          )}
        </View>
      )}

      {!selectedDay && (
        <View style={styles.emptyState}>
          <IconSymbol ios_icon_name="calendar" android_material_icon_name="calendar-today" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Select a day to view workout details</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dayButton: {
    width: 44,
    height: 64,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayTextToday: {
    color: colors.primary,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textSecondary,
    marginTop: 4,
  },
  indicatorToday: {
    backgroundColor: colors.primary,
  },
  workoutCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  workoutHeader: {
    marginBottom: 20,
  },
  workoutDay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  workoutType: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  exerciseList: {
    gap: 12,
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
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  exerciseDetails: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  exerciseInfo: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  restDay: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  restDayText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  restDaySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
});
