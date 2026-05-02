
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Flame, Trophy, Calendar, TrendingUp, Zap, Moon, Dumbbell, Apple, Heart, CheckSquare } from 'lucide-react-native';
import { StreakState, calculateDayScore, DayActivity } from '@/utils/streakEngine';
import { getStreakState } from '@/utils/streakStore';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { StreakCard } from '@/components/StreakCard';

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

const MILESTONES = [3, 7, 14, 30, 60, 100];

function getMilestoneGradient(days: number): string {
  if (days >= 100) return '#FFD700';
  if (days >= 60) return '#C0C0C0';
  if (days >= 30) return '#CD7F32';
  if (days >= 14) return '#6C63FF';
  if (days >= 7) return '#34D399';
  return '#8B9CC8';
}

function getDayColor(score: number, isRestDay: boolean): string {
  if (isRestDay) return C.primary;
  if (score >= 80) return C.primary;
  if (score >= 40) return C.green;
  if (score >= 20) return C.amber;
  return C.empty;
}

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const widthPct = String(Math.round(pct * 100)) + '%';
  return (
    <View style={barStyles.track}>
      <View style={[barStyles.fill, { width: widthPct as any, backgroundColor: color }]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});

function DayBreakdownCard({ day }: { day: DayActivity }) {
  const score = calculateDayScore(day);
  const scoreColor = getDayColor(score, day.restDayScheduled);
  const dateObj = new Date(day.date + 'T12:00:00');
  const dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const scoreText = String(score);

  return (
    <View style={dayCardStyles.card}>
      <View style={dayCardStyles.header}>
        <Text style={dayCardStyles.dateText}>{dateLabel}</Text>
        <View style={[dayCardStyles.scoreBadge, { backgroundColor: scoreColor + '22', borderColor: scoreColor + '44' }]}>
          <Text style={[dayCardStyles.scoreText, { color: scoreColor }]}>{scoreText}</Text>
        </View>
      </View>
      <View style={dayCardStyles.bars}>
        <View style={dayCardStyles.barRow}>
          <Dumbbell size={11} color={C.primary} />
          <Text style={dayCardStyles.barLabel}>Workout</Text>
          <ScoreBar value={day.workoutCompleted ? 40 : 0} max={40} color={C.primary} />
        </View>
        <View style={dayCardStyles.barRow}>
          <Apple size={11} color={C.green} />
          <Text style={dayCardStyles.barLabel}>Nutrition</Text>
          <ScoreBar value={day.nutritionHit ? 25 : 0} max={25} color={C.green} />
        </View>
        <View style={dayCardStyles.barRow}>
          <Heart size={11} color={C.amber} />
          <Text style={dayCardStyles.barLabel}>Recovery</Text>
          <ScoreBar value={day.recoveryDone ? 15 : 0} max={15} color={C.amber} />
        </View>
        <View style={dayCardStyles.barRow}>
          <CheckSquare size={11} color={C.textSecondary} />
          <Text style={dayCardStyles.barLabel}>Priorities</Text>
          <ScoreBar value={day.prioritiesCompleted} max={day.prioritiesTotal || 5} color={C.textSecondary} />
        </View>
      </View>
    </View>
  );
}

const dayCardStyles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  scoreBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '800',
  },
  bars: {
    gap: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barLabel: {
    fontSize: 10,
    color: C.textTertiary,
    width: 60,
    fontWeight: '500',
  },
});

function MilestoneBadge({ days, achieved, current }: { days: number; achieved: boolean; current: number }) {
  const color = getMilestoneGradient(days);
  const daysText = String(days);
  const progressPct = achieved ? 100 : Math.min(100, Math.round((current / days) * 100));
  const progressText = achieved ? 'Achieved' : String(progressPct) + '% there';

  return (
    <View style={[milestoneStyles.badge, achieved && milestoneStyles.badgeAchieved]}>
      <View style={[milestoneStyles.circle, { borderColor: achieved ? color : C.textTertiary }]}>
        <Trophy size={16} color={achieved ? color : C.textTertiary} />
        <Text style={[milestoneStyles.daysText, { color: achieved ? color : C.textTertiary }]}>{daysText}</Text>
      </View>
      <Text style={[milestoneStyles.label, { color: achieved ? C.text : C.textTertiary }]}>
        {daysText}
        {' day'}
        {days !== 1 ? 's' : ''}
      </Text>
      <Text style={[milestoneStyles.progress, { color: achieved ? color : C.textTertiary }]}>{progressText}</Text>
    </View>
  );
}

const milestoneStyles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    gap: 6,
    opacity: 0.5,
    width: 80,
  },
  badgeAchieved: {
    opacity: 1,
  },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    gap: 2,
  },
  daysText: {
    fontSize: 10,
    fontWeight: '800',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  progress: {
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default function StreakDetailScreen() {
  const router = useRouter();
  const [streakState, setStreakState] = useState<StreakState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStreak();
  }, []);

  const loadStreak = async () => {
    console.log('[StreakDetail] Loading streak state');
    try {
      const state = await getStreakState();
      setStreakState(state);
    } catch (e) {
      console.error('[StreakDetail] Error loading streak:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !streakState) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  // This week: last 7 days with activity
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const weekDays: DayActivity[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const activity = streakState.history.find((h) => h.date === dateStr);
    if (activity) weekDays.push(activity);
  }

  // 30-day grid (5 rows × 6 cols)
  const gridDays: { dateStr: string; score: number; isRestDay: boolean; isToday: boolean; isEmpty: boolean }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const activity = streakState.history.find((h) => h.date === dateStr);
    const score = activity ? calculateDayScore(activity) : 0;
    gridDays.push({
      dateStr,
      score,
      isRestDay: activity?.restDayScheduled ?? false,
      isToday: dateStr === todayStr,
      isEmpty: !activity,
    });
  }

  const currentStreak = streakState.currentStreak;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Main streak card */}
        <StreakCard state={streakState} pressable={false} />

        {/* This Week */}
        {weekDays.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Calendar size={16} color={C.primary} />
              <Text style={styles.sectionTitle}>This Week</Text>
            </View>
            <View style={styles.weekBreakdownList}>
              {weekDays.map((day) => (
                <DayBreakdownCard key={day.date} day={day} />
              ))}
            </View>
          </View>
        )}

        {/* 30-day history grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={16} color={C.primary} />
            <Text style={styles.sectionTitle}>30-Day History</Text>
          </View>
          <View style={styles.historyGrid}>
            {gridDays.map((day, i) => {
              const dotColor = day.isEmpty ? C.empty : getDayColor(day.score, day.isRestDay);
              return (
                <View
                  key={i}
                  style={[
                    styles.gridCell,
                    { backgroundColor: dotColor },
                    day.isToday && styles.gridCellToday,
                  ]}
                />
              );
            })}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.primary }]} />
              <Text style={styles.legendText}>Strong (80+)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.green }]} />
              <Text style={styles.legendText}>Good (40+)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.amber }]} />
              <Text style={styles.legendText}>Grace (20+)</Text>
            </View>
          </View>
        </View>

        {/* Milestones */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Trophy size={16} color={C.amber} />
            <Text style={styles.sectionTitle}>Milestones</Text>
          </View>
          <View style={styles.milestonesGrid}>
            {MILESTONES.map((days) => (
              <MilestoneBadge
                key={days}
                days={days}
                achieved={streakState.longestStreak >= days}
                current={currentStreak}
              />
            ))}
          </View>
          <View style={styles.nextMilestoneCard}>
            {(() => {
              const next = MILESTONES.find((m) => m > currentStreak);
              if (!next) {
                return (
                  <>
                    <Flame size={18} color="#FFD700" />
                    <Text style={styles.nextMilestoneText}>All milestones achieved. Legendary.</Text>
                  </>
                );
              }
              const daysLeft = next - currentStreak;
              const daysLeftText = String(daysLeft);
              return (
                <>
                  <Zap size={18} color={C.primary} />
                  <Text style={styles.nextMilestoneText}>
                    {daysLeftText}
                    {' day'}
                    {daysLeft !== 1 ? 's' : ''}
                    {' to your next milestone ('}
                    {String(next)}
                    {' days)'}
                  </Text>
                </>
              );
            })()}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 60,
    gap: 24,
  },
  section: {
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.2,
  },
  weekBreakdownList: {
    gap: 10,
  },
  historyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  gridCell: {
    width: (Platform.OS === 'web' ? 320 : undefined) as any,
    aspectRatio: 1,
    borderRadius: 4,
    flexBasis: '14.28%',
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: 38,
    height: 28,
  },
  gridCellToday: {
    borderWidth: 2,
    borderColor: C.primary,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: C.textTertiary,
    fontWeight: '500',
  },
  milestonesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  nextMilestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(108, 99, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.2)',
  },
  nextMilestoneText: {
    flex: 1,
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: '500',
    lineHeight: 18,
  },
});
