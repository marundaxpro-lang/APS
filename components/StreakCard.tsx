
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Flame, Zap, Moon, Trophy, TrendingUp } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { StreakState, calculateDayScore, getStreakMotivation } from '@/utils/streakEngine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const C = {
  bg: '#0A0D1A',
  surface: '#12162A',
  card: '#1A1E2E',
  primary: '#6C63FF',
  green: '#34D399',
  amber: '#F59E0B',
  red: '#EF4444',
  text: '#E8EAF6',
  textSecondary: '#8B9CC8',
  textTertiary: '#4A5580',
  empty: '#252A3D',
};

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getDayColor(score: number, isRestDay: boolean): string {
  if (isRestDay) return C.primary;
  if (score >= 80) return C.primary;
  if (score >= 40) return C.green;
  if (score >= 20) return C.amber;
  return C.empty;
}

function getStreakTypeLabel(type: StreakState['streakType']): string {
  switch (type) {
    case 'fire': return 'ON FIRE 🔥';
    case 'building': return 'BUILDING ⚡';
    case 'recovering': return 'COMEBACK 💪';
    case 'resting': return 'REST DAY 🌙';
  }
}

function getStreakTypeColor(type: StreakState['streakType']): string {
  switch (type) {
    case 'fire': return '#FF6B35';
    case 'building': return C.primary;
    case 'recovering': return C.green;
    case 'resting': return '#9B8FFF';
  }
}

interface StreakCardProps {
  state: StreakState;
  pressable?: boolean;
}

export function StreakCard({ state, pressable = true }: StreakCardProps) {
  const router = useRouter();
  const countAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(countAnim, {
        toValue: state.currentStreak,
        duration: 900,
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentStreak]);

  // Build 7-day strip (Mon–Sun of current week)
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dayOfWeek = today.getDay(); // 0=Sun
  // Reorder so Mon=0, Sun=6
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const weekDays = DAY_LABELS.map((label, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - mondayOffset + i);
    const dateStr = d.toISOString().split('T')[0];
    const activity = state.history.find((h) => h.date === dateStr);
    const score = activity ? calculateDayScore(activity) : 0;
    const isToday = dateStr === todayStr;
    const isFuture = dateStr > todayStr;
    const isRestDay = activity?.restDayScheduled ?? false;
    return { label, dateStr, score, isToday, isFuture, isRestDay };
  });

  const motivationText = getStreakMotivation(state);
  const typeLabel = getStreakTypeLabel(state.streakType);
  const typeColor = getStreakTypeColor(state.streakType);

  const weeklyPct = state.weeklyScore;
  const weeklyPctText = String(weeklyPct) + '%';
  const longestText = String(state.longestStreak) + ' days';
  const totalText = String(state.totalActiveDays) + ' days';

  const isGraceToday = (() => {
    const todayActivity = state.history.find((h) => h.date === todayStr);
    if (!todayActivity) return false;
    const score = calculateDayScore(todayActivity);
    return score >= 20 && score < 40 && state.graceUsedThisWeek;
  })();

  const cardContent = (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      {/* Comeback banner */}
      {state.comebackActive && (
        <View style={styles.comebackBanner}>
          <TrendingUp size={14} color={C.green} />
          <Text style={styles.comebackText}>Welcome back! Keep it going.</Text>
        </View>
      )}

      {/* Top row: streak number + type */}
      <View style={styles.topRow}>
        <View style={styles.streakNumberBlock}>
          <Animated.Text style={styles.streakNumber}>
            {countAnim.interpolate({
              inputRange: [0, state.currentStreak],
              outputRange: ['0', String(state.currentStreak)],
              extrapolate: 'clamp',
            })}
          </Animated.Text>
          <View style={styles.flameIcon}>
            {state.streakType === 'fire' ? (
              <Flame size={28} color="#FF6B35" fill="#FF6B35" />
            ) : state.streakType === 'resting' ? (
              <Moon size={28} color="#9B8FFF" />
            ) : state.streakType === 'recovering' ? (
              <TrendingUp size={28} color={C.green} />
            ) : (
              <Zap size={28} color={C.primary} fill={C.primary} />
            )}
          </View>
        </View>

        <View style={styles.typeBlock}>
          <Text style={[styles.typeLabel, { color: typeColor }]}>{typeLabel}</Text>
          <Text style={styles.motivationText} numberOfLines={2}>{motivationText}</Text>
          {isGraceToday && (
            <View style={styles.gracePill}>
              <Text style={styles.gracePillText}>Grace Day</Text>
            </View>
          )}
        </View>
      </View>

      {/* 7-day calendar strip */}
      <View style={styles.calendarStrip}>
        {weekDays.map((day, i) => {
          const dotColor = day.isFuture ? C.empty : getDayColor(day.score, day.isRestDay);
          const isFilled = !day.isFuture && (day.score > 0 || day.isRestDay);
          return (
            <View key={i} style={styles.calendarDayCol}>
              <Text style={[styles.calendarDayLabel, day.isToday && styles.calendarDayLabelToday]}>
                {day.label}
              </Text>
              <View
                style={[
                  styles.calendarDot,
                  { backgroundColor: isFilled ? dotColor : C.empty },
                  day.isToday && styles.calendarDotToday,
                ]}
              >
                {day.isRestDay && !day.isFuture && (
                  <Moon size={10} color="#fff" />
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Bottom stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Trophy size={13} color={C.amber} />
          <Text style={styles.statLabel}>Longest</Text>
          <Text style={styles.statValue}>{longestText}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <TrendingUp size={13} color={C.green} />
          <Text style={styles.statLabel}>This week</Text>
          <Text style={styles.statValue}>{weeklyPctText}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Flame size={13} color={C.primary} />
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statValue}>{totalText}</Text>
        </View>
      </View>
    </Animated.View>
  );

  if (!pressable) {
    return cardContent;
  }

  return (
    <AnimatedPressable
      onPress={() => {
        console.log('[StreakCard] User tapped streak card → navigating to streak-detail');
        router.push('/streak-detail' as any);
      }}
      scaleValue={0.98}
    >
      {cardContent}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.2)',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  comebackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
  },
  comebackText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.green,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 16,
  },
  streakNumberBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakNumber: {
    fontSize: 56,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
    lineHeight: 60,
  },
  flameIcon: {
    marginTop: 4,
  },
  typeBlock: {
    flex: 1,
    paddingTop: 6,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  motivationText: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 18,
    fontWeight: '500',
  },
  gracePill: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  gracePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.amber,
    letterSpacing: 0.5,
  },
  calendarStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  calendarDayCol: {
    alignItems: 'center',
    gap: 6,
  },
  calendarDayLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: C.textTertiary,
    textTransform: 'uppercase',
  },
  calendarDayLabelToday: {
    color: C.primary,
  },
  calendarDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDotToday: {
    borderWidth: 2,
    borderColor: C.primary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: C.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
  },
});
