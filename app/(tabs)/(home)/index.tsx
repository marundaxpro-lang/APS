
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
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { getTodaysWorkout } from '@/data/workouts';
import { FitnessProfile, WorkoutDay, FocusTask, DashboardStats } from '@/types/fitness';
import ParticleBackground from '@/components/ParticleBackground';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [todaysWorkout, setTodaysWorkout] = useState<WorkoutDay | null>(null);
  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    weeklyWorkouts: 0,
    totalWorkouts: 0,
    currentStreak: 0,
    weeklyStudyHours: 0,
    tasksCompleted: 0,
    totalTasks: 0,
  });

  const checkProfile = useCallback(async () => {
    try {
      const profile = await AsyncStorage.getItem('fitnessProfile');
      if (!profile && user) {
        router.replace('/onboarding');
      } else if (profile) {
        setHasProfile(true);
        const profileData: FitnessProfile = JSON.parse(profile);
        const workout = getTodaysWorkout(profileData);
        setTodaysWorkout(workout);
        
        // Load tasks
        const storedTasks = await AsyncStorage.getItem('focusTasks');
        if (storedTasks) {
          const parsedTasks: FocusTask[] = JSON.parse(storedTasks);
          setTasks(parsedTasks.filter(t => !t.completed).slice(0, 3));
        }

        // Load stats
        const storedStats = await AsyncStorage.getItem('dashboardStats');
        if (storedStats) {
          setStats(JSON.parse(storedStats));
        }
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    if (!authLoading) {
      checkProfile();
    }
  }, [authLoading, checkProfile]);

  if (authLoading || loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ParticleBackground />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!hasProfile) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ParticleBackground />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back!</Text>
          <Text style={styles.title}>Your Dashboard</Text>
        </View>

        {/* Weekly Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <IconSymbol 
              ios_icon_name="dumbbell.fill" 
              android_material_icon_name="fitness-center" 
              size={28} 
              color={colors.primary} 
            />
            <Text style={styles.statValue}>{stats.weeklyWorkouts}</Text>
            <Text style={styles.statLabel}>Workouts This Week</Text>
          </View>

          <View style={styles.statCard}>
            <IconSymbol 
              ios_icon_name="flame.fill" 
              android_material_icon_name="local-fire-department" 
              size={28} 
              color="#f59e0b" 
            />
            <Text style={styles.statValue}>{stats.currentStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>

          <View style={styles.statCard}>
            <IconSymbol 
              ios_icon_name="clock.fill" 
              android_material_icon_name="schedule" 
              size={28} 
              color="#8b5cf6" 
            />
            <Text style={styles.statValue}>{stats.weeklyStudyHours}h</Text>
            <Text style={styles.statLabel}>Study Hours</Text>
          </View>

          <View style={styles.statCard}>
            <IconSymbol 
              ios_icon_name="checkmark.circle.fill" 
              android_material_icon_name="check-circle" 
              size={28} 
              color={colors.success} 
            />
            <Text style={styles.statValue}>{stats.tasksCompleted}/{stats.totalTasks}</Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>
        </View>

        {/* Today's Workout */}
        {todaysWorkout ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today&apos;s Workout</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/training')}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.workoutCard}
              onPress={() => router.push('/workout-session')}
            >
              <View style={styles.workoutHeader}>
                <View style={styles.workoutIconContainer}>
                  <IconSymbol 
                    ios_icon_name="dumbbell.fill" 
                    android_material_icon_name="fitness-center" 
                    size={24} 
                    color={colors.primary} 
                  />
                </View>
                <View style={styles.workoutInfo}>
                  <Text style={styles.workoutName}>{todaysWorkout.name}</Text>
                  <Text style={styles.workoutDetails}>
                    {todaysWorkout.exercises.length} exercises
                  </Text>
                </View>
                <IconSymbol 
                  ios_icon_name="chevron.right" 
                  android_material_icon_name="chevron-right" 
                  size={24} 
                  color={colors.textSecondary} 
                />
              </View>

              <View style={styles.exercisePreview}>
                {todaysWorkout.exercises.slice(0, 3).map((exercise, index) => (
                  <View key={exercise.id} style={styles.exercisePreviewItem}>
                    <View style={styles.exerciseNumber}>
                      <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.exercisePreviewText} numberOfLines={1}>
                      {exercise.name}
                    </Text>
                  </View>
                ))}
                {todaysWorkout.exercises.length > 3 && (
                  <Text style={styles.moreExercises}>
                    +{todaysWorkout.exercises.length - 3} more
                  </Text>
                )}
              </View>

              <TouchableOpacity style={styles.startWorkoutButton}>
                <IconSymbol 
                  ios_icon_name="play.fill" 
                  android_material_icon_name="play-arrow" 
                  size={20} 
                  color="#fff" 
                />
                <Text style={styles.startWorkoutText}>Start Workout</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.restDayCard}>
              <IconSymbol 
                ios_icon_name="moon.stars.fill" 
                android_material_icon_name="bedtime" 
                size={48} 
                color={colors.primary} 
              />
              <Text style={styles.restDayTitle}>Rest Day</Text>
              <Text style={styles.restDayText}>Recovery is essential for progress</Text>
            </View>
          </View>
        )}

        {/* Today's Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today&apos;s Tasks</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/focus')}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {tasks.length > 0 ? (
            <View style={styles.tasksContainer}>
              {tasks.map((task) => (
                <View key={task.id} style={styles.taskCard}>
                  <View style={styles.taskIcon}>
                    <IconSymbol 
                      ios_icon_name={task.type === 'study' ? 'book.fill' : task.type === 'work' ? 'briefcase.fill' : 'star.fill'}
                      android_material_icon_name={task.type === 'study' ? 'menu-book' : task.type === 'work' ? 'work' : 'star'}
                      size={20} 
                      color={colors.primary} 
                    />
                  </View>
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                    <Text style={styles.taskMeta}>
                      {task.type} • {task.priority} priority
                    </Text>
                  </View>
                  <View style={[
                    styles.priorityBadge,
                    task.priority === 'high' && styles.priorityHigh,
                    task.priority === 'medium' && styles.priorityMedium,
                  ]}>
                    <Text style={styles.priorityText}>{task.priority}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyTasks}>
              <IconSymbol 
                ios_icon_name="checkmark.circle.fill" 
                android_material_icon_name="check-circle" 
                size={48} 
                color={colors.success} 
              />
              <Text style={styles.emptyTasksText}>All tasks completed!</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/plan')}
            >
              <IconSymbol 
                ios_icon_name="calendar" 
                android_material_icon_name="calendar-today" 
                size={32} 
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
                size={32} 
                color="#f59e0b" 
              />
              <Text style={styles.actionText}>Nutrition</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/progress')}
            >
              <IconSymbol 
                ios_icon_name="chart.line.uptrend.xyaxis" 
                android_material_icon_name="trending-up" 
                size={32} 
                color="#8b5cf6" 
              />
              <Text style={styles.actionText}>Progress</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/community')}
            >
              <IconSymbol 
                ios_icon_name="person.3.fill" 
                android_material_icon_name="group" 
                size={32} 
                color="#ec4899" 
              />
              <Text style={styles.actionText}>Community</Text>
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
  scrollContent: {
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 28,
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
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
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  workoutCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  workoutIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutInfo: {
    flex: 1,
    marginLeft: 16,
  },
  workoutName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  workoutDetails: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  exercisePreview: {
    marginBottom: 20,
    gap: 10,
  },
  exercisePreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  exercisePreviewText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  moreExercises: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 36,
    fontStyle: 'italic',
  },
  startWorkoutButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startWorkoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  restDayCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  restDayTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  restDayText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tasksContainer: {
    gap: 12,
  },
  taskCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  taskMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  priorityHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  priorityMedium: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'uppercase',
  },
  emptyTasks: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  emptyTasksText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: (width - 52) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
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
