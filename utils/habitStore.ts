
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit, HABIT_LIBRARY } from './habitEngine';

const HABITS_KEY = 'apex_habits_v1';

const DEFAULT_ACTIVE_IDS = [
  'morning_water',
  'protein_breakfast',
  'morning_stretch',
  'sleep_routine',
  'daily_checkin',
];

export interface FitnessProfileForHabits {
  primaryGoal?: string;
  nutritionPreference?: string;
  activityLevelOutsideTraining?: string;
  goal?: string;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function buildHabitFromLibrary(
  libItem: (typeof HABIT_LIBRARY)[number],
  overrides: Partial<Habit> = {}
): Habit {
  return {
    ...libItem,
    streakCount: 0,
    completedToday: false,
    completedDates: [],
    isActive: DEFAULT_ACTIVE_IDS.includes(libItem.id),
    ...overrides,
  };
}

/**
 * Derive a prioritized list of habit IDs based on the user's fitness profile.
 * Always returns at least 4 IDs.
 */
function getActiveIdsForProfile(profile: FitnessProfileForHabits): string[] {
  const goal = profile.primaryGoal || profile.goal || '';
  const nutrition = profile.nutritionPreference || '';
  const activity = profile.activityLevelOutsideTraining || '';

  let prioritized: string[] = [];

  if (goal === 'lose-fat' || goal === 'lose_weight' || goal === 'body_recomposition') {
    prioritized = ['daily_checkin', 'protein_breakfast', 'morning_water', 'sleep_routine', 'post_workout_shake'];
  } else if (goal === 'build-muscle' || goal === 'build_muscle' || goal === 'get-stronger' || goal === 'strength') {
    prioritized = ['protein_breakfast', 'post_workout_shake', 'morning_water', 'sleep_routine', 'morning_stretch'];
  } else if (goal === 'improve-endurance' || goal === 'improve_endurance' || goal === 'general-fitness' || goal === 'general_fitness') {
    prioritized = ['morning_water', 'morning_stretch', 'sleep_routine', 'daily_checkin', 'protein_breakfast'];
  } else {
    // Default fallback
    prioritized = [...DEFAULT_ACTIVE_IDS];
  }

  // Nutrition preference overrides: always include hydration + consistency
  if (nutrition === 'vegan' || nutrition === 'vegetarian') {
    if (!prioritized.includes('morning_water')) prioritized.unshift('morning_water');
    if (!prioritized.includes('daily_checkin')) prioritized.push('daily_checkin');
  }

  // Sedentary users benefit from mobility
  if (activity === 'sedentary' || activity === 'lightly-active' || activity === 'lightly_active') {
    if (!prioritized.includes('morning_stretch')) prioritized.push('morning_stretch');
  }

  // Ensure at least 4 active habits
  const fallbacks = ['morning_water', 'protein_breakfast', 'sleep_routine', 'daily_checkin', 'morning_stretch'];
  for (const id of fallbacks) {
    if (prioritized.length >= 4) break;
    if (!prioritized.includes(id)) prioritized.push(id);
  }

  console.log('[HabitStore] Active habit IDs for profile:', prioritized);
  return prioritized;
}

export async function getHabits(): Promise<Habit[]> {
  try {
    const raw = await AsyncStorage.getItem(HABITS_KEY);
    if (!raw) return [];
    const habits: Habit[] = JSON.parse(raw);
    // Refresh completedToday based on today's date
    const today = todayISO();
    return habits.map(h => ({
      ...h,
      completedToday: h.completedDates.includes(today),
    }));
  } catch (e) {
    console.error('[HabitStore] getHabits error:', e);
    return [];
  }
}

export async function saveHabits(habits: Habit[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  } catch (e) {
    console.error('[HabitStore] saveHabits error:', e);
  }
}

export async function initializeHabits(fitnessProfile?: FitnessProfileForHabits): Promise<Habit[]> {
  const existing = await getHabits();
  if (existing.length > 0) return existing;

  const activeIds = fitnessProfile
    ? getActiveIdsForProfile(fitnessProfile)
    : DEFAULT_ACTIVE_IDS;

  console.log('[HabitStore] First-time init — creating habits for profile, active IDs:', activeIds);
  const habits: Habit[] = HABIT_LIBRARY.map(lib =>
    buildHabitFromLibrary(lib, { isActive: activeIds.includes(lib.id) })
  );
  await saveHabits(habits);
  return habits;
}

/**
 * Clear existing habits and re-initialize based on the given fitness profile.
 * Called after onboarding completes so habits are immediately personalized.
 */
export async function resetHabitsForProfile(fitnessProfile: FitnessProfileForHabits): Promise<Habit[]> {
  console.log('[HabitStore] resetHabitsForProfile called with goal:', fitnessProfile.primaryGoal || fitnessProfile.goal);
  await AsyncStorage.removeItem(HABITS_KEY);
  return initializeHabits(fitnessProfile);
}

export async function completeHabit(
  habitId: string
): Promise<{ habit: Habit; xpEarned: number; newStreak: number }> {
  console.log('[HabitStore] completeHabit called for:', habitId);
  const habits = await getHabits();
  const today = todayISO();

  const idx = habits.findIndex(h => h.id === habitId);
  if (idx === -1) throw new Error(`Habit ${habitId} not found`);

  const habit = habits[idx];
  if (habit.completedToday) {
    return { habit, xpEarned: 0, newStreak: habit.streakCount };
  }

  // Calculate new streak
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = yesterday.toISOString().split('T')[0];
  const hadYesterday = habit.completedDates.includes(yesterdayISO);
  const newStreak = hadYesterday ? habit.streakCount + 1 : 1;

  const updatedHabit: Habit = {
    ...habit,
    completedToday: true,
    completedDates: [...habit.completedDates, today],
    streakCount: newStreak,
  };

  habits[idx] = updatedHabit;
  await saveHabits(habits);

  console.log('[HabitStore] Habit completed:', habitId, 'streak:', newStreak, 'xp:', habit.xpReward);
  return { habit: updatedHabit, xpEarned: habit.xpReward, newStreak };
}

export async function toggleHabit(habitId: string, active: boolean): Promise<void> {
  console.log('[HabitStore] toggleHabit:', habitId, 'active:', active);
  const habits = await getHabits();
  const updated = habits.map(h => (h.id === habitId ? { ...h, isActive: active } : h));
  await saveHabits(updated);
}

export async function seedDemoHabits(): Promise<void> {
  const existing = await getHabits();
  if (existing.length > 0) return;

  console.log('[HabitStore] Seeding demo habits with realistic history');

  const today = new Date();

  function pastDates(count: number): string[] {
    const dates: string[] = [];
    for (let i = count; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }

  const habits: Habit[] = HABIT_LIBRARY.map(lib => {
    if (lib.id === 'morning_water') {
      // 14-day streak
      return buildHabitFromLibrary(lib, {
        isActive: true,
        streakCount: 14,
        completedDates: pastDates(14),
        completedToday: true,
      });
    }
    if (lib.id === 'protein_breakfast') {
      // 5-day streak
      return buildHabitFromLibrary(lib, {
        isActive: true,
        streakCount: 5,
        completedDates: pastDates(5),
        completedToday: true,
      });
    }
    if (lib.id === 'morning_stretch') {
      // 5-day streak, not done today
      return buildHabitFromLibrary(lib, {
        isActive: true,
        streakCount: 5,
        completedDates: pastDates(5).slice(0, 5),
        completedToday: false,
      });
    }
    if (lib.id === 'sleep_routine') {
      // 3-day streak, not done today
      return buildHabitFromLibrary(lib, {
        isActive: true,
        streakCount: 3,
        completedDates: pastDates(3).slice(0, 3),
        completedToday: false,
      });
    }
    if (lib.id === 'daily_checkin') {
      // Just started, 1 day
      return buildHabitFromLibrary(lib, {
        isActive: true,
        streakCount: 1,
        completedDates: [today.toISOString().split('T')[0]],
        completedToday: true,
      });
    }
    if (lib.id === 'post_workout_shake') {
      // Active, 2-day streak
      return buildHabitFromLibrary(lib, {
        isActive: true,
        streakCount: 2,
        completedDates: pastDates(2).slice(0, 2),
        completedToday: false,
      });
    }
    if (lib.id === 'workout_log') {
      // Active, not started
      return buildHabitFromLibrary(lib, {
        isActive: true,
        streakCount: 0,
        completedDates: [],
        completedToday: false,
      });
    }
    return buildHabitFromLibrary(lib);
  });

  await saveHabits(habits);
}
