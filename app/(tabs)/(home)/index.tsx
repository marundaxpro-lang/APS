
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/IconSymbol';
import ParticleBackground from '@/components/ParticleBackground';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { getTodaysWorkout } from '@/data/workouts';
import { FitnessProfile, WorkoutDay, FocusTask, DashboardStats } from '@/types/fitness';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const [todaysWorkout, setTodaysWorkout] = useState<WorkoutDay | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    weeklyWorkouts: 0,
    weeklyStudyHours: 0,
    currentStreak: 0,
    todaysTasks: 0,
  });
  const [loading, setLoading] = useState(true);

  const checkProfile = useCallback(async () => {
    try {
      const storedProfile = await AsyncStorage.getItem('fitnessProfile');
      if (!storedProfile) {
        router.replace('/onboarding');
        return;
      }

      const profileData: FitnessProfile = JSON.parse(storedProfile);
      setProfile(profileData);

      const workout = getTodaysWorkout(profileData);
      setTodaysWorkout(workout);

      const storedStats = await AsyncStorage.getItem('dashboardStats');
      if (storedStats) {
        setStats(JSON.parse(storedStats));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authLoading) {
      checkProfile();
    }
  }, [authLoading, checkProfile]);

  if (authLoading || loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ParticleBackground />
        <ActivityIndicator size="large" color={colors.primary} />
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
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{user?.name || 'Athlete'}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <IconSymbol
              ios_icon_name="person.circle.fill"
              android_material_icon_name="account-circle"
              size={40}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="flame.fill"
              android_material_icon_name="local-fire-department"
              size={32}
              color="#f59e0b"
            />
            <Text style={styles.statValue}>{stats.currentStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>

          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="figure.strengthtraining.traditional"
              android_material_icon_name="fitness-center"
              size={32}
              color={colors.primary}
            />
            <Text style={styles.statValue}>{stats.weeklyWorkouts}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>

          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="clock.fill"
              android_material_icon_name="schedule"
              size={32}
              color="#8b5cf6"
            />
            <Text style={styles.statValue}>{stats.weeklyStudyHours}h</Text>
            <Text style={styles.statLabel}>Study Time</Text>
          </View>

          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={32}
              color={colors.success}
            />
            <Text style={styles.statValue}>{stats.todaysTasks}</Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>
        </View>

        {todaysWorkout && (
          <View style={styles.workoutCard}>
            <View style={styles.workoutHeader}>
              <View>
                <Text style={styles.workoutTitle}>Today&apos;s Workout</Text>
                <Text style={styles.workoutSubtitle}>{todaysWorkout.name}</Text>
              </View>
              <View style={styles.workoutBadge}>
                <Text style={styles.workoutBadgeText}>
                  {todaysWorkout.exercises.length} exercises
                </Text>
              </View>
            </View>

            <View style={styles.exercisePreview}>
              {todaysWorkout.exercises.slice(0, 3).map((exercise, index) => (
                <View key={exercise.id} style={styles.exerciseItem}>
                  <View style={styles.exerciseNumber}>
                    <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseMeta}>
                      {exercise.sets} × {exercise.reps}
                    </Text>
                  </View>
                </View>
              ))}
              {todaysWorkout.exercises.length > 3 && (
                <Text style={styles.moreExercises}>
                  +{todaysWorkout.exercises.length - 3} more exercises
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
                color="#fff"
              />
              <Text style={styles.startButtonText}>Start Workout</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/plan')}
            >
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="calendar-today"
                size={28}
                color={colors.primary}
              />
              <Text style={styles.actionText}>Weekly Plan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/nutrition')}
            >
              <IconSymbol
                ios_icon_name="fork.knife"
                android_material_icon_name="restaurant"
                size={28}
                color={colors.primary}
              />
              <Text style={styles.actionText}>Nutrition</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/focus')}
            >
              <IconSymbol
                ios_icon_name="brain.head.profile"
                android_material_icon_name="psychology"
                size={28}
                color={colors.primary}
              />
              <Text style={styles.actionText}>Focus Hub</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/progress')}
            >
              <IconSymbol
                ios_icon_name="chart.line.uptrend.xyaxis"
                android_material_icon_name="trending-up"
                size={28}
                color={colors.primary}
              />
              <Text style={styles.actionText}>Progress</Text>
            </TouchableOpacity>
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  name: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 52) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  workoutCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 24,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  workoutTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  workoutSubtitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  workoutBadge: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  workoutBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  exercisePreview: {
    marginBottom: 20,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
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
  exerciseMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  moreExercises: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  quickActions: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: (width - 52) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    gap: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
