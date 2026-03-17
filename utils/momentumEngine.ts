
// ─── Momentum Engine ──────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TimeOfDay } from './nextBestAction';

// ─── Storage Keys ─────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  COMPLETION_DATES: 'apex_completion_dates',
  COMPLETED_PRIORITIES: 'apex_completed_priorities',
  STREAK_DATA: 'apex_streak_data',
  EQUIPMENT_MODE: 'apex_equipment_mode',
  DAY_CONTEXT: 'apex_day_context',
} as const;

// ─── Streak Logic ─────────────────────────────────────────────────────────────

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  weeklyCompletionDates: string[];
}

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

export function calculateStreak(completionDates: string[]): StreakData {
  if (completionDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: '', weeklyCompletionDates: [] };
  }

  const sorted = [...new Set(completionDates)].sort();
  const today = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86400000));

  // Weekly completion dates (last 7 days)
  const weekAgo = toDateStr(new Date(Date.now() - 7 * 86400000));
  const weeklyCompletionDates = sorted.filter(d => d >= weekAgo);

  // Calculate current streak (consecutive days ending today or yesterday)
  let currentStreak = 0;
  const lastDate = sorted[sorted.length - 1];
  if (lastDate !== today && lastDate !== yesterday) {
    // Streak broken
    currentStreak = 0;
  } else {
    currentStreak = 1;
    for (let i = sorted.length - 2; i >= 0; i--) {
      const diff = daysBetween(sorted[i], sorted[i + 1]);
      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 1;
  let runningStreak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = daysBetween(sorted[i - 1], sorted[i]);
    if (diff === 1) {
      runningStreak++;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else {
      runningStreak = 1;
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastActiveDate: lastDate,
    weeklyCompletionDates,
  };
}

export function getStreakMessage(streak: number): string {
  if (streak === 0) return 'Start your streak today.';
  if (streak === 1) return 'Day 1. The hardest step is done.';
  if (streak <= 6) return `Day ${streak}. Build the habit.`;
  if (streak <= 13) return 'One week strong. Keep going.';
  if (streak <= 29) return 'Two weeks of consistency. You\'re building something real.';
  return `Day ${streak}. Elite consistency.`;
}

// ─── Weekly Adherence ─────────────────────────────────────────────────────────

export interface DayRecord {
  date: string;
  workoutCompleted: boolean;
  mealsLogged: number;
  totalMealsTarget: number;
  habitsCompleted: number;
  totalHabits: number;
}

export interface WeeklyAdherence {
  workoutAdherence: number;
  nutritionAdherence: number;
  habitAdherence: number;
  overallAdherence: number;
  completedDays: number;
  totalDays: number;
}

export function calculateWeeklyAdherence(weekData: DayRecord[]): WeeklyAdherence {
  if (weekData.length === 0) {
    return { workoutAdherence: 0, nutritionAdherence: 0, habitAdherence: 0, overallAdherence: 0, completedDays: 0, totalDays: 0 };
  }

  const totalDays = weekData.length;
  const workoutDays = weekData.filter(d => d.workoutCompleted).length;
  const nutritionScores = weekData.map(d => d.totalMealsTarget > 0 ? d.mealsLogged / d.totalMealsTarget : 0);
  const habitScores = weekData.map(d => d.totalHabits > 0 ? d.habitsCompleted / d.totalHabits : 0);

  const workoutAdherence = workoutDays / totalDays;
  const nutritionAdherence = nutritionScores.reduce((a, b) => a + b, 0) / totalDays;
  const habitAdherence = habitScores.reduce((a, b) => a + b, 0) / totalDays;
  const overallAdherence = workoutAdherence * 0.5 + nutritionAdherence * 0.3 + habitAdherence * 0.2;
  const completedDays = weekData.filter(d => d.workoutCompleted || d.mealsLogged > 0 || d.habitsCompleted > 0).length;

  return {
    workoutAdherence,
    nutritionAdherence,
    habitAdherence,
    overallAdherence,
    completedDays,
    totalDays,
  };
}

// ─── Daily Priorities Generator ───────────────────────────────────────────────

export const CATEGORY_COLORS = {
  training: '#00D4AA',
  nutrition: '#FF8C42',
  recovery: '#A78BFA',
  habit: '#60A5FA',
  planning: '#F59E0B',
} as const;

export interface Priority {
  id: string;
  category: 'training' | 'nutrition' | 'recovery' | 'habit' | 'planning';
  title: string;
  subtitle: string;
  isHero: boolean;
  isCompleted: boolean;
  completedAt?: string;
  rank: number;
  color: string;
  ctaLabel?: string;
  ctaRoute?: string;
}

export interface DayContext {
  date: string;
  timeOfDay: TimeOfDay;
  workoutScheduled?: string;
  workoutCompleted: boolean;
  proteinTarget: number;
  proteinLogged: number;
  caloriesTarget: number;
  caloriesLogged: number;
  mealsLogged: number;
  sleepHours: number;
  currentStreak: number;
  weeklyAdherence: number;
  missedWorkoutsThisWeek: number;
  completedPriorityIds: string[];
}

export function generateDailyPriorities(context: DayContext): Priority[] {
  const {
    timeOfDay, workoutScheduled, workoutCompleted, proteinTarget, proteinLogged,
    caloriesTarget, caloriesLogged, mealsLogged, currentStreak,
    weeklyAdherence, missedWorkoutsThisWeek, completedPriorityIds,
  } = context;

  const hour = new Date().getHours();
  const proteinRatio = proteinTarget > 0 ? proteinLogged / proteinTarget : 1;
  const caloriesRatio = caloriesTarget > 0 ? caloriesLogged / caloriesTarget : 1;
  const priorities: Priority[] = [];

  // ── HERO PRIORITY ──
  let heroPriority: Priority;

  if (workoutScheduled && !workoutCompleted) {
    heroPriority = {
      id: 'hero-workout',
      category: 'training',
      title: `Complete ${workoutScheduled}`,
      subtitle: 'Scheduled for today · Stay on track',
      isHero: true,
      isCompleted: completedPriorityIds.includes('hero-workout'),
      rank: 1,
      color: CATEGORY_COLORS.training,
      ctaLabel: 'Start Session',
      ctaRoute: '/training-plan',
    };
  } else if (proteinRatio < 0.5) {
    heroPriority = {
      id: 'hero-protein',
      category: 'nutrition',
      title: 'Hit your protein target',
      subtitle: `${Math.round(proteinLogged)}g of ${Math.round(proteinTarget)}g logged`,
      isHero: true,
      isCompleted: completedPriorityIds.includes('hero-protein'),
      rank: 1,
      color: CATEGORY_COLORS.nutrition,
      ctaLabel: 'Log Nutrition',
      ctaRoute: '/(tabs)/nutrition',
    };
  } else if (mealsLogged === 0 && hour > 10) {
    heroPriority = {
      id: 'hero-meals',
      category: 'nutrition',
      title: 'Log your first meal',
      subtitle: 'No meals logged yet today',
      isHero: true,
      isCompleted: completedPriorityIds.includes('hero-meals'),
      rank: 1,
      color: CATEGORY_COLORS.nutrition,
      ctaLabel: 'Log a Meal',
      ctaRoute: '/(tabs)/nutrition',
    };
  } else if (currentStreak > 0 && hour > 18 && !workoutCompleted) {
    heroPriority = {
      id: 'hero-streak',
      category: 'habit',
      title: 'Keep the streak alive',
      subtitle: `${currentStreak}-day streak at risk · Act now`,
      isHero: true,
      isCompleted: completedPriorityIds.includes('hero-streak'),
      rank: 1,
      color: CATEGORY_COLORS.habit,
      ctaLabel: 'View Priorities',
      ctaRoute: '/(tabs)/momentum',
    };
  } else {
    heroPriority = {
      id: 'hero-plan',
      category: 'planning',
      title: "Review tomorrow's plan",
      subtitle: 'Prep tonight · Execute tomorrow',
      isHero: true,
      isCompleted: completedPriorityIds.includes('hero-plan'),
      rank: 1,
      color: CATEGORY_COLORS.planning,
      ctaLabel: 'View Training Plan',
      ctaRoute: '/training-plan',
    };
  }

  priorities.push(heroPriority);

  // ── SECONDARY PRIORITIES ──
  let rank = 2;

  if (proteinRatio < 0.8 && heroPriority.id !== 'hero-protein') {
    const remaining = Math.max(0, proteinTarget - proteinLogged);
    priorities.push({
      id: 'sec-protein',
      category: 'nutrition',
      title: `Reach ${Math.round(proteinTarget)}g protein today`,
      subtitle: `${Math.round(proteinLogged)}g logged · ${Math.round(remaining)}g remaining`,
      isHero: false,
      isCompleted: completedPriorityIds.includes('sec-protein'),
      rank: rank++,
      color: CATEGORY_COLORS.nutrition,
      ctaLabel: 'Log Nutrition',
      ctaRoute: '/(tabs)/nutrition',
    });
  }

  if (caloriesRatio < 0.6 && mealsLogged < 3 && heroPriority.id !== 'hero-meals') {
    priorities.push({
      id: 'sec-calories',
      category: 'nutrition',
      title: 'Log remaining meals',
      subtitle: `${mealsLogged} meals logged · ${Math.round(caloriesLogged)} of ${Math.round(caloriesTarget)} kcal`,
      isHero: false,
      isCompleted: completedPriorityIds.includes('sec-calories'),
      rank: rank++,
      color: CATEGORY_COLORS.nutrition,
      ctaLabel: 'Log a Meal',
      ctaRoute: '/(tabs)/nutrition',
    });
  }

  if (workoutCompleted) {
    priorities.push({
      id: 'sec-mobility',
      category: 'recovery',
      title: '10 min mobility cooldown',
      subtitle: 'Hip flexors + thoracic spine',
      isHero: false,
      isCompleted: completedPriorityIds.includes('sec-mobility'),
      rank: rank++,
      color: CATEGORY_COLORS.recovery,
      ctaLabel: 'Start Timer',
      ctaRoute: '/(tabs)/momentum',
    });
  }

  if (currentStreak > 0 && heroPriority.id !== 'hero-streak') {
    priorities.push({
      id: 'sec-checkin',
      category: 'habit',
      title: 'Evening check-in — log today\'s wins',
      subtitle: `${currentStreak}-day streak · Keep it going`,
      isHero: false,
      isCompleted: completedPriorityIds.includes('sec-checkin'),
      rank: rank++,
      color: CATEGORY_COLORS.habit,
    });
  }

  if (missedWorkoutsThisWeek > 0) {
    priorities.push({
      id: 'sec-missed',
      category: 'planning',
      title: 'Review missed session',
      subtitle: `${missedWorkoutsThisWeek} missed this week · Reschedule`,
      isHero: false,
      isCompleted: completedPriorityIds.includes('sec-missed'),
      rank: rank++,
      color: CATEGORY_COLORS.planning,
      ctaLabel: 'View Plan',
      ctaRoute: '/training-plan',
    });
  }

  // ── OPTIONAL HABITS ──
  if (timeOfDay === 'morning') {
    priorities.push({
      id: 'habit-hydration',
      category: 'habit',
      title: 'Morning hydration',
      subtitle: '500ml water · Start the day right',
      isHero: false,
      isCompleted: completedPriorityIds.includes('habit-hydration'),
      rank: rank++,
      color: CATEGORY_COLORS.habit,
    });
    priorities.push({
      id: 'habit-supplements',
      category: 'habit',
      title: 'Take supplements',
      subtitle: 'Creatine, vitamins, fish oil',
      isHero: false,
      isCompleted: completedPriorityIds.includes('habit-supplements'),
      rank: rank++,
      color: CATEGORY_COLORS.habit,
    });
  } else if (timeOfDay === 'afternoon') {
    priorities.push({
      id: 'habit-movement',
      category: 'habit',
      title: 'Midday movement break',
      subtitle: '5 min walk · Reset your focus',
      isHero: false,
      isCompleted: completedPriorityIds.includes('habit-movement'),
      rank: rank++,
      color: CATEGORY_COLORS.habit,
    });
  } else if (timeOfDay === 'evening') {
    priorities.push({
      id: 'habit-meal-prep',
      category: 'habit',
      title: "Prep tomorrow's meals",
      subtitle: 'Remove friction · Set up for success',
      isHero: false,
      isCompleted: completedPriorityIds.includes('habit-meal-prep'),
      rank: rank++,
      color: CATEGORY_COLORS.habit,
    });
  } else {
    priorities.push({
      id: 'habit-screens',
      category: 'habit',
      title: 'No screens 1hr before bed',
      subtitle: 'Protect sleep quality · Wind down',
      isHero: false,
      isCompleted: completedPriorityIds.includes('habit-screens'),
      rank: rank++,
      color: CATEGORY_COLORS.habit,
    });
  }

  // Filter completed and ensure at least 3 remain
  const filtered = priorities.filter(p => !completedPriorityIds.includes(p.id));
  const completed = priorities.filter(p => completedPriorityIds.includes(p.id)).map(p => ({ ...p, isCompleted: true }));

  const combined = [...filtered, ...completed];
  return combined.length >= 3 ? combined : priorities;
}

// ─── Momentum Score ───────────────────────────────────────────────────────────

export function getMomentumScore(adherence: WeeklyAdherence, streak: number): number {
  const adherenceScore = adherence.overallAdherence * 60;
  const streakScore = (Math.min(streak, 30) / 30) * 40;
  return Math.round(adherenceScore + streakScore);
}

export function getMomentumLabel(score: number): string {
  if (score <= 30) return 'Building';
  if (score <= 60) return 'Consistent';
  if (score <= 80) return 'Strong';
  return 'Elite';
}

// ─── useMomentumStore hook ────────────────────────────────────────────────────

export function useMomentumStore() {
  const [completionDates, setCompletionDates] = useState<string[]>([]);
  const [completedPrioritiesMap, setCompletedPrioritiesMap] = useState<Record<string, string[]>>({});
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: '',
    weeklyCompletionDates: [],
  });
  const [loaded, setLoaded] = useState(false);

  const todayStr = toDateStr(new Date());

  useEffect(() => {
    async function load() {
      console.log('[MomentumStore] Loading from AsyncStorage');
      try {
        const [datesRaw, prioritiesRaw, streakRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.COMPLETION_DATES),
          AsyncStorage.getItem(STORAGE_KEYS.COMPLETED_PRIORITIES),
          AsyncStorage.getItem(STORAGE_KEYS.STREAK_DATA),
        ]);

        const dates: string[] = datesRaw ? JSON.parse(datesRaw) : [];
        const prioritiesMap: Record<string, string[]> = prioritiesRaw ? JSON.parse(prioritiesRaw) : {};

        setCompletionDates(dates);
        setCompletedPrioritiesMap(prioritiesMap);

        // Recalculate streak from dates (source of truth)
        const computed = calculateStreak(dates);
        setStreakData(computed);

        // Persist computed streak
        await AsyncStorage.setItem(STORAGE_KEYS.STREAK_DATA, JSON.stringify(computed));
        console.log('[MomentumStore] Loaded. Streak:', computed.currentStreak, 'Dates:', dates.length);
      } catch (e) {
        console.error('[MomentumStore] Load error:', e);
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, []);

  const completedPriorityIds = completedPrioritiesMap[todayStr] ?? [];

  const completePriority = useCallback(async (priorityId: string, isHero: boolean) => {
    console.log('[MomentumStore] completePriority', { priorityId, isHero });

    const newMap = { ...completedPrioritiesMap };
    const todayIds = newMap[todayStr] ? [...newMap[todayStr]] : [];
    if (!todayIds.includes(priorityId)) {
      todayIds.push(priorityId);
    }
    newMap[todayStr] = todayIds;
    setCompletedPrioritiesMap(newMap);

    let newDates = completionDates;
    if (isHero && !completionDates.includes(todayStr)) {
      newDates = [...completionDates, todayStr];
      setCompletionDates(newDates);
      const newStreak = calculateStreak(newDates);
      setStreakData(newStreak);
      await AsyncStorage.setItem(STORAGE_KEYS.COMPLETION_DATES, JSON.stringify(newDates));
      await AsyncStorage.setItem(STORAGE_KEYS.STREAK_DATA, JSON.stringify(newStreak));
      console.log('[MomentumStore] Hero completed — streak updated to', newStreak.currentStreak);
    }

    await AsyncStorage.setItem(STORAGE_KEYS.COMPLETED_PRIORITIES, JSON.stringify(newMap));
  }, [completedPrioritiesMap, completionDates, todayStr]);

  const completeToday = useCallback(async () => {
    console.log('[MomentumStore] completeToday');
    if (!completionDates.includes(todayStr)) {
      const newDates = [...completionDates, todayStr];
      setCompletionDates(newDates);
      const newStreak = calculateStreak(newDates);
      setStreakData(newStreak);
      await AsyncStorage.setItem(STORAGE_KEYS.COMPLETION_DATES, JSON.stringify(newDates));
      await AsyncStorage.setItem(STORAGE_KEYS.STREAK_DATA, JSON.stringify(newStreak));
    }
  }, [completionDates, todayStr]);

  return {
    loaded,
    streakData,
    completionDates,
    completedPriorityIds,
    completedPrioritiesMap,
    completeToday,
    completePriority,
  };
}
