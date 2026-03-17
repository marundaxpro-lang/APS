
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

export async function initializeHabits(): Promise<Habit[]> {
  const existing = await getHabits();
  if (existing.length > 0) return existing;

  console.log('[HabitStore] First-time init — creating default habits');
  const habits: Habit[] = HABIT_LIBRARY.map(lib => buildHabitFromLibrary(lib));
  await saveHabits(habits);
  return habits;
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
