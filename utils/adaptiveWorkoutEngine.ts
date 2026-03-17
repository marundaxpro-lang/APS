
// ─── Adaptive Workout Engine ─────────────────────────────────────────────────
// Pure TypeScript engine — no side effects, no imports from React or RN.

export type WorkoutStatus = 'scheduled' | 'completed' | 'missed' | 'skipped' | 'modified';
export type EquipmentMode = 'full_gym' | 'home' | 'minimal' | 'travel' | 'bodyweight';
export type GoalType = 'strength' | 'hypertrophy' | 'fat_loss' | 'endurance' | 'maintenance';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface AdaptiveExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  muscleGroup: string;
  equipment: string[];
  alternatives: string[];
  isPrimary: boolean;
  estimatedMinutes: number;
}

export interface AdaptiveWorkoutDay {
  id: string;
  dayOfWeek: number;
  name: string;
  exercises: AdaptiveExercise[];
  estimatedDuration: number;
  status: WorkoutStatus;
  scheduledDate: string;
  completedDate?: string;
  muscleGroups: string[];
  isRestDay: boolean;
}

export interface AdaptiveContext {
  missedWorkouts: string[];
  availableMinutes?: number;
  equipmentMode: EquipmentMode;
  goal: GoalType;
  experience: ExperienceLevel;
  weeklyAdherence: number;
  consecutiveMissed: number;
}

export interface MissedWorkoutResolution {
  action: 'reschedule' | 'compress' | 'skip' | 'recovery_week' | 'rebuild';
  targetDay?: number;
  explanation: string;
  supportMessage: string;
  modifiedWorkout?: AdaptiveWorkoutDay;
}

export interface CompressedWorkout {
  workout: AdaptiveWorkoutDay;
  mode: 'express' | 'focused' | 'efficient';
  keptExercises: string[];
  cutExercises: string[];
  explanation: string;
  estimatedDuration: number;
}

export interface AdaptiveRecommendation {
  type: 'on_track' | 'reduce_volume' | 'switch_plan' | 'recovery_week' | 'rebuild_consistency';
  title: string;
  message: string;
  actionLabel: string;
}

// ─── Exercise Database ────────────────────────────────────────────────────────

const GYM_EXERCISES: Record<string, AdaptiveExercise[]> = {
  chest: [
    { id: 'bp', name: 'Barbell Bench Press', sets: 4, reps: '5-8', restSeconds: 180, muscleGroup: 'chest', equipment: ['barbell'], alternatives: ['Dumbbell Bench Press', 'Push-ups'], isPrimary: true, estimatedMinutes: 10 },
    { id: 'idp', name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', restSeconds: 90, muscleGroup: 'chest', equipment: ['dumbbells'], alternatives: ['Incline Push-ups', 'Cable Flyes'], isPrimary: false, estimatedMinutes: 7 },
    { id: 'cf', name: 'Cable Flyes', sets: 3, reps: '12-15', restSeconds: 60, muscleGroup: 'chest', equipment: ['cable'], alternatives: ['Dumbbell Flyes', 'Push-ups'], isPrimary: false, estimatedMinutes: 6 },
    { id: 'dips_c', name: 'Chest Dips', sets: 3, reps: 'AMRAP', restSeconds: 90, muscleGroup: 'chest', equipment: ['bodyweight'], alternatives: ['Diamond Push-ups'], isPrimary: false, estimatedMinutes: 6 },
  ],
  back: [
    { id: 'dl', name: 'Deadlifts', sets: 4, reps: '4-6', restSeconds: 240, muscleGroup: 'back', equipment: ['barbell'], alternatives: ['Dumbbell RDL', 'Good Mornings'], isPrimary: true, estimatedMinutes: 12 },
    { id: 'pu', name: 'Pull-ups', sets: 4, reps: 'AMRAP', restSeconds: 120, muscleGroup: 'back', equipment: ['bodyweight'], alternatives: ['Lat Pulldowns', 'Band Pull-downs'], isPrimary: true, estimatedMinutes: 8 },
    { id: 'br', name: 'Barbell Rows', sets: 4, reps: '8-10', restSeconds: 120, muscleGroup: 'back', equipment: ['barbell'], alternatives: ['Dumbbell Rows', 'Inverted Rows'], isPrimary: false, estimatedMinutes: 8 },
    { id: 'lpd', name: 'Lat Pulldowns', sets: 3, reps: '10-12', restSeconds: 90, muscleGroup: 'back', equipment: ['cable'], alternatives: ['Pull-ups', 'Band Pull-downs'], isPrimary: false, estimatedMinutes: 6 },
    { id: 'cr', name: 'Cable Rows', sets: 3, reps: '12-15', restSeconds: 60, muscleGroup: 'back', equipment: ['cable'], alternatives: ['Dumbbell Rows', 'Resistance Band Rows'], isPrimary: false, estimatedMinutes: 6 },
  ],
  legs: [
    { id: 'sq', name: 'Barbell Squats', sets: 4, reps: '6-8', restSeconds: 180, muscleGroup: 'legs', equipment: ['barbell'], alternatives: ['Goblet Squats', 'Bodyweight Squats'], isPrimary: true, estimatedMinutes: 12 },
    { id: 'rdl', name: 'Romanian Deadlifts', sets: 4, reps: '10-12', restSeconds: 120, muscleGroup: 'legs', equipment: ['barbell'], alternatives: ['Dumbbell RDL', 'Nordic Curls'], isPrimary: true, estimatedMinutes: 9 },
    { id: 'lp', name: 'Leg Press', sets: 3, reps: '12-15', restSeconds: 90, muscleGroup: 'legs', equipment: ['machine'], alternatives: ['Goblet Squats', 'Lunges'], isPrimary: false, estimatedMinutes: 7 },
    { id: 'lc', name: 'Leg Curls', sets: 3, reps: '12-15', restSeconds: 60, muscleGroup: 'legs', equipment: ['machine'], alternatives: ['Nordic Curls', 'Stability Ball Curls'], isPrimary: false, estimatedMinutes: 6 },
    { id: 'calr', name: 'Calf Raises', sets: 4, reps: '15-20', restSeconds: 60, muscleGroup: 'legs', equipment: ['machine'], alternatives: ['Bodyweight Calf Raises'], isPrimary: false, estimatedMinutes: 5 },
  ],
  shoulders: [
    { id: 'ohp', name: 'Overhead Press', sets: 4, reps: '6-8', restSeconds: 180, muscleGroup: 'shoulders', equipment: ['barbell'], alternatives: ['Dumbbell Shoulder Press', 'Pike Push-ups'], isPrimary: true, estimatedMinutes: 10 },
    { id: 'lr', name: 'Lateral Raises', sets: 4, reps: '12-15', restSeconds: 60, muscleGroup: 'shoulders', equipment: ['dumbbells'], alternatives: ['Band Lateral Raises'], isPrimary: false, estimatedMinutes: 6 },
    { id: 'fp', name: 'Face Pulls', sets: 3, reps: '15-20', restSeconds: 60, muscleGroup: 'shoulders', equipment: ['cable'], alternatives: ['Band Face Pulls', 'Rear Delt Flyes'], isPrimary: false, estimatedMinutes: 5 },
    { id: 'rdf', name: 'Rear Delt Flyes', sets: 3, reps: '12-15', restSeconds: 60, muscleGroup: 'shoulders', equipment: ['dumbbells'], alternatives: ['Band Face Pulls'], isPrimary: false, estimatedMinutes: 5 },
  ],
  arms: [
    { id: 'bbc', name: 'Barbell Curls', sets: 3, reps: '10-12', restSeconds: 90, muscleGroup: 'arms', equipment: ['barbell'], alternatives: ['Dumbbell Curls', 'Hammer Curls'], isPrimary: false, estimatedMinutes: 6 },
    { id: 'tpd', name: 'Tricep Pushdowns', sets: 3, reps: '12-15', restSeconds: 60, muscleGroup: 'arms', equipment: ['cable'], alternatives: ['Overhead Tricep Extension', 'Tricep Dips'], isPrimary: false, estimatedMinutes: 5 },
    { id: 'hc', name: 'Hammer Curls', sets: 3, reps: '10-12', restSeconds: 60, muscleGroup: 'arms', equipment: ['dumbbells'], alternatives: ['Barbell Curls', 'Incline Curls'], isPrimary: false, estimatedMinutes: 5 },
    { id: 'ote', name: 'Overhead Tricep Extension', sets: 3, reps: '12-15', restSeconds: 60, muscleGroup: 'arms', equipment: ['dumbbells'], alternatives: ['Tricep Pushdowns', 'Skull Crushers'], isPrimary: false, estimatedMinutes: 5 },
  ],
  core: [
    { id: 'plk', name: 'Plank', sets: 3, reps: '60s', restSeconds: 60, muscleGroup: 'core', equipment: ['bodyweight'], alternatives: ['Dead Bug', 'Ab Wheel'], isPrimary: false, estimatedMinutes: 5 },
    { id: 'hlr', name: 'Hanging Leg Raises', sets: 3, reps: '10-15', restSeconds: 60, muscleGroup: 'core', equipment: ['bodyweight'], alternatives: ['Lying Leg Raises', 'Reverse Crunches'], isPrimary: false, estimatedMinutes: 5 },
    { id: 'aw', name: 'Ab Wheel Rollouts', sets: 3, reps: '10-12', restSeconds: 90, muscleGroup: 'core', equipment: ['ab wheel'], alternatives: ['Plank', 'Dead Bug'], isPrimary: false, estimatedMinutes: 6 },
  ],
};

const HOME_EXERCISES: Record<string, AdaptiveExercise[]> = {
  chest: [
    { id: 'dbp_h', name: 'Dumbbell Bench Press', sets: 4, reps: '8-12', restSeconds: 120, muscleGroup: 'chest', equipment: ['dumbbells'], alternatives: ['Push-ups', 'Dumbbell Flyes'], isPrimary: true, estimatedMinutes: 9 },
    { id: 'dbf_h', name: 'Dumbbell Flyes', sets: 3, reps: '12-15', restSeconds: 60, muscleGroup: 'chest', equipment: ['dumbbells'], alternatives: ['Push-ups', 'Chest Squeeze'], isPrimary: false, estimatedMinutes: 6 },
    { id: 'pup_h', name: 'Push-ups', sets: 3, reps: 'AMRAP', restSeconds: 60, muscleGroup: 'chest', equipment: ['bodyweight'], alternatives: ['Diamond Push-ups', 'Wide Push-ups'], isPrimary: false, estimatedMinutes: 5 },
  ],
  back: [
    { id: 'dbr_h', name: 'Dumbbell Rows', sets: 4, reps: '10-12', restSeconds: 90, muscleGroup: 'back', equipment: ['dumbbells'], alternatives: ['Renegade Rows', 'Pull-ups'], isPrimary: true, estimatedMinutes: 8 },
    { id: 'rr_h', name: 'Renegade Rows', sets: 3, reps: '8-10', restSeconds: 90, muscleGroup: 'back', equipment: ['dumbbells'], alternatives: ['Dumbbell Rows', 'Inverted Rows'], isPrimary: false, estimatedMinutes: 7 },
    { id: 'pu_h', name: 'Pull-ups', sets: 3, reps: 'AMRAP', restSeconds: 120, muscleGroup: 'back', equipment: ['bodyweight'], alternatives: ['Inverted Rows', 'Band Pull-downs'], isPrimary: false, estimatedMinutes: 6 },
  ],
  legs: [
    { id: 'gs_h', name: 'Goblet Squats', sets: 4, reps: '12-15', restSeconds: 90, muscleGroup: 'legs', equipment: ['dumbbells'], alternatives: ['Bodyweight Squats', 'Bulgarian Split Squats'], isPrimary: true, estimatedMinutes: 8 },
    { id: 'bss_h', name: 'Bulgarian Split Squats', sets: 3, reps: '10-12 each', restSeconds: 90, muscleGroup: 'legs', equipment: ['dumbbells'], alternatives: ['Lunges', 'Step-ups'], isPrimary: false, estimatedMinutes: 8 },
    { id: 'drdl_h', name: 'Dumbbell RDLs', sets: 4, reps: '10-12', restSeconds: 90, muscleGroup: 'legs', equipment: ['dumbbells'], alternatives: ['Good Mornings', 'Nordic Curls'], isPrimary: false, estimatedMinutes: 7 },
    { id: 'lun_h', name: 'Dumbbell Lunges', sets: 3, reps: '10-12 each', restSeconds: 60, muscleGroup: 'legs', equipment: ['dumbbells'], alternatives: ['Bodyweight Lunges', 'Step-ups'], isPrimary: false, estimatedMinutes: 6 },
  ],
  shoulders: [
    { id: 'dsp_h', name: 'Dumbbell Shoulder Press', sets: 4, reps: '8-10', restSeconds: 90, muscleGroup: 'shoulders', equipment: ['dumbbells'], alternatives: ['Pike Push-ups', 'Arnold Press'], isPrimary: true, estimatedMinutes: 8 },
    { id: 'dlr_h', name: 'Lateral Raises', sets: 4, reps: '12-15', restSeconds: 60, muscleGroup: 'shoulders', equipment: ['dumbbells'], alternatives: ['Band Lateral Raises'], isPrimary: false, estimatedMinutes: 6 },
    { id: 'borf_h', name: 'Bent Over Reverse Flyes', sets: 3, reps: '12-15', restSeconds: 60, muscleGroup: 'shoulders', equipment: ['dumbbells'], alternatives: ['Band Face Pulls'], isPrimary: false, estimatedMinutes: 5 },
  ],
  arms: [
    { id: 'dbc_h', name: 'Dumbbell Curls', sets: 3, reps: '10-12', restSeconds: 60, muscleGroup: 'arms', equipment: ['dumbbells'], alternatives: ['Hammer Curls', 'Concentration Curls'], isPrimary: false, estimatedMinutes: 5 },
    { id: 'ote_h', name: 'Overhead Tricep Extension', sets: 3, reps: '12-15', restSeconds: 60, muscleGroup: 'arms', equipment: ['dumbbells'], alternatives: ['Tricep Kickbacks', 'Close Grip Push-ups'], isPrimary: false, estimatedMinutes: 5 },
    { id: 'hc_h', name: 'Hammer Curls', sets: 3, reps: '10-12', restSeconds: 60, muscleGroup: 'arms', equipment: ['dumbbells'], alternatives: ['Dumbbell Curls'], isPrimary: false, estimatedMinutes: 5 },
  ],
  core: [
    { id: 'plk_h', name: 'Plank', sets: 3, reps: '60s', restSeconds: 60, muscleGroup: 'core', equipment: ['bodyweight'], alternatives: ['Dead Bug', 'Mountain Climbers'], isPrimary: false, estimatedMinutes: 5 },
    { id: 'bc_h', name: 'Bicycle Crunches', sets: 3, reps: '20-30', restSeconds: 45, muscleGroup: 'core', equipment: ['bodyweight'], alternatives: ['Crunches', 'Russian Twists'], isPrimary: false, estimatedMinutes: 4 },
  ],
};

const TRAVEL_EXERCISES: Record<string, AdaptiveExercise[]> = {
  chest: [
    { id: 'pup_t', name: 'Push-ups', sets: 4, reps: 'AMRAP', restSeconds: 60, muscleGroup: 'chest', equipment: ['bodyweight'], alternatives: ['Wide Push-ups', 'Decline Push-ups'], isPrimary: true, estimatedMinutes: 6 },
    { id: 'dpup_t', name: 'Diamond Push-ups', sets: 3, reps: 'AMRAP', restSeconds: 60, muscleGroup: 'chest', equipment: ['bodyweight'], alternatives: ['Close Grip Push-ups'], isPrimary: false, estimatedMinutes: 5 },
    { id: 'decpup_t', name: 'Decline Push-ups', sets: 3, reps: 'AMRAP', restSeconds: 60, muscleGroup: 'chest', equipment: ['bodyweight'], alternatives: ['Pike Push-ups'], isPrimary: false, estimatedMinutes: 5 },
  ],
  back: [
    { id: 'pu_t', name: 'Pull-ups', sets: 4, reps: 'AMRAP', restSeconds: 90, muscleGroup: 'back', equipment: ['bodyweight'], alternatives: ['Inverted Rows', 'Superman Holds'], isPrimary: true, estimatedMinutes: 7 },
    { id: 'ir_t', name: 'Inverted Rows', sets: 3, reps: '10-15', restSeconds: 60, muscleGroup: 'back', equipment: ['bodyweight'], alternatives: ['Pull-ups', 'Superman Holds'], isPrimary: false, estimatedMinutes: 6 },
    { id: 'sh_t', name: 'Superman Holds', sets: 3, reps: '30-60s', restSeconds: 45, muscleGroup: 'back', equipment: ['bodyweight'], alternatives: ['Bird Dogs'], isPrimary: false, estimatedMinutes: 4 },
  ],
  legs: [
    { id: 'bwsq_t', name: 'Bodyweight Squats', sets: 4, reps: '20-25', restSeconds: 60, muscleGroup: 'legs', equipment: ['bodyweight'], alternatives: ['Jump Squats', 'Sumo Squats'], isPrimary: true, estimatedMinutes: 6 },
    { id: 'jsq_t', name: 'Jump Squats', sets: 3, reps: '15-20', restSeconds: 60, muscleGroup: 'legs', equipment: ['bodyweight'], alternatives: ['Bodyweight Squats', 'Squat Pulses'], isPrimary: false, estimatedMinutes: 5 },
    { id: 'lun_t', name: 'Lunges', sets: 3, reps: '12-15 each', restSeconds: 60, muscleGroup: 'legs', equipment: ['bodyweight'], alternatives: ['Reverse Lunges', 'Step-ups'], isPrimary: false, estimatedMinutes: 5 },
    { id: 'sldl_t', name: 'Single Leg Deadlifts', sets: 3, reps: '10-12 each', restSeconds: 60, muscleGroup: 'legs', equipment: ['bodyweight'], alternatives: ['Good Mornings', 'Hip Hinges'], isPrimary: false, estimatedMinutes: 6 },
  ],
  shoulders: [
    { id: 'ppup_t', name: 'Pike Push-ups', sets: 4, reps: 'AMRAP', restSeconds: 60, muscleGroup: 'shoulders', equipment: ['bodyweight'], alternatives: ['Handstand Push-ups', 'Plank to Down Dog'], isPrimary: true, estimatedMinutes: 6 },
    { id: 'p2dd_t', name: 'Plank to Down Dog', sets: 3, reps: '10-15', restSeconds: 45, muscleGroup: 'shoulders', equipment: ['bodyweight'], alternatives: ['Pike Push-ups'], isPrimary: false, estimatedMinutes: 4 },
  ],
  arms: [
    { id: 'cgpu_t', name: 'Close Grip Push-ups', sets: 3, reps: 'AMRAP', restSeconds: 60, muscleGroup: 'arms', equipment: ['bodyweight'], alternatives: ['Diamond Push-ups', 'Tricep Dips'], isPrimary: false, estimatedMinutes: 5 },
    { id: 'tdips_t', name: 'Tricep Dips', sets: 3, reps: 'AMRAP', restSeconds: 60, muscleGroup: 'arms', equipment: ['bodyweight'], alternatives: ['Close Grip Push-ups'], isPrimary: false, estimatedMinutes: 5 },
    { id: 'chin_t', name: 'Chin-ups', sets: 3, reps: 'AMRAP', restSeconds: 90, muscleGroup: 'arms', equipment: ['bodyweight'], alternatives: ['Pull-ups', 'Inverted Rows'], isPrimary: false, estimatedMinutes: 6 },
  ],
  core: [
    { id: 'plk_t', name: 'Plank', sets: 3, reps: '60s', restSeconds: 60, muscleGroup: 'core', equipment: ['bodyweight'], alternatives: ['Side Plank', 'Dead Bug'], isPrimary: false, estimatedMinutes: 5 },
    { id: 'mc_t', name: 'Mountain Climbers', sets: 3, reps: '30s', restSeconds: 45, muscleGroup: 'core', equipment: ['bodyweight'], alternatives: ['Plank', 'Bicycle Crunches'], isPrimary: false, estimatedMinutes: 4 },
    { id: 'bc_t', name: 'Bicycle Crunches', sets: 3, reps: '20-30', restSeconds: 45, muscleGroup: 'core', equipment: ['bodyweight'], alternatives: ['Crunches', 'Russian Twists'], isPrimary: false, estimatedMinutes: 4 },
  ],
};

function getExerciseDb(mode: EquipmentMode): Record<string, AdaptiveExercise[]> {
  if (mode === 'travel' || mode === 'bodyweight') return TRAVEL_EXERCISES;
  if (mode === 'home' || mode === 'minimal') return HOME_EXERCISES;
  return GYM_EXERCISES;
}

// ─── Plan Templates ───────────────────────────────────────────────────────────

interface DayTemplate {
  dayOfWeek: number;
  name: string;
  muscleGroups: string[];
  isRestDay: boolean;
}

function getPlanTemplate(goal: GoalType, experience: ExperienceLevel): DayTemplate[] {
  // 4-day upper/lower split for strength/hypertrophy
  if (goal === 'strength' || goal === 'hypertrophy') {
    return [
      { dayOfWeek: 1, name: 'Upper Body Push', muscleGroups: ['chest', 'shoulders', 'arms'], isRestDay: false },
      { dayOfWeek: 2, name: 'Lower Body', muscleGroups: ['legs', 'core'], isRestDay: false },
      { dayOfWeek: 3, name: 'Rest & Recovery', muscleGroups: [], isRestDay: true },
      { dayOfWeek: 4, name: 'Upper Body Pull', muscleGroups: ['back', 'arms'], isRestDay: false },
      { dayOfWeek: 5, name: 'Legs & Glutes', muscleGroups: ['legs', 'core'], isRestDay: false },
      { dayOfWeek: 6, name: 'Rest & Recovery', muscleGroups: [], isRestDay: true },
      { dayOfWeek: 0, name: 'Rest & Recovery', muscleGroups: [], isRestDay: true },
    ];
  }
  if (goal === 'fat_loss' || goal === 'endurance') {
    return [
      { dayOfWeek: 1, name: 'Full Body A', muscleGroups: ['chest', 'back', 'legs'], isRestDay: false },
      { dayOfWeek: 2, name: 'Cardio & Core', muscleGroups: ['core'], isRestDay: false },
      { dayOfWeek: 3, name: 'Full Body B', muscleGroups: ['shoulders', 'arms', 'legs'], isRestDay: false },
      { dayOfWeek: 4, name: 'Rest & Recovery', muscleGroups: [], isRestDay: true },
      { dayOfWeek: 5, name: 'Full Body C', muscleGroups: ['back', 'chest', 'core'], isRestDay: false },
      { dayOfWeek: 6, name: 'Active Recovery', muscleGroups: [], isRestDay: true },
      { dayOfWeek: 0, name: 'Rest & Recovery', muscleGroups: [], isRestDay: true },
    ];
  }
  // maintenance — 3 day full body
  return [
    { dayOfWeek: 1, name: 'Full Body A', muscleGroups: ['chest', 'back', 'legs'], isRestDay: false },
    { dayOfWeek: 2, name: 'Rest & Recovery', muscleGroups: [], isRestDay: true },
    { dayOfWeek: 3, name: 'Full Body B', muscleGroups: ['shoulders', 'arms', 'core'], isRestDay: false },
    { dayOfWeek: 4, name: 'Rest & Recovery', muscleGroups: [], isRestDay: true },
    { dayOfWeek: 5, name: 'Full Body C', muscleGroups: ['back', 'legs', 'core'], isRestDay: false },
    { dayOfWeek: 6, name: 'Rest & Recovery', muscleGroups: [], isRestDay: true },
    { dayOfWeek: 0, name: 'Rest & Recovery', muscleGroups: [], isRestDay: true },
  ];
}

function buildExercisesForDay(
  muscleGroups: string[],
  db: Record<string, AdaptiveExercise[]>,
  goal: GoalType,
  experience: ExperienceLevel
): AdaptiveExercise[] {
  const exercises: AdaptiveExercise[] = [];
  const maxPerGroup = experience === 'beginner' ? 2 : experience === 'intermediate' ? 3 : 4;

  for (const group of muscleGroups) {
    const pool = db[group] || [];
    const selected = pool.slice(0, maxPerGroup);
    // Adjust sets/reps for goal
    selected.forEach(ex => {
      const adjusted = { ...ex, id: `${ex.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
      if (goal === 'strength') {
        adjusted.sets = ex.isPrimary ? 5 : 3;
        adjusted.reps = ex.isPrimary ? '3-5' : ex.reps;
        adjusted.restSeconds = ex.isPrimary ? 240 : 120;
      } else if (goal === 'hypertrophy') {
        adjusted.sets = ex.isPrimary ? 4 : 3;
        adjusted.reps = ex.isPrimary ? '8-12' : '12-15';
        adjusted.restSeconds = ex.isPrimary ? 120 : 60;
      } else if (goal === 'fat_loss') {
        adjusted.sets = 3;
        adjusted.reps = '15-20';
        adjusted.restSeconds = 45;
      }
      exercises.push(adjusted);
    });
  }
  return exercises;
}

function calcDuration(exercises: AdaptiveExercise[]): number {
  return exercises.reduce((sum, ex) => {
    const setTime = ex.estimatedMinutes;
    const restTime = (ex.sets - 1) * (ex.restSeconds / 60);
    return sum + setTime + restTime;
  }, 0);
}

function isoDateForDayOfWeek(dayOfWeek: number): string {
  const today = new Date();
  const todayDow = today.getDay();
  const diff = (dayOfWeek - todayDow + 7) % 7;
  const target = new Date(today);
  target.setDate(today.getDate() + diff);
  return target.toISOString().split('T')[0];
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateWeeklyPlan(
  goal: GoalType,
  experience: ExperienceLevel,
  equipment: EquipmentMode
): AdaptiveWorkoutDay[] {
  console.log('[AdaptiveEngine] generateWeeklyPlan', { goal, experience, equipment });
  const template = getPlanTemplate(goal, experience);
  const db = getExerciseDb(equipment);

  return template.map((t, idx) => {
    const exercises = t.isRestDay ? [] : buildExercisesForDay(t.muscleGroups, db, goal, experience);
    const duration = calcDuration(exercises);
    return {
      id: `day_${idx}_${t.dayOfWeek}`,
      dayOfWeek: t.dayOfWeek,
      name: t.name,
      exercises,
      estimatedDuration: Math.round(duration),
      status: 'scheduled' as WorkoutStatus,
      scheduledDate: isoDateForDayOfWeek(t.dayOfWeek),
      muscleGroups: t.muscleGroups,
      isRestDay: t.isRestDay,
    };
  });
}

export function handleMissedWorkout(
  missed: AdaptiveWorkoutDay,
  remainingWeek: AdaptiveWorkoutDay[],
  context: AdaptiveContext
): MissedWorkoutResolution {
  console.log('[AdaptiveEngine] handleMissedWorkout', { missedId: missed.id, consecutiveMissed: context.consecutiveMissed });

  const supportMessage = "Life happens. Here's how we keep you on track.";

  // 2+ consecutive missed → Recovery Week
  if (context.consecutiveMissed >= 2) {
    const reduced = { ...missed, exercises: missed.exercises.map(ex => ({ ...ex, sets: Math.max(2, ex.sets - 1) })) };
    return {
      action: 'recovery_week',
      explanation: `You've missed ${context.consecutiveMissed} sessions in a row. Switching to Recovery Week mode — volume reduced 40%, frequency maintained. This protects your progress and rebuilds momentum.`,
      supportMessage,
      modifiedWorkout: reduced,
    };
  }

  // Low adherence → suggest 3-day plan
  if (context.weeklyAdherence < 0.5) {
    return {
      action: 'rebuild',
      explanation: "Your weekly adherence is below 50%. Switching to a 3-day plan will make it easier to stay consistent — consistency beats volume every time.",
      supportMessage,
    };
  }

  // Find next available non-rest day in remaining week
  const available = remainingWeek.filter(d => !d.isRestDay && d.status === 'scheduled');
  if (available.length > 0) {
    const target = available[0];
    return {
      action: 'reschedule',
      targetDay: target.dayOfWeek,
      explanation: `Rescheduled to ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][target.dayOfWeek]}. Your plan stays intact — just shifted by one day.`,
      supportMessage,
      modifiedWorkout: { ...missed, scheduledDate: target.scheduledDate, dayOfWeek: target.dayOfWeek },
    };
  }

  // Week nearly over — compress or skip
  return {
    action: 'skip',
    explanation: "Not enough days left this week to reschedule. Skipping this session — your next week starts fresh. One missed session won't derail your progress.",
    supportMessage,
  };
}

export function compressWorkout(workout: AdaptiveWorkoutDay, availableMinutes: number): CompressedWorkout {
  console.log('[AdaptiveEngine] compressWorkout', { workoutId: workout.id, availableMinutes });

  const primary = workout.exercises.filter(ex => ex.isPrimary);
  const accessories = workout.exercises.filter(ex => !ex.isPrimary);

  let mode: 'express' | 'focused' | 'efficient';
  let kept: AdaptiveExercise[];
  let cut: AdaptiveExercise[];
  let explanation: string;

  if (availableMinutes < 15) {
    // Express: 3 compound movements, 3 sets, 60s rest
    mode = 'express';
    kept = primary.slice(0, 3).map(ex => ({ ...ex, sets: 3, restSeconds: 60 }));
    cut = [...primary.slice(3), ...accessories];
    explanation = 'Express mode: 3 compound lifts, 3 sets each, 60s rest. Maximum stimulus in minimum time.';
  } else if (availableMinutes < 30) {
    // Focused: primary lifts + 1 accessory per muscle group
    mode = 'focused';
    const musclesSeen = new Set<string>();
    const accessoryKept: AdaptiveExercise[] = [];
    for (const acc of accessories) {
      if (!musclesSeen.has(acc.muscleGroup)) {
        musclesSeen.add(acc.muscleGroup);
        accessoryKept.push({ ...acc, sets: Math.max(2, acc.sets - 1) });
      }
    }
    kept = [...primary, ...accessoryKept];
    cut = accessories.filter(a => !accessoryKept.find(k => k.id === a.id));
    explanation = 'Focused mode: all primary lifts kept, one accessory per muscle group, sets reduced by 1.';
  } else {
    // Efficient: full primary + reduced accessories
    mode = 'efficient';
    const reducedAccessories = accessories.map(ex => ({ ...ex, sets: Math.max(2, ex.sets - 1) }));
    kept = [...primary, ...reducedAccessories];
    cut = [];
    explanation = 'Efficient mode: full primary lifts, accessories trimmed by 1 set each.';
  }

  const compressedWorkout: AdaptiveWorkoutDay = {
    ...workout,
    exercises: kept,
    estimatedDuration: availableMinutes,
    status: 'modified',
  };

  return {
    workout: compressedWorkout,
    mode,
    keptExercises: kept.map(e => e.name),
    cutExercises: cut.map(e => e.name),
    explanation,
    estimatedDuration: availableMinutes,
  };
}

export function substituteEquipment(workout: AdaptiveWorkoutDay, mode: EquipmentMode): AdaptiveWorkoutDay {
  console.log('[AdaptiveEngine] substituteEquipment', { workoutId: workout.id, mode });
  const db = getExerciseDb(mode);

  const substituted = workout.exercises.map(ex => {
    const pool = db[ex.muscleGroup] || [];
    // Find a matching exercise from the new equipment pool
    const match = pool.find(p => p.isPrimary === ex.isPrimary) || pool[0];
    if (match) {
      return { ...match, id: ex.id, sets: ex.sets, reps: ex.reps };
    }
    // Fallback: use first alternative
    if (ex.alternatives.length > 0) {
      return { ...ex, name: ex.alternatives[0], equipment: ['bodyweight'] };
    }
    return ex;
  });

  return { ...workout, exercises: substituted, status: 'modified' };
}

export function rebalanceWeek(week: AdaptiveWorkoutDay[], context: AdaptiveContext): AdaptiveWorkoutDay[] {
  console.log('[AdaptiveEngine] rebalanceWeek', { adherence: context.weeklyAdherence, consecutiveMissed: context.consecutiveMissed });

  if (context.weeklyAdherence < 0.5 || context.consecutiveMissed >= 2) {
    // Reduce volume across the board
    return week.map(day => ({
      ...day,
      exercises: day.exercises.map(ex => ({
        ...ex,
        sets: Math.max(2, Math.floor(ex.sets * 0.6)),
      })),
    }));
  }

  if (context.equipmentMode === 'travel' || context.equipmentMode === 'bodyweight') {
    return week.map(day => substituteEquipment(day, context.equipmentMode));
  }

  return week;
}

export function getAdaptiveRecommendation(context: AdaptiveContext): AdaptiveRecommendation {
  console.log('[AdaptiveEngine] getAdaptiveRecommendation', context);

  if (context.consecutiveMissed >= 3) {
    return {
      type: 'rebuild_consistency',
      title: 'Rebuild Your Rhythm',
      message: "3+ sessions missed. Let's reset with a lighter week — 3 days, reduced volume. Consistency is the foundation.",
      actionLabel: 'Start Fresh',
    };
  }
  if (context.weeklyAdherence < 0.5) {
    return {
      type: 'switch_plan',
      title: 'Simplify Your Plan',
      message: "You're hitting less than half your sessions. A 3-day plan will be easier to stick to and still drive results.",
      actionLabel: 'Switch to 3-Day',
    };
  }
  if (context.consecutiveMissed >= 2) {
    return {
      type: 'recovery_week',
      title: 'Recovery Week',
      message: "Two sessions missed. Dropping volume 40% this week — same frequency, less load. You'll come back stronger.",
      actionLabel: 'Start Recovery Week',
    };
  }
  if (context.weeklyAdherence >= 0.85) {
    return {
      type: 'on_track',
      title: "You're Crushing It",
      message: "Adherence above 85% — your plan is working. Stay the course.",
      actionLabel: 'View Plan',
    };
  }
  return {
    type: 'on_track',
    title: 'Keep Going',
    message: "You're making progress. A few missed sessions won't derail you — just keep showing up.",
    actionLabel: 'View Plan',
  };
}
