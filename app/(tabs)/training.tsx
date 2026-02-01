
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/IconSymbol';
import ParticleBackground from '@/components/ParticleBackground';
import { colors } from '@/styles/commonStyles';
import { getTodaysWorkout, generateWorkoutSplit } from '@/data/workouts';
import { FitnessProfile, WorkoutDay } from '@/types/fitness';

export default function TrainingScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const [todaysWorkout, setTodaysWorkout] = useState<WorkoutDay | null>(null);
  const [weeklyWorkouts, setWeeklyWorkouts] = useState<WorkoutDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);

  const loadWorkout = useCallback(async () => {
    try {
      // First try to load from backend to get the latest profile
      try {
        const { authenticatedGet } = await import('@/utils/api');
        const backendProfile = await authenticatedGet('/api/fitness-profile');
        
        if (backendProfile) {
          console.log('[Training] Raw backend profile:', backendProfile);
          
          // Map backend field names to frontend field names
          // Backend uses: trainingFrequency, activityLevel, focusAreas, equipmentType
          // Frontend uses: trainingDays, activityLevel, focusAreas, equipmentType
          
          // Provide sensible defaults based on gender if fields are missing
          const defaultFocusAreas = backendProfile.gender === 'female' 
            ? ['Glutes', 'Legs', 'Core'] 
            : ['Chest', 'Back', 'Arms'];
          
          const mappedProfile: FitnessProfile = {
            name: backendProfile.name || undefined,
            gender: backendProfile.gender || 'male',
            age: backendProfile.age || 25,
            trainingDays: backendProfile.trainingFrequency || backendProfile.trainingDays || 3,
            focusAreas: Array.isArray(backendProfile.focusAreas) && backendProfile.focusAreas.length > 0
              ? backendProfile.focusAreas 
              : defaultFocusAreas,
            equipmentType: backendProfile.equipmentType || 'gym',
            goal: backendProfile.goal || 'muscle',
            weight: backendProfile.weight || 70,
            height: backendProfile.height || 175,
          };
          
          console.log('[Training] Mapped profile for workout generation:', mappedProfile);
          console.log('[Training] Profile has required fields:', {
            gender: mappedProfile.gender,
            trainingDays: mappedProfile.trainingDays,
            focusAreas: mappedProfile.focusAreas,
            equipmentType: mappedProfile.equipmentType,
          });
          
          setProfile(mappedProfile);
          await AsyncStorage.setItem('fitnessProfile', JSON.stringify(mappedProfile));
          
          // Generate weekly workout split with the complete profile
          const weeklyWorkoutSplit = generateWorkoutSplit(mappedProfile);
          console.log('[Training] Generated weekly workout split:', weeklyWorkoutSplit);
          setWeeklyWorkouts(weeklyWorkoutSplit);
          
          // Get today's workout
          const workout = getTodaysWorkout(mappedProfile);
          console.log('[Training] Today\'s workout:', workout);
          setTodaysWorkout(workout);
          
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('[Training] Error loading profile from backend:', error);
        console.log('[Training] Falling back to local storage');
      }
      
      // Fallback to local storage
      const storedProfile = await AsyncStorage.getItem('fitnessProfile');
      if (!storedProfile) {
        router.replace('/onboarding');
        return;
      }

      const profileData: FitnessProfile = JSON.parse(storedProfile);
      console.log('[Training] Profile from local storage:', profileData);
      setProfile(profileData);

      // Generate weekly workout split
      const weeklyWorkoutSplit = generateWorkoutSplit(profileData);
      console.log('[Training] Generated weekly workout split:', weeklyWorkoutSplit);
      setWeeklyWorkouts(weeklyWorkoutSplit);

      // Get today's workout
      const workout = getTodaysWorkout(profileData);
      console.log('[Training] Today\'s workout:', workout);
      setTodaysWorkout(workout);
    } catch (error) {
      console.error('[Training] Error loading workout:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  const handleViewWeeklyWorkouts = () => {
    console.log('[Training] User tapped View Weekly Workouts button');
    setShowWeeklyModal(true);
  };

  const handleSelectWorkout = async (workout: WorkoutDay) => {
    console.log('[Training] User selected workout:', workout.name);
    setTodaysWorkout(workout);
    setShowWeeklyModal(false);
    
    // Save the selected workout to AsyncStorage so workout-session can load it
    try {
      await AsyncStorage.setItem('selectedWorkout', JSON.stringify(workout));
      console.log('[Training] Selected workout saved to AsyncStorage');
    } catch (error) {
      console.error('[Training] Error saving selected workout:', error);
    }
  };

  const handleStartWorkout = async () => {
    console.log('[Training] User tapped Start Workout button');
    
    if (todaysWorkout) {
      // Save the workout to AsyncStorage before navigating
      try {
        await AsyncStorage.setItem('selectedWorkout', JSON.stringify(todaysWorkout));
        console.log('[Training] Workout saved to AsyncStorage before starting session');
      } catch (error) {
        console.error('[Training] Error saving workout:', error);
      }
    }
    
    router.push('/workout-session');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ParticleBackground />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!todaysWorkout) {
    return (
      <View style={styles.container}>
        <ParticleBackground />
        <View style={styles.emptyContainer}>
          <IconSymbol
            ios_icon_name="calendar.badge.exclamationmark"
            android_material_icon_name="event-busy"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyTitle}>No Workout Today</Text>
          <Text style={styles.emptySubtitle}>
            Rest day! Your body needs recovery too.
          </Text>
          <TouchableOpacity
            style={styles.planButton}
            onPress={handleViewWeeklyWorkouts}
          >
            <Text style={styles.planButtonText}>View All Workouts</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showWeeklyModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Weekly Workouts</Text>
              <TouchableOpacity onPress={() => setShowWeeklyModal(false)}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="close"
                  size={28}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {weeklyWorkouts.map((workout, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.workoutCard}
                  onPress={() => handleSelectWorkout(workout)}
                >
                  <View style={styles.workoutCardHeader}>
                    <View>
                      <Text style={styles.workoutDay}>{workout.day}</Text>
                      <Text style={styles.workoutName}>{workout.name}</Text>
                    </View>
                    <View style={styles.workoutBadge}>
                      <Text style={styles.workoutBadgeText}>
                        {workout.exercises.length} exercises
                      </Text>
                    </View>
                  </View>
                  <View style={styles.exercisePreview}>
                    {workout.exercises.slice(0, 3).map((exercise, idx) => (
                      <Text key={idx} style={styles.exercisePreviewText}>
                        • {exercise.name}
                      </Text>
                    ))}
                    {workout.exercises.length > 3 && (
                      <Text style={styles.exercisePreviewMore}>
                        +{workout.exercises.length - 3} more
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ParticleBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.subtitle}>Today&apos;s Workout</Text>
            <Text style={styles.title}>{todaysWorkout.name}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {todaysWorkout.exercises.length} exercises
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartWorkout}
        >
          <IconSymbol
            ios_icon_name="play.fill"
            android_material_icon_name="play-arrow"
            size={24}
            color="#fff"
          />
          <Text style={styles.startButtonText}>Start Workout</Text>
        </TouchableOpacity>

        <View style={styles.exerciseList}>
          <Text style={styles.listTitle}>Exercise List</Text>
          {todaysWorkout.exercises.map((exercise, index) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <View style={styles.exerciseNumber}>
                <Text style={styles.exerciseNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseMeta}>
                  {exercise.sets} sets × {exercise.reps} reps
                </Text>
                {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
                  <Text style={styles.exerciseMuscles}>
                    {exercise.muscleGroups.join(', ')}
                  </Text>
                )}
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </View>
          ))}
        </View>

        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <IconSymbol
              ios_icon_name="lightbulb.fill"
              android_material_icon_name="lightbulb"
              size={24}
              color="#f59e0b"
            />
            <Text style={styles.tipsTitle}>Workout Tips</Text>
          </View>
          <Text style={styles.tipText}>
            • Warm up for 5-10 minutes before starting{'\n'}
            • Focus on proper form over heavy weight{'\n'}
            • Rest 60-90 seconds between sets{'\n'}
            • Stay hydrated throughout your workout{'\n'}
            • Cool down and stretch after finishing
          </Text>
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
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  planButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  planButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  badge: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 32,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  exerciseList: {
    marginBottom: 24,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  exerciseNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  exerciseMeta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  exerciseMuscles: {
    fontSize: 12,
    color: colors.grey,
    textTransform: 'capitalize',
  },
  tipsCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  tipText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 48 : 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  workoutCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  workoutDay: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  workoutName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  workoutBadge: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  workoutBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  exercisePreview: {
    gap: 6,
  },
  exercisePreviewText: {
    fontSize: 14,
    color: colors.text,
  },
  exercisePreviewMore: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
