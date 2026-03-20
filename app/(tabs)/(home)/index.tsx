
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import {
  Play,
  Zap,
  Apple,
  Target,
  ChevronRight,
  Dumbbell,
  Clock,
  Flame,
  Moon,
  Brain,
  Plus,
  X,
} from 'lucide-react-native';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: '#0A0A0F',
  card: '#12121A',
  teal: '#00D4AA',
  tealMuted: 'rgba(0,212,170,0.10)',
  tealBorder: 'rgba(0,212,170,0.18)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.5)',
  border: 'rgba(255,255,255,0.08)',
  surface2: '#1A1A24',
};

// ─── Storage keys ──────────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  fitnessProfile: 'fitnessProfile',
  appTourSeen: 'appTourSeen',
  onboardingJustCompleted: 'onboardingJustCompleted',
  userTasks: 'userTasks',
};

// ─── Types ─────────────────────────────────────────────────────────────────────
interface FitnessProfile {
  name?: string;
  primaryGoal?: string;
  selectedDays?: number[];
  sessionLength?: string;
  equipmentType?: string;
  trainingConfidence?: string;
  trainingExperience?: string;
}

interface WorkoutInfo {
  name: string;
  type: string;
  focus: string;
  color: string;
  duration: string;
  exerciseCount: number;
  equipment: string;
}

interface WeekDay {
  dayName: string;
  dayId: number;
  isToday: boolean;
  isTraining: boolean;
  isPast: boolean;
}

interface Task {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

// ─── Workout generation ────────────────────────────────────────────────────────
function getTodayWorkout(profile: FitnessProfile): WorkoutInfo | null {
  const today = new Date().getDay();
  const isTrainingDay = profile.selectedDays?.includes(today);
  if (!isTrainingDay) return null;

  const goal = profile.primaryGoal || 'build-muscle';
  const equipment = profile.equipmentType || 'gym';
  const experience = profile.trainingExperience || 'beginner';

  const workoutTypes: Record<string, { name: string; type: string; focus: string; color: string }> = {
    'lose-fat': { name: 'Fat Burn Circuit', type: 'HIIT', focus: 'Full Body', color: '#FF6B6B' },
    'build-muscle': { name: 'Hypertrophy Session', type: 'Strength', focus: 'Progressive Overload', color: '#00D4AA' },
    'get-stronger': { name: 'Strength Block', type: 'Powerlifting', focus: 'Compound Lifts', color: '#FFB347' },
    'improve-endurance': { name: 'Conditioning Work', type: 'Cardio', focus: 'Stamina', color: '#87CEEB' },
    'increase-flexibility': { name: 'Mobility Flow', type: 'Flexibility', focus: 'Range of Motion', color: '#DDA0DD' },
  };

  const sessionMap: Record<string, string> = {
    '20-30': '25 min',
    '30-45': '38 min',
    '45-60': '52 min',
    '60+': '65 min',
  };
  const duration = sessionMap[profile.sessionLength || ''] || '45 min';
  const exerciseCount = experience === 'beginner' ? 4 : experience === 'intermediate' ? 5 : 6;
  const wt = workoutTypes[goal] || workoutTypes['build-muscle'];

  return {
    ...wt,
    duration,
    exerciseCount,
    equipment:
      equipment === 'gym' ? 'Full Gym' : equipment === 'home' ? 'Home Equipment' : 'Bodyweight',
  };
}

function getWeekSchedule(profile: FitnessProfile): WeekDay[] {
  const today = new Date().getDay();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const orderedIds = [1, 2, 3, 4, 5, 6, 0];

  return orderedIds.map((dayId) => {
    const isToday = dayId === today;
    const todayMon = today === 0 ? 6 : today - 1;
    const thisMon = dayId === 0 ? 6 : dayId - 1;
    const isPast = thisMon < todayMon;

    return {
      dayName: dayNames[dayId],
      dayId,
      isToday,
      isTraining: profile.selectedDays?.includes(dayId) ?? false,
      isPast,
    };
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

const GOAL_LABELS: Record<string, string> = {
  'lose-fat': 'Lose Fat',
  'build-muscle': 'Build Muscle',
  'get-stronger': 'Get Stronger',
  'improve-endurance': 'Endurance',
  'increase-flexibility': 'Flexibility',
};

const GOAL_DESCRIPTIONS: Record<string, string> = {
  'lose-fat': 'Your plan is optimised for fat loss with high-intensity circuits and calorie-burning sessions.',
  'build-muscle': 'Your plan focuses on progressive overload and hypertrophy to maximise muscle growth.',
  'get-stronger': 'Your plan is built around compound lifts and strength progression.',
  'improve-endurance': 'Your plan builds cardiovascular capacity and stamina over time.',
  'increase-flexibility': 'Your plan incorporates mobility work and flexibility training.',
};

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonLine({ width, height = 14 }: { width: number | string; height?: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.65, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: height / 2,
        backgroundColor: C.surface2,
        opacity,
      }}
    />
  );
}

function LoadingSkeleton() {
  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 8 }}>
        <SkeletonLine width={120} height={14} />
        <SkeletonLine width={200} height={28} />
      </View>
      <View style={[styles.card, { gap: 14 }]}>
        <SkeletonLine width={100} height={11} />
        <SkeletonLine width="80%" height={26} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SkeletonLine width={80} height={28} />
          <SkeletonLine width={80} height={28} />
          <SkeletonLine width={80} height={28} />
        </View>
        <SkeletonLine width="100%" height={48} />
      </View>
      <View style={{ gap: 8 }}>
        <SkeletonLine width={80} height={11} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonLine key={i} width={36} height={52} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Fade section ──────────────────────────────────────────────────────────────
function FadeSection({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay: index * 70, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 380, delay: index * 70, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

// ─── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

// ─── Tour overlay ──────────────────────────────────────────────────────────────
const TOUR_STEPS = [
  {
    title: "Your workout, personalised",
    body: "Every session is tailored to your goals, equipment, and experience level. Tap Start Workout to begin.",
    cta: "See Training →",
    route: "/(tabs)/training",
  },
  {
    title: "Track your momentum",
    body: "Your streaks, habits, and weekly progress all live in Momentum. Stay consistent and watch it grow.",
    cta: "See Momentum →",
    route: "/(tabs)/momentum",
  },
  {
    title: "Quick actions",
    body: "Jump to AI Coach, Nutrition, or Habits from your home screen anytime.",
    cta: "Let's go →",
    route: null,
  },
];

function TourOverlay({
  step,
  onNext,
  onSkip,
  router,
}: {
  step: number;
  onNext: () => void;
  onSkip: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const tourStep = TOUR_STEPS[step - 1];
  if (!tourStep) return null;

  const isLast = step >= TOUR_STEPS.length;

  const handleCta = () => {
    console.log('[Home] Tour CTA tapped on step', step, '— route:', tourStep.route);
    if (!isLast && tourStep.route) {
      router.push(tourStep.route as any);
    }
    onNext();
  };

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent>
      <Pressable style={styles.tourBackdrop} onPress={onSkip}>
        <View style={styles.tourCard}>
          <View style={styles.tourDots}>
            {TOUR_STEPS.map((_, i) => (
              <View
                key={i}
                style={[styles.tourDot, i === step - 1 && styles.tourDotActive]}
              />
            ))}
          </View>
          <Text style={styles.tourTitle}>{tourStep.title}</Text>
          <Text style={styles.tourBody}>{tourStep.body}</Text>
          <View style={styles.tourActions}>
            <TouchableOpacity onPress={onSkip} style={styles.tourSkipBtn}>
              <Text style={styles.tourSkipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCta} style={styles.tourNextBtn}>
              <Text style={styles.tourNextText}>{tourStep.cta}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Task row ──────────────────────────────────────────────────────────────────
function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <View style={styles.taskRow}>
      <TouchableOpacity
        onPress={() => {
          console.log('[Home] Task toggled:', task.id, 'done:', !task.done);
          onToggle(task.id);
        }}
        style={[styles.taskCheckbox, task.done && styles.taskCheckboxDone]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {task.done ? <Text style={styles.taskCheckmark}>✓</Text> : null}
      </TouchableOpacity>
      <Text
        style={[
          styles.taskText,
          task.done && styles.taskTextDone,
        ]}
        numberOfLines={2}
      >
        {task.text}
      </Text>
      <TouchableOpacity
        onPress={() => {
          console.log('[Home] Task deleted:', task.id);
          onDelete(task.id);
        }}
        style={styles.taskDeleteBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <X size={14} color={C.textSecondary} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<FitnessProfile>({});
  const [tourStep, setTourStep] = useState(0); // 0=not started, 1-3=active, 4=done

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskInput, setTaskInput] = useState('');

  const now = new Date();
  const hour = now.getHours();

  // Load profile and tasks from AsyncStorage
  useEffect(() => {
    const load = async () => {
      console.log('[Home] Loading fitnessProfile and userTasks from AsyncStorage');
      try {
        const [raw, rawTasks] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.fitnessProfile),
          AsyncStorage.getItem(STORAGE_KEYS.userTasks),
        ]);
        if (raw) {
          const parsed: FitnessProfile = JSON.parse(raw);
          console.log('[Home] fitnessProfile loaded:', JSON.stringify(parsed));
          setProfile(parsed);
        } else {
          console.log('[Home] No fitnessProfile found in AsyncStorage');
        }
        if (rawTasks) {
          const parsedTasks: Task[] = JSON.parse(rawTasks);
          console.log('[Home] userTasks loaded:', parsedTasks.length, 'tasks');
          setTasks(parsedTasks);
        }
      } catch (e) {
        console.log('[Home] Error loading data:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Check if tour should be shown — only after onboarding
  useEffect(() => {
    if (loading) return;
    const checkTour = async () => {
      const [seen, justCompleted] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.appTourSeen),
        AsyncStorage.getItem(STORAGE_KEYS.onboardingJustCompleted),
      ]);
      if (!seen && justCompleted === 'true') {
        console.log('[Home] First time after onboarding — starting app tour');
        await AsyncStorage.removeItem(STORAGE_KEYS.onboardingJustCompleted);
        setTourStep(1);
      } else {
        console.log('[Home] Tour skipped — seen:', seen, 'justCompleted:', justCompleted);
      }
    };
    checkTour();
  }, [loading]);

  const handleTourNext = async () => {
    console.log('[Home] Tour step advanced from', tourStep);
    if (tourStep >= TOUR_STEPS.length) {
      await AsyncStorage.setItem(STORAGE_KEYS.appTourSeen, 'true');
      setTourStep(4);
    } else {
      setTourStep(tourStep + 1);
    }
  };

  const handleTourSkip = async () => {
    console.log('[Home] Tour skipped at step', tourStep);
    await AsyncStorage.setItem(STORAGE_KEYS.appTourSeen, 'true');
    setTourStep(4);
  };

  // ─── Task handlers ────────────────────────────────────────────────────────────
  const saveTasks = async (updated: Task[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.userTasks, JSON.stringify(updated));
    } catch (e) {
      console.log('[Home] Error saving tasks:', e);
    }
  };

  const handleAddTask = async () => {
    const trimmed = taskInput.trim();
    if (!trimmed) return;
    console.log('[Home] User added task:', trimmed);
    const newTask: Task = {
      id: Date.now().toString(),
      text: trimmed,
      done: false,
      createdAt: new Date().toISOString(),
    };
    const updated = [...tasks, newTask];
    setTasks(updated);
    setTaskInput('');
    await saveTasks(updated);
  };

  const handleToggleTask = async (id: string) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, done: !t.done } : t
    );
    setTasks(updated);
    await saveTasks(updated);
  };

  const handleDeleteTask = async (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    await saveTasks(updated);
  };

  // Derived values
  const displayName = profile.name
    ? profile.name.split(' ')[0]
    : user?.name
    ? user.name.split(' ')[0]
    : 'Athlete';

  const greetingText = getGreeting(hour);
  const greetingEmoji = hour >= 5 && hour < 12 ? '👋' : hour >= 12 && hour < 17 ? '☀️' : hour >= 17 && hour < 21 ? '🌆' : '🌙';

  const todayWorkout = getTodayWorkout(profile);
  const weekSchedule = getWeekSchedule(profile);

  const goalLabel = GOAL_LABELS[profile.primaryGoal || ''] || 'Your Goal';
  const goalDescription = GOAL_DESCRIPTIONS[profile.primaryGoal || ''] || 'Complete your onboarding to personalise your plan.';

  const workoutColor = todayWorkout?.color || C.teal;
  const workoutColorMuted = workoutColor + '18';
  const workoutColorBorder = workoutColor + '30';

  const exerciseCountStr = todayWorkout ? String(todayWorkout.exerciseCount) : '0';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {loading ? (
        <View style={[styles.scrollContent, { paddingTop: insets.top + 24 }]}>
          <LoadingSkeleton />
        </View>
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 24, paddingBottom: 120 },
          ]}
        >
          {/* ── 1. Header ── */}
          <FadeSection index={0}>
            <View style={styles.header}>
              <View style={styles.headerGreetingRow}>
                <Text style={styles.greetingText}>{greetingText},</Text>
                <Text style={styles.greetingEmoji}>{greetingEmoji}</Text>
              </View>
              <Text style={styles.headerName}>{displayName}</Text>
              <View style={styles.headerChipsRow}>
                {profile.primaryGoal ? (
                  <View style={styles.goalChip}>
                    <Target size={11} color={C.teal} strokeWidth={2.5} />
                    <Text style={styles.goalChipText}>{goalLabel}</Text>
                  </View>
                ) : null}
                <View style={styles.dayChip}>
                  <Text style={styles.dayChipText}>
                    {todayWorkout ? 'Training day' : 'Rest day'}
                  </Text>
                </View>
              </View>
            </View>
          </FadeSection>

          {/* ── 2. Today's Workout ── */}
          <FadeSection index={1}>
            <SectionLabel title="TODAY'S WORKOUT" />
            {todayWorkout ? (
              <View
                style={[
                  styles.card,
                  styles.workoutCard,
                  { borderColor: workoutColorBorder },
                ]}
              >
                {/* Glow */}
                <View
                  style={[styles.workoutGlow, { backgroundColor: workoutColorMuted }]}
                  pointerEvents="none"
                />

                <View style={styles.workoutTopRow}>
                  <View style={[styles.workoutTypeBadge, { backgroundColor: workoutColorMuted, borderColor: workoutColorBorder }]}>
                    <Text style={[styles.workoutTypeBadgeText, { color: workoutColor }]}>
                      {todayWorkout.type}
                    </Text>
                  </View>
                  <Text style={styles.workoutFocus}>{todayWorkout.focus}</Text>
                </View>

                <Text style={styles.workoutName}>{todayWorkout.name}</Text>

                <View style={styles.workoutStatsRow}>
                  <View style={styles.workoutStat}>
                    <Clock size={13} color={C.textSecondary} strokeWidth={2} />
                    <Text style={styles.workoutStatText}>{todayWorkout.duration}</Text>
                  </View>
                  <View style={styles.workoutStatDivider} />
                  <View style={styles.workoutStat}>
                    <Dumbbell size={13} color={C.textSecondary} strokeWidth={2} />
                    <Text style={styles.workoutStatText}>{exerciseCountStr} exercises</Text>
                  </View>
                  <View style={styles.workoutStatDivider} />
                  <View style={styles.workoutStat}>
                    <Zap size={13} color={C.textSecondary} strokeWidth={2} />
                    <Text style={styles.workoutStatText}>{todayWorkout.equipment}</Text>
                  </View>
                </View>

                <AnimatedPressable
                  scaleValue={0.97}
                  onPress={() => {
                    console.log('[Home] User tapped Start Workout → navigating to /workout-session');
                    router.push('/workout-session');
                  }}
                  style={[styles.startBtn, { backgroundColor: workoutColor }]}
                >
                  <Play size={16} color="#000" strokeWidth={2.5} fill="#000" />
                  <Text style={styles.startBtnText}>Start Workout</Text>
                </AnimatedPressable>
              </View>
            ) : (
              <View style={[styles.card, styles.restCard]}>
                <Moon size={28} color={C.textSecondary} strokeWidth={1.5} />
                <Text style={styles.restTitle}>Rest Day</Text>
                <Text style={styles.restSubtitle}>
                  Recovery is part of the plan. Come back tomorrow.
                </Text>
              </View>
            )}
          </FadeSection>

          {/* ── 3. This Week ── */}
          <FadeSection index={2}>
            <SectionLabel title="THIS WEEK" />
            <View style={styles.weekRow}>
              {weekSchedule.map((day) => {
                const isActiveTraining = day.isTraining && !day.isPast && !day.isToday;
                const isPastTraining = day.isTraining && day.isPast;
                const isTodayTraining = day.isToday && day.isTraining;
                const isTodayRest = day.isToday && !day.isTraining;

                let pillBg = 'transparent';
                let pillBorder = C.border;
                let dayTextColor = C.textSecondary;
                let dotColor = 'transparent';

                if (isTodayTraining) {
                  pillBg = C.teal;
                  pillBorder = C.teal;
                  dayTextColor = '#000';
                } else if (isTodayRest) {
                  pillBg = C.surface2;
                  pillBorder = 'rgba(255,255,255,0.12)';
                  dayTextColor = C.text;
                } else if (isPastTraining) {
                  pillBg = 'rgba(0,212,170,0.12)';
                  pillBorder = 'rgba(0,212,170,0.2)';
                  dayTextColor = C.teal;
                  dotColor = C.teal;
                } else if (isActiveTraining) {
                  dotColor = C.teal;
                  dayTextColor = C.text;
                }

                return (
                  <View
                    key={day.dayId}
                    style={[
                      styles.dayPill,
                      { backgroundColor: pillBg, borderColor: pillBorder },
                    ]}
                  >
                    <Text style={[styles.dayPillText, { color: dayTextColor }]}>
                      {day.dayName}
                    </Text>
                    <View
                      style={[
                        styles.dayDot,
                        { backgroundColor: dotColor },
                      ]}
                    />
                  </View>
                );
              })}
            </View>
          </FadeSection>

          {/* ── 4. Quick Actions ── */}
          <FadeSection index={3}>
            <SectionLabel title="QUICK ACTIONS" />
            <View style={styles.quickActionsRow}>
              <AnimatedPressable
                scaleValue={0.95}
                onPress={() => {
                  console.log('[Home] User tapped Quick Action: AI Coach → navigating to /ai-coach');
                  router.push('/ai-coach');
                }}
                style={[styles.quickCard, styles.quickCardTall]}
              >
                <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(0,212,170,0.12)' }]}>
                  <Brain size={20} color={C.teal} strokeWidth={2} />
                </View>
                <Text style={styles.quickCardLabel}>AI Coach</Text>
                <Text style={styles.quickCardSub}>Get guidance</Text>
                <ChevronRight size={14} color={C.textSecondary} strokeWidth={2} style={styles.quickChevron} />
              </AnimatedPressable>

              <View style={styles.quickColRight}>
                <AnimatedPressable
                  scaleValue={0.95}
                  onPress={() => {
                    console.log('[Home] User tapped Quick Action: Nutrition → navigating to /nutrition');
                    router.push('/nutrition');
                  }}
                  style={styles.quickCard}
                >
                  <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(255,183,77,0.12)' }]}>
                    <Apple size={18} color="#FFB74D" strokeWidth={2} />
                  </View>
                  <Text style={styles.quickCardLabel}>Nutrition</Text>
                  <ChevronRight size={13} color={C.textSecondary} strokeWidth={2} style={styles.quickChevron} />
                </AnimatedPressable>

                <AnimatedPressable
                  scaleValue={0.95}
                  onPress={() => {
                    console.log('[Home] User tapped Quick Action: Habits → navigating to /habits');
                    router.push('/habits');
                  }}
                  style={styles.quickCard}
                >
                  <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(255,107,107,0.12)' }]}>
                    <Flame size={18} color="#FF6B6B" strokeWidth={2} />
                  </View>
                  <Text style={styles.quickCardLabel}>Habits</Text>
                  <ChevronRight size={13} color={C.textSecondary} strokeWidth={2} style={styles.quickChevron} />
                </AnimatedPressable>
              </View>
            </View>
          </FadeSection>

          {/* ── 5. Today's Tasks ── */}
          <FadeSection index={4}>
            <SectionLabel title="TODAY'S TASKS" />
            <View style={[styles.card, styles.tasksCard]}>
              {tasks.length === 0 ? (
                <View style={styles.tasksEmpty}>
                  <Text style={styles.tasksEmptyText}>No tasks yet — add one below</Text>
                </View>
              ) : (
                <View style={styles.tasksList}>
                  {tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={handleToggleTask}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </View>
              )}

              {/* Add task row */}
              <View style={styles.taskAddRow}>
                <TextInput
                  style={styles.taskInput}
                  placeholder="Add a task..."
                  placeholderTextColor={C.textSecondary}
                  value={taskInput}
                  onChangeText={setTaskInput}
                  returnKeyType="done"
                  onSubmitEditing={handleAddTask}
                  blurOnSubmit={false}
                />
                <TouchableOpacity
                  onPress={() => {
                    console.log('[Home] User tapped add task button');
                    handleAddTask();
                  }}
                  style={[
                    styles.taskAddBtn,
                    !taskInput.trim() && styles.taskAddBtnDisabled,
                  ]}
                  disabled={!taskInput.trim()}
                >
                  <Plus size={18} color={taskInput.trim() ? '#000' : C.textSecondary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>
          </FadeSection>

          {/* ── 6. Your Goal ── */}
          <FadeSection index={5}>
            <SectionLabel title="YOUR GOAL" />
            <View style={[styles.card, styles.goalCard]}>
              <View style={styles.goalTopRow}>
                <View style={styles.goalIconCircle}>
                  <Target size={18} color={C.teal} strokeWidth={2} />
                </View>
                <Text style={styles.goalName}>{goalLabel}</Text>
              </View>
              <Text style={styles.goalDescription}>{goalDescription}</Text>
              {profile.trainingExperience ? (
                <View style={styles.goalBadgeRow}>
                  <View style={styles.goalBadge}>
                    <Text style={styles.goalBadgeText}>
                      {String(profile.trainingExperience).charAt(0).toUpperCase() +
                        String(profile.trainingExperience).slice(1)}
                    </Text>
                  </View>
                  {profile.equipmentType ? (
                    <View style={styles.goalBadge}>
                      <Text style={styles.goalBadgeText}>
                        {profile.equipmentType === 'gym'
                          ? 'Full Gym'
                          : profile.equipmentType === 'home'
                          ? 'Home'
                          : 'Bodyweight'}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          </FadeSection>
        </ScrollView>
      )}

      {/* Tour overlay */}
      {tourStep >= 1 && tourStep <= 3 ? (
        <TourOverlay
          step={tourStep}
          onNext={handleTourNext}
          onSkip={handleTourSkip}
          router={router}
        />
      ) : null}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 24,
  },

  // Header
  header: {
    gap: 6,
  },
  headerGreetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greetingText: {
    fontSize: 15,
    fontWeight: '400',
    color: C.textSecondary,
  },
  greetingEmoji: {
    fontSize: 15,
  },
  headerName: {
    fontSize: 32,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.6,
    lineHeight: 38,
  },
  headerChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.tealMuted,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.tealBorder,
  },
  goalChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.teal,
  },
  dayChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.border,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: C.textSecondary,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textSecondary,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: -8,
  },

  // Card base
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    // @ts-expect-error borderCurve is iOS-only
    borderCurve: 'continuous',
    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
  },

  // Workout card
  workoutCard: {
    overflow: 'hidden',
    position: 'relative',
    gap: 14,
  },
  workoutGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  workoutTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workoutTypeBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  workoutTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  workoutFocus: {
    fontSize: 12,
    fontWeight: '500',
    color: C.textSecondary,
  },
  workoutName: {
    fontSize: 26,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  workoutStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  workoutStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  workoutStatText: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textSecondary,
  },
  workoutStatDivider: {
    width: 1,
    height: 12,
    backgroundColor: C.border,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    height: 50,
    // @ts-expect-error borderCurve is iOS-only
    borderCurve: 'continuous',
  },
  startBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.2,
  },

  // Rest card
  restCard: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 32,
  },
  restTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
  },
  restSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },

  // Week schedule
  weekRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
    // @ts-expect-error borderCurve is iOS-only
    borderCurve: 'continuous',
  },
  dayPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Quick actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    // @ts-expect-error borderCurve is iOS-only
    borderCurve: 'continuous',
    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
    position: 'relative',
  },
  quickCardTall: {
    justifyContent: 'flex-end',
    minHeight: 140,
  },
  quickColRight: {
    flex: 1,
    gap: 10,
  },
  quickIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  quickCardSub: {
    fontSize: 12,
    fontWeight: '400',
    color: C.textSecondary,
    marginTop: 2,
  },
  quickChevron: {
    position: 'absolute',
    top: 14,
    right: 14,
  },

  // Tasks
  tasksCard: {
    gap: 0,
    padding: 0,
    overflow: 'hidden',
  },
  tasksEmpty: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    alignItems: 'center',
  },
  tasksEmptyText: {
    fontSize: 14,
    fontWeight: '400',
    color: C.textSecondary,
    textAlign: 'center',
  },
  tasksList: {
    paddingTop: 6,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  taskCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: C.teal,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  taskCheckboxDone: {
    backgroundColor: C.teal,
    borderColor: C.teal,
  },
  taskCheckmark: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
    lineHeight: 14,
  },
  taskText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: C.text,
    lineHeight: 20,
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  taskDeleteBtn: {
    padding: 2,
    flexShrink: 0,
  },
  taskAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  taskInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: C.text,
    paddingVertical: 8,
  },
  taskAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.teal,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  taskAddBtnDisabled: {
    backgroundColor: C.surface2,
  },

  // Goal card
  goalCard: {
    gap: 12,
  },
  goalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  goalIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.tealMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.tealBorder,
  },
  goalName: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  goalDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: C.textSecondary,
    lineHeight: 21,
  },
  goalBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  goalBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  goalBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textSecondary,
  },

  // Tour
  tourBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  tourCard: {
    backgroundColor: '#1A1A26',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    // @ts-expect-error borderCurve is iOS-only
    borderCurve: 'continuous',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    gap: 12,
  },
  tourDots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  tourDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tourDotActive: {
    backgroundColor: C.teal,
    width: 18,
  },
  tourTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.2,
  },
  tourBody: {
    fontSize: 14,
    fontWeight: '400',
    color: C.textSecondary,
    lineHeight: 21,
  },
  tourActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  tourSkipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  tourSkipText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textSecondary,
  },
  tourNextBtn: {
    backgroundColor: C.teal,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tourNextText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
});
