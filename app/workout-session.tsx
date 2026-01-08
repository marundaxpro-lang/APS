
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { FitnessProfile, Exercise } from '@/types/fitness';
import { getTodaysWorkout } from '@/data/workouts';

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restTimer, setRestTimer] = useState(0);

  useEffect(() => {
    loadWorkout();
  }, []);

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

  const loadWorkout = async () => {
    try {
      const stored = await AsyncStorage.getItem('fitnessProfile');
      if (stored) {
        const profile: FitnessProfile = JSON.parse(stored);
        const workout = getTodaysWorkout(profile);
        if (workout) {
          setExercises(workout.exercises);
        }
      }
    } catch (error) {
      console.error('Error loading workout:', error);
    }
  };

  const completeSet = () => {
    const currentExercise = exercises[currentExerciseIndex];
    setIsResting(true);
    setRestTimer(currentExercise.restTime);

    // Move to next exercise after rest
    setTimeout(() => {
      if (currentExerciseIndex < exercises.length - 1) {
        setCurrentExerciseIndex(currentExerciseIndex + 1);
      } else {
        Alert.alert('Workout Complete!', 'Great job! 🎉', [
          { text: 'Finish', onPress: () => router.back() },
        ]);
      }
    }, currentExercise.restTime * 1000);
  };

  const skipRest = () => {
    setIsResting(false);
    setRestTimer(0);
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    }
  };

  if (exercises.length === 0) {
    return <View style={styles.container}><Text style={styles.text}>Loading...</Text></View>;
  }

  const currentExercise = exercises[currentExerciseIndex];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Workout Session',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.progressContainer}>
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
            <Text style={styles.exerciseInfo}>
              {currentExercise.sets} sets × {currentExercise.reps} reps
            </Text>
          </View>

          {isResting ? (
            <View style={styles.restCard}>
              <IconSymbol ios_icon_name="timer" android_material_icon_name="timer" size={64} color={colors.primary} />
              <Text style={styles.restTitle}>Rest Time</Text>
              <Text style={styles.restTimer}>{restTimer}s</Text>
              <TouchableOpacity style={styles.skipButton} onPress={skipRest}>
                <Text style={styles.skipButtonText}>Skip Rest</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.completeButton} onPress={completeSet}>
              <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check-circle" size={24} color="#fff" />
              <Text style={styles.completeButtonText}>Complete Set</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
  },
  text: {
    color: colors.text,
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  exerciseCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  exerciseInfo: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  restCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  restTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  restTimer: {
    fontSize: 64,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 24,
  },
  skipButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  completeButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  completeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
});
