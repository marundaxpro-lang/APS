
export interface FitnessProfile {
  name?: string;
  gender: 'male' | 'female';
  age?: number;
  trainingDays: number;
  selectedDays?: number[]; // Array of day indices (0-6) for which days to train
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
  food_item: FoodItem;
  grams: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  premium?: boolean;
}

export interface DashboardStats {
  workoutsThisWeek: number;
  tasksCompleted: number;
  currentStreak: number;
  todaysCalories: number;
}

export interface MealPlan {
  id: string;
  name: string;
  description: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  prepTimeMinutes: number;
  meals: MealPlanMeal[];
}

export interface MealPlanMeal {
  id: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  instructions: string[];
  imageUrl?: string;
  prepTimeMinutes: number;
}

export interface CaloricGoal {
  dailyCalorieGoal: number;
  bmr: number;
  tdee: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
}
