
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet } from '@/utils/api';

interface DashboardStats {
  dailyCalorieGoal: number;
  caloriesConsumed: number;
  caloriesRemaining: number;
  percentageConsumed: number;
  goalMet: boolean;
  mealsLogged: number;
  lastUpdated: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Athlete');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load user name from profile
      const profileData = await AsyncStorage.getItem('fitnessProfile');
      if (profileData) {
        const profile = JSON.parse(profileData);
        if (profile.name) {
          setUserName(profile.name);
        }
      }
      
      // Load dashboard stats from backend
      try {
        const dashboardStats = await authenticatedGet('/api/dashboard/home');
        setStats(dashboardStats);
        console.log('[Home] Dashboard stats loaded from backend');
      } catch (error) {
        console.log('[Home] Could not load stats from backend, using local data');
        // Fallback to local data
        setStats({
          dailyCalorieGoal: 2500,
          caloriesConsumed: 0,
          caloriesRemaining: 2500,
          percentageConsumed: 0,
          goalMet: false,
          mealsLogged: 0,
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('[Home] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToProfile = () => {
    console.log('[Home] User tapped profile button');
    router.push('/(tabs)/profile');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const percentageConsumed = stats?.percentageConsumed || 0;
  const caloriesConsumed = stats?.caloriesConsumed || 0;
  const caloriesRemaining = stats?.caloriesRemaining || stats?.dailyCalorieGoal || 2500;
  const dailyCalorieGoal = stats?.dailyCalorieGoal || 2500;
  const mealsLogged = stats?.mealsLogged || 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{userName}</Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={handleNavigateToProfile}>
          <IconSymbol
            ios_icon_name="person.circle.fill"
            android_material_icon_name="account-circle"
            size={40}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Compact Calorie Overview */}
        <View style={styles.calorieOverview}>
          <View style={styles.calorieHeader}>
            <IconSymbol
              ios_icon_name="flame.fill"
              android_material_icon_name="local-fire-department"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.calorieTitle}>Today&apos;s Nutrition</Text>
          </View>
          
          <View style={styles.calorieRow}>
            <View style={styles.calorieMainStat}>
              <Text style={styles.calorieMainNumber}>{caloriesConsumed}</Text>
              <Text style={styles.calorieMainLabel}>consumed</Text>
            </View>
            
            <View style={styles.calorieDivider} />
            
            <View style={styles.calorieSecondaryStat}>
              <Text style={styles.calorieSecondaryNumber}>{caloriesRemaining}</Text>
              <Text style={styles.calorieSecondaryLabel}>remaining</Text>
            </View>
            
            <View style={styles.calorieDivider} />
            
            <View style={styles.calorieSecondaryStat}>
              <Text style={styles.calorieSecondaryNumber}>{dailyCalorieGoal}</Text>
              <Text style={styles.calorieSecondaryLabel}>goal</Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${Math.min(percentageConsumed, 100)}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{Math.round(percentageConsumed)}%</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="figure.strengthtraining.traditional"
              android_material_icon_name="fitness-center"
              size={28}
              color={colors.primary}
            />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>

          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="fork.knife"
              android_material_icon_name="restaurant"
              size={28}
              color={colors.primary}
            />
            <Text style={styles.statValue}>{mealsLogged}</Text>
            <Text style={styles.statLabel}>Meals Logged</Text>
          </View>

          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="flame.fill"
              android_material_icon_name="local-fire-department"
              size={28}
              color={colors.primary}
            />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>

          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="chart.line.uptrend.xyaxis"
              android_material_icon_name="trending-up"
              size={28}
              color={colors.primary}
            />
            <Text style={styles.statValue}>0%</Text>
            <Text style={styles.statLabel}>Progress</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/training')}
            >
              <View style={styles.actionIconContainer}>
                <IconSymbol
                  ios_icon_name="figure.strengthtraining.traditional"
                  android_material_icon_name="fitness-center"
                  size={28}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.actionText}>Start Workout</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/nutrition')}
            >
              <View style={styles.actionIconContainer}>
                <IconSymbol
                  ios_icon_name="fork.knife"
                  android_material_icon_name="restaurant"
                  size={28}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.actionText}>Log Meal</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/progress')}
            >
              <View style={styles.actionIconContainer}>
                <IconSymbol
                  ios_icon_name="chart.line.uptrend.xyaxis"
                  android_material_icon_name="show-chart"
                  size={28}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.actionText}>View Progress</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/plan')}
            >
              <View style={styles.actionIconContainer}>
                <IconSymbol
                  ios_icon_name="calendar"
                  android_material_icon_name="calendar-today"
                  size={28}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.actionText}>Weekly Plan</Text>
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  calorieOverview: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  calorieHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  calorieTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  calorieMainStat: {
    flex: 1,
    alignItems: 'center',
  },
  calorieMainNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  calorieMainLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  calorieDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 8,
  },
  calorieSecondaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  calorieSecondaryNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  calorieSecondaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    minWidth: 40,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
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
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
