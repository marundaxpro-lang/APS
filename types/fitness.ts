
export interface FitnessProfile {
  gender: 'male' | 'female' | 'other';
  experience: 'beginner' | 'intermediate' | 'advanced';
  goal: 'strength' | 'muscle' | 'endurance' | 'weight-loss';
  trainingDays: number;
  focusAreas: string[];
  equipment: 'gym' | 'home-freeweights' | 'home-bodyweight';
  createdAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  muscleGroup: string;
  equipment: string[];
  difficulty: string;
  videoUrl?: string;
  instructions: string[];
  completed?: boolean;
  setsCompleted?: number;
}

export interface WorkoutDay {
  day: string;
  name: string;
  exercises: Exercise[];
}

export interface MealEntry {
  id: string;
  foodId: string;
  foodName: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  date: string;
}

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  isPremium: boolean;
}

export interface FocusTask {
  id: string;
  title: string;
  type: 'study' | 'work' | 'workout' | 'personal';
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  duration?: number;
}

export interface WeeklyTask {
  id: string;
  title: string;
  type: 'study' | 'work' | 'workout' | 'personal';
  dayOfWeek: number;
  startTime: string;
  duration: number;
  completed: boolean;
}

export interface ProgressPhoto {
  id: string;
  photoUrl: string;
  date: string;
  weight?: number;
  notes?: string;
}

export interface Measurement {
  id: string;
  date: string;
  weight: number;
  bodyFat?: number;
  muscleMass?: number;
  notes?: string;
}

export interface Achievement {
  id: string;
  type: string;
  title: string;
  description: string;
  unlockedDate: string;
  icon: string;
}

export interface DashboardStats {
  weeklyWorkouts: number;
  totalWorkouts: number;
  currentStreak: number;
  weeklyStudyHours: number;
  tasksCompleted: number;
  totalTasks: number;
}
