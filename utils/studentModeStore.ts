
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StudentSession,
  StudentDayPriorities,
  generateStudentPriorities,
  STORAGE_KEY_STUDENT_SESSION,
  STORAGE_KEY_STUDENT_PRIORITIES,
  STORAGE_KEY_STUDENT_COMPLETED_WORKOUTS,
  STORAGE_KEY_STUDENT_USED_BLOCKS,
} from './studentModeEngine';

export async function getStudentSession(): Promise<StudentSession | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_STUDENT_SESSION);
    if (!raw) return null;
    const session: StudentSession = JSON.parse(raw);
    return session.isActive ? session : null;
  } catch (e) {
    console.error('[StudentModeStore] Error getting session:', e);
    return null;
  }
}

export async function saveStudentSession(session: StudentSession): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_STUDENT_SESSION, JSON.stringify(session));
    console.log('[StudentModeStore] Session saved:', session.examName, session.stressLevel);
  } catch (e) {
    console.error('[StudentModeStore] Error saving session:', e);
  }
}

export async function endStudentSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_STUDENT_SESSION);
    await AsyncStorage.removeItem(STORAGE_KEY_STUDENT_PRIORITIES);
    console.log('[StudentModeStore] Session ended and cleared');
  } catch (e) {
    console.error('[StudentModeStore] Error ending session:', e);
  }
}

export async function getTodayPriorities(session: StudentSession): Promise<StudentDayPriorities> {
  try {
    const today = new Date().toDateString();
    const raw = await AsyncStorage.getItem(STORAGE_KEY_STUDENT_PRIORITIES);
    if (raw) {
      const saved: StudentDayPriorities = JSON.parse(raw);
      if (saved.date === today && saved.stressLevel === session.stressLevel) {
        return saved;
      }
    }
    // Generate fresh priorities
    const priorities = generateStudentPriorities(session.stressLevel, session.studyHoursPerDay, false);
    const dayPriorities: StudentDayPriorities = {
      date: today,
      stressLevel: session.stressLevel,
      priorities,
    };
    await AsyncStorage.setItem(STORAGE_KEY_STUDENT_PRIORITIES, JSON.stringify(dayPriorities));
    return dayPriorities;
  } catch (e) {
    console.error('[StudentModeStore] Error getting priorities:', e);
    const priorities = generateStudentPriorities(session.stressLevel, session.studyHoursPerDay, false);
    return { date: new Date().toDateString(), stressLevel: session.stressLevel, priorities };
  }
}

export async function completePriority(priorityId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_STUDENT_PRIORITIES);
    if (!raw) return;
    const saved: StudentDayPriorities = JSON.parse(raw);
    saved.priorities = saved.priorities.map(p =>
      p.id === priorityId ? { ...p, completed: !p.completed } : p
    );
    await AsyncStorage.setItem(STORAGE_KEY_STUDENT_PRIORITIES, JSON.stringify(saved));
    console.log('[StudentModeStore] Priority toggled:', priorityId);
  } catch (e) {
    console.error('[StudentModeStore] Error completing priority:', e);
  }
}

export async function getTodayWorkoutId(stressLevel: StudentSession['stressLevel']): Promise<string> {
  if (stressLevel === 'extreme') return 'desk_break_circuit';
  if (stressLevel === 'high') return 'quick_strength';
  return 'morning_activation';
}

export async function markWorkoutCompleted(workoutId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_STUDENT_COMPLETED_WORKOUTS);
    const data: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    const today = new Date().toDateString();
    const todayCompleted = data[today] || [];
    if (!todayCompleted.includes(workoutId)) {
      data[today] = [...todayCompleted, workoutId];
      await AsyncStorage.setItem(STORAGE_KEY_STUDENT_COMPLETED_WORKOUTS, JSON.stringify(data));
    }
    console.log('[StudentModeStore] Workout marked completed:', workoutId);
  } catch (e) {
    console.error('[StudentModeStore] Error marking workout completed:', e);
  }
}

export async function isWorkoutCompletedToday(workoutId: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_STUDENT_COMPLETED_WORKOUTS);
    if (!raw) return false;
    const data: Record<string, string[]> = JSON.parse(raw);
    const today = new Date().toDateString();
    return (data[today] || []).includes(workoutId);
  } catch (e) {
    return false;
  }
}

export async function markStudyBlockUsed(blockId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_STUDENT_USED_BLOCKS);
    const data: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    const today = new Date().toDateString();
    const todayUsed = data[today] || [];
    if (!todayUsed.includes(blockId)) {
      data[today] = [...todayUsed, blockId];
      await AsyncStorage.setItem(STORAGE_KEY_STUDENT_USED_BLOCKS, JSON.stringify(data));
    }
    console.log('[StudentModeStore] Study block marked used:', blockId);
  } catch (e) {
    console.error('[StudentModeStore] Error marking study block used:', e);
  }
}

export async function getUsedBlocksToday(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_STUDENT_USED_BLOCKS);
    if (!raw) return [];
    const data: Record<string, string[]> = JSON.parse(raw);
    const today = new Date().toDateString();
    return data[today] || [];
  } catch (e) {
    return [];
  }
}
