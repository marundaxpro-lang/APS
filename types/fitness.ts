
export interface FitnessProfile {
  gender: 'male' | 'female';
  trainingDays: number;
  focusAreas: string[];
  equipmentType: 'gym' | 'home' | 'minimal';
  goal: 'strength' | 'muscle' | 'endurance' | 'weight-loss';
  weight: number;
  height: number;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  videoUrl?: string;
  muscleGroups: string[];
  equipment: string[];
  muscleGroup?: string;
  difficulty?: string;
  instructions?: string[];
}

export interface WorkoutDay {
  name: string;
  exercises: Exercise[];
  dayIndex: number;
  day?: string;
}

export interface FocusTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  category: 'study' | 'work' | 'personal';
}

export interface WeeklyTask extends FocusTask {
  dayOfWeek: number;
  startTime?: string;
  duration?: number;
  type?: 'study' | 'work' | 'personal';
}

export interface TimerType {
  id: string;
  name: string;
  duration: number;
  description: string;
}

export interface Measurement {
  id: string;
  weight: number;
  bodyFat?: number;
  date: string;
}

export interface MealEntry {
  id: string;
  foodId: string;
  grams: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  per100g: boolean;
}

export interface DashboardStats {
  workoutsThisWeek: number;
  tasksCompleted: number;
  currentStreak: number;
  todaysCalories: number;
}
