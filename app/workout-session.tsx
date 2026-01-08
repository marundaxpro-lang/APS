
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { FitnessProfile, Exercise } from '@/types/fitness';
import { getTodaysWorkout } from '@/data/workouts';
import ParticleBackground from '@/components/ParticleBackground';

// Confetti component
function ConfettiExplosion() {
  const [confettiPieces] = useState(() =>
    Array.from({ length: 50 }, () => ({
      x: new Animated.Value(Math.random() * 400 - 200),
      y: new Animated.Value(-100),
      rotation: new Animated.Value(0),
      scale: new Animated.Value(1),
      color: ['#459b9b', '#f59e0b', '#8b5cf6', '#ec4899', '#4ade80'][
        Math.floor(Math.random() * 5)
      ],
    }))
  );

  useEffect(() => {
    confettiPieces.forEach((piece, index) => {
      Animated.parallel([
        Animated.timing(piece.y, {
          toValue: 800,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(piece.rotation, {
          toValue: Math.random() * 720 - 360,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(piece.scale, {
            toValue: 1.5,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(piece.scale, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  }, []);

  return (
    <View style={styles.confettiContainer} pointerEvents="none">
      {confettiPieces.map((piece, index) => (
        <Animated.View
          key={index}
          style={[
            styles.confettiPiece,
            {
              backgroundColor: piece.color,
              transform: [
                { translateX: piece.x },
                { translateY: piece.y },
                {
                  rotate: piece.rotation.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
                { scale: piece.scale },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [restTimer, setRestTimer] = useState(60);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    loadWorkout();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResting && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => prev - 1);
      }, 1000);
    } else if (restTimer === 0) {
      setIsResting(false);
      setRestTimer(60);
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
    
    if (currentSet < currentExercise.sets) {
      // Move to next set
      setCurrentSet(currentSet + 1);
      setIsResting(true);
      setRestTimer(60);
    } else {
      // Exercise completed - show confetti!
      setShowConfetti(true);
      setCompletedExercises(new Set([...completedExercises, currentExercise.id]));
      
      setTimeout(() => {
        setShowConfetti(false);
        
        if (currentExerciseIndex < exercises.length - 1) {
          // Move to next exercise
          setCurrentExerciseIndex(currentExerciseIndex + 1);
          setCurrentSet(1);
        } else {
          // Workout completed!
          Alert.alert(
            '🎉 Workout Complete!',
            'Amazing work! You crushed it today!',
            [
              {
                text: 'Finish',
                onPress: () => router.back(),
              },
            ]
          );
        }
      }, 2000);
    }
  };

  const skipRest = () => {
    setIsResting(false);
    setRestTimer(60);
  };

  if (exercises.length === 0) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <ParticleBackground />
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No workout loaded</Text>
        </View>
      </View>
    );
  }

  const currentExercise = exercises[currentExerciseIndex];
  const progress = ((currentExerciseIndex + (currentSet / currentExercise.sets)) / exercises.length) * 100;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Workout Session',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <ParticleBackground />
      
      {showConfetti && <ConfettiExplosion />}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Exercise {currentExerciseIndex + 1} of {exercises.length}
          </Text>
        </View>

        {/* Current Exercise */}
        <View style={styles.exerciseCard}>
          <View style={styles.exerciseHeader}>
            <View style={styles.exerciseNumber}>
              <Text style={styles.exerciseNumberText}>
                {currentExerciseIndex + 1}
              </Text>
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{currentExercise.name}</Text>
              <Text style={styles.exerciseMeta}>
                {currentExercise.muscleGroup} • {currentExercise.difficulty}
              </Text>
            </View>
          </View>

          {/* Video/Demo Placeholder */}
          <View style={styles.videoPlaceholder}>
            <IconSymbol
              ios_icon_name="play.circle.fill"
              android_material_icon_name="play-circle-filled"
              size={64}
              color={colors.primary}
            />
            <Text style={styles.videoText}>Exercise Demonstration</Text>
            <Text style={styles.videoSubtext}>
              Tap to watch proper form video
            </Text>
          </View>

          {/* Set Counter */}
          <View style={styles.setCounter}>
            <Text style={styles.setLabel}>Current Set</Text>
            <Text style={styles.setNumber}>
              {currentSet} / {currentExercise.sets}
            </Text>
            <Text style={styles.repsText}>{currentExercise.reps} reps</Text>
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>Instructions</Text>
            {currentExercise.instructions.map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <Text style={styles.instructionBullet}>{index + 1}.</Text>
                <Text style={styles.instructionText}>{instruction}</Text>
              </View>
            ))}
          </View>

          {/* Action Button */}
          {!isResting ? (
            <TouchableOpacity style={styles.completeButton} onPress={completeSet}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={24}
                color="#fff"
              />
              <Text style={styles.completeButtonText}>
                {currentSet < currentExercise.sets
                  ? 'Complete Set'
                  : 'Complete Exercise'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.restContainer}>
              <Text style={styles.restTitle}>Rest Time</Text>
              <Text style={styles.restTimer}>{restTimer}s</Text>
              <TouchableOpacity style={styles.skipButton} onPress={skipRest}>
                <Text style={styles.skipButtonText}>Skip Rest</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Exercise List */}
        <View style={styles.exerciseList}>
          <Text style={styles.listTitle}>Workout Overview</Text>
          {exercises.map((exercise, index) => (
            <View
              key={exercise.id}
              style={[
                styles.listItem,
                index === currentExerciseIndex && styles.listItemActive,
                completedExercises.has(exercise.id) && styles.listItemCompleted,
              ]}
            >
              <View style={styles.listNumber}>
                {completedExercises.has(exercise.id) ? (
                  <IconSymbol
                    ios_icon_name="checkmark"
                    android_material_icon_name="check"
                    size={16}
                    color="#fff"
                  />
                ) : (
                  <Text style={styles.listNumberText}>{index + 1}</Text>
                )}
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listName}>{exercise.name}</Text>
                <Text style={styles.listMeta}>
                  {exercise.sets} × {exercise.reps}
                </Text>
              </View>
            </View>
          ))}
        </View>
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
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  exerciseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 24,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  exerciseNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseNumberText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  exerciseMeta: {
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  videoPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  videoText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  videoSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  setCounter: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 20,
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
    borderRadius: 16,
  },
  setLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  setNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  repsText: {
    fontSize: 16,
    color: colors.text,
  },
  instructions: {
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  instructionBullet: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  completeButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  restContainer: {
    alignItems: 'center',
    padding: 20,
  },
  restTitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  restTimer: {
    fontSize: 64,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 20,
  },
  skipButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  exerciseList: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  listItemActive: {
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  listItemCompleted: {
    opacity: 0.5,
  },
  listNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  listMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    alignItems: 'center',
  },
  confettiPiece: {
    position: 'absolute',
    width: 10,
    height: 10,
    top: '50%',
  },
});
