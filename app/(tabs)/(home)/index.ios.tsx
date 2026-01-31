
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/IconSymbol';
import ParticleBackground from '@/components/ParticleBackground';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { FitnessProfile, DashboardStats } from '@/types/fitness';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    workoutsThisWeek: 0,
    tasksCompleted: 0,
    currentStreak: 0,
    todaysCalories: 0,
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

      // Try to load dashboard stats from backend
      try {
        const { authenticatedGet } = await import('@/utils/api');
        const dashboardData = await authenticatedGet('/api/dashboard/home');
        
        if (dashboardData) {
          const backendStats: DashboardStats = {
            workoutsThisWeek: dashboardData.workoutsThisWeek || 0,
            tasksCompleted: dashboardData.tasksCompleted || 0,
            currentStreak: dashboardData.currentStreak || 0,
            todaysCalories: dashboardData.todaysCalories || 0,
          };
          setStats(backendStats);
          await AsyncStorage.setItem('dashboardStats', JSON.stringify(backendStats));
          console.log('[Home iOS] Dashboard stats loaded from backend');
        }
      } catch (error) {
        console.log('[Home iOS] Could not load stats from backend, using local data');
        // Fallback to local storage
        const storedStats = await AsyncStorage.getItem('dashboardStats');
        if (storedStats) {
          setStats(JSON.parse(storedStats));
        }
      }
    } catch (error) {
      console.error('[Home iOS] Error loading profile:', error);
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

  const displayName = profile?.name || 'Athlete';

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
            <Text style={styles.name}>{displayName}</Text>
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
            <Text style={styles.statValue}>{stats.workoutsThisWeek}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>

          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={32}
              color={colors.success}
            />
            <Text style={styles.statValue}>{stats.tasksCompleted}</Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>

          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="flame.fill"
              android_material_icon_name="local-fire-department"
              size={32}
              color="#ec4899"
            />
            <Text style={styles.statValue}>{stats.todaysCalories}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/training')}
            >
              <IconSymbol
                ios_icon_name="dumbbell.fill"
                android_material_icon_name="fitness-center"
                size={28}
                color={colors.primary}
              />
              <Text style={styles.actionText}>Start Training</Text>
            </TouchableOpacity>

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

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/community')}
            >
              <IconSymbol
                ios_icon_name="person.3.fill"
                android_material_icon_name="group"
                size={28}
                color={colors.primary}
              />
              <Text style={styles.actionText}>Community</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/meal-plans')}
            >
              <IconSymbol
                ios_icon_name="fork.knife.circle.fill"
                android_material_icon_name="restaurant-menu"
                size={28}
                color={colors.primary}
              />
              <Text style={styles.actionText}>Meal Plans</Text>
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
    paddingTop: 60,
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
