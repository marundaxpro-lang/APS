
export type HabitCategory = 'hydration' | 'nutrition' | 'recovery' | 'sleep' | 'training' | 'consistency';

export type HabitTrigger =
  | 'morning'
  | 'pre_workout'
  | 'post_workout'
  | 'evening'
  | 'anytime'
  | 'low_energy'
  | 'nutrition_gap';

export interface Habit {
  id: string;
  title: string;
  description: string;
  category: HabitCategory;
  trigger: HabitTrigger;
  durationMinutes: number;
  icon: string;
  color: string;
  streakCount: number;
  completedToday: boolean;
  completedDates: string[];
  isActive: boolean;
  isPremium: boolean;
  xpReward: number;
}

export const HABIT_LIBRARY: Omit<Habit, 'streakCount' | 'completedToday' | 'completedDates' | 'isActive'>[] = [
  // Hydration
  {
    id: 'morning_water',
    title: 'Morning hydration',
    description: 'Drink 500ml within 30 min of waking to kickstart metabolism',
    category: 'hydration',
    trigger: 'morning',
    durationMinutes: 0,
    icon: 'Droplets',
    color: '#38BDF8',
    isPremium: false,
    xpReward: 10,
  },
  {
    id: 'daily_water',
    title: 'Hit water target',
    description: 'Reach your daily 2.5L hydration goal',
    category: 'hydration',
    trigger: 'anytime',
    durationMinutes: 0,
    icon: 'Droplets',
    color: '#38BDF8',
    isPremium: false,
    xpReward: 15,
  },
  // Nutrition
  {
    id: 'protein_breakfast',
    title: 'Protein-first breakfast',
    description: 'Start with 30g+ protein to reduce cravings all day',
    category: 'nutrition',
    trigger: 'morning',
    durationMinutes: 0,
    icon: 'Egg',
    color: '#F97316',
    isPremium: false,
    xpReward: 20,
  },
  {
    id: 'meal_prep',
    title: "Prep tomorrow's meals",
    description: 'Spend 15 min prepping to stay on track tomorrow',
    category: 'nutrition',
    trigger: 'evening',
    durationMinutes: 15,
    icon: 'ChefHat',
    color: '#F97316',
    isPremium: false,
    xpReward: 25,
  },
  {
    id: 'post_workout_shake',
    title: 'Post-workout protein',
    description: 'Hit 30-40g protein within 45 min of finishing',
    category: 'nutrition',
    trigger: 'post_workout',
    durationMinutes: 0,
    icon: 'Zap',
    color: '#F97316',
    isPremium: false,
    xpReward: 20,
  },
  // Recovery
  {
    id: 'morning_stretch',
    title: 'Morning mobility',
    description: '5 min of movement to reduce stiffness and injury risk',
    category: 'recovery',
    trigger: 'morning',
    durationMinutes: 5,
    icon: 'Activity',
    color: '#34D399',
    isPremium: false,
    xpReward: 15,
  },
  {
    id: 'post_workout_stretch',
    title: 'Cool-down stretch',
    description: 'Stretch for 10 min after training to speed recovery',
    category: 'recovery',
    trigger: 'post_workout',
    durationMinutes: 10,
    icon: 'Activity',
    color: '#34D399',
    isPremium: false,
    xpReward: 20,
  },
  {
    id: 'foam_roll',
    title: 'Foam rolling',
    description: 'Target sore muscle groups for 10 min to reduce DOMS',
    category: 'recovery',
    trigger: 'evening',
    durationMinutes: 10,
    icon: 'Circle',
    color: '#34D399',
    isPremium: true,
    xpReward: 25,
  },
  // Sleep
  {
    id: 'sleep_routine',
    title: 'Wind-down routine',
    description: 'No screens 30 min before bed to improve sleep quality',
    category: 'sleep',
    trigger: 'evening',
    durationMinutes: 30,
    icon: 'Moon',
    color: '#A78BFA',
    isPremium: false,
    xpReward: 20,
  },
  {
    id: 'sleep_target',
    title: 'Hit sleep target',
    description: 'Get 7-9h tonight — sleep is when your body actually grows',
    category: 'sleep',
    trigger: 'evening',
    durationMinutes: 0,
    icon: 'Moon',
    color: '#A78BFA',
    isPremium: false,
    xpReward: 30,
  },
  // Training
  {
    id: 'pre_workout_fuel',
    title: 'Pre-workout fuel',
    description: 'Eat carbs + protein 60-90 min before training',
    category: 'training',
    trigger: 'pre_workout',
    durationMinutes: 0,
    icon: 'Flame',
    color: '#6C63FF',
    isPremium: false,
    xpReward: 15,
  },
  {
    id: 'workout_log',
    title: 'Log your workout',
    description: 'Track weights and reps to enable progressive overload',
    category: 'training',
    trigger: 'post_workout',
    durationMinutes: 5,
    icon: 'ClipboardList',
    color: '#6C63FF',
    isPremium: false,
    xpReward: 20,
  },
  // Consistency
  {
    id: 'daily_checkin',
    title: 'Daily check-in',
    description: 'Review your plan for today — takes 2 minutes',
    category: 'consistency',
    trigger: 'morning',
    durationMinutes: 2,
    icon: 'CheckSquare',
    color: '#F59E0B',
    isPremium: false,
    xpReward: 10,
  },
  {
    id: 'weekly_review',
    title: 'Weekly review',
    description: 'Spend 5 min reviewing your week every Sunday',
    category: 'consistency',
    trigger: 'anytime',
    durationMinutes: 5,
    icon: 'BarChart2',
    color: '#F59E0B',
    isPremium: true,
    xpReward: 40,
  },
  {
    id: 'progress_photo',
    title: 'Progress photo',
    description: 'Take a weekly photo — visual progress is the best motivator',
    category: 'consistency',
    trigger: 'morning',
    durationMinutes: 0,
    icon: 'Camera',
    color: '#F59E0B',
    isPremium: true,
    xpReward: 30,
  },
  {
    id: 'low_energy_walk',
    title: 'Recovery walk',
    description: 'A 10-min walk on low-energy days keeps momentum alive',
    category: 'recovery',
    trigger: 'low_energy',
    durationMinutes: 10,
    icon: 'Footprints',
    color: '#34D399',
    isPremium: false,
    xpReward: 15,
  },
];

export function getSurfacedHabits(
  activeHabits: Habit[],
  context: {
    currentHour: number;
    workoutToday: boolean;
    workoutCompleted: boolean;
    sleepHoursLast: number;
    proteinGapToday: number;
    streakSlipping: boolean;
  }
): Habit[] {
  const { currentHour, workoutToday, workoutCompleted, sleepHoursLast, proteinGapToday, streakSlipping } = context;

  const isMorning = currentHour >= 6 && currentHour < 10;
  const isEvening = currentHour >= 19 && currentHour < 22;
  const isPreWorkout = workoutToday && !workoutCompleted && currentHour >= 8 && currentHour < 18;
  const isPostWorkout = workoutCompleted;
  const isLowEnergy = sleepHoursLast < 6 || streakSlipping;
  const hasNutritionGap = proteinGapToday > 20;

  // Score each habit by relevance
  const scored = activeHabits
    .filter(h => !h.completedToday)
    .map(h => {
      let score = 0;

      // Trigger matching
      if (h.trigger === 'post_workout' && isPostWorkout) score += 100;
      else if (h.trigger === 'pre_workout' && isPreWorkout) score += 90;
      else if (h.trigger === 'morning' && isMorning) score += 80;
      else if (h.trigger === 'evening' && isEvening) score += 80;
      else if (h.trigger === 'low_energy' && isLowEnergy) score += 70;
      else if (h.trigger === 'nutrition_gap' && hasNutritionGap) score += 70;
      else if (h.trigger === 'anytime') score += 30;
      else score += 5; // wrong time but still active

      // Boost by streak (reward consistency)
      if (h.streakCount >= 7) score += 10;
      else if (h.streakCount === 0) score += 5; // nudge new habits

      return { habit: h, score };
    });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 4).map(s => s.habit);
}

export function getHabitInsight(habit: Habit): string {
  const streak = habit.streakCount;
  if (streak === 0) return 'Start today';
  if (streak < 3) return `${streak} day${streak === 1 ? '' : 's'} in`;
  if (streak < 7) return `${streak}-day streak!`;
  if (streak < 14) return 'One week strong';
  return 'Habit locked in';
}
