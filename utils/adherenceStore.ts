
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DayAdherence,
  WeekAdherence,
  calculateWeekAdherence,
} from './adherenceEngine';

const CURRENT_WEEK_KEY_BASE = 'adherence_current_week';
const WEEK_HISTORY_KEY_BASE = 'adherence_week_history';

function getCurrentWeekKey(userId?: string): string {
  return userId ? `${CURRENT_WEEK_KEY_BASE}_${userId}` : CURRENT_WEEK_KEY_BASE;
}

function getWeekHistoryKey(userId?: string): string {
  return userId ? `${WEEK_HISTORY_KEY_BASE}_${userId}` : WEEK_HISTORY_KEY_BASE;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

function buildEmptyWeek(): DayAdherence[] {
  const monday = getMonday(new Date());
  const days: DayAdherence[] = [];
  const dayNames: DayAdherence['dayOfWeek'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({
      date: toISO(d),
      dayOfWeek: dayNames[i],
      workout: { planned: false, completed: false, skipped: false },
      nutrition: { calorieTarget: 2400, caloriesLogged: 0, proteinTarget: 160, proteinLogged: 0 },
      recovery: { stretchDone: false, sleepHours: 0, sleepTarget: 8 },
      priorities: { completed: 0, total: 0 },
    });
  }
  return days;
}

export async function getCurrentWeek(userId?: string): Promise<WeekAdherence> {
  try {
    const key = getCurrentWeekKey(userId);
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const parsed: WeekAdherence = JSON.parse(raw);
      // Recalculate scores in case engine logic changed
      return calculateWeekAdherence(parsed.days);
    }
  } catch (e) {
    console.error('[AdherenceStore] Error reading current week:', e);
  }
  const emptyDays = buildEmptyWeek();
  return calculateWeekAdherence(emptyDays);
}

export async function saveCurrentWeek(week: WeekAdherence, userId?: string): Promise<void> {
  try {
    const key = getCurrentWeekKey(userId);
    await AsyncStorage.setItem(key, JSON.stringify(week));
    console.log('[AdherenceStore] Saved current week for user:', userId ?? 'anonymous', 'overall score:', week.scores.overall);
  } catch (e) {
    console.error('[AdherenceStore] Error saving current week:', e);
  }
}

export async function logDayAdherence(
  date: string,
  partial: Partial<DayAdherence>,
  userId?: string
): Promise<WeekAdherence> {
  console.log('[AdherenceStore] Logging day adherence for date:', date, 'user:', userId ?? 'anonymous', partial);
  const week = await getCurrentWeek(userId);
  const dayIndex = week.days.findIndex(d => d.date === date);
  if (dayIndex >= 0) {
    week.days[dayIndex] = { ...week.days[dayIndex], ...partial };
  }
  const updated = calculateWeekAdherence(week.days);
  await saveCurrentWeek(updated, userId);
  return updated;
}

export async function getWeekHistory(userId?: string): Promise<WeekAdherence[]> {
  try {
    const key = getWeekHistoryKey(userId);
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('[AdherenceStore] Error reading week history:', e);
  }
  return [];
}

export async function seedDemoWeek(userId?: string): Promise<void> {
  try {
    const key = getCurrentWeekKey(userId);
    const existing = await AsyncStorage.getItem(key);
    if (existing) {
      console.log('[AdherenceStore] Demo week already seeded, skipping');
      return;
    }

    console.log('[AdherenceStore] Seeding demo week data for user:', userId ?? 'anonymous');

    const monday = getMonday(new Date());
    const today = new Date();
    const todayStr = toISO(today);
    const dayNames: DayAdherence['dayOfWeek'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const days: DayAdherence[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = toISO(d);
      const isPast = dateStr < todayStr;
      const isToday = dateStr === todayStr;

      if (!isPast && !isToday) {
        // Future days — empty
        days.push({
          date: dateStr,
          dayOfWeek: dayNames[i],
          workout: { planned: i < 5, completed: false, skipped: false },
          nutrition: { calorieTarget: 2400, caloriesLogged: 0, proteinTarget: 160, proteinLogged: 0 },
          recovery: { stretchDone: false, sleepHours: 0, sleepTarget: 8 },
          priorities: { completed: 0, total: 3 },
        });
        continue;
      }

      // Realistic varied data for past/today
      const scenarios: DayAdherence[] = [
        // Mon — great day
        {
          date: dateStr,
          dayOfWeek: dayNames[i],
          workout: { planned: true, completed: true, skipped: false },
          nutrition: { calorieTarget: 2400, caloriesLogged: 2350, proteinTarget: 160, proteinLogged: 155 },
          recovery: { stretchDone: true, sleepHours: 7.5, sleepTarget: 8 },
          priorities: { completed: 3, total: 3 },
        },
        // Tue — solid
        {
          date: dateStr,
          dayOfWeek: dayNames[i],
          workout: { planned: false, completed: false, skipped: false },
          nutrition: { calorieTarget: 2400, caloriesLogged: 2200, proteinTarget: 160, proteinLogged: 140 },
          recovery: { stretchDone: true, sleepHours: 7.0, sleepTarget: 8 },
          priorities: { completed: 2, total: 3 },
        },
        // Wed — mid-week dip
        {
          date: dateStr,
          dayOfWeek: dayNames[i],
          workout: { planned: true, completed: true, skipped: false },
          nutrition: { calorieTarget: 2400, caloriesLogged: 1800, proteinTarget: 160, proteinLogged: 110 },
          recovery: { stretchDone: false, sleepHours: 5.5, sleepTarget: 8 },
          priorities: { completed: 1, total: 3 },
        },
        // Thu — recovering
        {
          date: dateStr,
          dayOfWeek: dayNames[i],
          workout: { planned: true, completed: false, skipped: true },
          nutrition: { calorieTarget: 2400, caloriesLogged: 2100, proteinTarget: 160, proteinLogged: 130 },
          recovery: { stretchDone: false, sleepHours: 6.0, sleepTarget: 8 },
          priorities: { completed: 2, total: 3 },
        },
        // Fri — today (partial)
        {
          date: dateStr,
          dayOfWeek: dayNames[i],
          workout: { planned: true, completed: false, skipped: false },
          nutrition: { calorieTarget: 2400, caloriesLogged: 1400, proteinTarget: 160, proteinLogged: 90 },
          recovery: { stretchDone: false, sleepHours: 7.0, sleepTarget: 8 },
          priorities: { completed: 1, total: 3 },
        },
        // Sat — rest day
        {
          date: dateStr,
          dayOfWeek: dayNames[i],
          workout: { planned: false, completed: false, skipped: false },
          nutrition: { calorieTarget: 2200, caloriesLogged: 0, proteinTarget: 140, proteinLogged: 0 },
          recovery: { stretchDone: false, sleepHours: 0, sleepTarget: 8 },
          priorities: { completed: 0, total: 2 },
        },
        // Sun — rest day
        {
          date: dateStr,
          dayOfWeek: dayNames[i],
          workout: { planned: false, completed: false, skipped: false },
          nutrition: { calorieTarget: 2200, caloriesLogged: 0, proteinTarget: 140, proteinLogged: 0 },
          recovery: { stretchDone: false, sleepHours: 0, sleepTarget: 8 },
          priorities: { completed: 0, total: 2 },
        },
      ];

      days.push(scenarios[i] || scenarios[0]);
    }

    const week = calculateWeekAdherence(days);
    await saveCurrentWeek(week, userId);

    // Seed 4 weeks of history
    const historyKey = getWeekHistoryKey(userId);
    const history: WeekAdherence[] = [];
    const historyScores = [72, 81, 65, 88];
    for (let w = 1; w <= 4; w++) {
      const wMonday = new Date(monday);
      wMonday.setDate(monday.getDate() - w * 7);
      const histDays: DayAdherence[] = [];
      const baseScore = historyScores[w - 1];
      for (let i = 0; i < 7; i++) {
        const hd = new Date(wMonday);
        hd.setDate(wMonday.getDate() + i);
        const variance = (Math.random() - 0.5) * 20;
        const cal = Math.round(2400 * Math.min(1.1, Math.max(0.5, (baseScore + variance) / 100)));
        const prot = Math.round(160 * Math.min(1.1, Math.max(0.5, (baseScore + variance) / 100)));
        histDays.push({
          date: toISO(hd),
          dayOfWeek: dayNames[i],
          workout: {
            planned: i < 5,
            completed: i < 5 && Math.random() < baseScore / 100,
            skipped: i < 5 && Math.random() < (1 - baseScore / 100) * 0.5,
          },
          nutrition: { calorieTarget: 2400, caloriesLogged: cal, proteinTarget: 160, proteinLogged: prot },
          recovery: {
            stretchDone: Math.random() < baseScore / 100,
            sleepHours: 5.5 + Math.random() * 3,
            sleepTarget: 8,
          },
          priorities: {
            completed: Math.round(3 * (baseScore / 100)),
            total: 3,
          },
        });
      }
      history.push(calculateWeekAdherence(histDays));
    }

    await AsyncStorage.setItem(historyKey, JSON.stringify(history));
    console.log('[AdherenceStore] Demo week seeded successfully for user:', userId ?? 'anonymous');
  } catch (e) {
    console.error('[AdherenceStore] Error seeding demo week:', e);
  }
}
