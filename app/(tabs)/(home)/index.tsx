
import React, { useState, useEffect } from 'react';
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
import { colors } from '@/styles/commonStyles';
import { getTodaysWorkout } from '@/data/workouts';
import { IconSymbol } from '@/components/IconSymbol';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet } from '@/utils/api';

export default function TrainingScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [todaysWorkout, setTodaysWorkout] = useState(getTodaysWorkout(new Date().getDay()));
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/auth');
      } else {
        checkProfile();
      }
    }
  }, [user, authLoading]);

  const checkProfile = async () => {
    try {
      setLoading(true);
      
      // Try to load from backend first
      try {
        const backendProfile = await authenticatedGet('/api/fitness-profile');
        if (backendProfile) {
          await AsyncStorage.setItem('fitnessProfile', JSON.stringify(backendProfile));
          setHasProfile(true);
          console.log('[Home] Profile loaded from backend');
          return;
        }
      } catch (error) {
        console.log('[Home] No profile in backend, checking local storage');
      }
      
      // Fallback to local storage
      const localProfile = await AsyncStorage.getItem('fitnessProfile');
      if (!localProfile) {
        router.replace('/onboarding');
      } else {
        setHasProfile(true);
      }
    } catch (error) {
      console.error('[Home] Error checking profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading || !hasProfile) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Today&apos;s Workout</Text>
          <Text style={styles.workoutType}>{todaysWorkout.type} Day</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <IconSymbol
              ios_icon_name="figure.strengthtraining.traditional"
              android_material_icon_name="fitness-center"
              size={32}
              color={colors.primary}
            />
            <Text style={styles.cardTitle}>{todaysWorkout.exercises.length} Exercises</Text>
          </View>

          <View style={styles.exerciseList}>
            {todaysWorkout.exercises.slice(0, 5).map((exercise, index) => (
              <View key={exercise.id} style={styles.exerciseItem}>
                <View style={styles.exerciseNumber}>
                  <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseDetails}>
                    {exercise.sets} sets × {exercise.reps} reps
                  </Text>
                </View>
              </View>
            ))}
            {todaysWorkout.exercises.length > 5 && (
              <Text style={styles.moreExercises}>
                +{todaysWorkout.exercises.length - 5} more exercises
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={() => router.push('/workout-session')}
          >
            <IconSymbol
              ios_icon_name="play.fill"
              android_material_icon_name="play-arrow"
              size={24}
              color="#ffffff"
            />
            <Text style={styles.startButtonText}>Start Workout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="flame.fill"
              android_material_icon_name="local-fire-department"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.statValue}>7</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="figure.run"
              android_material_icon_name="directions-run"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.statValue}>24</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="clock.fill"
              android_material_icon_name="schedule"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.statValue}>45m</Text>
            <Text style={styles.statLabel}>Avg Time</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/progress')}
          >
            <IconSymbol
              ios_icon_name="chart.line.uptrend.xyaxis"
              android_material_icon_name="trending-up"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.actionText}>View Progress</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/nutrition')}
          >
            <IconSymbol
              ios_icon_name="fork.knife"
              android_material_icon_name="restaurant"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.actionText}>Track Nutrition</Text>
          </TouchableOpacity>
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
  scrollContent: {
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  workoutType: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  exerciseList: {
    marginBottom: 20,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  exerciseDetails: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  moreExercises: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  startButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  quickActions: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  actionCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
