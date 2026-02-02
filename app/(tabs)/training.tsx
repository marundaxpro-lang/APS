
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
  const [hasWorkoutsLogged, setHasWorkoutsLogged] = useState(false);

  const loadWorkout = useCallback(async () => {
    try {
      // Check if user has logged workouts
      const workoutHistory = await AsyncStorage.getItem('workoutHistory');
      const hasHistory = workoutHistory && JSON.parse(workoutHistory).length > 0;
      setHasWorkoutsLogged(hasHistory);

      // First try to load from backend to get the latest profile
      try {
        const { authenticatedGet } = await import('@/utils/api');
        const backendProfile = await authenticatedGet('/api/fitness-profile');
        
        if (backendProfile) {
          console.log('[Training] Raw backend profile:', backendProfile);
          
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
          
          setProfile(mappedProfile);
          await AsyncStorage.setItem('fitnessProfile', JSON.stringify(mappedProfile));
          
          const weeklyWorkoutSplit = generateWorkoutSplit(mappedProfile);
          console.log('[Training] Generated weekly workout split:', weeklyWorkoutSplit);
          setWeeklyWorkouts(weeklyWorkoutSplit);
          
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

      const weeklyWorkoutSplit = generateWorkoutSplit(profileData);
      console.log('[Training] Generated weekly workout split:', weeklyWorkoutSplit);
      setWeeklyWorkouts(weeklyWorkoutSplit);

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
      try {
        await AsyncStorage.setItem('selectedWorkout', JSON.stringify(todaysWorkout));
        console.log('[Training] Workout saved to AsyncStorage before starting session');
      } catch (error) {
        console.error('[Training] Error saving workout:', error);
      }
    }
    
    router.push('/workout-session');
  };

  const handleCreateWeeklyPlan = () => {
    console.log('[Training] User tapped Create Weekly Plan');
    router.push('/(tabs)/plan');
  };

  // Get context-aware tips based on workout type
  const getWorkoutTips = () => {
    if (!todaysWorkout) return [];
    
    const workoutName = todaysWorkout.name.toLowerCase();
    const exercises = todaysWorkout.exercises.map(e => e.name.toLowerCase());
    
    const tips = [];
    
    // Chest/Push tips
    if (workoutName.includes('push') || workoutName.includes('chest') || 
        exercises.some(e => e.includes('bench') || e.includes('press'))) {
      tips.push('Retract your shoulder blades for better chest activation');
      tips.push('Control the eccentric (lowering) phase for 2-3 seconds');
    }
    
    // Pull/Back tips
    if (workoutName.includes('pull') || workoutName.includes('back') ||
        exercises.some(e => e.includes('row') || e.includes('pull'))) {
      tips.push('Focus on pulling with your elbows, not your hands');
      tips.push('Squeeze your shoulder blades together at peak contraction');
    }
    
    // Leg tips
    if (workoutName.includes('leg') || workoutName.includes('lower') ||
        exercises.some(e => e.includes('squat') || e.includes('leg'))) {
      tips.push('Keep your core braced throughout the movement');
      tips.push('Drive through your heels, not your toes');
    }
    
    // General tips
    tips.push('Warm up with 5-10 minutes of light cardio');
    tips.push('Rest 60-90 seconds between sets for hypertrophy');
    tips.push('Stay hydrated - drink water between sets');
    
    return tips.slice(0, 5);
  };

  const workoutTips = getWorkoutTips();

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ParticleBackground />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Empty state for users with no workouts logged
  if (!hasWorkoutsLogged && !todaysWorkout) {
    return (
      <View style={styles.container}>
        <ParticleBackground />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.emptyContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.emptyStateContainer}>
            <IconSymbol
              ios_icon_name="figure.strengthtraining.traditional"
              android_material_icon_name="fitness-center"
              size={80}
              color={colors.primary}
            />
            <Text style={styles.emptyTitle}>Ready to Start Your Fitness Journey?</Text>
            <Text style={styles.emptySubtitle}>
              Begin with today&apos;s workout or create a custom weekly training plan
            </Text>
            
            <TouchableOpacity
              style={styles.primaryCTA}
              onPress={handleStartWorkout}
            >
              <IconSymbol
                ios_icon_name="play.fill"
                android_material_icon_name="play-arrow"
                size={24}
                color="#fff"
              />
              <Text style={styles.primaryCTAText}>Start Today&apos;s Workout</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.secondaryCTA}
              onPress={handleCreateWeeklyPlan}
            >
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="calendar-today"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.secondaryCTAText}>Create Weekly Plan</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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

        {workoutTips.length > 0 && (
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <IconSymbol
                ios_icon_name="lightbulb.fill"
                android_material_icon_name="lightbulb"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.tipsTitle}>Workout Tips</Text>
            </View>
            <View style={styles.tipsContent}>
              {workoutTips.map((tip, index) => (
                <View key={index} style={styles.tipRow}>
                  <View style={styles.tipBullet} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
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
  emptyContent: {
    flexGrow: 1,
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
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  primaryCTA: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    marginBottom: 16,
  },
  primaryCTAText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryCTA: {
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryCTAText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
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
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(69, 155, 155, 0.3)',
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
  tipsContent: {
    gap: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 7,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
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
