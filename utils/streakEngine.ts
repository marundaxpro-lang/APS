
export interface DayActivity {
  date: string; // ISO date 'YYYY-MM-DD'
  workoutCompleted: boolean;
  nutritionHit: boolean;
  recoveryDone: boolean;
  prioritiesCompleted: number; // 0-5
  prioritiesTotal: number;
  restDayScheduled: boolean;
}

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  streakType: 'fire' | 'building' | 'recovering' | 'resting';
  graceUsedThisWeek: boolean;
  comebackActive: boolean;
  weeklyScore: number; // 0-100
  totalActiveDays: number;
  history: DayActivity[]; // last 30 days
}

export function calculateDayScore(day: DayActivity): number {
  if (day.restDayScheduled) {
    const hasAnyAction =
      day.workoutCompleted ||
      day.nutritionHit ||
      day.recoveryDone ||
      day.prioritiesCompleted > 0;
    return hasAnyAction ? 80 : 40;
  }

  let score = 0;
  if (day.workoutCompleted) score += 40;
  if (day.nutritionHit) score += 25;
  if (day.recoveryDone) score += 15;
  const priorityRatio =
    day.prioritiesTotal > 0 ? day.prioritiesCompleted / day.prioritiesTotal : 0;
  score += Math.round(priorityRatio * 20);
  return Math.min(100, score);
}

export function shouldStreakContinue(
  today: DayActivity,
  state: StreakState
): boolean {
  const score = calculateDayScore(today);
  if (score >= 40) return true;
  if (today.restDayScheduled) return true;
  if (!state.graceUsedThisWeek && score >= 20) return true;
  return false;
}

function getISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.round(Math.abs(a - b) / (1000 * 60 * 60 * 24));
}

function getWeeklyScore(history: DayActivity[]): number {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const weekStr = getISODate(weekAgo);
  const weekDays = history.filter((d) => d.date >= weekStr);
  if (weekDays.length === 0) return 0;
  const total = weekDays.reduce((sum, d) => sum + calculateDayScore(d), 0);
  return Math.round(total / 7);
}

export function updateStreak(
  today: DayActivity,
  state: StreakState
): StreakState {
  const todayStr = today.date;
  const score = calculateDayScore(today);
  const isGraceDay = !state.graceUsedThisWeek && score >= 20 && score < 40 && !today.restDayScheduled;
  const streakContinues = shouldStreakContinue(today, state);

  // Merge today into history (replace if exists, else append)
  const existingIdx = state.history.findIndex((d) => d.date === todayStr);
  let newHistory: DayActivity[];
  if (existingIdx >= 0) {
    newHistory = state.history.map((d, i) => (i === existingIdx ? today : d));
  } else {
    newHistory = [...state.history, today];
  }
  // Keep last 30 days
  newHistory = newHistory
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  const daysSinceLast = state.lastActiveDate
    ? daysBetween(state.lastActiveDate, todayStr)
    : 0;

  let newStreak = state.currentStreak;
  let newGraceUsed = state.graceUsedThisWeek;
  let newComebackActive = state.comebackActive;
  let newTotalActiveDays = state.totalActiveDays;

  if (streakContinues) {
    // Only increment if this is a new day (not re-logging same day)
    if (state.lastActiveDate !== todayStr) {
      if (daysSinceLast <= 1) {
        newStreak = state.currentStreak + 1;
      } else {
        // Gap — reset streak but mark comeback
        newStreak = 1;
        newComebackActive = true;
      }
      newTotalActiveDays = state.totalActiveDays + 1;
    }
    if (isGraceDay) {
      newGraceUsed = true;
    }
  } else {
    // Streak broken
    if (state.lastActiveDate !== todayStr) {
      newStreak = 0;
      newComebackActive = false;
    }
  }

  // Comeback clears after 3 days of active streak
  if (newComebackActive && newStreak >= 3) {
    newComebackActive = false;
  }

  const newLongest = Math.max(state.longestStreak, newStreak);

  // Determine streak type
  let streakType: StreakState['streakType'];
  if (today.restDayScheduled && !today.workoutCompleted) {
    streakType = 'resting';
  } else if (newComebackActive) {
    streakType = 'recovering';
  } else if (newStreak >= 7) {
    streakType = 'fire';
  } else {
    streakType = 'building';
  }

  const weeklyScore = getWeeklyScore(newHistory);

  console.log('[StreakEngine] updateStreak:', {
    date: todayStr,
    score,
    isGraceDay,
    streakContinues,
    newStreak,
    streakType,
  });

  return {
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastActiveDate: streakContinues ? todayStr : state.lastActiveDate,
    streakType,
    graceUsedThisWeek: newGraceUsed,
    comebackActive: newComebackActive,
    weeklyScore,
    totalActiveDays: newTotalActiveDays,
    history: newHistory,
  };
}

export function getComebackMessage(daysMissed: number): string {
  if (daysMissed === 1) return 'Welcome back — your streak is waiting.';
  if (daysMissed === 2) return 'Two days off. Your body needed it. Let\'s rebuild.';
  if (daysMissed === 3) return 'Fresh start. Every comeback is a new streak record waiting to happen.';
  return 'The best time to start was before. The second best time is now.';
}

export function getStreakMotivation(state: StreakState): string {
  switch (state.streakType) {
    case 'fire':
      if (state.currentStreak >= 30) return 'A month of consistency. You\'re unstoppable.';
      if (state.currentStreak >= 14) return 'Two weeks strong. This is who you are now.';
      return 'You\'re on fire. Don\'t stop now.';
    case 'building':
      if (state.currentStreak >= 5) return 'Five days in. The habit is forming.';
      if (state.currentStreak >= 3) return 'Momentum is building. Keep showing up.';
      return 'Every streak starts with day one. You\'re doing it.';
    case 'recovering': {
      const daysMissed = state.lastActiveDate
        ? Math.round(
            (new Date().getTime() - new Date(state.lastActiveDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 1;
      return getComebackMessage(daysMissed);
    }
    case 'resting':
      return 'Rest is training. You\'re still in the game.';
    default:
      return 'Show up today. That\'s all it takes.';
  }
}
