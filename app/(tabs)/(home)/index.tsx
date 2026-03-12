
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
import { WeeklyTask, FitnessProfile, WorkoutDay } from '@/types/fitness';
import { generateWorkoutSplit } from '@/data/workouts';

interface DashboardStats {
  dailyCalorieGoal: number;
  caloriesConsumed: number;
  caloriesRemaining: number;
  percentageConsumed: number;
  goalMet: boolean;
  mealsLogged: number;
  lastUpdated: string;
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const COACH_INSIGHTS = [
  "Consistency beats intensity. Show up, even when it's hard.",
  "Recovery is where the magic happens. Don't skip rest days.",
  "Small daily improvements lead to stunning long-term results.",
  "Your body achieves what your mind believes.",
  "Progress isn't linear. Trust the process.",
  "The best workout is the one you actually do.",
  "Nutrition fuels performance. You can't out-train a bad diet.",
  "Sleep is your secret weapon for gains.",
];

export default function HomeScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Athlete');
  const [todayTasks, setTodayTasks] = useState<WeeklyTask[]>([]);
  const [userMotivation, setUserMotivation] = useState('');
  const [weeklyWorkouts, setWeeklyWorkouts] = useState<WorkoutDay[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [motivationCardType, setMotivationCardType] = useState<'user' | 'coach' | 'target' | 'streak' | 'recovery'>('user');

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

        const workoutSplit = generateWorkoutSplit(profile);
        console.log('[Home] Generated weekly workout split:', workoutSplit);
        setWeeklyWorkouts(workoutSplit);
      }

      const motivationData = await AsyncStorage.getItem('userMotivation');
      if (motivationData) {
        const parsed = JSON.parse(motivationData);
        const motivationText = parsed.customText || parsed.chips?.join(', ') || '';
        setUserMotivation(motivationText);
      }
      
      const tasksData = await AsyncStorage.getItem('focusTasks');
      if (tasksData) {
        const allTasks: WeeklyTask[] = JSON.parse(tasksData);
        const today = new Date().getDay();
        const tasksForToday = allTasks.filter(task => task.dayOfWeek === today);
        setTodayTasks(tasksForToday);
        console.log('[Home] Loaded tasks for today:', tasksForToday.length);
      }

      const historyData = await AsyncStorage.getItem('workoutHistory');
      if (historyData) {
        const history = JSON.parse(historyData);
        setWorkoutHistory(history);
        console.log('[Home] Loaded workout history:', history.length);
      }

      const measurementsData = await AsyncStorage.getItem('measurements');
      if (measurementsData) {
        const parsed = JSON.parse(measurementsData);
        setMeasurements(parsed);
        console.log('[Home] Loaded measurements:', parsed.length);
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

      determineMotivationCardType();
    } catch (error) {
      console.error('[Home] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const determineMotivationCardType = () => {
    const types: ('user' | 'coach' | 'target' | 'streak' | 'recovery')[] = ['user', 'coach', 'target', 'streak', 'recovery'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    setMotivationCardType(randomType);
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

  const handleViewFullPlan = () => {
    console.log('[Home] User tapped View Full Plan');
    router.push('/(tabs)/plan');
  };

  const getDayWorkout = (dayIndex: number): WorkoutDay | null => {
    return weeklyWorkouts.find(day => day.dayIndex === dayIndex) || null;
  };

  const getNextThreeDays = () => {
    const todayIndex = new Date().getDay();
    const nextThreeDays = [];
    
    for (let i = 0; i < 3; i++) {
      const dayIndex = (todayIndex + i) % 7;
      nextThreeDays.push({
        dayIndex,
        dayName: DAYS_SHORT[dayIndex],
        isToday: i === 0,
      });
    }
    
    console.log('[Home] Next 3 days:', nextThreeDays);
    return nextThreeDays;
  };

  const getDynamicContextLine = () => {
    const todayIndex = new Date().getDay();
    const todayWorkout = getDayWorkout(todayIndex);
    const completedTasksCount = todayTasks.filter(t => t.completed).length;
    const totalTasksCount = todayTasks.length;
    const mealsLogged = stats?.mealsLogged || 0;

    const thisWeekWorkouts = workoutHistory.filter(w => {
      const workoutDate = new Date(w.completedAt);
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return workoutDate >= weekStart;
    });

    const workoutsThisWeek = thisWeekWorkouts.length;
    const totalWeeklyWorkouts = weeklyWorkouts.filter(w => w.exercises.length > 0).length;
    const workoutsRemaining = Math.max(0, totalWeeklyWorkouts - workoutsThisWeek);

    if (workoutsRemaining === 1) {
      return "You're 1 workout away from completing this week 💪";
    }

    if (todayWorkout) {
      const workoutName = todayWorkout.name;
      return `Today is your scheduled ${workoutName} 🔥`;
    }

    if (totalTasksCount > 0 && completedTasksCount < totalTasksCount) {
      const pendingTasks = totalTasksCount - completedTasksCount;
      const taskText = pendingTasks === 1 ? 'task' : 'tasks';
      return `You have ${pendingTasks} pending ${taskText} today`;
    }

    if (mealsLogged === 0) {
      return "You have 1 pending meal log today 🍽️";
    }

    if (workoutsThisWeek >= 5) {
      return `You're on a ${workoutsThisWeek}-day consistency streak 🔥`;
    }

    if (workoutsRemaining > 0) {
      return `${workoutsRemaining} workouts left this week`;
    }

    return "You're crushing it this week! 🎯";
  };

  const getMotivationCardContent = () => {
    const thisWeekWorkouts = workoutHistory.filter(w => {
      const workoutDate = new Date(w.completedAt);
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return workoutDate >= weekStart;
    });
    const workoutsThisWeek = thisWeekWorkouts.length;
    const totalWeeklyWorkouts = weeklyWorkouts.filter(w => w.exercises.length > 0).length;

    const lastWorkout = workoutHistory.length > 0 ? workoutHistory[workoutHistory.length - 1] : null;
    const daysSinceLastWorkout = lastWorkout ? Math.floor((Date.now() - new Date(lastWorkout.completedAt).getTime()) / (1000 * 60 * 60 * 24)) : 999;

    switch (motivationCardType) {
      case 'user':
        if (userMotivation) {
          return {
            icon: 'favorite',
            text: `Your why: "${userMotivation}"`,
            color: colors.primary,
          };
        }
        return {
          icon: 'lightbulb',
          text: COACH_INSIGHTS[Math.floor(Math.random() * COACH_INSIGHTS.length)],
          color: '#FFA500',
        };
      
      case 'coach':
        return {
          icon: 'lightbulb',
          text: COACH_INSIGHTS[Math.floor(Math.random() * COACH_INSIGHTS.length)],
          color: '#FFA500',
        };
      
      case 'target':
        const remaining = totalWeeklyWorkouts - workoutsThisWeek;
        if (remaining > 0) {
          return {
            icon: 'flag',
            text: `Weekly target: ${remaining} workout${remaining === 1 ? '' : 's'} remaining to hit your goal`,
            color: '#4CAF50',
          };
        }
        return {
          icon: 'check-circle',
          text: `Weekly target complete! You've hit all ${totalWeeklyWorkouts} workouts this week 🎯`,
          color: '#4CAF50',
        };
      
      case 'streak':
        if (workoutsThisWeek >= 3) {
          return {
            icon: 'local-fire-department',
            text: `${workoutsThisWeek}-day streak! Keep the momentum going 🔥`,
            color: '#FF5722',
          };
        } else if (daysSinceLastWorkout > 3) {
          return {
            icon: 'warning',
            text: `It's been ${daysSinceLastWorkout} days since your last workout. Time to get back on track!`,
            color: '#FF9800',
          };
        }
        return {
          icon: 'trending-up',
          text: `You're building momentum. ${workoutsThisWeek} workout${workoutsThisWeek === 1 ? '' : 's'} this week!`,
          color: colors.primary,
        };
      
      case 'recovery':
        const todayIndex = new Date().getDay();
        const todayWorkout = getDayWorkout(todayIndex);
        if (!todayWorkout) {
          return {
            icon: 'self-improvement',
            text: 'Rest day: Focus on mobility, hydration, and quality sleep for optimal recovery',
            color: '#9C27B0',
          };
        } else if (workoutsThisWeek >= 3) {
          return {
            icon: 'spa',
            text: 'You're training hard. Don't forget to prioritize sleep and nutrition for recovery',
            color: '#9C27B0',
          };
        }
        return {
          icon: 'self-improvement',
          text: 'Listen to your body. Recovery is when you get stronger',
          color: '#9C27B0',
        };
      
      default:
        return {
          icon: 'favorite',
          text: userMotivation || COACH_INSIGHTS[0],
          color: colors.primary,
        };
    }
  };

  const getPrimaryAction = () => {
    const todayIndex = new Date().getDay();
    const todayWorkout = getDayWorkout(todayIndex);
    const completedTasksCount = todayTasks.filter(t => t.completed).length;
    const totalTasksCount = todayTasks.length;
    const mealsLogged = stats?.mealsLogged || 0;

    const lastWorkout = workoutHistory.length > 0 ? workoutHistory[workoutHistory.length - 1] : null;
    const daysSinceLastWorkout = lastWorkout ? Math.floor((Date.now() - new Date(lastWorkout.completedAt).getTime()) / (1000 * 60 * 60 * 24)) : 999;

    const lastMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;
    const daysSinceWeighIn = lastMeasurement ? Math.floor((Date.now() - new Date(lastMeasurement.date).getTime()) / (1000 * 60 * 60 * 24)) : 999;

    if (daysSinceLastWorkout > 7) {
      return {
        title: 'Resume After Break',
        subtitle: `It's been ${daysSinceLastWorkout} days. Let's get back on track`,
        icon: 'refresh',
        route: '/(tabs)/plan',
      };
    }

    if (daysSinceWeighIn > 7) {
      return {
        title: 'Complete Your Weigh-In',
        subtitle: 'Track your progress this week',
        icon: 'monitor-weight',
        route: '/(tabs)/progress',
      };
    }

    if (todayWorkout && workoutHistory.filter(w => {
      const workoutDate = new Date(w.completedAt);
      const today = new Date();
      return workoutDate.toDateString() === today.toDateString();
    }).length === 0) {
      return {
        title: `Do Today's ${todayWorkout.name}`,
        subtitle: `${todayWorkout.exercises.length} exercises ready`,
        icon: 'fitness-center',
        route: '/(tabs)/plan',
      };
    }

    if (mealsLogged === 0) {
      const hour = new Date().getHours();
      const mealTime = hour < 10 ? 'Breakfast' : hour < 14 ? 'Lunch' : hour < 18 ? 'Snack' : 'Dinner';
      return {
        title: `Log ${mealTime}`,
        subtitle: 'Track your nutrition for today',
        icon: 'restaurant',
        route: '/(tabs)/nutrition',
      };
    }

    if (totalTasksCount > 0 && completedTasksCount < totalTasksCount) {
      return {
        title: 'Complete Your Tasks',
        subtitle: `${totalTasksCount - completedTasksCount} tasks remaining`,
        icon: 'check-circle',
        route: '/(tabs)/plan',
      };
    }

    const thisWeekWorkouts = workoutHistory.filter(w => {
      const workoutDate = new Date(w.completedAt);
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return workoutDate >= weekStart;
    });
    const workoutsThisWeek = thisWeekWorkouts.length;

    if (workoutsThisWeek >= 4) {
      return {
        title: 'Review Recovery',
        subtitle: 'You're training hard. Check your rest needs',
        icon: 'spa',
        route: '/(tabs)/plan',
      };
    }

    return {
      title: 'Start Today\'s Workout',
      subtitle: 'Your workout is ready',
      icon: 'fitness-center',
      route: '/(tabs)/plan',
    };
  };

  const getProgressMetric = () => {
    const thisWeekWorkouts = workoutHistory.filter(w => {
      const workoutDate = new Date(w.completedAt);
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return workoutDate >= weekStart;
    });
    const workoutsThisWeek = thisWeekWorkouts.length;
    const totalWeeklyWorkouts = weeklyWorkouts.filter(w => w.exercises.length > 0).length;

    if (measurements.length >= 2) {
      const latest = measurements[measurements.length - 1];
      const previous = measurements[measurements.length - 2];
      const weightChange = latest.weight - previous.weight;
      const changeText = weightChange > 0 ? `+${weightChange.toFixed(1)}` : weightChange.toFixed(1);
      return `Weight: ${changeText} kg this month`;
    }

    if (workoutsThisWeek > 0) {
      return `Workouts: ${workoutsThisWeek}/${totalWeeklyWorkouts} this week`;
    }

    const mealsLogged = stats?.mealsLogged || 0;
    if (mealsLogged > 0) {
      return `Nutrition: ${mealsLogged} meals logged today`;
    }

    return 'Track your progress';
  };

  const getWorkoutDuration = (workout: WorkoutDay): string => {
    const exerciseCount = workout.exercises.length;
    if (exerciseCount <= 4) return '30-40 min';
    if (exerciseCount <= 6) return '45-55 min';
    return '60-75 min';
  };

  const getWorkoutEmphasis = (workout: WorkoutDay): string => {
    const exerciseCount = workout.exercises.length;
    if (exerciseCount <= 4) return 'Light';
    if (exerciseCount <= 6) return 'Moderate';
    return 'Intense';
  };

  const getRestDayActivity = (dayIndex: number): { activity: string; icon: string } => {
    const activities = [
      { activity: 'Active recovery: 20-min walk', icon: 'directions-walk' },
      { activity: 'Mobility: 15-min stretching', icon: 'self-improvement' },
      { activity: 'Light cardio: 30-min bike', icon: 'directions-bike' },
      { activity: 'Recovery: Foam rolling', icon: 'spa' },
    ];
    return activities[dayIndex % activities.length];
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
  const allTasksComplete = totalTasksCount > 0 && completedTasksCount === totalTasksCount;

  const greetingTime = new Date().getHours();
  const greetingText = greetingTime < 12 ? 'Good morning' : 
                      greetingTime < 18 ? 'Good afternoon' : 
                      'Good evening';

  const dynamicContextLine = getDynamicContextLine();
  const nextThreeDays = getNextThreeDays();
  const motivationContent = getMotivationCardContent();
  const primaryAction = getPrimaryAction();
  const progressMetric = getProgressMetric();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{greetingText},</Text>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.contextLine}>{dynamicContextLine}</Text>
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
        <TouchableOpacity 
          style={styles.motivationCard}
          onPress={determineMotivationCardType}
          activeOpacity={0.8}
        >
          <IconSymbol
            ios_icon_name="heart.fill"
            android_material_icon_name={motivationContent.icon}
            size={20}
            color={motivationContent.color}
          />
          <Text style={styles.motivationText}>{motivationContent.text}</Text>
        </TouchableOpacity>

        <View style={styles.nextActionSection}>
          <Text style={styles.nextActionLabel}>Your next move</Text>
          
          <TouchableOpacity 
            style={styles.primaryAction}
            onPress={() => {
              console.log('[Home] User tapped primary action:', primaryAction.route);
              router.push(primaryAction.route as any);
            }}
          >
            <View style={styles.primaryActionContent}>
              <View style={styles.primaryActionIcon}>
                <IconSymbol
                  ios_icon_name="bolt.fill"
                  android_material_icon_name={primaryAction.icon}
                  size={32}
                  color="#fff"
                />
              </View>
              <View style={styles.primaryActionText}>
                <Text style={styles.primaryActionTitle}>{primaryAction.title}</Text>
                <Text style={styles.primaryActionSubtitle}>{primaryAction.subtitle}</Text>
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
              console.log('[Home] User tapped View Progress');
              router.push('/(tabs)/progress');
            }}
          >
            <IconSymbol
              ios_icon_name="chart.line.uptrend.xyaxis"
              android_material_icon_name="show-chart"
              size={20}
              color={colors.primary}
            />
            <View style={styles.secondaryActionTextContainer}>
              <Text style={styles.secondaryActionText}>Check Weekly Progress</Text>
              <Text style={styles.secondaryActionMetric}>{progressMetric}</Text>
            </View>
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

        {weeklyWorkouts.length > 0 && (
          <View style={styles.weeklyPlanSection}>
            <View style={styles.weeklyPlanHeader}>
              <Text style={styles.sectionTitle}>Next 3 Days</Text>
              <TouchableOpacity onPress={handleViewFullPlan}>
                <Text style={styles.viewAllLink}>View Full Plan</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weeklyPlanScrollContent}
            >
              {nextThreeDays.map((dayInfo, index) => {
                const workout = getDayWorkout(dayInfo.dayIndex);
                const duration = workout ? getWorkoutDuration(workout) : '';
                const emphasis = workout ? getWorkoutEmphasis(workout) : '';
                const restActivity = !workout ? getRestDayActivity(dayInfo.dayIndex) : null;

                const workoutIconElement = workout ? (
                  <View style={styles.weekDayIconContainer}>
                    <IconSymbol
                      ios_icon_name="figure.strengthtraining.traditional"
                      android_material_icon_name="fitness-center"
                      size={40}
                      color={dayInfo.isToday ? colors.primary : colors.textSecondary}
                    />
                  </View>
                ) : (
                  <View style={styles.weekDayIconContainer}>
                    <IconSymbol
                      ios_icon_name="bed.double.fill"
                      android_material_icon_name={restActivity?.icon || 'hotel'}
                      size={40}
                      color={colors.grey}
                    />
                  </View>
                );

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.weekDayCard,
                      dayInfo.isToday && styles.weekDayCardToday,
                      !workout && styles.weekDayCardRest,
                    ]}
                    onPress={() => {
                      console.log('[Home] User tapped day card:', dayInfo.dayName);
                      router.push('/(tabs)/plan');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.weekDayLabel,
                      dayInfo.isToday && styles.weekDayLabelToday,
                    ]}>
                      {dayInfo.dayName}
                    </Text>
                    {workoutIconElement}
                    {workout ? (
                      <>
                        <Text
                          style={[
                            styles.weekDayWorkout,
                            dayInfo.isToday && styles.weekDayWorkoutToday,
                          ]}
                          numberOfLines={1}
                        >
                          {workout?.name}
                        </Text>
                        <Text style={styles.weekDayDuration}>{duration}</Text>
                        <Text style={styles.weekDayEmphasis}>{emphasis}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.weekDayRest}>Rest</Text>
                        {restActivity && (
                          <Text style={styles.weekDayRestActivity}>{restActivity.activity}</Text>
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
                {stats?.mealsLogged || 0}
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
              <TouchableOpacity onPress={() => router.push('/(tabs)/plan')}>
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
    marginBottom: 6,
  },
  contextLine: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
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
    color: colors.text,
    lineHeight: 20,
    fontWeight: '500',
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
  secondaryActionTextContainer: {
    flex: 1,
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  secondaryActionMetric: {
    fontSize: 13,
    color: colors.textSecondary,
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
  weeklyPlanSection: {
    marginBottom: 32,
    marginHorizontal: -20,
  },
  weeklyPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  weeklyPlanScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  weekDayCard: {
    width: 140,
    height: 180,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekDayCardToday: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
  },
  weekDayCardRest: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  weekDayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  weekDayLabelToday: {
    color: colors.primary,
  },
  weekDayIconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDayWorkout: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  weekDayWorkoutToday: {
    color: colors.primary,
  },
  weekDayDuration: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  weekDayEmphasis: {
    fontSize: 11,
    color: colors.grey,
    textAlign: 'center',
    marginTop: 2,
  },
  weekDayRest: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.grey,
    textAlign: 'center',
    marginTop: 8,
  },
  weekDayRestActivity: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 14,
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
