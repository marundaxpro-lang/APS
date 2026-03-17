
// ─── Nutrition Engine ─────────────────────────────────────────────────────────

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  category: 'protein' | 'carb' | 'fat' | 'mixed' | 'drink' | 'snack';
}

export interface MealTemplate {
  id: string;
  name: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout';
  items: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  lastUsed?: string;
  useCount: number;
  isFavorite: boolean;
  tags: string[];
}

export interface MealLog {
  id: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout';
  templateId?: string;
  items: FoodItem[];
  loggedAt: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface DailyNutrition {
  date: string;
  meals: MealLog[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  caloriesTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
}

// ── Default food database ──────────────────────────────────────────────────────

export const QUICK_FOODS: FoodItem[] = [
  // Proteins
  { id: 'qf-chicken', name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 4, servingSize: '100g', category: 'protein' },
  { id: 'qf-eggs', name: 'Eggs (x2)', calories: 140, protein: 12, carbs: 1, fat: 10, servingSize: '2 eggs', category: 'protein' },
  { id: 'qf-greek-yogurt', name: 'Greek Yogurt', calories: 100, protein: 17, carbs: 6, fat: 1, servingSize: '170g', category: 'protein' },
  { id: 'qf-whey', name: 'Whey Protein', calories: 120, protein: 25, carbs: 3, fat: 2, servingSize: '1 scoop', category: 'protein' },
  { id: 'qf-tuna', name: 'Tuna (can)', calories: 150, protein: 30, carbs: 0, fat: 3, servingSize: '1 can', category: 'protein' },
  { id: 'qf-salmon', name: 'Salmon', calories: 208, protein: 20, carbs: 0, fat: 13, servingSize: '100g', category: 'protein' },
  { id: 'qf-cottage', name: 'Cottage Cheese', calories: 98, protein: 11, carbs: 4, fat: 4, servingSize: '100g', category: 'protein' },
  { id: 'qf-beef', name: 'Beef Mince', calories: 215, protein: 26, carbs: 0, fat: 12, servingSize: '100g', category: 'protein' },
  { id: 'qf-turkey', name: 'Turkey Breast', calories: 135, protein: 30, carbs: 0, fat: 1, servingSize: '100g', category: 'protein' },
  // Carbs
  { id: 'qf-oats', name: 'Oats', calories: 300, protein: 10, carbs: 54, fat: 6, servingSize: '80g', category: 'carb' },
  { id: 'qf-rice', name: 'White Rice', calories: 195, protein: 4, carbs: 43, fat: 0, servingSize: '150g cooked', category: 'carb' },
  { id: 'qf-sweet-potato', name: 'Sweet Potato', calories: 130, protein: 3, carbs: 30, fat: 0, servingSize: '150g', category: 'carb' },
  { id: 'qf-banana', name: 'Banana', calories: 105, protein: 1, carbs: 27, fat: 0, servingSize: '1 medium', category: 'carb' },
  { id: 'qf-bread', name: 'Bread Slice', calories: 80, protein: 3, carbs: 15, fat: 1, servingSize: '1 slice', category: 'carb' },
  { id: 'qf-pasta', name: 'Pasta', calories: 220, protein: 8, carbs: 43, fat: 1, servingSize: '150g cooked', category: 'carb' },
  // Fats
  { id: 'qf-avocado', name: 'Avocado', calories: 120, protein: 1, carbs: 6, fat: 11, servingSize: 'half', category: 'fat' },
  { id: 'qf-peanut-butter', name: 'Peanut Butter', calories: 190, protein: 8, carbs: 6, fat: 16, servingSize: '2 tbsp', category: 'fat' },
  { id: 'qf-almonds', name: 'Almonds', calories: 170, protein: 6, carbs: 6, fat: 15, servingSize: '30g', category: 'fat' },
  // Mixed
  { id: 'qf-protein-bar', name: 'Protein Bar', calories: 200, protein: 20, carbs: 22, fat: 7, servingSize: '1 bar', category: 'mixed' },
  { id: 'qf-mixed-nuts', name: 'Mixed Nuts', calories: 180, protein: 5, carbs: 8, fat: 16, servingSize: '30g', category: 'mixed' },
  // Drinks
  { id: 'qf-protein-shake', name: 'Protein Shake', calories: 150, protein: 30, carbs: 5, fat: 2, servingSize: '300ml', category: 'drink' },
  { id: 'qf-milk', name: 'Milk', calories: 150, protein: 8, carbs: 12, fat: 8, servingSize: '250ml', category: 'drink' },
  { id: 'qf-coffee', name: 'Black Coffee', calories: 5, protein: 0, carbs: 1, fat: 0, servingSize: '1 cup', category: 'drink' },
  // Snacks
  { id: 'qf-apple', name: 'Apple', calories: 80, protein: 0, carbs: 21, fat: 0, servingSize: '1 medium', category: 'snack' },
  { id: 'qf-rice-cakes', name: 'Rice Cakes', calories: 70, protein: 1, carbs: 15, fat: 0, servingSize: '2 cakes', category: 'snack' },
  { id: 'qf-dark-choc', name: 'Dark Chocolate', calories: 110, protein: 1, carbs: 13, fat: 7, servingSize: '20g', category: 'snack' },
];

// ── Default meal templates ─────────────────────────────────────────────────────

const greekYogurt = QUICK_FOODS.find(f => f.id === 'qf-greek-yogurt')!;
const oats = QUICK_FOODS.find(f => f.id === 'qf-oats')!;
const banana = QUICK_FOODS.find(f => f.id === 'qf-banana')!;
const eggs = QUICK_FOODS.find(f => f.id === 'qf-eggs')!;
const chicken = QUICK_FOODS.find(f => f.id === 'qf-chicken')!;
const rice = QUICK_FOODS.find(f => f.id === 'qf-rice')!;
const avocado = QUICK_FOODS.find(f => f.id === 'qf-avocado')!;
const tuna = QUICK_FOODS.find(f => f.id === 'qf-tuna')!;
const bread = QUICK_FOODS.find(f => f.id === 'qf-bread')!;
const beef = QUICK_FOODS.find(f => f.id === 'qf-beef')!;
const sweetPotato = QUICK_FOODS.find(f => f.id === 'qf-sweet-potato')!;
const salmon = QUICK_FOODS.find(f => f.id === 'qf-salmon')!;
const whey = QUICK_FOODS.find(f => f.id === 'qf-whey')!;
const milk = QUICK_FOODS.find(f => f.id === 'qf-milk')!;
const almonds = QUICK_FOODS.find(f => f.id === 'qf-almonds')!;

export const DEFAULT_MEAL_TEMPLATES: MealTemplate[] = [
  {
    id: 'tpl-morning-bowl',
    name: 'Morning Protein Bowl',
    mealType: 'breakfast',
    items: [greekYogurt, oats, banana],
    totalCalories: greekYogurt.calories + oats.calories + banana.calories,
    totalProtein: greekYogurt.protein + oats.protein + banana.protein,
    totalCarbs: greekYogurt.carbs + oats.carbs + banana.carbs,
    totalFat: greekYogurt.fat + oats.fat + banana.fat,
    useCount: 0,
    isFavorite: false,
    tags: ['high-protein', 'quick', 'breakfast'],
  },
  {
    id: 'tpl-egg-oats',
    name: 'Egg & Oats',
    mealType: 'breakfast',
    items: [eggs, oats],
    totalCalories: eggs.calories + oats.calories,
    totalProtein: eggs.protein + oats.protein,
    totalCarbs: eggs.carbs + oats.carbs,
    totalFat: eggs.fat + oats.fat,
    useCount: 0,
    isFavorite: false,
    tags: ['quick', 'breakfast', 'meal-prep'],
  },
  {
    id: 'tpl-chicken-rice',
    name: 'Chicken & Rice',
    mealType: 'lunch',
    items: [chicken, rice, avocado],
    totalCalories: chicken.calories + rice.calories + avocado.calories,
    totalProtein: chicken.protein + rice.protein + avocado.protein,
    totalCarbs: chicken.carbs + rice.carbs + avocado.carbs,
    totalFat: chicken.fat + rice.fat + avocado.fat,
    useCount: 0,
    isFavorite: false,
    tags: ['high-protein', 'meal-prep', 'lunch'],
  },
  {
    id: 'tpl-tuna-salad',
    name: 'Tuna Salad',
    mealType: 'lunch',
    items: [tuna, bread, bread],
    totalCalories: tuna.calories + bread.calories * 2,
    totalProtein: tuna.protein + bread.protein * 2,
    totalCarbs: tuna.carbs + bread.carbs * 2,
    totalFat: tuna.fat + bread.fat * 2,
    useCount: 0,
    isFavorite: false,
    tags: ['quick', 'high-protein', 'lunch'],
  },
  {
    id: 'tpl-beef-sweet-potato',
    name: 'Beef & Sweet Potato',
    mealType: 'dinner',
    items: [beef, sweetPotato],
    totalCalories: beef.calories + sweetPotato.calories,
    totalProtein: beef.protein + sweetPotato.protein,
    totalCarbs: beef.carbs + sweetPotato.carbs,
    totalFat: beef.fat + sweetPotato.fat,
    useCount: 0,
    isFavorite: false,
    tags: ['high-protein', 'dinner', 'meal-prep'],
  },
  {
    id: 'tpl-salmon-rice',
    name: 'Salmon & Rice',
    mealType: 'dinner',
    items: [salmon, rice],
    totalCalories: salmon.calories + rice.calories,
    totalProtein: salmon.protein + rice.protein,
    totalCarbs: salmon.carbs + rice.carbs,
    totalFat: salmon.fat + rice.fat,
    useCount: 0,
    isFavorite: false,
    tags: ['omega-3', 'dinner', 'high-protein'],
  },
  {
    id: 'tpl-post-workout-shake',
    name: 'Post-Workout Shake',
    mealType: 'post_workout',
    items: [whey, banana, milk],
    totalCalories: whey.calories + banana.calories + milk.calories,
    totalProtein: whey.protein + banana.protein + milk.protein,
    totalCarbs: whey.carbs + banana.carbs + milk.carbs,
    totalFat: whey.fat + banana.fat + milk.fat,
    useCount: 0,
    isFavorite: false,
    tags: ['post-workout', 'quick', 'high-protein'],
  },
  {
    id: 'tpl-protein-snack',
    name: 'Protein Snack',
    mealType: 'snack',
    items: [greekYogurt, almonds],
    totalCalories: greekYogurt.calories + almonds.calories,
    totalProtein: greekYogurt.protein + almonds.protein,
    totalCarbs: greekYogurt.carbs + almonds.carbs,
    totalFat: greekYogurt.fat + almonds.fat,
    useCount: 0,
    isFavorite: false,
    tags: ['snack', 'high-protein', 'quick'],
  },
];

// ── Protein guidance ───────────────────────────────────────────────────────────

export interface ProteinStatus {
  logged: number;
  target: number;
  remaining: number;
  percentage: number;
  status: 'critical' | 'behind' | 'on_track' | 'achieved';
  quickFixes: FoodItem[];
  message: string;
  trainingConnection: string;
}

export function getProteinStatus(
  logged: number,
  target: number,
  hour: number,
  hasWorkoutToday: boolean
): ProteinStatus {
  const remaining = Math.max(0, target - logged);
  const percentage = target > 0 ? Math.min(100, Math.round((logged / target) * 100)) : 0;

  let status: ProteinStatus['status'];
  if (percentage >= 100) {
    status = 'achieved';
  } else if (percentage >= 70) {
    status = 'on_track';
  } else if (percentage < 30 || (percentage < 50 && hour >= 17)) {
    status = 'critical';
  } else {
    status = 'behind';
  }

  const proteinFoods = QUICK_FOODS.filter(f => f.category === 'protein')
    .sort((a, b) => b.protein - a.protein)
    .slice(0, 3);

  let message: string;
  if (status === 'critical') {
    if (hour < 12) {
      message = 'Start strong — front-load your protein early.';
    } else if (hour < 17) {
      message = 'You\'re behind on protein. Add a high-protein meal now.';
    } else {
      message = `Critical: only ${logged}g logged. Add a protein shake before bed.`;
    }
  } else if (status === 'behind') {
    message = `You're ${remaining}g away from your target. One more protein meal will do it.`;
  } else if (status === 'on_track') {
    message = 'On track. Keep it up through the evening.';
  } else {
    message = 'Protein target hit. Great work.';
  }

  let trainingConnection: string;
  if (hasWorkoutToday && (status === 'critical' || status === 'behind')) {
    trainingConnection = 'Protein is essential for today\'s session. Log it before you train.';
  } else if (hasWorkoutToday && (status === 'on_track' || status === 'achieved')) {
    trainingConnection = 'Well fuelled for today\'s workout.';
  } else {
    trainingConnection = 'Recovery day — protein supports muscle repair even on rest days.';
  }

  return {
    logged,
    target,
    remaining,
    percentage,
    status,
    quickFixes: proteinFoods,
    message,
    trainingConnection,
  };
}

// ── Daily nutrition summary ────────────────────────────────────────────────────

export function getDailyNutrition(
  logs: MealLog[],
  targets: { calories: number; protein: number; carbs: number; fat: number }
): DailyNutrition {
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(l => l.date === today);

  const totalCalories = todayLogs.reduce((s, l) => s + l.totalCalories, 0);
  const totalProtein = todayLogs.reduce((s, l) => s + l.totalProtein, 0);
  const totalCarbs = todayLogs.reduce((s, l) => s + l.totalCarbs, 0);
  const totalFat = todayLogs.reduce((s, l) => s + l.totalFat, 0);

  return {
    date: today,
    meals: todayLogs,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    caloriesTarget: targets.calories,
    proteinTarget: targets.protein,
    carbsTarget: targets.carbs,
    fatTarget: targets.fat,
  };
}

// ── Meal template helpers ──────────────────────────────────────────────────────

export function logMealFromTemplate(template: MealTemplate, date: string): MealLog {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    date,
    mealType: template.mealType,
    templateId: template.id,
    items: template.items,
    loggedAt: new Date().toISOString(),
    totalCalories: template.totalCalories,
    totalProtein: template.totalProtein,
    totalCarbs: template.totalCarbs,
    totalFat: template.totalFat,
  };
}

export function logFoodItem(food: FoodItem, date: string): MealLog {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    date,
    mealType: 'snack',
    items: [food],
    loggedAt: new Date().toISOString(),
    totalCalories: food.calories,
    totalProtein: food.protein,
    totalCarbs: food.carbs,
    totalFat: food.fat,
  };
}

export function getFrequentTemplates(templates: MealTemplate[]): MealTemplate[] {
  return [...templates]
    .sort((a, b) => {
      if (b.useCount !== a.useCount) return b.useCount - a.useCount;
      if (a.lastUsed && b.lastUsed) return b.lastUsed.localeCompare(a.lastUsed);
      if (a.lastUsed) return -1;
      if (b.lastUsed) return 1;
      return 0;
    })
    .slice(0, 5);
}

export function getFavoriteTemplates(templates: MealTemplate[]): MealTemplate[] {
  return templates.filter(t => t.isFavorite);
}

export function searchTemplates(templates: MealTemplate[], query: string): MealTemplate[] {
  const q = query.toLowerCase().trim();
  if (!q) return templates;
  return templates.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.toLowerCase().includes(q))
  );
}

export function getNutritionFeedback(daily: DailyNutrition, hour: number): string {
  const calPct = daily.caloriesTarget > 0 ? daily.totalCalories / daily.caloriesTarget : 0;
  const proteinPct = daily.proteinTarget > 0 ? daily.totalProtein / daily.proteinTarget : 0;

  if (calPct < 0.4 && hour > 14) {
    return "You've barely eaten today. Log your meals to stay on track.";
  }
  if (proteinPct < 0.5 && hour > 16) {
    return 'Protein is low — add a high-protein meal or shake.';
  }
  if (calPct > 1.1) {
    return "You've exceeded your calorie target today.";
  }
  if (proteinPct >= 1.0 && calPct >= 0.9 && calPct <= 1.1) {
    return 'Solid nutrition day. Well done.';
  }
  return 'Keep logging to stay aligned with your goals.';
}

export const MEAL_TYPE_LABELS: Record<MealLog['mealType'], string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  pre_workout: 'Pre-Workout',
  post_workout: 'Post-Workout',
};
