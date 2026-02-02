
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
        <View style={styles.calorieCard}>
          <Text style={styles.cardTitle}>Today&apos;s Calories</Text>
          
          <View style={styles.calorieCircle}>
            <View style={styles.calorieCircleInner}>
              <Text style={styles.calorieNumber}>{caloriesConsumed}</Text>
              <Text style={styles.calorieLabel}>consumed</Text>
            </View>
          </View>

          <View style={styles.calorieStats}>
            <View style={styles.calorieStat}>
              <Text style={styles.calorieStatValue}>{dailyCalorieGoal}</Text>
              <Text style={styles.calorieStatLabel}>Goal</Text>
            </View>
            <View style={styles.calorieStat}>
              <Text style={styles.calorieStatValue}>{caloriesRemaining}</Text>
              <Text style={styles.calorieStatLabel}>Remaining</Text>
            </View>
          </View>

          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${Math.min(percentageConsumed, 100)}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{Math.round(percentageConsumed)}% of daily goal</Text>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/training')}
            >
              <IconSymbol
                ios_icon_name="figure.strengthtraining.traditional"
                android_material_icon_name="fitness-center"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.actionText}>Start Workout</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/nutrition')}
            >
              <IconSymbol
                ios_icon_name="fork.knife"
                android_material_icon_name="restaurant"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.actionText}>Log Meal</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/progress')}
            >
              <IconSymbol
                ios_icon_name="chart.line.uptrend.xyaxis"
                android_material_icon_name="show-chart"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.actionText}>View Progress</Text>
            </TouchableOpacity>

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
  calorieCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  calorieCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  calorieCircleInner: {
    alignItems: 'center',
  },
  calorieNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
  },
  calorieLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  calorieStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  calorieStat: {
    alignItems: 'center',
  },
  calorieStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  calorieStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
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
    padding: 20,
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
