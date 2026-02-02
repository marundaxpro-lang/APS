
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
import { WeeklyTask } from '@/types/fitness';

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
  const [todayTasks, setTodayTasks] = useState<WeeklyTask[]>([]);

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
      
      // Load today's tasks
      const tasksData = await AsyncStorage.getItem('focusTasks');
      if (tasksData) {
        const allTasks: WeeklyTask[] = JSON.parse(tasksData);
        const today = new Date().getDay();
        const tasksForToday = allTasks.filter(task => task.dayOfWeek === today);
        setTodayTasks(tasksForToday);
        console.log('[Home] Loaded tasks for today:', tasksForToday.length);
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

  const toggleTask = async (taskId: string) => {
    console.log('[Home] User toggled task:', taskId);
    try {
      const tasksData = await AsyncStorage.getItem('focusTasks');
      if (tasksData) {
        const allTasks: WeeklyTask[] = JSON.parse(tasksData);
        const updatedTasks = allTasks.map(task => 
          task.id === taskId ? { ...task, completed: !task.completed } : task
        );
        await AsyncStorage.setItem('focusTasks', JSON.stringify(updatedTasks));
        
        // Update local state
        const today = new Date().getDay();
        const tasksForToday = updatedTasks.filter(task => task.dayOfWeek === today);
        setTodayTasks(tasksForToday);
      }
    } catch (error) {
      console.error('[Home] Error toggling task:', error);
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

  const completedTasksCount = todayTasks.filter(t => t.completed).length;
  const totalTasksCount = todayTasks.length;

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
        {/* Today's Tasks - Highlighted Section */}
        <View style={styles.tasksHighlight}>
          <View style={styles.tasksHeader}>
            <View style={styles.tasksHeaderLeft}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={28}
                color={colors.primary}
              />
              <View>
                <Text style={styles.tasksTitle}>Today&apos;s Tasks</Text>
                <Text style={styles.tasksSubtitle}>
                  {completedTasksCount} of {totalTasksCount} completed
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push('/(tabs)/focus')}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={16}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {todayTasks.length === 0 ? (
            <View style={styles.noTasksContainer}>
              <IconSymbol
                ios_icon_name="tray"
                android_material_icon_name="inbox"
                size={40}
                color={colors.grey}
              />
              <Text style={styles.noTasksText}>No tasks for today</Text>
              <TouchableOpacity 
                style={styles.addTaskButton}
                onPress={() => router.push('/(tabs)/focus')}
              >
                <IconSymbol
                  ios_icon_name="plus"
                  android_material_icon_name="add"
                  size={16}
                  color="#fff"
                />
                <Text style={styles.addTaskButtonText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.tasksList}>
              {todayTasks.slice(0, 3).map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={styles.taskItem}
                  onPress={() => toggleTask(task.id)}
                >
                  <View style={[
                    styles.taskCheckbox,
                    task.completed && styles.taskCheckboxCompleted,
                  ]}>
                    {task.completed && (
                      <IconSymbol
                        ios_icon_name="checkmark"
                        android_material_icon_name="check"
                        size={14}
                        color="#fff"
                      />
                    )}
                  </View>
                  <View style={styles.taskInfo}>
                    <Text style={[
                      styles.taskTitle,
                      task.completed && styles.taskTitleCompleted,
                    ]}>
                      {task.title}
                    </Text>
                    {task.startTime && (
                      <Text style={styles.taskTime}>{task.startTime}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
              {todayTasks.length > 3 && (
                <TouchableOpacity 
                  style={styles.moreTasksButton}
                  onPress={() => router.push('/(tabs)/focus')}
                >
                  <Text style={styles.moreTasksText}>
                    +{todayTasks.length - 3} more tasks
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Compact Nutrition Overview */}
        <View style={styles.nutritionCard}>
          <View style={styles.nutritionHeader}>
            <IconSymbol
              ios_icon_name="flame.fill"
              android_material_icon_name="local-fire-department"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.nutritionTitle}>Nutrition</Text>
          </View>
          
          <View style={styles.nutritionStats}>
            <View style={styles.nutritionStat}>
              <Text style={styles.nutritionValue}>{caloriesConsumed}</Text>
              <Text style={styles.nutritionLabel}>consumed</Text>
            </View>
            <View style={styles.nutritionDivider} />
            <View style={styles.nutritionStat}>
              <Text style={styles.nutritionValue}>{caloriesRemaining}</Text>
              <Text style={styles.nutritionLabel}>remaining</Text>
            </View>
            <View style={styles.nutritionDivider} />
            <View style={styles.nutritionStat}>
              <Text style={styles.nutritionValue}>{dailyCalorieGoal}</Text>
              <Text style={styles.nutritionLabel}>goal</Text>
            </View>
          </View>

          <View style={styles.nutritionProgressBar}>
            <View 
              style={[
                styles.nutritionProgressFill, 
                { width: `${Math.min(percentageConsumed, 100)}%` }
              ]} 
            />
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
  tasksHighlight: {
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderWidth: 2,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tasksHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  tasksTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  tasksSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    borderRadius: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  noTasksContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noTasksText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 16,
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addTaskButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  tasksList: {
    gap: 10,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 12,
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.grey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckboxCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.grey,
  },
  taskTime: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
  moreTasksButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  moreTasksText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  nutritionCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  nutritionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  nutritionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  nutritionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  nutritionStat: {
    flex: 1,
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  nutritionLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  nutritionDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 8,
  },
  nutritionProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  nutritionProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
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
