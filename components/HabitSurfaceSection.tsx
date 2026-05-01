
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Habit, getSurfacedHabits } from '@/utils/habitEngine';
import { getHabits, completeHabit, seedDemoHabits } from '@/utils/habitStore';
import { HabitCard } from './HabitCard';
import { colors } from '@/styles/commonStyles';

function getTimeContextLabel(hour: number, workoutCompleted: boolean): string {
  if (workoutCompleted) return 'Post-workout';
  if (hour >= 6 && hour < 10) return 'Morning habits';
  if (hour >= 10 && hour < 17) return 'Midday habits';
  if (hour >= 17 && hour < 20) return 'Pre-evening';
  return 'Evening routine';
}

function getNextHintText(hour: number): string {
  if (hour < 7) return 'Next: Morning habits at 6am';
  if (hour < 12) return 'Next: Midday habits at 12pm';
  if (hour < 19) return 'Next: Evening routine at 7pm';
  return 'Next: Morning habits tomorrow';
}

interface HabitSurfaceSectionProps {
  workoutToday?: boolean;
  workoutCompleted?: boolean;
  sleepHoursLast?: number;
  proteinGapToday?: number;
  streakSlipping?: boolean;
}

export function HabitSurfaceSection({
  workoutToday = false,
  workoutCompleted = false,
  sleepHoursLast = 7,
  proteinGapToday = 0,
  streakSlipping = false,
}: HabitSurfaceSectionProps) {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [surfaced, setSurfaced] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  const itemAnims = useRef<Animated.Value[]>([]);
  const itemTranslates = useRef<Animated.Value[]>([]);

  const hour = new Date().getHours();
  const timeLabel = getTimeContextLabel(hour, workoutCompleted);

  const loadHabits = useCallback(async () => {
    try {
      await seedDemoHabits();
      const all = await getHabits();
      const active = all.filter(h => h.isActive);
      const context = { currentHour: hour, workoutToday, workoutCompleted, sleepHoursLast, proteinGapToday, streakSlipping };
      const surfacedHabits = getSurfacedHabits(active, context);
      setHabits(all);
      setSurfaced(surfacedHabits);
      console.log('[HabitSurfaceSection] Loaded habits, surfaced:', surfacedHabits.length);
    } catch (e) {
      console.error('[HabitSurfaceSection] Error loading habits:', e);
    } finally {
      setLoading(false);
    }
  }, [hour, workoutToday, workoutCompleted, sleepHoursLast, proteinGapToday, streakSlipping]);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  // Stagger entrance animations
  useEffect(() => {
    if (surfaced.length === 0) return;
    itemAnims.current = surfaced.map(() => new Animated.Value(0));
    itemTranslates.current = surfaced.map(() => new Animated.Value(10));

    const anims = surfaced.map((_, i) =>
      Animated.parallel([
        Animated.timing(itemAnims.current[i], {
          toValue: 1,
          duration: 300,
          delay: i * 60,
          useNativeDriver: true,
        }),
        Animated.timing(itemTranslates.current[i], {
          toValue: 0,
          duration: 300,
          delay: i * 60,
          useNativeDriver: true,
        }),
      ])
    );
    Animated.stagger(60, anims).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surfaced.length]);

  const handleComplete = useCallback(async (habitId: string) => {
    console.log('[HabitSurfaceSection] Completing habit:', habitId);
    try {
      const result = await completeHabit(habitId);
      console.log('[HabitSurfaceSection] Habit completed, XP earned:', result.xpEarned, 'streak:', result.newStreak);
      // Refresh
      const all = await getHabits();
      const active = all.filter(h => h.isActive);
      const context = { currentHour: hour, workoutToday, workoutCompleted, sleepHoursLast, proteinGapToday, streakSlipping };
      const surfacedHabits = getSurfacedHabits(active, context);
      setHabits(all);
      setSurfaced(surfacedHabits);
    } catch (e) {
      console.error('[HabitSurfaceSection] Error completing habit:', e);
    }
  }, [hour, workoutToday, workoutCompleted, sleepHoursLast, proteinGapToday, streakSlipping]);

  if (loading || surfaced.length === 0) return null;

  const activeHabits = habits.filter(h => h.isActive);
  const completedTodayCount = activeHabits.filter(h => h.completedToday).length;
  const totalActiveCount = activeHabits.length;
  const progressRatio = totalActiveCount > 0 ? completedTodayCount / totalActiveCount : 0;
  const allSurfacedDone = surfaced.every(h => h.completedToday);
  const nextHint = getNextHintText(hour);

  const progressText = `${completedTodayCount} of ${totalActiveCount} habits done today`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Right now</Text>
        <Text style={styles.timeLabel}>{timeLabel}</Text>
      </View>

      {/* All done state */}
      {allSurfacedDone ? (
        <View style={styles.allDoneCard}>
          <Text style={styles.allDoneEmoji}>🎉</Text>
          <View style={styles.allDoneText}>
            <Text style={styles.allDoneTitle}>All done for now</Text>
            <Text style={styles.allDoneHint}>{nextHint}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.habitList}>
          {surfaced.map((habit, i) => {
            const opacity = itemAnims.current[i] || new Animated.Value(1);
            const translateY = itemTranslates.current[i] || new Animated.Value(0);
            return (
              <Animated.View
                key={habit.id}
                style={{ opacity, transform: [{ translateY }] }}
              >
                <HabitCard habit={habit} onComplete={handleComplete} index={i} />
              </Animated.View>
            );
          })}
        </View>
      )}

      {/* Progress bar */}
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>{progressText}</Text>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progressRatio * 100}%` }]} />
        </View>
      </View>

      {/* Manage link */}
      <TouchableOpacity
        style={styles.manageLink}
        onPress={() => {
          console.log('[HabitSurfaceSection] User tapped Manage habits');
          router.push('/habits' as any);
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.manageLinkText}>Manage habits</Text>
        <ChevronRight size={14} color={colors.primary} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.grey,
  },
  habitList: {
    gap: 8,
  },
  allDoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(52,211,153,0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.2)',
    padding: 16,
  },
  allDoneEmoji: {
    fontSize: 28,
  },
  allDoneText: {
    flex: 1,
  },
  allDoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  allDoneHint: {
    fontSize: 13,
    color: colors.grey,
  },
  progressRow: {
    gap: 6,
  },
  progressText: {
    fontSize: 12,
    color: colors.grey,
    fontWeight: '500',
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34D399',
    borderRadius: 2,
  },
  manageLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  manageLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
