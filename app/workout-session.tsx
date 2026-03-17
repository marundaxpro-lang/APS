
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
  Modal,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useVideoPlayer, VideoView } from 'expo-video';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { Exercise, WorkoutDay } from '@/types/fitness';
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
    confettiPieces.forEach((piece) => {
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
  }, [confettiPieces]);

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
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);

  // Video player for exercise demonstrations
  const currentExercise = exercises[currentExerciseIndex];
  const videoSource = currentExercise?.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  
  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = true;
  });

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
      console.log('[WorkoutSession] Loading workout from AsyncStorage');
      
      // Try to load the selected workout first
      const selectedWorkoutData = await AsyncStorage.getItem('selectedWorkout');
      
      if (selectedWorkoutData) {
        const workout: WorkoutDay = JSON.parse(selectedWorkoutData);
        console.log('[WorkoutSession] Loaded selected workout:', workout.name);
        setExercises(workout.exercises);
        setLoading(false);
        return;
      }
      
      console.log('[WorkoutSession] No selected workout found');
      setLoading(false);
    } catch (error) {
      console.error('[WorkoutSession] Error loading workout:', error);
      setLoading(false);
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
          // Workout completed! Save to backend
          saveWorkoutToBackend();
          
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

  const saveWorkoutToBackend = async () => {
    try {
      const { authenticatedPost } = await import('@/utils/api');
      
      const workoutData = {
        date: new Date().toISOString().split('T')[0],
        exercises: exercises.map(ex => ({
          exercise_id: ex.id,
          exercise_name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          completed: completedExercises.has(ex.id),
        })),
        duration_minutes: Math.floor((Date.now() - Date.now()) / 60000), // Placeholder
        completed: true,
      };
      
      await authenticatedPost('/api/workouts', workoutData);
      console.log('[WorkoutSession] Workout saved to backend');
    } catch (error) {
      console.error('[WorkoutSession] Error saving workout to backend:', error);
      // Continue anyway - workout is completed
    }
  };

  const skipRest = () => {
    setIsResting(false);
    setRestTimer(60);
  };

  const openVideoModal = () => {
    setShowVideoModal(true);
    player.play();
  };

  const closeVideoModal = () => {
    setShowVideoModal(false);
    player.pause();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <ParticleBackground />
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Loading workout...</Text>
        </View>
      </View>
    );
  }

  if (exercises.length === 0) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <ParticleBackground />
        <View style={styles.centered}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="warning"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyText}>No workout loaded</Text>
          <Text style={styles.emptySubtext}>
            Please select a workout from the Training screen
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
                {currentExercise.muscleGroups?.join(', ') || 'Full Body'}
              </Text>
            </View>
          </View>

          {/* Video Demo Button */}
          <TouchableOpacity 
            style={styles.videoPlaceholder}
            onPress={openVideoModal}
          >
            <IconSymbol
              ios_icon_name="play.circle.fill"
              android_material_icon_name="play-circle-filled"
              size={64}
              color={colors.primary}
            />
            <Text style={styles.videoText}>Watch Exercise Demo</Text>
            <Text style={styles.videoSubtext}>
              Learn proper form and technique
            </Text>
          </TouchableOpacity>

          {/* Set Counter */}
          <View style={styles.setCounter}>
            <Text style={styles.setLabel}>Current Set</Text>
            <Text style={styles.setNumber}>
              {currentSet} / {currentExercise.sets}
            </Text>
            <Text style={styles.repsText}>{currentExercise.reps} reps</Text>
          </View>

          {/* Action Button */}
          {!isResting ? (
            <TouchableOpacity style={styles.completeButton} onPress={() => {
              console.log('[WorkoutSession] User pressed Complete Set/Exercise');
              completeSet();
            }}>
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
              <Text style={styles.restTitle}>RECOVERY RESET</Text>
              <Text style={styles.restContextLine}>Let your system rebuild.</Text>
              <Text style={styles.restTimer}>{restTimer}s</Text>
              <TouchableOpacity style={styles.skipButton} onPress={() => {
                console.log('[WorkoutSession] User pressed End Session (skip rest)');
                skipRest();
              }}>
                <Text style={styles.skipButtonText}>End Session</Text>
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

      {/* Video Modal */}
      <Modal
        visible={showVideoModal}
        transparent
        animationType="fade"
        onRequestClose={closeVideoModal}
      >
        <View style={styles.videoModal}>
          <View style={styles.videoModalContent}>
            <View style={styles.videoModalHeader}>
              <Text style={styles.videoModalTitle}>{currentExercise.name}</Text>
              <TouchableOpacity onPress={closeVideoModal}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={32}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>
            
            <VideoView
              style={styles.video}
              player={player}
              allowsFullscreen
              allowsPictureInPicture
              nativeControls
            />

            <View style={styles.videoInfo}>
              <Text style={styles.videoInfoTitle}>Key Points:</Text>
              <Text style={styles.videoInfoText}>
                • Maintain proper form throughout the movement{'\n'}
                • Control the weight on both concentric and eccentric phases{'\n'}
                • Breathe consistently - exhale on exertion{'\n'}
                • Focus on the target muscle group
              </Text>
            </View>
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
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  videoText: {
    fontSize: 16,
    fontWeight: '700',
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
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  restContextLine: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    fontStyle: 'italic',
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
  videoModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    padding: 20,
  },
  videoModalContent: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  videoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  videoModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  videoInfo: {
    padding: 20,
  },
  videoInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  videoInfoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
