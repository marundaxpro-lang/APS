
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DayActivity,
  StreakState,
  updateStreak,
  calculateDayScore,
} from './streakEngine';

const STREAK_KEY_BASE = 'apex_streak_state';

function getStreakKey(userId?: string): string {
  return userId ? `${STREAK_KEY_BASE}_${userId}` : STREAK_KEY_BASE;
}

function getISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

const DEFAULT_STATE: StreakState = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: '',
  streakType: 'building',
  graceUsedThisWeek: false,
  comebackActive: false,
  weeklyScore: 0,
  totalActiveDays: 0,
  history: [],
};

export async function getStreakState(userId?: string): Promise<StreakState> {
  try {
    const key = getStreakKey(userId);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as StreakState;
    console.log('[StreakStore] Loaded streak state for user:', userId ?? 'anonymous', 'currentStreak:', parsed.currentStreak);
    return parsed;
  } catch (e) {
    console.error('[StreakStore] Error loading streak state:', e);
    return { ...DEFAULT_STATE };
  }
}

export async function saveStreakState(state: StreakState, userId?: string): Promise<void> {
  try {
    const key = getStreakKey(userId);
    await AsyncStorage.setItem(key, JSON.stringify(state));
    console.log('[StreakStore] Saved streak state for user:', userId ?? 'anonymous', 'currentStreak:', state.currentStreak);
  } catch (e) {
    console.error('[StreakStore] Error saving streak state:', e);
  }
}

export async function logTodayActivity(
  activity: Partial<DayActivity>,
  userId?: string
): Promise<StreakState> {
  const state = await getStreakState(userId);
  const todayStr = getISODate(new Date());

  // Merge with existing today record if any
  const existing = state.history.find((d) => d.date === todayStr);
  const base: DayActivity = existing ?? {
    date: todayStr,
    workoutCompleted: false,
    nutritionHit: false,
    recoveryDone: false,
    prioritiesCompleted: 0,
    prioritiesTotal: 5,
    restDayScheduled: false,
  };

  const merged: DayActivity = { ...base, ...activity, date: todayStr };
  console.log('[StreakStore] logTodayActivity:', merged, 'score:', calculateDayScore(merged));

  const newState = updateStreak(merged, state);
  await saveStreakState(newState, userId);
  return newState;
}

export async function seedDemoStreak(userId?: string): Promise<void> {
  const key = getStreakKey(userId);
  const existing = await AsyncStorage.getItem(key);
  if (existing) {
    console.log('[StreakStore] Demo streak already seeded, skipping');
    return;
  }

  console.log('[StreakStore] Seeding demo streak for user:', userId ?? 'anonymous');

  const today = new Date();
  const days: DayActivity[] = [];

  // Build 9 days of history ending yesterday
  const configs = [
    // 9 days ago — strong day
    { workoutCompleted: true, nutritionHit: true, recoveryDone: true, prioritiesCompleted: 4, prioritiesTotal: 5, restDayScheduled: false },
    // 8 days ago — good day
    { workoutCompleted: true, nutritionHit: true, recoveryDone: false, prioritiesCompleted: 3, prioritiesTotal: 5, restDayScheduled: false },
    // 7 days ago — rest day
    { workoutCompleted: false, nutritionHit: true, recoveryDone: true, prioritiesCompleted: 2, prioritiesTotal: 5, restDayScheduled: true },
    // 6 days ago — strong day
    { workoutCompleted: true, nutritionHit: true, recoveryDone: true, prioritiesCompleted: 5, prioritiesTotal: 5, restDayScheduled: false },
    // 5 days ago — grace day (score ~25)
    { workoutCompleted: false, nutritionHit: true, recoveryDone: false, prioritiesCompleted: 0, prioritiesTotal: 5, restDayScheduled: false },
    // 4 days ago — solid
    { workoutCompleted: true, nutritionHit: false, recoveryDone: true, prioritiesCompleted: 3, prioritiesTotal: 5, restDayScheduled: false },
    // 3 days ago — strong
    { workoutCompleted: true, nutritionHit: true, recoveryDone: true, prioritiesCompleted: 4, prioritiesTotal: 5, restDayScheduled: false },
    // 2 days ago — good
    { workoutCompleted: true, nutritionHit: true, recoveryDone: false, prioritiesCompleted: 3, prioritiesTotal: 5, restDayScheduled: false },
    // yesterday — strong
    { workoutCompleted: true, nutritionHit: true, recoveryDone: true, prioritiesCompleted: 5, prioritiesTotal: 5, restDayScheduled: false },
  ];

  for (let i = 0; i < configs.length; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (configs.length - i));
    const dateStr = d.toISOString().split('T')[0];
    days.push({ date: dateStr, ...configs[i] });
  }

  // Build state by replaying history
  let state: StreakState = { ...DEFAULT_STATE };
  for (const day of days) {
    state = updateStreak(day, state);
    // Mark grace used on the grace day (5 days ago)
    if (configs[days.indexOf(day)] === configs[4]) {
      state = { ...state, graceUsedThisWeek: true };
    }
  }

  await saveStreakState(state, userId);
  console.log('[StreakStore] Demo streak seeded, currentStreak:', state.currentStreak);
}
