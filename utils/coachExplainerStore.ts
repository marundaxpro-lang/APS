
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CoachChange, ChangeType, generateExplanation } from './coachExplainer';

const CHANGES_KEY = '@apex_coach_changes';

export async function saveChange(change: CoachChange): Promise<void> {
  console.log('[CoachStore] Saving change:', change.id, change.type);
  try {
    const existing = await getChanges();
    const updated = [change, ...existing.filter(c => c.id !== change.id)];
    await AsyncStorage.setItem(CHANGES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('[CoachStore] Error saving change:', error);
  }
}

export async function getChanges(): Promise<CoachChange[]> {
  try {
    const raw = await AsyncStorage.getItem(CHANGES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CoachChange[];
  } catch (error) {
    console.error('[CoachStore] Error getting changes:', error);
    return [];
  }
}

export async function dismissChange(id: string): Promise<void> {
  console.log('[CoachStore] Dismissing change:', id);
  try {
    const existing = await getChanges();
    const updated = existing.map(c => (c.id === id ? { ...c, dismissed: true } : c));
    await AsyncStorage.setItem(CHANGES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('[CoachStore] Error dismissing change:', error);
  }
}

export async function clearOldChanges(daysToKeep = 30): Promise<void> {
  console.log('[CoachStore] Clearing changes older than', daysToKeep, 'days');
  try {
    const existing = await getChanges();
    const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
    const filtered = existing.filter(c => new Date(c.timestamp).getTime() > cutoff);
    await AsyncStorage.setItem(CHANGES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('[CoachStore] Error clearing old changes:', error);
  }
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
}

const DEMO_CHANGES: {
  id: string;
  type: ChangeType;
  timestamp: string;
  dataPoints: string[];
  confidence: CoachChange['confidence'];
  impact: CoachChange['impact'];
  seed: number;
}[] = [
  {
    id: 'demo_1',
    type: 'intensity_drop',
    timestamp: hoursAgo(3),
    dataPoints: ['Sleep avg: 5.4h this week', 'HRV: 14% below baseline', '6 sessions in 8 days'],
    confidence: 'high',
    impact: 'caution',
    seed: 0,
  },
  {
    id: 'demo_2',
    type: 'nutrition_fix',
    timestamp: daysAgo(1),
    dataPoints: ['Protein avg: 108g/day', 'Target: 130g/day', '6-day deficit streak', 'Avg shortfall: 22g'],
    confidence: 'high',
    impact: 'positive',
    seed: 0,
  },
  {
    id: 'demo_3',
    type: 'rest_day_added',
    timestamp: daysAgo(2),
    dataPoints: ['5 consecutive training days', 'Session rating: -15% trend', 'Fatigue score: 78/100'],
    confidence: 'high',
    impact: 'caution',
    seed: 0,
  },
  {
    id: 'demo_4',
    type: 'workout_swap',
    timestamp: daysAgo(3),
    dataPoints: ['Quad soreness: 2 days', 'Last leg session: 36h ago', 'Upper body: 48h rest'],
    confidence: 'high',
    impact: 'neutral',
    seed: 0,
  },
  {
    id: 'demo_5',
    type: 'week_reshuffle',
    timestamp: daysAgo(5),
    dataPoints: ['Push/pull on consecutive days', 'Shoulder stress overlap', 'Load distribution: uneven'],
    confidence: 'medium',
    impact: 'positive',
    seed: 1,
  },
  {
    id: 'demo_6',
    type: 'intensity_increase',
    timestamp: daysAgo(7),
    dataPoints: ['2 weeks on-target', 'Reps in reserve: 3–4', 'Recovery score: 87/100', 'Sleep avg: 7.6h'],
    confidence: 'medium',
    impact: 'positive',
    seed: 0,
  },
];

export async function seedDemoChanges(): Promise<void> {
  console.log('[CoachStore] Seeding demo changes');
  try {
    const changes: CoachChange[] = DEMO_CHANGES.map(d => {
      const explanation = generateExplanation(d.type, {
        seed: d.seed,
        dataPoints: d.dataPoints,
        confidence: d.confidence,
        impact: d.impact,
      });
      return {
        ...explanation,
        id: d.id,
        timestamp: d.timestamp,
        dismissed: false,
      };
    });

    await AsyncStorage.setItem(CHANGES_KEY, JSON.stringify(changes));
    console.log('[CoachStore] Seeded', changes.length, 'demo changes');
  } catch (error) {
    console.error('[CoachStore] Error seeding demo changes:', error);
  }
}
