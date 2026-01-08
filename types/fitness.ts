
export interface FitnessProfile {
  experience: 'beginner' | 'intermediate' | 'advanced';
  goal: 'strength' | 'muscle' | 'endurance' | 'weight-loss';
  trainingFrequency: number; // 2-6 days per week
  splitType: 'ppl' | 'upper-lower' | 'full-body' | 'bro-split';
  userId?: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  restTime: number; // seconds
  muscleGroup: string;
  completed?: boolean;
  weight?: number;
}

export interface WorkoutDay {
  day: string;
  type: string;
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
}

export interface FoodItem {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  isPremium?: boolean;
}

export interface FocusTask {
  id: string;
  title: string;
  completed: boolean;
  category: string;
  dueDate: string;
}

export interface Measurement {
  id: string;
  weight: number;
  bodyFat?: number;
  muscleMass?: number;
  date: string;
}

export interface ProgressPhoto {
  id: string;
  photoUrl: string;
  date: string;
  weight?: number;
  notes?: string;
}
