
export interface ProgressPhoto {
  id: string;
  photo_url: string;
  photo_date: string;
  weight_at_time: number;
  notes?: string;
}

export interface Measurement {
  id: string;
  weight: number;
  body_fat_percentage?: number;
  muscle_mass?: number;
  measurement_date: string;
  notes?: string;
}

export interface Achievement {
  id: string;
  achievement_type: string;
  title: string;
  description: string;
  icon: string;
  unlocked_date?: string;
  shared: boolean;
}

export interface FriendConnection {
  id: string;
  friend_email: string;
  friend_name?: string;
  status: 'pending' | 'accepted' | 'rejected';
  connected_date?: string;
}

export interface SocialPost {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  post_type: 'workout' | 'achievement' | 'progress' | 'general';
  achievement_data?: any;
  likes_count: number;
  comments: Comment[];
  created_at: string;
}

export interface Comment {
  id: string;
  user_name: string;
  content: string;
  created_at: string;
}

export interface FitnessProfile {
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  goal: 'strength' | 'muscle' | 'endurance' | 'weight-loss';
  training_frequency: number; // 2-6 days per week
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  category: 'chest' | 'shoulders' | 'arms' | 'back' | 'legs' | 'abs' | 'glutes';
  completed?: boolean;
}

export interface WorkoutSession {
  id: string;
  workout_type: 'Push' | 'Pull' | 'Legs';
  exercises: Exercise[];
  date: string;
  completed: boolean;
  duration_minutes?: number;
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  per_100g: boolean;
  premium?: boolean;
}

export interface MealEntry {
  id: string;
  food_item: FoodItem;
  grams: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
}

export interface DailyNutrition {
  date: string;
  meals: MealEntry[];
  goals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface FocusTask {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export interface FocusSession {
  id: string;
  duration_minutes: number;
  start_time: string;
  end_time?: string;
  completed: boolean;
}
