
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { WeeklyTask, FitnessProfile } from '@/types/fitness';
import { authenticatedGet } from '@/utils/api';
import { IconSymbol } from '@/components/IconSymbol';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';

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
  const [motivation, setMotivation] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const profileData = await AsyncStorage.getItem('fitnessProfile');
      let profile: FitnessProfile | null = null;
      
      if (profileData) {
        profile = JSON.parse(profileData);
        if (profile?.name) {
          setUserName(profile.name);
        }
        const motivationText = (profile as any).motivation || '';
        setMotivation(motivationText);
      }
      
      const tasksData = await AsyncStorage.getItem('focusTasks');
      if (tasksData) {
        const allTasks: WeeklyTask[] = JSON.parse(tasksData);
        const today = new Date().getDay();
        const tasksForToday = allTasks.filter(task => task.dayOfWeek === today);
        setTodayTasks(tasksForToday);
        console.log('[Home] Loaded tasks for today:', tasksForToday.length);
      }
      
      try {
        const dashboardStats = await authenticatedGet('/api/dashboard/home');
        setStats(dashboardStats);
        console.log('[Home] Dashboard stats loaded from backend');
      } catch (error) {
        console.log('[Home] Could not load stats from backend, using local data');
        
        const caloricGoal = profile?.caloricGoal || 2500;
        console.log('[Home] Using caloric goal from profile:', caloricGoal);
        
        setStats({
          dailyCalorieGoal: caloricGoal,
          caloriesConsumed: 0,
          caloriesRemaining: caloricGoal,
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

  const completedTasksCount = todayTasks.filter(t => t.completed).length;
  const totalTasksCount = todayTasks.length;
  const hasIncompleteTasks = totalTasksCount > 0 && completedTasksCount < totalTasksCount;
  const allTasksComplete = totalTasksCount > 0 && completedTasksCount === totalTasksCount;

  const mealsLogged = stats?.mealsLogged || 0;
  const needsNutritionLog = mealsLogged === 0;

  const primaryActionText = hasIncompleteTasks ? 'Complete Your Tasks' : 
                           needsNutritionLog ? 'Log Your First Meal' : 
                           'Start Today\'s Workout';
  const primaryActionRoute = hasIncompleteTasks ? '/(tabs)/focus' : 
                            needsNutritionLog ? '/(tabs)/nutrition' : 
                            '/(tabs)/training';
  const primaryActionIcon = hasIncompleteTasks ? 'check-circle' : 
                           needsNutritionLog ? 'restaurant' : 
                           'fitness-center';

  const secondaryActionText = hasIncompleteTasks ? 'View Weekly Plan' : 'Track Progress';
  const secondaryActionRoute = hasIncompleteTasks ? '/(tabs)/plan' : '/(tabs)/progress';
  const secondaryActionIcon = hasIncompleteTasks ? 'calendar-today' : 'show-chart';

  const greetingTime = new Date().getHours();
  const greetingText = greetingTime < 12 ? 'Good morning' : 
                      greetingTime < 18 ? 'Good afternoon' : 
                      'Good evening';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{greetingText},</Text>
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
        {motivation && (
          <View style={styles.motivationCard}>
            <IconSymbol
              ios_icon_name="heart.fill"
              android_material_icon_name="favorite"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.motivationText}>&quot;{motivation}&quot;</Text>
          </View>
        )}

        <View style={styles.nextActionSection}>
          <Text style={styles.nextActionLabel}>Your next move</Text>
          
          <TouchableOpacity 
            style={styles.primaryAction}
            onPress={() => {
              console.log('[Home] User tapped primary action:', primaryActionRoute);
              router.push(primaryActionRoute as any);
            }}
          >
            <View style={styles.primaryActionContent}>
              <View style={styles.primaryActionIcon}>
                <IconSymbol
                  ios_icon_name="bolt.fill"
                  android_material_icon_name={primaryActionIcon}
                  size={32}
                  color="#fff"
                />
              </View>
              <View style={styles.primaryActionText}>
                <Text style={styles.primaryActionTitle}>{primaryActionText}</Text>
                <Text style={styles.primaryActionSubtitle}>
                  {hasIncompleteTasks ? `${totalTasksCount - completedTasksCount} tasks remaining` : 
                   needsNutritionLog ? 'Track what you eat today' : 
                   'Your workout is ready'}
                </Text>
              </View>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={24}
              color="#fff"
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryAction}
            onPress={() => {
              console.log('[Home] User tapped secondary action:', secondaryActionRoute);
              router.push(secondaryActionRoute as any);
            }}
          >
            <IconSymbol
              ios_icon_name="chart.line.uptrend.xyaxis"
              android_material_icon_name={secondaryActionIcon}
              size={20}
              color={colors.primary}
            />
            <Text style={styles.secondaryActionText}>{secondaryActionText}</Text>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={16}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        {allTasksComplete && (
          <View style={styles.celebrationCard}>
            <IconSymbol
              ios_icon_name="party.popper.fill"
              android_material_icon_name="celebration"
              size={32}
              color={colors.primary}
            />
            <View style={styles.celebrationText}>
              <Text style={styles.celebrationTitle}>All tasks complete!</Text>
              <Text style={styles.celebrationSubtitle}>You&apos;re crushing it today 🔥</Text>
            </View>
          </View>
        )}

        <View style={styles.todayOverview}>
          <Text style={styles.sectionTitle}>Today at a glance</Text>
          
          <View style={styles.overviewGrid}>
            <View style={styles.overviewCard}>
              <View style={styles.overviewHeader}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.overviewLabel}>Tasks</Text>
              </View>
              <Text style={styles.overviewValue}>
                {completedTasksCount}
              </Text>
              <Text style={styles.overviewSubtext}>
                of {totalTasksCount}
              </Text>
            </View>

            <View style={styles.overviewCard}>
              <View style={styles.overviewHeader}>
                <IconSymbol
                  ios_icon_name="fork.knife"
                  android_material_icon_name="restaurant"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.overviewLabel}>Meals</Text>
              </View>
              <Text style={styles.overviewValue}>
                {mealsLogged}
              </Text>
              <Text style={styles.overviewSubtext}>
                logged
              </Text>
            </View>

            <View style={styles.overviewCard}>
              <View style={styles.overviewHeader}>
                <IconSymbol
                  ios_icon_name="flame.fill"
                  android_material_icon_name="local-fire-department"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.overviewLabel}>Calories</Text>
              </View>
              <Text style={styles.overviewValue}>
                {stats?.caloriesConsumed || 0}
              </Text>
              <Text style={styles.overviewSubtext}>
                of {stats?.dailyCalorieGoal || 2500}
              </Text>
            </View>
          </View>
        </View>

        {todayTasks.length > 0 && (
          <View style={styles.quickTasksSection}>
            <View style={styles.quickTasksHeader}>
              <Text style={styles.sectionTitle}>Quick tasks</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/focus')}>
                <Text style={styles.viewAllLink}>View all</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.quickTasksList}>
              {todayTasks.slice(0, 3).map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={styles.quickTaskItem}
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
                        size={12}
                        color="#fff"
                      />
                    )}
                  </View>
                  <Text style={[
                    styles.quickTaskText,
                    task.completed && styles.quickTaskTextCompleted,
                  ]}>
                    {task.title}
                  </Text>
                </TouchableOpacity>
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
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
  motivationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  motivationText: {
    flex: 1,
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.text,
    lineHeight: 20,
  },
  nextActionSection: {
    marginBottom: 32,
  },
  nextActionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  primaryAction: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  primaryActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    flex: 1,
  },
  primaryActionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  primaryActionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  secondaryActionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  celebrationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  celebrationText: {
    flex: 1,
  },
  celebrationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  celebrationSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  todayOverview: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  overviewGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  overviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  overviewValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  overviewSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  quickTasksSection: {
    marginBottom: 24,
  },
  quickTasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  quickTasksList: {
    gap: 10,
  },
  quickTaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    padding: 14,
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
  quickTaskText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  quickTaskTextCompleted: {
    textDecorationLine: 'line-through',
    color: colors.grey,
  },
});
