
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { getTodaysWorkout } from '@/data/workouts';
import { IconSymbol } from '@/components/IconSymbol';
import { Exercise } from '@/types/fitness';
import { authenticatedPost } from '@/utils/api';

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const [workout, setWorkout] = useState(getTodaysWorkout(new Date().getDay()));
  const [exercises, setExercises] = useState<Exercise[]>(workout.exercises);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResting && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => {
          if (prev <= 1) {
            setIsResting(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isResting, restTimer]);

  const completeSet = async () => {
    const updatedExercises = [...exercises];
    updatedExercises[currentExerciseIndex].completed = true;
    setExercises(updatedExercises);

    if (currentExerciseIndex < exercises.length - 1) {
      setRestTimer(60);
      setIsResting(true);
      setTimeout(() => {
        setCurrentExerciseIndex(currentExerciseIndex + 1);
      }, 500);
    } else {
      // Save completed workout to backend
      try {
        const workoutData = {
          workout_type: workout.type,
          exercises: exercises.map(ex => ({
            exercise_id: ex.id,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            completed: true,
          })),
          duration_minutes: 45, // You can track actual duration
          completed_at: new Date().toISOString(),
        };
        
        await authenticatedPost('/api/workouts', workoutData);
        console.log('[Workout] Workout saved successfully');
        
        Alert.alert(
          'Workout Complete! 🎉',
          'Great job! Your workout has been saved.',
          [
            {
              text: 'Done',
              onPress: () => router.back(),
            },
          ]
        );
      } catch (error) {
        console.error('[Workout] Error saving workout:', error);
        Alert.alert(
          'Workout Complete! 🎉',
          'Great job! (Note: Could not sync to server)',
          [
            {
              text: 'Done',
              onPress: () => router.back(),
            },
          ]
        );
      }
    }
  };

  const skipRest = () => {
    setIsResting(false);
    setRestTimer(0);
  };

  const currentExercise = exercises[currentExerciseIndex];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `${workout.type} Workout`,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerBackTitle: 'Cancel',
        }}
      />
      <View style={styles.container}>
        {isResting ? (
          <View style={styles.restContainer}>
            <Text style={styles.restTitle}>Rest Time</Text>
            <Text style={styles.restTimer}>{restTimer}s</Text>
            <Text style={styles.restSubtitle}>Next: {exercises[currentExerciseIndex]?.name}</Text>
            <TouchableOpacity style={styles.skipButton} onPress={skipRest}>
              <Text style={styles.skipButtonText}>Skip Rest</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>
                Exercise {currentExerciseIndex + 1} of {exercises.length}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${((currentExerciseIndex + 1) / exercises.length) * 100}%` },
                  ]}
                />
              </View>
            </View>

            <View style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>{currentExercise.name}</Text>
              <Text style={styles.exerciseDetails}>
                {currentExercise.sets} sets × {currentExercise.reps} reps
              </Text>

              <View style={styles.setTracker}>
                {Array.from({ length: currentExercise.sets }).map((_, index) => (
                  <View key={index} style={styles.setCircle}>
                    <Text style={styles.setNumber}>{index + 1}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.completeButton} onPress={completeSet}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={24}
                  color="#ffffff"
                />
                <Text style={styles.completeButtonText}>Complete Exercise</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.upcomingSection}>
              <Text style={styles.sectionTitle}>Upcoming Exercises</Text>
              {exercises.slice(currentExerciseIndex + 1).map((exercise, index) => (
                <View key={exercise.id} style={styles.upcomingItem}>
                  <View style={styles.upcomingNumber}>
                    <Text style={styles.upcomingNumberText}>
                      {currentExerciseIndex + index + 2}
                    </Text>
                  </View>
                  <View style={styles.upcomingInfo}>
                    <Text style={styles.upcomingName}>{exercise.name}</Text>
                    <Text style={styles.upcomingDetails}>
                      {exercise.sets} × {exercise.reps}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  progressHeader: {
    marginBottom: 24,
  },
  progressText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.grey,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  exerciseCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  exerciseDetails: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  setTracker: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  setCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  completeButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  restContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  restTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 16,
  },
  restTimer: {
    fontSize: 96,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 16,
  },
  restSubtitle: {
    fontSize: 18,
    color: colors.text,
    marginBottom: 32,
    textAlign: 'center',
  },
  skipButton: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  upcomingSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  upcomingNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.grey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  upcomingDetails: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
