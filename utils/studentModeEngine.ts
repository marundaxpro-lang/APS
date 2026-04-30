
export interface StudentSession {
  id: string;
  startDate: string;
  endDate: string | null;
  examName: string;
  stressLevel: 'moderate' | 'high' | 'extreme';
  isActive: boolean;
  studyHoursPerDay: number;
}

export interface StudentWorkout {
  id: string;
  title: string;
  durationMinutes: number;
  type: 'strength' | 'cardio' | 'mobility' | 'desk_break';
  equipment: 'none' | 'minimal' | 'gym';
  exercises: StudentExercise[];
  cognitiveBoost: string;
  bestTime: 'morning' | 'study_break' | 'evening';
  energyImpact: 'energising' | 'calming' | 'neutral';
}

export interface StudentExercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  deskFriendly: boolean;
}

export interface StudentNutritionTemplate {
  id: string;
  title: string;
  scenario: 'budget_meal' | 'study_snack' | 'exam_day' | 'late_night' | 'quick_prep';
  prepMinutes: number;
  costLevel: 'very_low' | 'low' | 'medium';
  proteinGrams: number;
  calories: number;
  ingredients: string[];
  instructions: string;
  brainBenefit: string;
}

export interface StudyBlock {
  id: string;
  title: string;
  durationMinutes: number;
  technique: 'pomodoro' | 'deep_work' | 'active_recall';
  breakActivity: string;
  fitnessBreak: StudentExercise | null;
}

export interface StudentDayPriorities {
  date: string;
  stressLevel: StudentSession['stressLevel'];
  priorities: {
    id: string;
    title: string;
    category: 'workout' | 'nutrition' | 'recovery' | 'study' | 'mindset' | 'sleep';
    completed: boolean;
    durationMinutes: number;
    tip: string;
  }[];
}

export const STUDENT_WORKOUTS: StudentWorkout[] = [
  {
    id: 'morning_activation',
    title: 'Morning Activation',
    durationMinutes: 15,
    type: 'strength',
    equipment: 'none',
    cognitiveBoost: 'Morning exercise increases BDNF by 200-300% — primes your brain for learning',
    bestTime: 'morning',
    energyImpact: 'energising',
    exercises: [
      { name: 'Jumping jack', sets: 2, reps: '30 sec', restSeconds: 15, deskFriendly: false },
      { name: 'Push-up', sets: 3, reps: '10', restSeconds: 30, deskFriendly: false },
      { name: 'Bodyweight squat', sets: 3, reps: '15', restSeconds: 30, deskFriendly: false },
      { name: 'Plank', sets: 2, reps: '30 sec', restSeconds: 20, deskFriendly: false },
      { name: 'Hip flexor stretch', sets: 1, reps: '30 sec each', restSeconds: 0, deskFriendly: true },
    ],
  },
  {
    id: 'desk_break_circuit',
    title: 'Desk Break Circuit',
    durationMinutes: 8,
    type: 'desk_break',
    equipment: 'none',
    cognitiveBoost: 'Short movement breaks restore focus and reduce mental fatigue by up to 40%',
    bestTime: 'study_break',
    energyImpact: 'energising',
    exercises: [
      { name: 'Chair squat', sets: 2, reps: '15', restSeconds: 15, deskFriendly: true },
      { name: 'Desk push-up', sets: 2, reps: '12', restSeconds: 15, deskFriendly: true },
      { name: 'Standing calf raise', sets: 2, reps: '20', restSeconds: 10, deskFriendly: true },
      { name: 'Neck rolls', sets: 1, reps: '5 each direction', restSeconds: 0, deskFriendly: true },
    ],
  },
  {
    id: 'evening_deload',
    title: 'Evening Deload',
    durationMinutes: 20,
    type: 'mobility',
    equipment: 'none',
    cognitiveBoost: 'Evening mobility reduces cortisol and improves sleep quality — critical for memory consolidation',
    bestTime: 'evening',
    energyImpact: 'calming',
    exercises: [
      { name: 'Cat-cow stretch', sets: 1, reps: '10 reps', restSeconds: 0, deskFriendly: false },
      { name: 'Seated forward fold', sets: 1, reps: '60 sec', restSeconds: 0, deskFriendly: true },
      { name: 'Pigeon pose', sets: 1, reps: '60 sec each', restSeconds: 0, deskFriendly: false },
      { name: 'Supine twist', sets: 1, reps: '45 sec each', restSeconds: 0, deskFriendly: false },
      { name: 'Legs up the wall', sets: 1, reps: '3 min', restSeconds: 0, deskFriendly: false },
    ],
  },
  {
    id: 'quick_strength',
    title: '20-Min Strength',
    durationMinutes: 20,
    type: 'strength',
    equipment: 'none',
    cognitiveBoost: 'Resistance training 3x/week maintains muscle and testosterone during high-stress periods',
    bestTime: 'morning',
    energyImpact: 'energising',
    exercises: [
      { name: 'Push-up', sets: 4, reps: '12', restSeconds: 30, deskFriendly: false },
      { name: 'Bulgarian split squat', sets: 3, reps: '10 each', restSeconds: 45, deskFriendly: false },
      { name: 'Pike push-up', sets: 3, reps: '10', restSeconds: 30, deskFriendly: false },
      { name: 'Glute bridge', sets: 3, reps: '15', restSeconds: 30, deskFriendly: false },
      { name: 'Plank', sets: 3, reps: '30 sec', restSeconds: 20, deskFriendly: false },
    ],
  },
  {
    id: 'focus_cardio',
    title: 'Focus Cardio',
    durationMinutes: 20,
    type: 'cardio',
    equipment: 'none',
    cognitiveBoost: 'Aerobic exercise before studying increases hippocampal activity — improves information retention',
    bestTime: 'morning',
    energyImpact: 'energising',
    exercises: [
      { name: 'Jog in place', sets: 1, reps: '3 min', restSeconds: 0, deskFriendly: false },
      { name: 'High knees', sets: 4, reps: '30 sec', restSeconds: 20, deskFriendly: false },
      { name: 'Burpee', sets: 4, reps: '8', restSeconds: 30, deskFriendly: false },
      { name: 'Jump squat', sets: 4, reps: '10', restSeconds: 30, deskFriendly: false },
      { name: 'Cool-down walk', sets: 1, reps: '3 min', restSeconds: 0, deskFriendly: false },
    ],
  },
  {
    id: 'exam_day_prep',
    title: 'Exam Day Prep',
    durationMinutes: 12,
    type: 'mobility',
    equipment: 'none',
    cognitiveBoost: 'Light movement on exam day reduces anxiety and improves working memory performance',
    bestTime: 'morning',
    energyImpact: 'calming',
    exercises: [
      { name: 'Deep breathing', sets: 1, reps: '2 min', restSeconds: 0, deskFriendly: true },
      { name: 'Shoulder rolls', sets: 1, reps: '10 each direction', restSeconds: 0, deskFriendly: true },
      { name: 'Light squat', sets: 2, reps: '10', restSeconds: 15, deskFriendly: false },
      { name: 'Forward fold', sets: 1, reps: '45 sec', restSeconds: 0, deskFriendly: false },
      { name: 'Power pose', sets: 1, reps: '2 min', restSeconds: 0, deskFriendly: true },
    ],
  },
];

export const STUDENT_NUTRITION: StudentNutritionTemplate[] = [
  {
    id: 'protein_oats',
    title: 'Protein oats',
    scenario: 'budget_meal',
    prepMinutes: 5,
    costLevel: 'very_low',
    proteinGrams: 35,
    calories: 480,
    ingredients: ['80g oats', '1 scoop protein powder', '1 banana', '1 tbsp peanut butter', 'Water or milk'],
    instructions: 'Cook oats, stir in protein powder off heat, top with banana and peanut butter.',
    brainBenefit: 'Slow-release carbs + protein = sustained focus for 3-4 hours',
  },
  {
    id: 'tuna_rice',
    title: 'Tuna rice bowl',
    scenario: 'budget_meal',
    prepMinutes: 10,
    costLevel: 'very_low',
    proteinGrams: 42,
    calories: 520,
    ingredients: ['150g cooked rice', '1 tin tuna', 'Soy sauce', 'Sesame oil', 'Spring onion'],
    instructions: 'Mix tuna into warm rice, drizzle with soy sauce and sesame oil, top with spring onion.',
    brainBenefit: 'Omega-3s from tuna support memory and reduce brain inflammation',
  },
  {
    id: 'greek_yogurt_bowl',
    title: 'Greek yogurt bowl',
    scenario: 'study_snack',
    prepMinutes: 2,
    costLevel: 'low',
    proteinGrams: 20,
    calories: 280,
    ingredients: ['200g Greek yogurt', 'Handful of blueberries', '1 tbsp honey', '30g granola'],
    instructions: 'Layer yogurt, top with blueberries, granola, and a drizzle of honey.',
    brainBenefit: 'Blueberries are the #1 brain food — antioxidants protect neurons during stress',
  },
  {
    id: 'exam_day_breakfast',
    title: 'Exam day breakfast',
    scenario: 'exam_day',
    prepMinutes: 8,
    costLevel: 'low',
    proteinGrams: 30,
    calories: 420,
    ingredients: ['3 eggs', '1 slice whole grain toast', 'Handful of spinach', 'Coffee or green tea'],
    instructions: 'Scramble eggs with spinach, serve on toast. Eat 90 minutes before your exam.',
    brainBenefit: 'Eggs provide choline — the neurotransmitter precursor for focus and memory',
  },
  {
    id: 'late_night_snack',
    title: 'Late-night study snack',
    scenario: 'late_night',
    prepMinutes: 2,
    costLevel: 'very_low',
    proteinGrams: 18,
    calories: 220,
    ingredients: ['2 rice cakes', '2 tbsp peanut butter', '1 glass of milk'],
    instructions: 'Spread peanut butter on rice cakes. Drink milk alongside.',
    brainBenefit: 'Casein protein in milk feeds muscles overnight — prevents catabolism during late study sessions',
  },
  {
    id: 'quick_wrap',
    title: 'Quick protein wrap',
    scenario: 'quick_prep',
    prepMinutes: 5,
    costLevel: 'low',
    proteinGrams: 38,
    calories: 490,
    ingredients: ['1 large tortilla', '150g cooked chicken (pre-cooked)', 'Hummus', 'Spinach', 'Cherry tomatoes'],
    instructions: 'Spread hummus on tortilla, add chicken and vegetables, roll tightly.',
    brainBenefit: 'High protein + complex carbs = no energy crash mid-study session',
  },
];

export const STUDY_BLOCKS: StudyBlock[] = [
  {
    id: 'pomodoro_25',
    title: 'Pomodoro sprint',
    durationMinutes: 25,
    technique: 'pomodoro',
    breakActivity: '5-min desk break circuit',
    fitnessBreak: { name: 'Desk push-up', sets: 2, reps: '10', restSeconds: 15, deskFriendly: true },
  },
  {
    id: 'deep_work_90',
    title: 'Deep work block',
    durationMinutes: 90,
    technique: 'deep_work',
    breakActivity: '15-min walk or desk break circuit',
    fitnessBreak: { name: 'Chair squat', sets: 3, reps: '15', restSeconds: 20, deskFriendly: true },
  },
  {
    id: 'active_recall_50',
    title: 'Active recall session',
    durationMinutes: 50,
    technique: 'active_recall',
    breakActivity: '10-min movement break',
    fitnessBreak: { name: 'Jumping jack', sets: 2, reps: '30 sec', restSeconds: 10, deskFriendly: false },
  },
];

export const BRAIN_TIPS = [
  'Exercise before studying increases memory retention by up to 20%',
  'Sleep is when your brain consolidates what you studied — 7-9h is non-negotiable',
  'Dehydration of just 2% impairs cognitive performance — drink 2.5L daily',
  'Caffeine peaks at 30-60 min — time your coffee before your hardest study block',
  'Short workouts beat no workouts — even 15 min improves focus for 2-3 hours',
];

export function generateStudentPriorities(
  stressLevel: StudentSession['stressLevel'],
  studyHoursToday: number,
  isExamDay: boolean
): StudentDayPriorities['priorities'] {
  if (isExamDay || stressLevel === 'extreme') {
    return [
      {
        id: 'exam_workout',
        title: 'Exam Day Prep workout (12 min)',
        category: 'workout',
        completed: false,
        durationMinutes: 12,
        tip: 'Light movement reduces anxiety and sharpens working memory',
      },
      {
        id: 'exam_breakfast',
        title: 'Eat exam day breakfast 90 min before',
        category: 'nutrition',
        completed: false,
        durationMinutes: 8,
        tip: 'Eggs + whole grain toast = sustained energy and choline for focus',
      },
      {
        id: 'sleep_8h',
        title: 'Protect 8 hours of sleep tonight',
        category: 'sleep',
        completed: false,
        durationMinutes: 480,
        tip: 'Sleep is when your brain consolidates everything you studied',
      },
      {
        id: 'hydrate_exam',
        title: 'Drink 2.5L water today',
        category: 'recovery',
        completed: false,
        durationMinutes: 0,
        tip: '2% dehydration measurably impairs cognitive performance',
      },
      {
        id: 'mindset_breathe',
        title: 'Box breathing — 2 min before exam',
        category: 'mindset',
        completed: false,
        durationMinutes: 2,
        tip: 'Activates parasympathetic nervous system — reduces cortisol spike',
      },
    ];
  }

  if (stressLevel === 'high') {
    return [
      {
        id: 'high_workout',
        title: '20-Min Strength workout',
        category: 'workout',
        completed: false,
        durationMinutes: 20,
        tip: 'Resistance training maintains muscle and testosterone under stress',
      },
      {
        id: 'high_protein',
        title: 'Hit 30g protein at breakfast',
        category: 'nutrition',
        completed: false,
        durationMinutes: 0,
        tip: 'Protein stabilises blood sugar and prevents energy crashes',
      },
      {
        id: 'high_study',
        title: 'Complete one deep work block (90 min)',
        category: 'study',
        completed: false,
        durationMinutes: 90,
        tip: 'One focused block beats three distracted hours',
      },
      {
        id: 'high_sleep',
        title: 'In bed by 11pm — 7-8h sleep',
        category: 'sleep',
        completed: false,
        durationMinutes: 0,
        tip: 'Sleep deprivation reduces memory consolidation by up to 40%',
      },
      {
        id: 'high_desk_break',
        title: 'Desk break every 90 min of study',
        category: 'recovery',
        completed: false,
        durationMinutes: 8,
        tip: 'Movement breaks restore focus and reduce mental fatigue',
      },
    ];
  }

  // moderate
  return [
    {
      id: 'mod_workout',
      title: 'Morning Activation workout (15 min)',
      category: 'workout',
      completed: false,
      durationMinutes: 15,
      tip: 'BDNF release primes your brain for 2-3 hours of peak learning',
    },
    {
      id: 'mod_nutrition',
      title: 'Prep a budget meal for lunch',
      category: 'nutrition',
      completed: false,
      durationMinutes: 10,
      tip: 'Cooking your own food saves money and controls macros',
    },
    {
      id: 'mod_study1',
      title: 'Pomodoro sprint — 2 sessions',
      category: 'study',
      completed: false,
      durationMinutes: 50,
      tip: '25 min focused + 5 min break = optimal attention cycle',
    },
    {
      id: 'mod_study2',
      title: 'Active recall session (50 min)',
      category: 'study',
      completed: false,
      durationMinutes: 50,
      tip: 'Testing yourself beats re-reading by 2-3x for retention',
    },
    {
      id: 'mod_recovery',
      title: 'Evening Deload stretch (20 min)',
      category: 'recovery',
      completed: false,
      durationMinutes: 20,
      tip: 'Reduces cortisol and improves sleep quality for memory consolidation',
    },
  ];
}

export function getRecommendedStudentWorkout(stressLevel: StudentSession['stressLevel']): StudentWorkout {
  if (stressLevel === 'extreme') {
    return STUDENT_WORKOUTS.find(w => w.id === 'desk_break_circuit')!;
  }
  if (stressLevel === 'high') {
    return STUDENT_WORKOUTS.find(w => w.id === 'quick_strength')!;
  }
  return STUDENT_WORKOUTS.find(w => w.id === 'morning_activation')!;
}

export function getDaysUntilEnd(session: StudentSession): number | null {
  if (!session.endDate) return null;
  const end = new Date(session.endDate);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export const STORAGE_KEY_STUDENT_SESSION = 'student_mode_session';
export const STORAGE_KEY_STUDENT_PRIORITIES = 'student_mode_priorities';
export const STORAGE_KEY_STUDENT_COMPLETED_WORKOUTS = 'student_mode_completed_workouts';
export const STORAGE_KEY_STUDENT_USED_BLOCKS = 'student_mode_used_blocks';
