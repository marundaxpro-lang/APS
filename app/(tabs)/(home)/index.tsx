
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Animated,
  Pressable,
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
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

// ─── AnimatedPressable ────────────────────────────────────────────────────────
function AnimatedPressable({
  onPress,
  style,
  children,
  scaleValue = 0.97,
}: {
  onPress?: () => void;
  style?: any;
  children: React.ReactNode;
  scaleValue?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const animateIn = useCallback(() => {
    Animated.spring(scale, { toValue: scaleValue, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale, scaleValue]);
  const animateOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPressIn={animateIn} onPressOut={animateOut} onPress={onPress} style={style}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

// ─── Staggered list item ──────────────────────────────────────────────────────
function AnimatedItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 70, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 70, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

// ─── Muscle group chip ────────────────────────────────────────────────────────
function MuscleChip({ label }: { label: string }) {
  return (
    <View style={styles.muscleChip}>
      <Text style={styles.muscleChipText}>{label}</Text>
    </View>
  );
}

// ─── Duration badge ───────────────────────────────────────────────────────────
function DurationBadge({ label }: { label: string }) {
  return (
    <View style={styles.durationBadge}>
      <Text style={styles.durationBadgeText}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
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
    const types: Array<'user' | 'coach' | 'target' | 'streak' | 'recovery'> = ['user', 'coach', 'target', 'streak', 'recovery'];
    setMotivationCardType(types[Math.floor(Math.random() * types.length)]);
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
        setTodayTasks(updatedTasks.filter(task => task.dayOfWeek === today));
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

  const getDayWorkout = (dayIndex: number): WorkoutDay | null =>
    weeklyWorkouts.find(day => day.dayIndex === dayIndex) || null;

  const getNextThreeDays = () => {
    const todayIndex = new Date().getDay();
    const result = [];
    for (let i = 0; i < 3; i++) {
      const dayIndex = (todayIndex + i) % 7;
      result.push({ dayIndex, dayName: DAYS_SHORT[dayIndex], fullDayName: DAYS_FULL[dayIndex], isToday: i === 0, isTomorrow: i === 1 });
    }
    console.log('[Home] Next 3 days computed:', result.map(d => d.dayName));
    return result;
  };

  const getThisWeekWorkouts = () =>
    workoutHistory.filter(w => {
      const workoutDate = new Date(w.completedAt);
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return workoutDate >= weekStart;
    });

  const getDynamicContextLine = () => {
    const todayIndex = new Date().getDay();
    const todayWorkout = getDayWorkout(todayIndex);
    const completedTasksCount = todayTasks.filter(t => t.completed).length;
    const totalTasksCount = todayTasks.length;
    const mealsLogged = stats?.mealsLogged || 0;
    const thisWeekWorkouts = getThisWeekWorkouts();
    const workoutsThisWeek = thisWeekWorkouts.length;
    const totalWeeklyWorkouts = weeklyWorkouts.filter(w => w.exercises.length > 0).length;
    const workoutsRemaining = Math.max(0, totalWeeklyWorkouts - workoutsThisWeek);

    if (workoutsRemaining === 1) return "One workout away from completing this week.";
    if (todayWorkout) return `${todayWorkout.name} is on the schedule today.`;
    if (totalTasksCount > 0 && completedTasksCount < totalTasksCount) {
      const pending = totalTasksCount - completedTasksCount;
      return `${pending} task${pending === 1 ? '' : 's'} left to close out today.`;
    }
    if (mealsLogged === 0) return "Haven't logged a meal yet — start with breakfast.";
    if (workoutsThisWeek >= 5) return `${workoutsThisWeek} sessions in the bag this week.`;
    if (workoutsRemaining > 0) return `${workoutsRemaining} workout${workoutsRemaining === 1 ? '' : 's'} left this week.`;
    return "You're crushing it this week.";
  };

  const getMotivationCardContent = () => {
    const thisWeekWorkouts = getThisWeekWorkouts();
    const workoutsThisWeek = thisWeekWorkouts.length;
    const totalWeeklyWorkouts = weeklyWorkouts.filter(w => w.exercises.length > 0).length;
    const lastWorkout = workoutHistory.length > 0 ? workoutHistory[workoutHistory.length - 1] : null;
    const daysSinceLastWorkout = lastWorkout
      ? Math.floor((Date.now() - new Date(lastWorkout.completedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    switch (motivationCardType) {
      case 'user':
        if (userMotivation) {
          return { icon: 'favorite', text: `Your why: "${userMotivation}"`, color: colors.primary };
        }
        return { icon: 'lightbulb', text: COACH_INSIGHTS[Math.floor(Math.random() * COACH_INSIGHTS.length)], color: colors.orange };
      case 'coach':
        return { icon: 'lightbulb', text: COACH_INSIGHTS[Math.floor(Math.random() * COACH_INSIGHTS.length)], color: colors.orange };
      case 'target': {
        const remaining = totalWeeklyWorkouts - workoutsThisWeek;
        if (remaining > 0) {
          return { icon: 'flag', text: `${remaining} workout${remaining === 1 ? '' : 's'} left to hit your weekly target.`, color: colors.success };
        }
        return { icon: 'check-circle', text: `Weekly target complete — all ${totalWeeklyWorkouts} sessions done.`, color: colors.success };
      }
      case 'streak':
        if (workoutsThisWeek >= 3) {
          return { icon: 'local-fire-department', text: `${workoutsThisWeek} sessions this week. Keep the momentum.`, color: colors.warning };
        } else if (daysSinceLastWorkout > 3) {
          return { icon: 'warning', text: `${daysSinceLastWorkout} days since your last session. Time to get back.`, color: colors.orange };
        }
        return { icon: 'trending-up', text: `Building momentum — ${workoutsThisWeek} session${workoutsThisWeek === 1 ? '' : 's'} this week.`, color: colors.primary };
      case 'recovery': {
        const todayIndex = new Date().getDay();
        const todayWorkout = getDayWorkout(todayIndex);
        if (!todayWorkout) {
          return { icon: 'self-improvement', text: 'Rest day. Mobility, hydration, and sleep are training too.', color: '#9C27B0' };
        } else if (workoutsThisWeek >= 3) {
          return { icon: 'spa', text: "Training hard. Don't neglect sleep and recovery nutrition.", color: '#9C27B0' };
        }
        return { icon: 'self-improvement', text: 'Listen to your body. Recovery is where you get stronger.', color: '#9C27B0' };
      }
      default:
        return { icon: 'favorite', text: userMotivation || COACH_INSIGHTS[0], color: colors.primary };
    }
  };

  const getPrimaryAction = () => {
    const todayIndex = new Date().getDay();
    const todayWorkout = getDayWorkout(todayIndex);
    const completedTasksCount = todayTasks.filter(t => t.completed).length;
    const totalTasksCount = todayTasks.length;
    const mealsLogged = stats?.mealsLogged || 0;
    const lastWorkout = workoutHistory.length > 0 ? workoutHistory[workoutHistory.length - 1] : null;
    const daysSinceLastWorkout = lastWorkout
      ? Math.floor((Date.now() - new Date(lastWorkout.completedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const lastMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;
    const daysSinceWeighIn = lastMeasurement
      ? Math.floor((Date.now() - new Date(lastMeasurement.date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    if (daysSinceLastWorkout > 7) {
      return { title: 'Get back on track', subtitle: `${daysSinceLastWorkout} days since your last session`, icon: 'refresh', route: '/(tabs)/training' };
    }
    if (daysSinceWeighIn > 7) {
      return { title: 'Log your weigh-in', subtitle: 'Track this week\'s progress', icon: 'monitor-weight', route: '/(tabs)/progress' };
    }
    const todayDone = workoutHistory.filter(w => {
      const d = new Date(w.completedAt);
      return d.toDateString() === new Date().toDateString();
    }).length > 0;
    if (todayWorkout && !todayDone) {
      return { title: `Start ${todayWorkout.name}`, subtitle: `${todayWorkout.exercises.length} exercises ready`, icon: 'fitness-center', route: '/(tabs)/training' };
    }
    if (mealsLogged === 0) {
      const hour = new Date().getHours();
      const mealTime = hour < 10 ? 'Breakfast' : hour < 14 ? 'Lunch' : hour < 18 ? 'Snack' : 'Dinner';
      return { title: `Log ${mealTime}`, subtitle: 'Track your nutrition for today', icon: 'restaurant', route: '/(tabs)/nutrition' };
    }
    if (totalTasksCount > 0 && completedTasksCount < totalTasksCount) {
      return { title: 'Complete your tasks', subtitle: `${totalTasksCount - completedTasksCount} remaining today`, icon: 'check-circle', route: '/(tabs)/focus' };
    }
    const workoutsThisWeek = getThisWeekWorkouts().length;
    if (workoutsThisWeek >= 4) {
      return { title: 'Review recovery', subtitle: 'High training load — check your rest', icon: 'spa', route: '/(tabs)/plan' };
    }
    return { title: "Start today's workout", subtitle: 'Your session is ready', icon: 'fitness-center', route: '/(tabs)/training' };
  };

  const getProgressMetric = () => {
    const workoutsThisWeek = getThisWeekWorkouts().length;
    const totalWeeklyWorkouts = weeklyWorkouts.filter(w => w.exercises.length > 0).length;
    if (measurements.length >= 2) {
      const latest = measurements[measurements.length - 1];
      const previous = measurements[measurements.length - 2];
      const weightChange = Number(latest.weight) - Number(previous.weight);
      const changeText = weightChange > 0 ? `+${weightChange.toFixed(1)}` : weightChange.toFixed(1);
      return `Weight ${changeText} kg this month`;
    }
    if (workoutsThisWeek > 0) return `${workoutsThisWeek}/${totalWeeklyWorkouts} sessions this week`;
    const mealsLogged = stats?.mealsLogged || 0;
    if (mealsLogged > 0) return `${mealsLogged} meal${mealsLogged === 1 ? '' : 's'} logged today`;
    return 'View your progress';
  };

  const getWorkoutDuration = (workout: WorkoutDay): string => {
    const n = workout.exercises.length;
    if (n <= 4) return '30–40 min';
    if (n <= 6) return '45–55 min';
    return '60–75 min';
  };

  const getWorkoutMuscleGroups = (workout: WorkoutDay): string[] => {
    const name = workout.name.toLowerCase();
    if (name.includes('chest') || name.includes('push')) return ['Chest', 'Triceps', 'Shoulders'];
    if (name.includes('back') || name.includes('pull')) return ['Back', 'Biceps'];
    if (name.includes('leg') || name.includes('lower')) return ['Quads', 'Hamstrings', 'Glutes'];
    if (name.includes('shoulder')) return ['Shoulders', 'Traps'];
    if (name.includes('arm')) return ['Biceps', 'Triceps'];
    if (name.includes('full')) return ['Full Body'];
    return ['Strength'];
  };

  const getRestDayLabel = (dayIndex: number): { title: string; subtitle: string; icon: string } => {
    const options = [
      { title: 'Active Recovery', subtitle: '10 min foam roll + stretch', icon: 'self-improvement' },
      { title: 'Mobility & Stretch', subtitle: '15 min full-body flow', icon: 'spa' },
      { title: 'Rest & Recharge', subtitle: 'Light walk, hydrate, sleep early', icon: 'directions-walk' },
      { title: 'Active Recovery', subtitle: '20 min easy bike or swim', icon: 'directions-bike' },
    ];
    return options[dayIndex % options.length];
  };

  // ─── Greeting ───────────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  let greetingPrefix: string;
  let greetingSuffix: string;
  if (hour >= 5 && hour < 12) {
    greetingPrefix = 'Morning';
    greetingSuffix = "Let's make today count.";
  } else if (hour >= 12 && hour < 17) {
    greetingPrefix = 'Afternoon';
    greetingSuffix = 'Stay on track.';
  } else if (hour >= 17 && hour < 23) {
    greetingPrefix = 'Evening';
    greetingSuffix = 'Finish strong.';
  } else {
    greetingPrefix = 'Still up';
    greetingSuffix = 'Rest is training too.';
  }

  const greetingName = userName ? `, ${userName}` : '';
  const greetingLine = `${greetingPrefix}${greetingName}.`;

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
  const dynamicContextLine = getDynamicContextLine();
  const nextThreeDays = getNextThreeDays();
  const motivationContent = getMotivationCardContent();
  const primaryAction = getPrimaryAction();
  const progressMetric = getProgressMetric();
  const caloriesConsumed = stats?.caloriesConsumed || 0;
  const dailyCalorieGoal = stats?.dailyCalorieGoal || 2500;
  const mealsLogged = stats?.mealsLogged || 0;

  const caloriesValueText = caloriesConsumed > 0 ? String(caloriesConsumed) : '';
  const caloriesEmptyText = caloriesConsumed === 0 ? 'Log your first meal' : '';
  const mealsValueText = mealsLogged > 0 ? String(mealsLogged) : '';
  const mealsEmptyText = mealsLogged === 0 ? 'Nothing logged yet' : '';
  const tasksValueText = totalTasksCount > 0 ? `${completedTasksCount}/${totalTasksCount}` : '';
  const tasksEmptyText = totalTasksCount === 0 ? 'No tasks today' : '';

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{greetingLine}</Text>
          <Text style={styles.greetingSuffix}>{greetingSuffix}</Text>
          <Text style={styles.contextLine}>{dynamicContextLine}</Text>
        </View>
        <AnimatedPressable style={styles.profileButton} onPress={handleNavigateToProfile}>
          <IconSymbol
            ios_icon_name="person.circle.fill"
            android_material_icon_name="account-circle"
            size={40}
            color={colors.primary}
          />
        </AnimatedPressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Motivation banner ── */}
        <AnimatedItem index={0}>
          <AnimatedPressable
            style={styles.motivationCard}
            onPress={() => {
              console.log('[Home] User tapped motivation card — refreshing');
              determineMotivationCardType();
            }}
          >
            <IconSymbol
              ios_icon_name="heart.fill"
              android_material_icon_name={motivationContent.icon}
              size={18}
              color={motivationContent.color}
            />
            <Text style={styles.motivationText}>{motivationContent.text}</Text>
          </AnimatedPressable>
        </AnimatedItem>

        {/* ── Focus for today ── */}
        <AnimatedItem index={1}>
          <View style={styles.nextActionSection}>
            <Text style={styles.sectionLabel}>FOCUS FOR TODAY</Text>

            <AnimatedPressable
              style={styles.primaryAction}
              onPress={() => {
                console.log('[Home] User tapped primary action:', primaryAction.title, '→', primaryAction.route);
                router.push(primaryAction.route as any);
              }}
            >
              <View style={styles.primaryActionContent}>
                <View style={styles.primaryActionIcon}>
                  <IconSymbol
                    ios_icon_name="bolt.fill"
                    android_material_icon_name={primaryAction.icon}
                    size={28}
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
                size={20}
                color="rgba(255,255,255,0.7)"
              />
            </AnimatedPressable>

            <AnimatedPressable
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
                <Text style={styles.secondaryActionText}>Weekly Progress</Text>
                <Text style={styles.secondaryActionMetric}>{progressMetric}</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={16}
                color={colors.primary}
              />
            </AnimatedPressable>
          </View>
        </AnimatedItem>

        {/* ── Celebration ── */}
        {allTasksComplete && (
          <AnimatedItem index={2}>
            <View style={styles.celebrationCard}>
              <IconSymbol
                ios_icon_name="party.popper.fill"
                android_material_icon_name="celebration"
                size={28}
                color={colors.primary}
              />
              <View style={styles.celebrationText}>
                <Text style={styles.celebrationTitle}>All tasks complete</Text>
                <Text style={styles.celebrationSubtitle}>You're crushing it today</Text>
              </View>
            </View>
          </AnimatedItem>
        )}

        {/* ── Today at a glance ── */}
        <AnimatedItem index={2}>
          <View style={styles.glanceSection}>
            <Text style={styles.sectionTitle}>Today at a glance</Text>
            <View style={styles.glanceGrid}>
              {/* Calories */}
              <AnimatedPressable
                style={[styles.glanceCard, styles.glanceCardFeatured]}
                onPress={() => {
                  console.log('[Home] User tapped Calories glance card');
                  router.push('/(tabs)/nutrition');
                }}
              >
                <View style={styles.glanceCardHeader}>
                  <IconSymbol ios_icon_name="flame.fill" android_material_icon_name="local-fire-department" size={18} color={colors.primary} />
                  <Text style={styles.glanceLabel}>Calories</Text>
                </View>
                {caloriesConsumed > 0 ? (
                  <>
                    <Text style={styles.glanceValue}>{caloriesValueText}</Text>
                    <Text style={styles.glanceSubtext}>of {dailyCalorieGoal} kcal</Text>
                  </>
                ) : (
                  <Text style={styles.glanceEmptyText}>{caloriesEmptyText}</Text>
                )}
                <View style={styles.glanceTapHint}>
                  <Text style={styles.glanceTapHintText}>Tap to log</Text>
                  <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={10} color={colors.primary} />
                </View>
              </AnimatedPressable>

              <View style={styles.glanceColumn}>
                {/* Meals */}
                <AnimatedPressable
                  style={styles.glanceCard}
                  onPress={() => {
                    console.log('[Home] User tapped Meals glance card');
                    router.push('/(tabs)/nutrition');
                  }}
                >
                  <View style={styles.glanceCardHeader}>
                    <IconSymbol ios_icon_name="fork.knife" android_material_icon_name="restaurant" size={16} color={colors.primary} />
                    <Text style={styles.glanceLabel}>Meals</Text>
                  </View>
                  {mealsLogged > 0 ? (
                    <Text style={styles.glanceValueSmall}>{mealsValueText}</Text>
                  ) : (
                    <Text style={styles.glanceEmptyTextSmall}>{mealsEmptyText}</Text>
                  )}
                </AnimatedPressable>

                {/* Tasks */}
                <AnimatedPressable
                  style={styles.glanceCard}
                  onPress={() => {
                    console.log('[Home] User tapped Tasks glance card');
                    router.push('/(tabs)/focus');
                  }}
                >
                  <View style={styles.glanceCardHeader}>
                    <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check-circle" size={16} color={colors.primary} />
                    <Text style={styles.glanceLabel}>Tasks</Text>
                  </View>
                  {totalTasksCount > 0 ? (
                    <Text style={styles.glanceValueSmall}>{tasksValueText}</Text>
                  ) : (
                    <Text style={styles.glanceEmptyTextSmall}>{tasksEmptyText}</Text>
                  )}
                </AnimatedPressable>
              </View>
            </View>
          </View>
        </AnimatedItem>

        {/* ── Next 3 Days ── */}
        {weeklyWorkouts.length > 0 && (
          <AnimatedItem index={3}>
            <View style={styles.weeklyPlanSection}>
              <View style={styles.weeklyPlanHeader}>
                <Text style={styles.sectionTitle}>Next 3 Days</Text>
                <AnimatedPressable onPress={handleViewFullPlan}>
                  <Text style={styles.viewAllLink}>Full plan</Text>
                </AnimatedPressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.weeklyPlanScrollContent}
              >
                {nextThreeDays.map((dayInfo, index) => {
                  const workout = getDayWorkout(dayInfo.dayIndex);
                  const duration = workout ? getWorkoutDuration(workout) : '';
                  const muscleGroups = workout ? getWorkoutMuscleGroups(workout) : [];
                  const restInfo = !workout ? getRestDayLabel(dayInfo.dayIndex) : null;
                  const dayLabel = dayInfo.isToday ? 'Today' : dayInfo.isTomorrow ? 'Tomorrow' : dayInfo.fullDayName;

                  return (
                    <AnimatedPressable
                      key={index}
                      style={[
                        styles.weekDayCard,
                        dayInfo.isToday && styles.weekDayCardToday,
                        !workout && styles.weekDayCardRest,
                      ]}
                      onPress={() => {
                        console.log('[Home] User tapped day card:', dayInfo.dayName, workout ? 'workout' : 'rest');
                        if (workout) {
                          router.push('/(tabs)/training');
                        } else {
                          router.push('/(tabs)/plan');
                        }
                      }}
                    >
                      {/* Day label */}
                      <View style={styles.weekDayTop}>
                        <Text style={[styles.weekDayLabel, dayInfo.isToday && styles.weekDayLabelToday]}>
                          {dayLabel}
                        </Text>
                        {workout && <DurationBadge label={duration} />}
                      </View>

                      {/* Icon */}
                      <View style={styles.weekDayIconContainer}>
                        <IconSymbol
                          ios_icon_name={workout ? 'figure.strengthtraining.traditional' : 'figure.walk'}
                          android_material_icon_name={workout ? 'fitness-center' : (restInfo?.icon || 'self-improvement')}
                          size={36}
                          color={workout ? (dayInfo.isToday ? colors.primary : colors.textSecondary) : colors.grey}
                        />
                      </View>

                      {/* Name */}
                      {workout ? (
                        <Text style={[styles.weekDayWorkout, dayInfo.isToday && styles.weekDayWorkoutToday]} numberOfLines={1}>
                          {workout.name}
                        </Text>
                      ) : (
                        <Text style={styles.weekDayRestTitle}>{restInfo?.title}</Text>
                      )}

                      {/* Muscle chips or rest subtitle */}
                      {workout ? (
                        <View style={styles.muscleChipsRow}>
                          {muscleGroups.slice(0, 2).map((m) => (
                            <MuscleChip key={m} label={m} />
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.weekDayRestSubtitle} numberOfLines={2}>{restInfo?.subtitle}</Text>
                      )}

                      {/* Chevron */}
                      <View style={styles.weekDayChevron}>
                        <IconSymbol
                          ios_icon_name="chevron.right"
                          android_material_icon_name="chevron-right"
                          size={12}
                          color={dayInfo.isToday ? colors.primary : colors.grey}
                        />
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </ScrollView>
            </View>
          </AnimatedItem>
        )}

        {/* ── Quick tasks ── */}
        {todayTasks.length > 0 && (
          <AnimatedItem index={4}>
            <View style={styles.quickTasksSection}>
              <View style={styles.quickTasksHeader}>
                <Text style={styles.sectionTitle}>Quick tasks</Text>
                <AnimatedPressable onPress={() => {
                  console.log('[Home] User tapped View all tasks');
                  router.push('/(tabs)/focus');
                }}>
                  <Text style={styles.viewAllLink}>View all</Text>
                </AnimatedPressable>
              </View>

              <View style={styles.quickTasksList}>
                {todayTasks.slice(0, 3).map((task, i) => (
                  <AnimatedItem key={task.id} index={i}>
                    <AnimatedPressable
                      style={styles.quickTaskItem}
                      onPress={() => toggleTask(task.id)}
                    >
                      <View style={[styles.taskCheckbox, task.completed && styles.taskCheckboxCompleted]}>
                        {task.completed && (
                          <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={11} color="#fff" />
                        )}
                      </View>
                      <Text style={[styles.quickTaskText, task.completed && styles.quickTaskTextCompleted]}>
                        {task.title}
                      </Text>
                      <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={14} color={colors.grey} />
                    </AnimatedPressable>
                  </AnimatedItem>
                ))}
              </View>
            </View>
          </AnimatedItem>
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
    alignItems: 'flex-start',
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  greetingSuffix: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  contextLine: {
    fontSize: 14,
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
    gap: 28,
  },
  // Motivation
  motivationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(69, 155, 155, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: 12,
    padding: 14,
  },
  motivationText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    fontWeight: '500',
  },
  // Section labels
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.grey,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  // Next action
  nextActionSection: {},
  primaryAction: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  primaryActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  primaryActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    flex: 1,
  },
  primaryActionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  primaryActionSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  secondaryActionTextContainer: {
    flex: 1,
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  secondaryActionMetric: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Celebration
  celebrationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(69, 155, 155, 0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(69, 155, 155, 0.25)',
    padding: 16,
  },
  celebrationText: {
    flex: 1,
  },
  celebrationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  celebrationSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  // Today at a glance
  glanceSection: {},
  glanceGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  glanceCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    justifyContent: 'space-between',
  },
  glanceCardFeatured: {
    flex: 1,
    borderColor: 'rgba(69, 155, 155, 0.3)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  glanceColumn: {
    flex: 1,
    gap: 10,
  },
  glanceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  glanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  glanceValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  glanceValueSmall: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  glanceSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  glanceEmptyText: {
    fontSize: 13,
    color: colors.grey,
    fontWeight: '500',
    lineHeight: 18,
    flex: 1,
    marginBottom: 8,
  },
  glanceEmptyTextSmall: {
    fontSize: 11,
    color: colors.grey,
    fontWeight: '500',
    lineHeight: 16,
    flex: 1,
  },
  glanceTapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  glanceTapHintText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  // Weekly plan
  weeklyPlanSection: {
    marginHorizontal: -20,
  },
  weeklyPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 20,
  },
  weeklyPlanScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  weekDayCard: {
    width: 156,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  weekDayCardToday: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: 'rgba(69, 155, 155, 0.08)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  weekDayCardRest: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  weekDayTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  weekDayLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  weekDayLabelToday: {
    color: colors.primary,
  },
  weekDayIconContainer: {
    marginBottom: 10,
  },
  weekDayWorkout: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  weekDayWorkoutToday: {
    color: colors.primary,
  },
  weekDayRestTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  weekDayRestSubtitle: {
    fontSize: 11,
    color: colors.grey,
    lineHeight: 15,
    marginBottom: 8,
  },
  muscleChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  muscleChip: {
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  muscleChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  durationBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  weekDayChevron: {
    alignItems: 'flex-end',
  },
  // Quick tasks
  quickTasksSection: {},
  quickTasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  quickTasksList: {
    gap: 8,
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
    borderWidth: 1.5,
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
