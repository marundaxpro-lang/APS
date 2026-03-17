
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { FitnessProfile } from '@/types/fitness';
import { useAuth } from '@/contexts/AuthContext';

interface MacroMeal {
  id: string;
  label: string;
  kcal: number;
  P: number;
  C: number;
  F: number;
  category: 'high_protein' | 'high_carb' | 'balanced' | 'light';
  ingredients?: {
    name: string;
    amount: string;
    kcal: number;
    P: number;
    C: number;
    F: number;
  }[];
  instructions?: string[];
}

interface NutritionLogEntry {
  id: string;
  timestamp: string;
  mealSlot?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
  label: string;
  type: 'template' | 'manual' | 'macro_meal';
  kcal: number;
  P: number;
  C: number;
  F: number;
}

interface DailyNutritionData {
  date: string;
  entries: NutritionLogEntry[];
}

interface NutritionTargets {
  calorieGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
}

interface TodaysPlan {
  Breakfast: MacroMeal;
  Lunch: MacroMeal;
  Dinner: MacroMeal;
  Snacks: MacroMeal;
}

const MACRO_MEALS_LIBRARY: MacroMeal[] = [
  { 
    id: 'skyr_whey_berries', 
    label: 'Skyr + whey + berries', 
    kcal: 350, 
    P: 40, 
    C: 30, 
    F: 8, 
    category: 'high_protein',
    ingredients: [
      { name: 'Skyr (plain)', amount: '200g', kcal: 120, P: 20, C: 8, F: 0 },
      { name: 'Whey protein', amount: '30g', kcal: 120, P: 24, C: 2, F: 1 },
      { name: 'Mixed berries', amount: '150g', kcal: 80, P: 1, C: 18, F: 0 },
      { name: 'Honey', amount: '10g', kcal: 30, P: 0, C: 8, F: 0 }
    ],
    instructions: ['Mix skyr with whey protein', 'Top with fresh berries', 'Drizzle honey on top']
  },
  { 
    id: 'chicken_rice_bowl', 
    label: 'Chicken rice bowl', 
    kcal: 650, 
    P: 50, 
    C: 70, 
    F: 15, 
    category: 'balanced',
    ingredients: [
      { name: 'Chicken breast', amount: '200g', kcal: 330, P: 62, C: 0, F: 7 },
      { name: 'White rice (cooked)', amount: '200g', kcal: 260, P: 5, C: 58, F: 0 },
      { name: 'Broccoli', amount: '100g', kcal: 35, P: 3, C: 7, F: 0 },
      { name: 'Olive oil', amount: '5ml', kcal: 45, P: 0, C: 0, F: 5 }
    ],
    instructions: ['Grill chicken breast with seasoning', 'Cook rice according to package', 'Steam broccoli', 'Combine in bowl and drizzle with olive oil']
  },
  { 
    id: 'tuna_wrap', 
    label: 'Tuna wrap', 
    kcal: 400, 
    P: 30, 
    C: 40, 
    F: 12, 
    category: 'balanced',
    ingredients: [
      { name: 'Tuna (canned in water)', amount: '150g', kcal: 165, P: 36, C: 0, F: 2 },
      { name: 'Whole wheat tortilla', amount: '1 large', kcal: 170, P: 6, C: 30, F: 4 },
      { name: 'Lettuce', amount: '50g', kcal: 8, P: 1, C: 2, F: 0 },
      { name: 'Light mayo', amount: '15g', kcal: 50, P: 0, C: 2, F: 5 }
    ],
    instructions: ['Drain tuna and mix with mayo', 'Lay tortilla flat and add lettuce', 'Add tuna mixture', 'Roll tightly and cut in half']
  },
  { 
    id: 'oats_banana', 
    label: 'Oats + banana', 
    kcal: 300, 
    P: 10, 
    C: 50, 
    F: 7, 
    category: 'high_carb',
    ingredients: [
      { name: 'Rolled oats', amount: '60g', kcal: 220, P: 8, C: 40, F: 4 },
      { name: 'Banana', amount: '1 medium', kcal: 105, P: 1, C: 27, F: 0 },
      { name: 'Almond butter', amount: '10g', kcal: 60, P: 2, C: 2, F: 5 }
    ],
    instructions: ['Cook oats with water or milk', 'Slice banana on top', 'Add a dollop of almond butter', 'Optional: sprinkle cinnamon']
  },
  { 
    id: 'eggs_toast', 
    label: 'Eggs + toast', 
    kcal: 380, 
    P: 25, 
    C: 35, 
    F: 15, 
    category: 'balanced',
    ingredients: [
      { name: 'Eggs', amount: '3 large', kcal: 210, P: 18, C: 2, F: 15 },
      { name: 'Whole wheat bread', amount: '2 slices', kcal: 160, P: 8, C: 30, F: 2 },
      { name: 'Butter', amount: '5g', kcal: 36, P: 0, C: 0, F: 4 }
    ],
    instructions: ['Scramble or fry eggs', 'Toast bread', 'Spread butter on toast', 'Serve eggs on toast']
  },
  { 
    id: 'protein_shake', 
    label: 'Protein shake', 
    kcal: 180, 
    P: 30, 
    C: 8, 
    F: 3, 
    category: 'high_protein',
    ingredients: [
      { name: 'Whey protein', amount: '40g', kcal: 160, P: 32, C: 4, F: 2 },
      { name: 'Almond milk', amount: '250ml', kcal: 30, P: 1, C: 1, F: 2 }
    ],
    instructions: ['Add protein powder to shaker', 'Pour in almond milk', 'Shake vigorously for 30 seconds', 'Drink immediately']
  },
  { 
    id: 'greek_yogurt_granola', 
    label: 'Greek yogurt + granola', 
    kcal: 320, 
    P: 20, 
    C: 40, 
    F: 8, 
    category: 'balanced',
    ingredients: [
      { name: 'Greek yogurt (plain)', amount: '200g', kcal: 130, P: 20, C: 9, F: 0 },
      { name: 'Granola', amount: '40g', kcal: 180, P: 4, C: 28, F: 6 },
      { name: 'Honey', amount: '10g', kcal: 30, P: 0, C: 8, F: 0 }
    ],
    instructions: ['Spoon yogurt into bowl', 'Top with granola', 'Drizzle honey over top']
  },
  { 
    id: 'salmon_sweet_potato', 
    label: 'Salmon + sweet potato', 
    kcal: 550, 
    P: 40, 
    C: 50, 
    F: 18, 
    category: 'balanced',
    ingredients: [
      { name: 'Salmon fillet', amount: '150g', kcal: 280, P: 34, C: 0, F: 17 },
      { name: 'Sweet potato', amount: '200g', kcal: 180, P: 4, C: 42, F: 0 },
      { name: 'Asparagus', amount: '100g', kcal: 20, P: 2, C: 4, F: 0 },
      { name: 'Olive oil', amount: '5ml', kcal: 45, P: 0, C: 0, F: 5 }
    ],
    instructions: ['Bake salmon at 200°C for 15 minutes', 'Roast sweet potato cubes', 'Grill asparagus with olive oil', 'Plate and season to taste']
  },
  { 
    id: 'turkey_avocado_wrap', 
    label: 'Turkey avocado wrap', 
    kcal: 480, 
    P: 35, 
    C: 45, 
    F: 16, 
    category: 'balanced',
    ingredients: [
      { name: 'Turkey breast', amount: '120g', kcal: 135, P: 30, C: 0, F: 1 },
      { name: 'Whole wheat tortilla', amount: '1 large', kcal: 170, P: 6, C: 30, F: 4 },
      { name: 'Avocado', amount: '50g', kcal: 80, P: 1, C: 4, F: 7 },
      { name: 'Tomato', amount: '50g', kcal: 9, P: 0, C: 2, F: 0 },
      { name: 'Lettuce', amount: '30g', kcal: 5, P: 0, C: 1, F: 0 }
    ],
    instructions: ['Lay tortilla flat', 'Layer turkey, avocado, tomato, and lettuce', 'Roll tightly', 'Cut diagonally']
  },
  { 
    id: 'cottage_cheese_fruit', 
    label: 'Cottage cheese + fruit', 
    kcal: 250, 
    P: 25, 
    C: 30, 
    F: 5, 
    category: 'high_protein',
    ingredients: [
      { name: 'Cottage cheese (low-fat)', amount: '200g', kcal: 160, P: 28, C: 8, F: 4 },
      { name: 'Pineapple chunks', amount: '100g', kcal: 50, P: 1, C: 13, F: 0 },
      { name: 'Strawberries', amount: '50g', kcal: 16, P: 0, C: 4, F: 0 }
    ],
    instructions: ['Spoon cottage cheese into bowl', 'Top with fresh fruit', 'Mix gently before eating']
  },
  { 
    id: 'beef_quinoa_bowl', 
    label: 'Beef quinoa bowl', 
    kcal: 620, 
    P: 45, 
    C: 60, 
    F: 20, 
    category: 'balanced',
    ingredients: [
      { name: 'Lean ground beef', amount: '150g', kcal: 310, P: 38, C: 0, F: 17 },
      { name: 'Quinoa (cooked)', amount: '150g', kcal: 180, P: 6, C: 32, F: 3 },
      { name: 'Bell peppers', amount: '100g', kcal: 31, P: 1, C: 6, F: 0 },
      { name: 'Black beans', amount: '50g', kcal: 60, P: 4, C: 11, F: 0 }
    ],
    instructions: ['Brown ground beef in pan', 'Cook quinoa according to package', 'Sauté bell peppers', 'Combine all in bowl with black beans']
  },
  { 
    id: 'protein_pancakes', 
    label: 'Protein pancakes', 
    kcal: 420, 
    P: 35, 
    C: 45, 
    F: 10, 
    category: 'high_protein',
    ingredients: [
      { name: 'Protein powder', amount: '40g', kcal: 160, P: 32, C: 4, F: 2 },
      { name: 'Oat flour', amount: '50g', kcal: 185, P: 7, C: 33, F: 3 },
      { name: 'Egg whites', amount: '100ml', kcal: 52, P: 11, C: 1, F: 0 },
      { name: 'Banana (mashed)', amount: '1 small', kcal: 90, P: 1, C: 23, F: 0 }
    ],
    instructions: ['Mix all ingredients until smooth', 'Heat non-stick pan', 'Pour batter to form pancakes', 'Flip when bubbles form', 'Serve with berries']
  },
  { 
    id: 'chicken_pasta', 
    label: 'Chicken pasta', 
    kcal: 680, 
    P: 48, 
    C: 75, 
    F: 18, 
    category: 'high_carb',
    ingredients: [
      { name: 'Chicken breast', amount: '150g', kcal: 248, P: 47, C: 0, F: 5 },
      { name: 'Whole wheat pasta', amount: '100g dry', kcal: 350, P: 13, C: 70, F: 3 },
      { name: 'Tomato sauce', amount: '100g', kcal: 40, P: 2, C: 8, F: 0 },
      { name: 'Parmesan cheese', amount: '10g', kcal: 43, P: 4, C: 0, F: 3 }
    ],
    instructions: ['Cook pasta al dente', 'Grill and slice chicken', 'Heat tomato sauce', 'Toss pasta with sauce and chicken', 'Top with parmesan']
  },
  { 
    id: 'egg_white_omelette', 
    label: 'Egg white omelette', 
    kcal: 220, 
    P: 28, 
    C: 10, 
    F: 8, 
    category: 'high_protein',
    ingredients: [
      { name: 'Egg whites', amount: '250ml', kcal: 130, P: 27, C: 2, F: 0 },
      { name: 'Spinach', amount: '50g', kcal: 12, P: 1, C: 2, F: 0 },
      { name: 'Mushrooms', amount: '50g', kcal: 11, P: 2, C: 2, F: 0 },
      { name: 'Feta cheese', amount: '20g', kcal: 53, P: 4, C: 1, F: 4 },
      { name: 'Olive oil', amount: '3ml', kcal: 27, P: 0, C: 0, F: 3 }
    ],
    instructions: ['Heat oil in pan', 'Sauté spinach and mushrooms', 'Pour egg whites over vegetables', 'Add feta and fold omelette']
  },
  { 
    id: 'rice_cakes_pb', 
    label: 'Rice cakes + PB', 
    kcal: 280, 
    P: 12, 
    C: 35, 
    F: 12, 
    category: 'high_carb',
    ingredients: [
      { name: 'Rice cakes', amount: '3 cakes', kcal: 105, P: 3, C: 24, F: 1 },
      { name: 'Peanut butter', amount: '25g', kcal: 150, P: 7, C: 6, F: 13 },
      { name: 'Banana slices', amount: '50g', kcal: 45, P: 1, C: 11, F: 0 }
    ],
    instructions: ['Spread peanut butter on rice cakes', 'Top with banana slices', 'Optional: drizzle honey']
  },
  { 
    id: 'tuna_salad', 
    label: 'Tuna salad', 
    kcal: 320, 
    P: 35, 
    C: 15, 
    F: 14, 
    category: 'high_protein',
    ingredients: [
      { name: 'Tuna (canned)', amount: '150g', kcal: 165, P: 36, C: 0, F: 2 },
      { name: 'Mixed greens', amount: '100g', kcal: 20, P: 2, C: 4, F: 0 },
      { name: 'Cherry tomatoes', amount: '100g', kcal: 18, P: 1, C: 4, F: 0 },
      { name: 'Cucumber', amount: '50g', kcal: 8, P: 0, C: 2, F: 0 },
      { name: 'Olive oil dressing', amount: '15ml', kcal: 120, P: 0, C: 0, F: 14 }
    ],
    instructions: ['Arrange greens in bowl', 'Add tuna, tomatoes, and cucumber', 'Drizzle with olive oil dressing', 'Toss gently']
  },
  { 
    id: 'smoothie_bowl', 
    label: 'Smoothie bowl', 
    kcal: 380, 
    P: 20, 
    C: 55, 
    F: 10, 
    category: 'high_carb',
    ingredients: [
      { name: 'Frozen berries', amount: '150g', kcal: 80, P: 1, C: 18, F: 0 },
      { name: 'Banana', amount: '1 medium', kcal: 105, P: 1, C: 27, F: 0 },
      { name: 'Protein powder', amount: '30g', kcal: 120, P: 24, C: 2, F: 1 },
      { name: 'Almond milk', amount: '100ml', kcal: 13, P: 0, C: 1, F: 1 },
      { name: 'Granola topping', amount: '20g', kcal: 90, P: 2, C: 14, F: 3 }
    ],
    instructions: ['Blend berries, banana, protein, and milk until thick', 'Pour into bowl', 'Top with granola and extra berries']
  },
  { 
    id: 'steak_veggies', 
    label: 'Steak + veggies', 
    kcal: 520, 
    P: 48, 
    C: 25, 
    F: 26, 
    category: 'high_protein',
    ingredients: [
      { name: 'Sirloin steak', amount: '200g', kcal: 380, P: 50, C: 0, F: 20 },
      { name: 'Broccoli', amount: '150g', kcal: 52, P: 4, C: 10, F: 1 },
      { name: 'Carrots', amount: '100g', kcal: 41, P: 1, C: 10, F: 0 },
      { name: 'Butter', amount: '5g', kcal: 36, P: 0, C: 0, F: 4 }
    ],
    instructions: ['Season and grill steak to desired doneness', 'Steam broccoli and carrots', 'Toss vegetables with butter', 'Let steak rest before slicing']
  },
  { 
    id: 'bagel_cream_cheese', 
    label: 'Bagel + cream cheese', 
    kcal: 350, 
    P: 12, 
    C: 50, 
    F: 12, 
    category: 'high_carb',
    ingredients: [
      { name: 'Whole wheat bagel', amount: '1 bagel', kcal: 245, P: 10, C: 48, F: 2 },
      { name: 'Light cream cheese', amount: '30g', kcal: 70, P: 3, C: 2, F: 6 },
      { name: 'Smoked salmon', amount: '30g', kcal: 35, P: 7, C: 0, F: 1 }
    ],
    instructions: ['Toast bagel', 'Spread cream cheese', 'Top with smoked salmon', 'Optional: add capers and red onion']
  },
  { 
    id: 'protein_bar', 
    label: 'Protein bar', 
    kcal: 200, 
    P: 20, 
    C: 22, 
    F: 6, 
    category: 'high_protein',
    ingredients: [
      { name: 'Protein bar (store-bought)', amount: '1 bar (60g)', kcal: 200, P: 20, C: 22, F: 6 }
    ],
    instructions: ['Unwrap and enjoy', 'Great for on-the-go']
  },
  { 
    id: 'apple_almond_butter', 
    label: 'Apple + almond butter', 
    kcal: 220, 
    P: 6, 
    C: 28, 
    F: 12, 
    category: 'light',
    ingredients: [
      { name: 'Apple', amount: '1 medium', kcal: 95, P: 0, C: 25, F: 0 },
      { name: 'Almond butter', amount: '20g', kcal: 120, P: 4, C: 4, F: 11 }
    ],
    instructions: ['Slice apple into wedges', 'Serve with almond butter for dipping']
  },
  { 
    id: 'chicken_salad', 
    label: 'Chicken salad', 
    kcal: 380, 
    P: 40, 
    C: 20, 
    F: 16, 
    category: 'high_protein',
    ingredients: [
      { name: 'Grilled chicken breast', amount: '150g', kcal: 248, P: 47, C: 0, F: 5 },
      { name: 'Mixed greens', amount: '100g', kcal: 20, P: 2, C: 4, F: 0 },
      { name: 'Cherry tomatoes', amount: '100g', kcal: 18, P: 1, C: 4, F: 0 },
      { name: 'Avocado', amount: '50g', kcal: 80, P: 1, C: 4, F: 7 },
      { name: 'Balsamic vinaigrette', amount: '15ml', kcal: 45, P: 0, C: 2, F: 4 }
    ],
    instructions: ['Arrange greens in bowl', 'Top with sliced chicken', 'Add tomatoes and avocado', 'Drizzle with vinaigrette']
  },
  { 
    id: 'pasta_marinara', 
    label: 'Pasta marinara', 
    kcal: 480, 
    P: 18, 
    C: 75, 
    F: 12, 
    category: 'high_carb',
    ingredients: [
      { name: 'Whole wheat pasta', amount: '100g dry', kcal: 350, P: 13, C: 70, F: 3 },
      { name: 'Marinara sauce', amount: '150g', kcal: 60, P: 2, C: 12, F: 1 },
      { name: 'Parmesan cheese', amount: '15g', kcal: 64, P: 6, C: 0, F: 4 },
      { name: 'Fresh basil', amount: '5g', kcal: 1, P: 0, C: 0, F: 0 }
    ],
    instructions: ['Cook pasta al dente', 'Heat marinara sauce', 'Toss pasta with sauce', 'Top with parmesan and basil']
  },
  { 
    id: 'turkey_sandwich', 
    label: 'Turkey sandwich', 
    kcal: 420, 
    P: 32, 
    C: 48, 
    F: 12, 
    category: 'balanced',
    ingredients: [
      { name: 'Whole wheat bread', amount: '2 slices', kcal: 160, P: 8, C: 30, F: 2 },
      { name: 'Turkey breast', amount: '100g', kcal: 113, P: 25, C: 0, F: 1 },
      { name: 'Swiss cheese', amount: '20g', kcal: 76, P: 6, C: 0, F: 6 },
      { name: 'Lettuce & tomato', amount: '50g', kcal: 10, P: 1, C: 2, F: 0 },
      { name: 'Mustard', amount: '10g', kcal: 5, P: 0, C: 1, F: 0 }
    ],
    instructions: ['Toast bread if desired', 'Layer turkey, cheese, lettuce, and tomato', 'Spread mustard', 'Close sandwich and cut']
  },
  { 
    id: 'protein_oats', 
    label: 'Protein oats', 
    kcal: 380, 
    P: 28, 
    C: 50, 
    F: 8, 
    category: 'balanced',
    ingredients: [
      { name: 'Rolled oats', amount: '60g', kcal: 220, P: 8, C: 40, F: 4 },
      { name: 'Protein powder', amount: '30g', kcal: 120, P: 24, C: 2, F: 1 },
      { name: 'Blueberries', amount: '50g', kcal: 29, P: 0, C: 7, F: 0 },
      { name: 'Cinnamon', amount: '2g', kcal: 6, P: 0, C: 2, F: 0 }
    ],
    instructions: ['Cook oats with water', 'Stir in protein powder', 'Top with blueberries and cinnamon']
  },
  { 
    id: 'shrimp_rice', 
    label: 'Shrimp + rice', 
    kcal: 450, 
    P: 38, 
    C: 55, 
    F: 8, 
    category: 'balanced',
    ingredients: [
      { name: 'Shrimp', amount: '200g', kcal: 200, P: 46, C: 0, F: 3 },
      { name: 'Jasmine rice (cooked)', amount: '150g', kcal: 195, P: 4, C: 43, F: 0 },
      { name: 'Snap peas', amount: '100g', kcal: 42, P: 3, C: 8, F: 0 },
      { name: 'Soy sauce', amount: '10ml', kcal: 9, P: 1, C: 1, F: 0 }
    ],
    instructions: ['Sauté shrimp until pink', 'Cook rice', 'Stir-fry snap peas', 'Combine and season with soy sauce']
  },
  { 
    id: 'nuts_mix', 
    label: 'Mixed nuts', 
    kcal: 180, 
    P: 6, 
    C: 8, 
    F: 16, 
    category: 'light',
    ingredients: [
      { name: 'Mixed nuts (almonds, cashews, walnuts)', amount: '30g', kcal: 180, P: 6, C: 8, F: 16 }
    ],
    instructions: ['Portion out nuts', 'Enjoy as a snack']
  },
  { 
    id: 'hummus_veggies', 
    label: 'Hummus + veggies', 
    kcal: 200, 
    P: 8, 
    C: 24, 
    F: 10, 
    category: 'light',
    ingredients: [
      { name: 'Hummus', amount: '80g', kcal: 160, P: 6, C: 14, F: 10 },
      { name: 'Carrot sticks', amount: '100g', kcal: 41, P: 1, C: 10, F: 0 },
      { name: 'Cucumber slices', amount: '50g', kcal: 8, P: 0, C: 2, F: 0 }
    ],
    instructions: ['Cut vegetables into sticks', 'Serve with hummus for dipping']
  },
  { 
    id: 'chicken_wrap', 
    label: 'Chicken wrap', 
    kcal: 520, 
    P: 42, 
    C: 50, 
    F: 16, 
    category: 'balanced',
    ingredients: [
      { name: 'Grilled chicken', amount: '150g', kcal: 248, P: 47, C: 0, F: 5 },
      { name: 'Whole wheat tortilla', amount: '1 large', kcal: 170, P: 6, C: 30, F: 4 },
      { name: 'Lettuce', amount: '30g', kcal: 5, P: 0, C: 1, F: 0 },
      { name: 'Tomato', amount: '50g', kcal: 9, P: 0, C: 2, F: 0 },
      { name: 'Ranch dressing', amount: '20g', kcal: 88, P: 1, C: 2, F: 9 }
    ],
    instructions: ['Lay tortilla flat', 'Add chicken, lettuce, and tomato', 'Drizzle ranch dressing', 'Roll tightly and cut']
  },
  { 
    id: 'overnight_oats', 
    label: 'Overnight oats', 
    kcal: 340, 
    P: 15, 
    C: 52, 
    F: 9, 
    category: 'high_carb',
    ingredients: [
      { name: 'Rolled oats', amount: '60g', kcal: 220, P: 8, C: 40, F: 4 },
      { name: 'Greek yogurt', amount: '100g', kcal: 65, P: 10, C: 5, F: 0 },
      { name: 'Chia seeds', amount: '10g', kcal: 49, P: 2, C: 4, F: 3 },
      { name: 'Honey', amount: '10g', kcal: 30, P: 0, C: 8, F: 0 }
    ],
    instructions: ['Mix oats, yogurt, chia seeds in jar', 'Add honey and stir', 'Refrigerate overnight', 'Top with fruit before eating']
  },
];

const TEMPLATES = [
  { id: 'balanced', label: 'Balanced Meal', kcal: 600, P: 35, C: 60, F: 15 },
  { id: 'high_protein', label: 'High Protein', kcal: 500, P: 45, C: 35, F: 15 },
  { id: 'light', label: 'Light Meal', kcal: 350, P: 30, C: 30, F: 8 },
];

const DIET_PREFERENCES = [
  { id: 'none', label: 'None' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'pescatarian', label: 'Pescatarian' },
  { id: 'keto', label: 'Keto' },
  { id: 'paleo', label: 'Paleo' },
  { id: 'gluten-free', label: 'Gluten-Free' },
];

const DIET_STORAGE_KEY = 'nutritionDietPreference';

export default function NutritionScreen() {
  const router = useRouter();
  const { isPremium } = useAuth();
  const [targets, setTargets] = useState<NutritionTargets>({
    calorieGoal: 2500,
    proteinGoal: 180,
    carbsGoal: 270,
    fatGoal: 65,
  });
  const [dailyData, setDailyData] = useState<DailyNutritionData>({
    date: new Date().toISOString().split('T')[0],
    entries: [],
  });
  const [todaysPlan, setTodaysPlan] = useState<TodaysPlan | null>(null);
  const [showMealModal, setShowMealModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showTargetsModal, setShowTargetsModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [showMealDetailsModal, setShowMealDetailsModal] = useState(false);
  const [selectedMealForDetails, setSelectedMealForDetails] = useState<MacroMeal | null>(null);
  const [selectedMealSlot, setSelectedMealSlot] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'>('Breakfast');
  const [swapMealSlot, setSwapMealSlot] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'>('Breakfast');
  const [manualKcal, setManualKcal] = useState('');
  const [manualP, setManualP] = useState('');
  const [manualC, setManualC] = useState('');
  const [manualF, setManualF] = useState('');
  const [manualLabel, setManualLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [dietPreference, setDietPreference] = useState('none');
  const [showDietModal, setShowDietModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      const storedDiet = await AsyncStorage.getItem(DIET_STORAGE_KEY);
      if (storedDiet) {
        setDietPreference(storedDiet);
        console.log('[Nutrition] Loaded diet preference:', storedDiet);
      }

      const storedTargets = await AsyncStorage.getItem('nutritionTargets');
      if (storedTargets) {
        setTargets(JSON.parse(storedTargets));
        console.log('[Nutrition] Loaded targets from storage');
      } else {
        const profileData = await AsyncStorage.getItem('fitnessProfile');
        if (profileData) {
          const profile: FitnessProfile = JSON.parse(profileData);
          if (profile.weight) {
            const derivedTargets: NutritionTargets = {
              calorieGoal: profile.caloricGoal || 2500,
              proteinGoal: Math.round(profile.weight * 2.0),
              carbsGoal: 270,
              fatGoal: 65,
            };
            setTargets(derivedTargets);
            await AsyncStorage.setItem('nutritionTargets', JSON.stringify(derivedTargets));
            console.log('[Nutrition] Derived targets from profile:', derivedTargets);
          }
        }
      }
      
      const storedLogs = await AsyncStorage.getItem('nutritionDailyLogs');
      if (storedLogs) {
        const allLogs: Record<string, DailyNutritionData> = JSON.parse(storedLogs);
        if (allLogs[today]) {
          setDailyData(allLogs[today]);
          console.log('[Nutrition] Loaded daily data for', today);
        } else {
          setDailyData({ date: today, entries: [] });
        }
      } else {
        setDailyData({ date: today, entries: [] });
      }

      const storedPlan = await AsyncStorage.getItem('todaysPlan');
      if (storedPlan) {
        const plan = JSON.parse(storedPlan);
        if (plan.date === today) {
          setTodaysPlan(plan.plan);
          console.log('[Nutrition] Loaded today plan');
        } else {
          generateTodaysPlan();
        }
      } else {
        generateTodaysPlan();
      }
    } catch (error) {
      console.error('[Nutrition] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const generateTodaysPlan = () => {
    const balanced = MACRO_MEALS_LIBRARY.filter(m => m.category === 'balanced');
    const highProtein = MACRO_MEALS_LIBRARY.filter(m => m.category === 'high_protein');
    const highCarb = MACRO_MEALS_LIBRARY.filter(m => m.category === 'high_carb');
    
    const plan: TodaysPlan = {
      Breakfast: highCarb[Math.floor(Math.random() * highCarb.length)],
      Lunch: balanced[Math.floor(Math.random() * balanced.length)],
      Dinner: balanced[Math.floor(Math.random() * balanced.length)],
      Snacks: highProtein[Math.floor(Math.random() * highProtein.length)],
    };
    
    setTodaysPlan(plan);
    const today = new Date().toISOString().split('T')[0];
    AsyncStorage.setItem('todaysPlan', JSON.stringify({ date: today, plan }));
    console.log('[Nutrition] Generated new today plan');
  };

  const saveDailyData = async (data: DailyNutritionData) => {
    try {
      const storedLogs = await AsyncStorage.getItem('nutritionDailyLogs');
      const allLogs: Record<string, DailyNutritionData> = storedLogs ? JSON.parse(storedLogs) : {};
      allLogs[data.date] = data;
      await AsyncStorage.setItem('nutritionDailyLogs', JSON.stringify(allLogs));
      console.log('[Nutrition] Saved daily data for', data.date);
    } catch (error) {
      console.error('[Nutrition] Error saving daily data:', error);
    }
  };

  const addEntry = (entry: Omit<NutritionLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: NutritionLogEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    
    const updatedData = {
      ...dailyData,
      entries: [...dailyData.entries, newEntry],
    };
    
    setDailyData(updatedData);
    saveDailyData(updatedData);
    console.log('[Nutrition] Added entry:', newEntry.label, newEntry.kcal, 'kcal');
  };

  const deleteEntry = (id: string) => {
    const updatedData = {
      ...dailyData,
      entries: dailyData.entries.filter(e => e.id !== id),
    };
    
    setDailyData(updatedData);
    saveDailyData(updatedData);
    console.log('[Nutrition] Deleted entry:', id);
  };

  const handlePlanMealTap = (slot: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks') => {
    if (!todaysPlan) return;
    const meal = todaysPlan[slot];
    console.log('[Nutrition] User tapped Today Plan:', slot, meal.label);
    addEntry({
      label: meal.label,
      type: 'macro_meal',
      mealSlot: slot,
      kcal: meal.kcal,
      P: meal.P,
      C: meal.C,
      F: meal.F,
    });
  };

  const handleSwapMeal = (slot: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks') => {
    if (!isPremium) {
      console.log('[Nutrition] User tried to swap (premium feature)');
      setShowPaywallModal(true);
      return;
    }
    console.log('[Nutrition] User tapped Swap for', slot);
    setSwapMealSlot(slot);
    setShowSwapModal(true);
  };

  const confirmSwap = (newMeal: MacroMeal) => {
    if (!todaysPlan) return;
    const updatedPlan = { ...todaysPlan, [swapMealSlot]: newMeal };
    setTodaysPlan(updatedPlan);
    const today = new Date().toISOString().split('T')[0];
    AsyncStorage.setItem('todaysPlan', JSON.stringify({ date: today, plan: updatedPlan }));
    console.log('[Nutrition] Swapped meal for', swapMealSlot, 'to', newMeal.label);
    setShowSwapModal(false);
  };

  const openMealSlot = (slot: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks') => {
    console.log('[Nutrition] User tapped Add to', slot);
    setSelectedMealSlot(slot);
    setShowMealModal(true);
  };

  const getSuggestedMeals = (): MacroMeal[] => {
    const remaining = {
      kcal: targets.calorieGoal - consumed.kcal,
      P: targets.proteinGoal - consumed.P,
      C: targets.carbsGoal - consumed.C,
      F: targets.fatGoal - consumed.F,
    };
    
    let filtered: MacroMeal[] = [];
    
    if (remaining.P > remaining.C && remaining.P > remaining.F) {
      filtered = MACRO_MEALS_LIBRARY.filter(m => m.category === 'high_protein');
    } else if (remaining.C > remaining.P && remaining.C > remaining.F) {
      filtered = MACRO_MEALS_LIBRARY.filter(m => m.category === 'high_carb');
    } else if (remaining.kcal < 400) {
      filtered = MACRO_MEALS_LIBRARY.filter(m => m.category === 'light');
    } else {
      filtered = MACRO_MEALS_LIBRARY.filter(m => m.category === 'balanced');
    }
    
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  };

  const getNextMoveMeals = (): (MacroMeal & { reason: string })[] => {
    const remaining = {
      kcal: targets.calorieGoal - consumed.kcal,
      P: targets.proteinGoal - consumed.P,
      C: targets.carbsGoal - consumed.C,
      F: targets.fatGoal - consumed.F,
    };
    
    const suggestions: (MacroMeal & { reason: string })[] = [];
    
    if (remaining.P > 40) {
      const highProtein = MACRO_MEALS_LIBRARY.filter(m => m.category === 'high_protein' && m.P >= 30);
      if (highProtein.length > 0) {
        const meal = highProtein[Math.floor(Math.random() * highProtein.length)];
        suggestions.push({ ...meal, reason: "You're low on protein" });
      }
    }
    
    if (remaining.C > 50) {
      const highCarb = MACRO_MEALS_LIBRARY.filter(m => m.category === 'high_carb' && m.C >= 40);
      if (highCarb.length > 0) {
        const meal = highCarb[Math.floor(Math.random() * highCarb.length)];
        suggestions.push({ ...meal, reason: "You need more carbs" });
      }
    }
    
    if (remaining.kcal < 400) {
      const light = MACRO_MEALS_LIBRARY.filter(m => m.category === 'light' && m.kcal <= 300);
      if (light.length > 0) {
        const meal = light[Math.floor(Math.random() * light.length)];
        suggestions.push({ ...meal, reason: "Light option for remaining calories" });
      }
    }
    
    while (suggestions.length < 3) {
      const balanced = MACRO_MEALS_LIBRARY.filter(m => m.category === 'balanced');
      const meal = balanced[Math.floor(Math.random() * balanced.length)];
      if (!suggestions.find(s => s.id === meal.id)) {
        suggestions.push({ ...meal, reason: "Balanced macro option" });
      }
    }
    
    return suggestions.slice(0, 3);
  };

  const handleMacroMealSelect = (meal: MacroMeal) => {
    console.log('[Nutrition] User selected Macro Meal:', meal.label);
    addEntry({
      label: meal.label,
      type: 'macro_meal',
      mealSlot: selectedMealSlot,
      kcal: meal.kcal,
      P: meal.P,
      C: meal.C,
      F: meal.F,
    });
    setShowMealModal(false);
  };

  const handleTemplate = (template: typeof TEMPLATES[0]) => {
    console.log('[Nutrition] User selected Template:', template.label);
    addEntry({
      label: template.label,
      type: 'template',
      mealSlot: selectedMealSlot,
      kcal: template.kcal,
      P: template.P,
      C: template.C,
      F: template.F,
    });
    setShowMealModal(false);
  };

  const handleManualAdd = () => {
    const kcal = parseInt(manualKcal) || 0;
    const P = parseInt(manualP) || 0;
    const C = parseInt(manualC) || 0;
    const F = parseInt(manualF) || 0;
    
    if (kcal === 0) return;
    
    const label = manualLabel.trim() || 'Custom Entry';
    
    console.log('[Nutrition] User added Manual entry:', label, kcal, 'kcal');
    addEntry({
      label,
      type: 'manual',
      mealSlot: selectedMealSlot,
      kcal,
      P,
      C,
      F,
    });
    
    setShowMealModal(false);
    setShowManualModal(false);
    setManualKcal('');
    setManualP('');
    setManualC('');
    setManualF('');
    setManualLabel('');
  };

  const saveTargets = async () => {
    try {
      await AsyncStorage.setItem('nutritionTargets', JSON.stringify(targets));
      console.log('[Nutrition] Saved targets:', targets);
      setShowTargetsModal(false);
    } catch (error) {
      console.error('[Nutrition] Error saving targets:', error);
    }
  };

  const handleMealTapForDetails = (meal: MacroMeal) => {
    console.log('[Nutrition] User tapped meal for details:', meal.label);
    setSelectedMealForDetails(meal);
    setShowMealDetailsModal(true);
  };

  const consumed = dailyData.entries.reduce(
    (acc, entry) => ({
      kcal: acc.kcal + entry.kcal,
      P: acc.P + entry.P,
      C: acc.C + entry.C,
      F: acc.F + entry.F,
    }),
    { kcal: 0, P: 0, C: 0, F: 0 }
  );

  const remaining = {
    kcal: Math.max(0, targets.calorieGoal - consumed.kcal),
    P: Math.max(0, targets.proteinGoal - consumed.P),
    C: Math.max(0, targets.carbsGoal - consumed.C),
    F: Math.max(0, targets.fatGoal - consumed.F),
  };

  const getMealEntries = (slot: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks') =>
    dailyData.entries.filter(e => e.mealSlot === slot);

  const consumedKcal = Math.round(consumed.kcal);
  const remainingKcal = Math.round(remaining.kcal);
  const goalKcal = targets.calorieGoal;
  const consumedP = Math.round(consumed.P);
  const consumedC = Math.round(consumed.C);
  const consumedF = Math.round(consumed.F);
  const remainingP = Math.round(remaining.P);
  const remainingC = Math.round(remaining.C);
  const remainingF = Math.round(remaining.F);
  const proteinGoal = targets.proteinGoal;
  const carbsGoal = targets.carbsGoal;
  const fatGoal = targets.fatGoal;
  const proteinPercent = Math.min((consumed.P / targets.proteinGoal) * 100, 100);
  const carbsPercent = Math.min((consumed.C / targets.carbsGoal) * 100, 100);
  const fatPercent = Math.min((consumed.F / targets.fatGoal) * 100, 100);
  const caloriesPercent = Math.min((consumed.kcal / targets.calorieGoal) * 100, 100);

  const nextMoveMeals = getNextMoveMeals();

  const saveDietPreference = async (pref: string) => {
    setDietPreference(pref);
    await AsyncStorage.setItem(DIET_STORAGE_KEY, pref);
    console.log('[Nutrition] User changed diet preference to:', pref);
    setShowDietModal(false);
  };

  const dietLabel = DIET_PREFERENCES.find(d => d.id === dietPreference)?.label || 'None';

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Nutrition</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Nutrition</Text>
            <Text style={styles.subtitle}>Smart macro tracking</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => {
              console.log('[Nutrition] User tapped Edit Targets');
              setShowTargetsModal(true);
            }}
          >
            <IconSymbol
              ios_icon_name="gear"
              android_material_icon_name="settings"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.dietPrefRow}
          onPress={() => {
            console.log('[Nutrition] User tapped Diet Preference selector');
            setShowDietModal(true);
          }}
        >
          <View style={styles.dietPrefLeft}>
            <IconSymbol
              ios_icon_name="leaf.fill"
              android_material_icon_name="eco"
              size={18}
              color={colors.primary}
            />
            <Text style={styles.dietPrefLabel}>Diet Preference</Text>
          </View>
          <View style={styles.dietPrefRight}>
            <Text style={styles.dietPrefValue}>{dietLabel}</Text>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={16}
              color={colors.textSecondary}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.caloriesCard}
          onPress={() => {
            console.log('[Nutrition] User tapped Daily Calories card');
            setShowTimelineModal(true);
          }}
        >
          <Text style={styles.caloriesTitle}>Daily Calories</Text>
          <View style={styles.caloriesRow}>
            <View style={styles.caloriesStat}>
              <Text style={styles.caloriesValue}>{consumedKcal}</Text>
              <Text style={styles.caloriesLabel}>consumed</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.caloriesStat}>
              <Text style={styles.caloriesValue}>{remainingKcal}</Text>
              <Text style={styles.caloriesLabel}>remaining</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.caloriesStat}>
              <Text style={styles.caloriesValue}>{goalKcal}</Text>
              <Text style={styles.caloriesLabel}>goal</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${caloriesPercent}%` }]} />
          </View>
        </TouchableOpacity>

        <View style={styles.macrosCard}>
          <View style={styles.macroRow}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroValue}>{consumedP}g / {proteinGoal}g</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${proteinPercent}%`, backgroundColor: '#ef4444' }]} />
            </View>
            <Text style={styles.macroRemaining}>Remaining: {remainingP}g</Text>
          </View>

          <View style={styles.macroRow}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroValue}>{consumedC}g / {carbsGoal}g</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${carbsPercent}%`, backgroundColor: '#f59e0b' }]} />
            </View>
            <Text style={styles.macroRemaining}>Remaining: {remainingC}g</Text>
          </View>

          <View style={styles.macroRow}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel}>Fat</Text>
              <Text style={styles.macroValue}>{consumedF}g / {fatGoal}g</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${fatPercent}%`, backgroundColor: '#8b5cf6' }]} />
            </View>
            <Text style={styles.macroRemaining}>Remaining: {remainingF}g</Text>
          </View>
        </View>

        {todaysPlan && (
          <View style={styles.section}>
            <View style={styles.planHeader}>
              <Text style={styles.sectionTitle}>Today&apos;s Plan</Text>
              {!isPremium && (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>Free: 1-day</Text>
                </View>
              )}
            </View>
            <View style={styles.planGrid}>
              {(['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const).map((slot) => {
                const meal = todaysPlan[slot];
                const mealKcal = Math.round(meal.kcal);
                const mealP = Math.round(meal.P);
                const mealC = Math.round(meal.C);
                const mealF = Math.round(meal.F);
                
                return (
                  <View key={slot} style={styles.planTile}>
                    <TouchableOpacity
                      style={styles.planTileContent}
                      onPress={() => handleMealTapForDetails(meal)}
                      onLongPress={() => handlePlanMealTap(slot)}
                    >
                      <Text style={styles.planSlot}>{slot}</Text>
                      <Text style={styles.planMeal}>{meal.label}</Text>
                      <Text style={styles.planMacros}>
                        {mealKcal} kcal • P{mealP} C{mealC} F{mealF}
                      </Text>
                      <Text style={styles.tapHint}>Tap for recipe</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.swapButton}
                      onPress={() => handleSwapMeal(slot)}
                    >
                      <IconSymbol
                        ios_icon_name="arrow.2.squarepath"
                        android_material_icon_name="swap-horiz"
                        size={16}
                        color={colors.primary}
                      />
                      <Text style={styles.swapText}>Swap</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.nextMoveCard}>
          <Text style={styles.nextMoveTitle}>Next Move (recommended)</Text>
          <Text style={styles.nextMoveSubtitle}>
            You have {remainingKcal} kcal and {remainingP}g protein left today
          </Text>
          <View style={styles.nextMoveList}>
            {nextMoveMeals.map((meal) => {
              const mealKcal = Math.round(meal.kcal);
              const mealP = Math.round(meal.P);
              const mealC = Math.round(meal.C);
              const mealF = Math.round(meal.F);
              
              return (
                <TouchableOpacity
                  key={meal.id}
                  style={styles.nextMoveItem}
                  onPress={() => handleMealTapForDetails(meal)}
                  onLongPress={() => {
                    console.log('[Nutrition] User long-pressed Next Move meal:', meal.label);
                    addEntry({
                      label: meal.label,
                      type: 'macro_meal',
                      kcal: meal.kcal,
                      P: meal.P,
                      C: meal.C,
                      F: meal.F,
                    });
                  }}
                >
                  <View style={styles.nextMoveInfo}>
                    <Text style={styles.nextMoveMeal}>{meal.label}</Text>
                    <Text style={styles.nextMoveReason}>{meal.reason}</Text>
                    <Text style={styles.nextMoveMacros}>
                      {mealKcal} kcal • P{mealP} C{mealC} F{mealF}
                    </Text>
                  </View>
                  <IconSymbol
                    ios_icon_name="info.circle"
                    android_material_icon_name="info"
                    size={24}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {(['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const).map((slot) => {
          const entries = getMealEntries(slot);
          const hasEntries = entries.length > 0;
          
          return (
            <View key={slot} style={styles.mealSection}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealTitle}>{slot}</Text>
                <TouchableOpacity onPress={() => openMealSlot(slot)}>
                  <IconSymbol
                    ios_icon_name="plus.circle.fill"
                    android_material_icon_name="add-circle"
                    size={28}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
              
              {!hasEntries && (
                <View style={styles.emptyMeal}>
                  <Text style={styles.emptyMealText}>Tap + to log</Text>
                </View>
              )}
              
              {entries.map((entry) => {
                const entryKcal = Math.round(entry.kcal);
                const entryP = Math.round(entry.P);
                const entryC = Math.round(entry.C);
                const entryF = Math.round(entry.F);
                
                return (
                  <View key={entry.id} style={styles.mealEntry}>
                    <View style={styles.mealEntryInfo}>
                      <Text style={styles.mealEntryLabel}>{entry.label}</Text>
                      <Text style={styles.mealEntryMacros}>
                        {entryKcal} kcal • P{entryP} C{entryC} F{entryF}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        console.log('[Nutrition] User deleted entry:', entry.label);
                        deleteEntry(entry.id);
                      }}
                    >
                      <IconSymbol
                        ios_icon_name="trash.fill"
                        android_material_icon_name="delete"
                        size={20}
                        color={colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={showMealDetailsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMealDetailsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedMealForDetails?.label}</Text>
            <TouchableOpacity onPress={() => setShowMealDetailsModal(false)}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="close"
                size={28}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {selectedMealForDetails && (
              <>
                <View style={styles.detailsCard}>
                  <Text style={styles.detailsTitle}>Total Macros</Text>
                  <View style={styles.detailsMacrosRow}>
                    <View style={styles.detailsMacroItem}>
                      <Text style={styles.detailsMacroValue}>{Math.round(selectedMealForDetails.kcal)}</Text>
                      <Text style={styles.detailsMacroLabel}>kcal</Text>
                    </View>
                    <View style={styles.detailsMacroItem}>
                      <Text style={styles.detailsMacroValue}>{Math.round(selectedMealForDetails.P)}g</Text>
                      <Text style={styles.detailsMacroLabel}>Protein</Text>
                    </View>
                    <View style={styles.detailsMacroItem}>
                      <Text style={styles.detailsMacroValue}>{Math.round(selectedMealForDetails.C)}g</Text>
                      <Text style={styles.detailsMacroLabel}>Carbs</Text>
                    </View>
                    <View style={styles.detailsMacroItem}>
                      <Text style={styles.detailsMacroValue}>{Math.round(selectedMealForDetails.F)}g</Text>
                      <Text style={styles.detailsMacroLabel}>Fat</Text>
                    </View>
                  </View>
                </View>

                {selectedMealForDetails.ingredients && selectedMealForDetails.ingredients.length > 0 && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsSectionTitle}>Ingredients</Text>
                    {selectedMealForDetails.ingredients.map((ingredient, index) => {
                      const ingKcal = Math.round(ingredient.kcal);
                      const ingP = Math.round(ingredient.P);
                      const ingC = Math.round(ingredient.C);
                      const ingF = Math.round(ingredient.F);
                      
                      return (
                        <View key={index} style={styles.ingredientItem}>
                          <View style={styles.ingredientHeader}>
                            <Text style={styles.ingredientName}>{ingredient.name}</Text>
                            <Text style={styles.ingredientAmount}>{ingredient.amount}</Text>
                          </View>
                          <Text style={styles.ingredientMacros}>
                            {ingKcal} kcal • P{ingP}g C{ingC}g F{ingF}g
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {selectedMealForDetails.instructions && selectedMealForDetails.instructions.length > 0 && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsSectionTitle}>Instructions</Text>
                    {selectedMealForDetails.instructions.map((instruction, index) => {
                      const stepNumber = index + 1;
                      
                      return (
                        <View key={index} style={styles.instructionItem}>
                          <Text style={styles.instructionNumber}>{stepNumber}</Text>
                          <Text style={styles.instructionText}>{instruction}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {
                    if (selectedMealForDetails) {
                      console.log('[Nutrition] User added meal from details:', selectedMealForDetails.label);
                      addEntry({
                        label: selectedMealForDetails.label,
                        type: 'macro_meal',
                        kcal: selectedMealForDetails.kcal,
                        P: selectedMealForDetails.P,
                        C: selectedMealForDetails.C,
                        F: selectedMealForDetails.F,
                      });
                      setShowMealDetailsModal(false);
                    }
                  }}
                >
                  <Text style={styles.addButtonText}>Add to Today</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showMealModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMealModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add to {selectedMealSlot}</Text>
            <TouchableOpacity onPress={() => setShowMealModal(false)}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="close"
                size={28}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Suggested (fastest)</Text>
              {getSuggestedMeals().map((meal) => {
                const mealKcal = Math.round(meal.kcal);
                const mealP = Math.round(meal.P);
                const mealC = Math.round(meal.C);
                const mealF = Math.round(meal.F);
                
                return (
                  <TouchableOpacity
                    key={meal.id}
                    style={styles.suggestedButton}
                    onPress={() => handleMacroMealSelect(meal)}
                    onLongPress={() => handleMealTapForDetails(meal)}
                  >
                    <View style={styles.suggestedInfo}>
                      <Text style={styles.suggestedLabel}>{meal.label}</Text>
                      <Text style={styles.suggestedMacros}>
                        {mealKcal} kcal • P{mealP} C{mealC} F{mealF}
                      </Text>
                    </View>
                    <IconSymbol
                      ios_icon_name="plus.circle.fill"
                      android_material_icon_name="add-circle"
                      size={24}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Templates</Text>
              {TEMPLATES.map((template) => {
                const templateKcal = Math.round(template.kcal);
                const templateP = Math.round(template.P);
                const templateC = Math.round(template.C);
                const templateF = Math.round(template.F);
                
                return (
                  <TouchableOpacity
                    key={template.id}
                    style={styles.templateButton}
                    onPress={() => handleTemplate(template)}
                  >
                    <View style={styles.templateInfo}>
                      <Text style={styles.templateLabel}>{template.label}</Text>
                      <Text style={styles.templateMacros}>
                        {templateKcal} kcal • P{templateP} C{templateC} F{templateF}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Manual</Text>
              <TouchableOpacity
                style={styles.manualButton}
                onPress={() => {
                  console.log('[Nutrition] User tapped Manual entry');
                  setShowManualModal(true);
                }}
              >
                <Text style={styles.manualButtonText}>Enter custom values</Text>
                <IconSymbol
                  ios_icon_name="pencil.circle.fill"
                  android_material_icon_name="edit"
                  size={24}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showManualModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowManualModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Manual Entry</Text>
            <TouchableOpacity onPress={() => setShowManualModal(false)}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="close"
                size={28}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Label (optional)"
              placeholderTextColor={colors.textSecondary}
              value={manualLabel}
              onChangeText={setManualLabel}
            />
            <TextInput
              style={styles.input}
              placeholder="Calories (kcal)"
              placeholderTextColor={colors.textSecondary}
              value={manualKcal}
              onChangeText={setManualKcal}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Protein (g)"
              placeholderTextColor={colors.textSecondary}
              value={manualP}
              onChangeText={setManualP}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Carbs (g)"
              placeholderTextColor={colors.textSecondary}
              value={manualC}
              onChangeText={setManualC}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Fat (g)"
              placeholderTextColor={colors.textSecondary}
              value={manualF}
              onChangeText={setManualF}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleManualAdd}
            >
              <Text style={styles.addButtonText}>Add Entry</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showSwapModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSwapModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Swap {swapMealSlot}</Text>
            <TouchableOpacity onPress={() => setShowSwapModal(false)}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="close"
                size={28}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {MACRO_MEALS_LIBRARY.map((meal) => {
              const mealKcal = Math.round(meal.kcal);
              const mealP = Math.round(meal.P);
              const mealC = Math.round(meal.C);
              const mealF = Math.round(meal.F);
              
              return (
                <TouchableOpacity
                  key={meal.id}
                  style={styles.swapOption}
                  onPress={() => confirmSwap(meal)}
                  onLongPress={() => handleMealTapForDetails(meal)}
                >
                  <View style={styles.swapInfo}>
                    <Text style={styles.swapLabel}>{meal.label}</Text>
                    <Text style={styles.swapMacros}>
                      {mealKcal} kcal • P{mealP} C{mealC} F{mealF}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showTimelineModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTimelineModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Today Timeline</Text>
            <TouchableOpacity onPress={() => setShowTimelineModal(false)}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="close"
                size={28}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {dailyData.entries.length === 0 && (
              <View style={styles.emptyTimeline}>
                <Text style={styles.emptyTimelineText}>No entries yet today</Text>
              </View>
            )}
            
            {dailyData.entries
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .map((entry) => {
                const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                });
                const entryKcal = Math.round(entry.kcal);
                const entryP = Math.round(entry.P);
                const entryC = Math.round(entry.C);
                const entryF = Math.round(entry.F);
                
                return (
                  <View key={entry.id} style={styles.timelineEntry}>
                    <View style={styles.timelineInfo}>
                      <Text style={styles.timelineLabel}>{entry.label}</Text>
                      <Text style={styles.timelineTime}>{time}</Text>
                      <Text style={styles.timelineMacros}>
                        {entryKcal} kcal • P{entryP} C{entryC} F{entryF}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        console.log('[Nutrition] User deleted entry from timeline:', entry.label);
                        deleteEntry(entry.id);
                      }}
                    >
                      <IconSymbol
                        ios_icon_name="trash.fill"
                        android_material_icon_name="delete"
                        size={20}
                        color={colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showTargetsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTargetsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Targets</Text>
            <TouchableOpacity onPress={() => setShowTargetsModal(false)}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="close"
                size={28}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.inputLabel}>Calorie Goal (kcal)</Text>
            <TextInput
              style={styles.input}
              value={targets.calorieGoal.toString()}
              onChangeText={(text) => setTargets({ ...targets, calorieGoal: parseInt(text) || 0 })}
              keyboardType="numeric"
            />
            
            <Text style={styles.inputLabel}>Protein Goal (g)</Text>
            <TextInput
              style={styles.input}
              value={targets.proteinGoal.toString()}
              onChangeText={(text) => setTargets({ ...targets, proteinGoal: parseInt(text) || 0 })}
              keyboardType="numeric"
            />
            
            <Text style={styles.inputLabel}>Carbs Goal (g)</Text>
            <TextInput
              style={styles.input}
              value={targets.carbsGoal.toString()}
              onChangeText={(text) => setTargets({ ...targets, carbsGoal: parseInt(text) || 0 })}
              keyboardType="numeric"
            />
            
            <Text style={styles.inputLabel}>Fat Goal (g)</Text>
            <TextInput
              style={styles.input}
              value={targets.fatGoal.toString()}
              onChangeText={(text) => setTargets({ ...targets, fatGoal: parseInt(text) || 0 })}
              keyboardType="numeric"
            />
            
            <TouchableOpacity
              style={styles.addButton}
              onPress={saveTargets}
            >
              <Text style={styles.addButtonText}>Save Targets</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showDietModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDietModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Diet Preference</Text>
            <TouchableOpacity onPress={() => setShowDietModal(false)}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="close"
                size={28}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {DIET_PREFERENCES.map((pref) => {
              const isSelected = dietPreference === pref.id;
              return (
                <TouchableOpacity
                  key={pref.id}
                  style={[styles.dietOption, isSelected && styles.dietOptionSelected]}
                  onPress={() => saveDietPreference(pref.id)}
                >
                  <Text style={[styles.dietOptionText, isSelected && styles.dietOptionTextSelected]}>
                    {pref.label}
                  </Text>
                  {isSelected && (
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check-circle"
                      size={22}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showPaywallModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowPaywallModal(false)}
      >
        <View style={styles.paywallOverlay}>
          <View style={styles.paywallCard}>
            <IconSymbol
              ios_icon_name="star.fill"
              android_material_icon_name="star"
              size={48}
              color={colors.warning}
            />
            <Text style={styles.paywallTitle}>Premium Feature</Text>
            <Text style={styles.paywallText}>
              Unlock unlimited meal swaps, weekly meal plans, grocery lists, and more with Premium.
            </Text>
            <TouchableOpacity
              style={styles.paywallButton}
              onPress={() => {
                console.log('[Nutrition] User tapped Upgrade to Premium');
                setShowPaywallModal(false);
                router.push('/shop');
              }}
            >
              <Text style={styles.paywallButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.paywallClose}
              onPress={() => setShowPaywallModal(false)}
            >
              <Text style={styles.paywallCloseText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  caloriesCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  caloriesTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  caloriesStat: {
    flex: 1,
    alignItems: 'center',
  },
  caloriesValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  caloriesLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 8,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  macrosCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    gap: 20,
  },
  macroRow: {
    gap: 8,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  macroRemaining: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  freeBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  freeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
  },
  planGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  planTile: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  planTileContent: {
    padding: 12,
  },
  planSlot: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  planMeal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  planMacros: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  tapHint: {
    fontSize: 9,
    color: colors.primary,
    fontStyle: 'italic',
  },
  swapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    borderTopWidth: 1,
    borderTopColor: colors.primary,
  },
  swapText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  nextMoveCard: {
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
  },
  nextMoveTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  nextMoveSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  nextMoveList: {
    gap: 12,
  },
  nextMoveItem: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextMoveInfo: {
    flex: 1,
  },
  nextMoveMeal: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  nextMoveReason: {
    fontSize: 11,
    color: colors.primary,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  nextMoveMacros: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  mealSection: {
    marginBottom: 20,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  emptyMeal: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
  },
  emptyMealText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  mealEntry: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealEntryInfo: {
    flex: 1,
  },
  mealEntryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  mealEntryMacros: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 48 : 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  modalSection: {
    marginBottom: 32,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  detailsCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  detailsMacrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailsMacroItem: {
    alignItems: 'center',
  },
  detailsMacroValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  detailsMacroLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  ingredientItem: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  ingredientAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  ingredientMacros: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  instructionItem: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  instructionNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    width: 24,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  suggestedButton: {
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestedInfo: {
    flex: 1,
  },
  suggestedLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  suggestedMacros: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  templateButton: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  templateInfo: {
    flex: 1,
  },
  templateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  templateMacros: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  manualButton: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  swapOption: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  swapInfo: {
    flex: 1,
  },
  swapLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  swapMacros: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyTimeline: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTimelineText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  timelineEntry: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineInfo: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  timelineTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  timelineMacros: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  paywallOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  paywallCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  paywallTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  paywallText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  paywallButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  dietPrefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  dietPrefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dietPrefLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  dietPrefRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dietPrefValue: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  dietOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  dietOptionSelected: {
    borderBottomColor: colors.primary + '40',
  },
  dietOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  dietOptionTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  paywallButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  paywallClose: {
    paddingVertical: 12,
  },
  paywallCloseText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
