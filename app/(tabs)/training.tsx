
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
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
  const [isRestDay, setIsRestDay] = useState(false);

  const loadWorkout = useCallback(async () => {
    try {
      console.log('[Training] Loading workout data');
      
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
            selectedDays: backendProfile.selectedDays || [],
          };
          
          console.log('[Training] Mapped profile for workout generation:', mappedProfile);
          
          setProfile(mappedProfile);
          await AsyncStorage.setItem('fitnessProfile', JSON.stringify(mappedProfile));
          
          const weeklyWorkoutSplit = generateWorkoutSplit(mappedProfile);
          console.log('[Training] Generated weekly workout split:', weeklyWorkoutSplit);
          setWeeklyWorkouts(weeklyWorkoutSplit);
          
          const workout = getTodaysWorkout(mappedProfile);
          console.log('[Training] Today\'s workout:', workout);
          
          if (workout) {
            setTodaysWorkout(workout);
            setIsRestDay(false);
          } else {
            setTodaysWorkout(null);
            setIsRestDay(true);
          }
          
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('[Training] Error loading profile from backend:', error);
        console.log('[Training] Falling back to local storage');
      }
      
      const storedProfile = await AsyncStorage.getItem('fitnessProfile');
      if (!storedProfile) {
        console.log('[Training] No profile found, redirecting to onboarding');
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
      
      if (workout) {
        setTodaysWorkout(workout);
        setIsRestDay(false);
      } else {
        setTodaysWorkout(null);
        setIsRestDay(true);
      }
    } catch (error) {
      console.error('[Training] Error loading workout:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  const handleViewWeeklyPlan = () => {
    console.log('[Training] User tapped View Weekly Plan button - navigating to Training Plan screen');
    router.push('/training-plan');
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

  const getWorkoutTips = () => {
    if (!todaysWorkout) return [];
    
    const workoutName = todaysWorkout.name.toLowerCase();
    const exercises = todaysWorkout.exercises.map(e => e.name.toLowerCase());
    
    const tips = [];
    
    if (workoutName.includes('push') || workoutName.includes('chest') || 
        exercises.some(e => e.includes('bench') || e.includes('press'))) {
      tips.push('Retract your shoulder blades for better chest activation');
      tips.push('Control the eccentric (lowering) phase for 2-3 seconds');
    }
    
    if (workoutName.includes('pull') || workoutName.includes('back') ||
        exercises.some(e => e.includes('row') || e.includes('pull'))) {
      tips.push('Focus on pulling with your elbows, not your hands');
      tips.push('Squeeze your shoulder blades together at peak contraction');
    }
    
    if (workoutName.includes('leg') || workoutName.includes('lower') ||
        exercises.some(e => e.includes('squat') || e.includes('leg'))) {
      tips.push('Keep your core braced throughout the movement');
      tips.push('Drive through your heels, not your toes');
    }
    
    tips.push('Warm up with 5-10 minutes of light cardio');
    tips.push('Rest 60-90 seconds between sets for hypertrophy');
    tips.push('Stay hydrated - drink water between sets');
    
    return tips.slice(0, 5);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ParticleBackground />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // REST DAY SCREEN
  if (isRestDay) {
    return (
      <View style={styles.container}>
        <ParticleBackground />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.restDayContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.restDayContainer}>
            <View style={styles.restDayIconContainer}>
              <IconSymbol
                ios_icon_name="bed.double.fill"
                android_material_icon_name="hotel"
                size={80}
                color={colors.primary}
              />
            </View>
            
            <Text style={styles.restDayTitle}>Today is a Rest Day</Text>
            <Text style={styles.restDaySubtitle}>
              Recovery is just as important as training. Your muscles need time to repair and grow stronger.
            </Text>

            <View style={styles.restDayTipsCard}>
              <Text style={styles.restDayTipsTitle}>Make the Most of Your Rest Day</Text>
              <View style={styles.restDayTipsList}>
                <View style={styles.restDayTipRow}>
                  <View style={styles.restDayTipBullet} />
                  <Text style={styles.restDayTipText}>Stay hydrated and eat nutritious meals</Text>
                </View>
                <View style={styles.restDayTipRow}>
                  <View style={styles.restDayTipBullet} />
                  <Text style={styles.restDayTipText}>Light stretching or yoga can aid recovery</Text>
                </View>
                <View style={styles.restDayTipRow}>
                  <View style={styles.restDayTipBullet} />
                  <Text style={styles.restDayTipText}>Get 7-9 hours of quality sleep</Text>
                </View>
                <View style={styles.restDayTipRow}>
                  <View style={styles.restDayTipBullet} />
                  <Text style={styles.restDayTipText}>Consider a light walk or mobility work</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.viewPlanButton}
              onPress={handleViewWeeklyPlan}
            >
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="calendar-today"
                size={24}
                color="#fff"
              />
              <Text style={styles.viewPlanButtonText}>View Full Training Plan</Text>
            </TouchableOpacity>

            <Text style={styles.restDayFooter}>
              Check your weekly plan to see which days you train
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // WORKOUT DAY SCREEN
  const workoutTips = getWorkoutTips();

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
            <Text style={styles.title}>{todaysWorkout?.name}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {todaysWorkout?.exercises.length} exercises
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

        <TouchableOpacity
          style={styles.weeklyPlanButton}
          onPress={handleViewWeeklyPlan}
        >
          <IconSymbol
            ios_icon_name="calendar"
            android_material_icon_name="calendar-today"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.weeklyPlanButtonText}>View Weekly Plan</Text>
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron-right"
            size={20}
            color={colors.primary}
          />
        </TouchableOpacity>

        <View style={styles.exerciseList}>
          <Text style={styles.listTitle}>Exercise List</Text>
          {todaysWorkout?.exercises.map((exercise, index) => (
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  restDayContent: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  restDayContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  restDayIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  restDayTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  restDaySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  restDayTipsCard: {
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(69, 155, 155, 0.3)',
    width: '100%',
    marginBottom: 32,
  },
  restDayTipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  restDayTipsList: {
    gap: 12,
  },
  restDayTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  restDayTipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 7,
  },
  restDayTipText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  viewPlanButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 16,
    width: '100%',
    marginBottom: 16,
  },
  viewPlanButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  restDayFooter: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
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
    marginBottom: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  weeklyPlanButton: {
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    borderColor: colors.primary,
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 32,
  },
  weeklyPlanButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
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
});
