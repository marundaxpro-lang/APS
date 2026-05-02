
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import {
  Flame,
  BarChart2,
  CheckSquare,
  ChevronRight,
  Dumbbell,
  TrendingUp,
} from 'lucide-react-native';
import {
  useMomentumStore,
  calculateWeeklyAdherence,
  getMomentumScore,
  getMomentumLabel,
  getStreakMessage,
  DayRecord,
} from '@/utils/momentumEngine';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TEAL = '#00D4AA';
const TEAL_DIM = 'rgba(0,212,170,0.12)';
const TEAL_BORDER = 'rgba(0,212,170,0.3)';
const CARD_BG = '#161616';
const CARD_BORDER = 'rgba(255,255,255,0.06)';
const TEXT_PRIMARY = '#F5F5F5';
const TEXT_SECONDARY = '#888';
const TEXT_MUTED = 'rgba(255,255,255,0.3)';
const SCREEN_BG = '#0A0A0A';
const AMBER = '#F59E0B';

// ─── Animated Progress Bar ────────────────────────────────────────────────────
function AnimatedProgressBar({ fraction }: { fraction: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: fraction, duration: 700, useNativeDriver: false }).start();
  }, [fraction, anim]);
  return (
    <View style={pbStyles.track}>
      <Animated.View
        style={[pbStyles.fill, { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
      />
    </View>
  );
}

const pbStyles = StyleSheet.create({
  track: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: TEAL, borderRadius: 3 },
});

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return <Text style={s.sectionLabel}>{label}</Text>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, accent }: { icon: React.ReactNode; value: string; label: string; accent: string }) {
  return (
    <View style={[s.statCard, { borderTopColor: accent }]}>
      <View style={[s.statIconCircle, { backgroundColor: accent + '18' }]}>{icon}</View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Week Day Dot ─────────────────────────────────────────────────────────────
function WeekDots({ completionDates }: { completionDates: string[] }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const isToday = d.toDateString() === today.toDateString();
    const completed = completionDates.includes(dateStr);
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return { label: dayNames[d.getDay()], isToday, completed };
  });

  return (
    <View style={s.weekDotsRow}>
      {days.map((d, i) => {
        const dotColor = d.completed ? TEAL : d.isToday ? 'rgba(0,212,170,0.3)' : 'rgba(255,255,255,0.08)';
        return (
          <View key={i} style={s.weekDotItem}>
            <View style={[s.weekDot, { backgroundColor: dotColor, borderWidth: d.isToday ? 2 : 0, borderColor: TEAL }]} />
            <Text style={[s.weekDotLabel, d.isToday && { color: TEAL }]}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Recent Workout Row ───────────────────────────────────────────────────────
const RECENT_WORKOUTS = [
  { name: 'Upper Body Push', duration: 48, date: 'Today', completed: true },
  { name: 'Lower Body Power', duration: 52, date: 'Yesterday', completed: true },
  { name: 'Core & Cardio', duration: 35, date: '2 days ago', completed: true },
  { name: 'Pull Day', duration: 45, date: '3 days ago', completed: true },
  { name: 'Full Body Circuit', duration: 40, date: '4 days ago', completed: true },
];

function WorkoutHistoryRow({ workout, index }: { workout: typeof RECENT_WORKOUTS[0]; index: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 300, delay: index * 50, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }}>
      <View style={s.workoutRow}>
        <View style={s.workoutDot} />
        <View style={s.workoutInfo}>
          <Text style={s.workoutName}>{workout.name}</Text>
          <Text style={s.workoutMeta}>{workout.date}</Text>
        </View>
        <Text style={s.workoutDuration}>{workout.duration} min</Text>
      </View>
    </Animated.View>
  );
}

// ─── Habit Summary Row ────────────────────────────────────────────────────────
const HABIT_SUMMARY = [
  { name: 'Morning hydration', completed: true },
  { name: 'Take supplements', completed: true },
  { name: 'Log dinner', completed: false },
  { name: 'Evening stretch', completed: false },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MomentumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { loaded, streakData, completionDates } = useMomentumStore();

  const weekData: DayRecord[] = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const completed = completionDates.includes(dateStr);
      return {
        date: dateStr,
        workoutCompleted: completed,
        mealsLogged: completed ? 3 : 0,
        totalMealsTarget: 4,
        habitsCompleted: completed ? 2 : 0,
        totalHabits: 3,
      };
    });
  }, [completionDates]);

  const adherence = useMemo(() => calculateWeeklyAdherence(weekData), [weekData]);
  const momentumScore = useMemo(() => getMomentumScore(adherence, streakData.currentStreak), [adherence, streakData.currentStreak]);
  const momentumLabel = getMomentumLabel(momentumScore);
  const streakMessage = getStreakMessage(streakData.currentStreak);

  const weeklyProgressFraction = adherence.completedDays / 7;
  const streakStr = String(streakData.currentStreak);
  const momentumScoreStr = String(momentumScore);
  const weeklyDaysStr = String(adherence.completedDays);
  const habitsCompletedCount = HABIT_SUMMARY.filter(h => h.completed).length;
  const habitsTotal = HABIT_SUMMARY.length;
  const habitsStr = `${habitsCompletedCount}/${habitsTotal}`;
  const habitsFraction = habitsTotal > 0 ? habitsCompletedCount / habitsTotal : 0;

  return (
    <View style={[s.container, { backgroundColor: SCREEN_BG }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Section 1: Hero — Streak + Momentum ── */}
        <SectionLabel label="TODAY'S MOMENTUM" />
        <View style={s.heroCard}>
          <View style={s.heroTopRow}>
            <View style={s.heroLeft}>
              <Text style={s.heroScore}>{momentumScoreStr}</Text>
              <Text style={s.heroScoreLabel}>Momentum Score</Text>
              <View style={[s.heroBadge, { backgroundColor: TEAL + '20', borderColor: TEAL + '40' }]}>
                <Text style={[s.heroBadgeText, { color: TEAL }]}>{momentumLabel}</Text>
              </View>
            </View>
            <View style={s.heroRight}>
              <View style={s.streakCircle}>
                <Flame size={22} color={AMBER} strokeWidth={2} />
                <Text style={s.streakNum}>{streakStr}</Text>
                <Text style={s.streakDayLabel}>day streak</Text>
              </View>
            </View>
          </View>
          <Text style={s.streakMessage}>{streakMessage}</Text>
        </View>

        {/* ── Section 2: Weekly Adherence ── */}
        <View style={s.sectionGap} />
        <SectionLabel label="WEEKLY ADHERENCE" />
        <AnimatedPressable
          style={s.adherenceCard}
          onPress={() => {
            console.log('[Momentum] User tapped weekly adherence card → navigating to /weekly-adherence-detail');
            router.push('/weekly-adherence-detail' as never);
          }}
        >
          <View style={s.adherenceTopRow}>
            <View>
              <Text style={s.adherenceTitle}>{weeklyDaysStr} of 7 days</Text>
              <Text style={s.adherenceSubtitle}>This week's training</Text>
            </View>
            <ChevronRight size={18} color={TEXT_MUTED} strokeWidth={2} />
          </View>
          <AnimatedProgressBar fraction={weeklyProgressFraction} />
          <WeekDots completionDates={completionDates} />
        </AnimatedPressable>

        {/* ── Section 3: Recent Workout History ── */}
        <View style={s.sectionGap} />
        <View style={s.sectionHeaderRow}>
          <SectionLabel label="RECENT WORKOUTS" />
          <AnimatedPressable
            onPress={() => {
              console.log('[Momentum] User tapped View all workouts → navigating to /training-plan');
              router.push('/training-plan' as never);
            }}
          >
            <Text style={s.seeAllLink}>View plan →</Text>
          </AnimatedPressable>
        </View>
        <View style={s.workoutHistoryCard}>
          {RECENT_WORKOUTS.map((w, i) => (
            <WorkoutHistoryRow key={i} workout={w} index={i} />
          ))}
        </View>

        {/* ── Section 4: Habits Summary ── */}
        <View style={s.sectionGap} />
        <View style={s.sectionHeaderRow}>
          <SectionLabel label="TODAY'S HABITS" />
          <AnimatedPressable
            onPress={() => {
              console.log('[Momentum] User tapped habits section → navigating to /habits');
              router.push('/habits' as never);
            }}
          >
            <Text style={s.seeAllLink}>Manage →</Text>
          </AnimatedPressable>
        </View>
        <View style={s.habitsCard}>
          <View style={s.habitsTopRow}>
            <Text style={s.habitsCount}>{habitsStr}</Text>
            <Text style={s.habitsCountLabel}> habits done today</Text>
          </View>
          <AnimatedProgressBar fraction={habitsFraction} />
          <View style={s.habitsList}>
            {HABIT_SUMMARY.map((h, i) => (
              <View key={i} style={s.habitRow}>
                <View style={[s.habitCheck, h.completed && s.habitCheckDone]}>
                  {h.completed && <Text style={s.habitCheckMark}>✓</Text>}
                </View>
                <Text style={[s.habitName, h.completed && s.habitNameDone]}>{h.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Quick nav ── */}
        <View style={s.sectionGap} />
        <View style={s.quickNavRow}>
          <AnimatedPressable
            style={s.quickNavCard}
            onPress={() => {
              console.log('[Momentum] User tapped AI Coach quick nav → navigating to /ai-coach');
              router.push('/ai-coach' as never);
            }}
          >
            <Text style={s.quickNavLabel}>AI Coach</Text>
            <Text style={s.quickNavSub}>Ask your plan</Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={s.quickNavCard}
            onPress={() => {
              console.log('[Momentum] User tapped Nutrition quick nav → navigating to /nutrition');
              router.push('/nutrition' as never);
            }}
          >
            <Text style={s.quickNavLabel}>Nutrition</Text>
            <Text style={s.quickNavSub}>Log a meal</Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TEAL,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  seeAllLink: {
    fontSize: 13,
    fontWeight: '600',
    color: TEAL,
  },
  sectionGap: { height: 24 },

  // Hero card
  heroCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderTopWidth: 3,
    borderTopColor: TEAL,
    padding: 20,
    gap: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLeft: { gap: 6 },
  heroScore: {
    fontSize: 56,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -2,
    lineHeight: 60,
  },
  heroScoreLabel: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroRight: { alignItems: 'center' },
  streakCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(245,158,11,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  streakNum: {
    fontSize: 28,
    fontWeight: '800',
    color: AMBER,
    letterSpacing: -1,
    lineHeight: 32,
  },
  streakDayLabel: {
    fontSize: 10,
    color: 'rgba(245,158,11,0.7)',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  streakMessage: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Adherence card
  adherenceCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 18,
    gap: 14,
  },
  adherenceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adherenceTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  adherenceSubtitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  weekDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  weekDotItem: {
    alignItems: 'center',
    gap: 5,
  },
  weekDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  weekDotLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT_MUTED,
    letterSpacing: 0.3,
  },

  // Workout history
  workoutHistoryCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 12,
  },
  workoutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEAL,
  },
  workoutInfo: { flex: 1 },
  workoutName: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  workoutMeta: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  workoutDuration: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },

  // Habits
  habitsCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 18,
    gap: 14,
  },
  habitsTopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  habitsCount: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  habitsCountLabel: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  habitsList: { gap: 10 },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  habitCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitCheckDone: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  habitCheckMark: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
  },
  habitName: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  habitNameDone: {
    color: TEXT_SECONDARY,
    textDecorationLine: 'line-through',
  },

  // Quick nav
  quickNavRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickNavCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 16,
    gap: 4,
  },
  quickNavLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  quickNavSub: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },

  // Stat card (unused but kept for future)
  statCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderTopWidth: 3,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    fontWeight: '500',
    textAlign: 'center',
  },
});
