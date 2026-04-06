
// ─── Nutrition Engine ─────────────────────────────────────────────────────────
// IMPORTANT: All calculations use metric units internally (kg, cm).
// Weight must be in kg, height must be in cm. Convert at UI boundaries only.

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

// ── BMI calculation ────────────────────────────────────────────────────────────
// Both params must be metric: weightKg in kg, heightCm in cm.

export function calculateBMI(weightKg: number, heightCm: number): number {
  const w = Number(weightKg);
  const h = Number(heightCm);
  if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return 0;
  const heightM = h / 100;
  return w / (heightM * heightM);
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
const peanutButter = QUICK_FOODS.find(f => f.id === 'qf-peanut-butter')!;
const cottage = QUICK_FOODS.find(f => f.id === 'qf-cottage')!;
const riceCakes = QUICK_FOODS.find(f => f.id === 'qf-rice-cakes')!;

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

export function logFoodItems(foods: FoodItem[], date: string, mealType: MealLog['mealType'] = 'snack'): MealLog {
  const totalCalories = foods.reduce((s, f) => s + f.calories, 0);
  const totalProtein = foods.reduce((s, f) => s + f.protein, 0);
  const totalCarbs = foods.reduce((s, f) => s + f.carbs, 0);
  const totalFat = foods.reduce((s, f) => s + f.fat, 0);
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    date,
    mealType,
    items: foods,
    loggedAt: new Date().toISOString(),
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
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

// ── Nutrition Rescue System ────────────────────────────────────────────────────

export type NutritionIssue =
  | 'behind_protein'
  | 'over_calories'
  | 'under_calories'
  | 'low_carbs'
  | 'low_fat'
  | 'on_track';

export interface RescueSuggestion {
  id: string;
  title: string;
  subtitle: string;
  proteinImpact: number;
  calorieImpact: number;
  effort: 'instant' | 'quick' | 'moderate';
  foodItems: FoodItem[];
}

export interface NutritionRescue {
  issue: NutritionIssue;
  severity: 'critical' | 'moderate' | 'minor' | 'none';
  headline: string;
  explanation: string;
  suggestions: RescueSuggestion[];
  quickLogItems: FoodItem[];
}

export function detectNutritionIssues(
  daily: DailyNutrition,
  hour: number,
  hadWorkoutToday: boolean
): NutritionIssue[] {
  const issues: NutritionIssue[] = [];

  const proteinRatio = daily.proteinTarget > 0 ? daily.totalProtein / daily.proteinTarget : 1;
  const calRatio = daily.caloriesTarget > 0 ? daily.totalCalories / daily.caloriesTarget : 1;
  const carbRatio = daily.carbsTarget > 0 ? daily.totalCarbs / daily.carbsTarget : 1;
  const fatRatio = daily.fatTarget > 0 ? daily.totalFat / daily.fatTarget : 1;

  const behindProtein =
    (hour >= 15 && proteinRatio < 0.6) || (hour >= 19 && proteinRatio < 0.8);
  if (behindProtein) issues.push('behind_protein');

  if (calRatio > 1.1) issues.push('over_calories');

  const underCalories =
    (hour >= 15 && calRatio < 0.4) || (hour >= 19 && calRatio < 0.6);
  if (underCalories) issues.push('under_calories');

  if (hadWorkoutToday && carbRatio < 0.4) issues.push('low_carbs');

  if (fatRatio < 0.3) issues.push('low_fat');

  return issues;
}

export function getNutritionRescue(
  daily: DailyNutrition,
  hour: number,
  hadWorkoutToday: boolean
): NutritionRescue {
  const issues = detectNutritionIssues(daily, hour, hadWorkoutToday);

  // Priority order: protein > calories > carbs > fat
  const priorityOrder: NutritionIssue[] = [
    'behind_protein',
    'over_calories',
    'under_calories',
    'low_carbs',
    'low_fat',
  ];

  const topIssue = priorityOrder.find(i => issues.includes(i)) ?? 'on_track';

  if (topIssue === 'on_track') {
    return {
      issue: 'on_track',
      severity: 'none',
      headline: "You're on track",
      explanation: 'Nutrition is looking good today.',
      suggestions: [],
      quickLogItems: [],
    };
  }

  const proteinRemaining = Math.max(0, daily.proteinTarget - daily.totalProtein);
  const calRemaining = Math.max(0, daily.caloriesTarget - daily.totalCalories);

  if (topIssue === 'behind_protein') {
    const severity = hour >= 19 && daily.totalProtein / daily.proteinTarget < 0.6 ? 'critical' : 'moderate';
    return {
      issue: 'behind_protein',
      severity,
      headline: `You're ${Math.round(proteinRemaining)}g short on protein`,
      explanation: `Protein synthesis requires consistent intake throughout the day. ${hour >= 19 ? 'Evening is your last window to close the gap.' : 'Getting ahead now prevents a bigger deficit later.'}`,
      suggestions: [
        {
          id: 'rs-shake',
          title: 'Protein shake',
          subtitle: '+33g protein · 270 cal · instant',
          proteinImpact: 33,
          calorieImpact: 270,
          effort: 'instant',
          foodItems: [whey, milk],
        },
        {
          id: 'rs-yogurt-almonds',
          title: 'Greek yogurt + almonds',
          subtitle: '+23g protein · 270 cal · instant',
          proteinImpact: 23,
          calorieImpact: 270,
          effort: 'instant',
          foodItems: [greekYogurt, almonds],
        },
        {
          id: 'rs-tuna-rice',
          title: 'Tuna on rice cakes',
          subtitle: '+31g protein · 220 cal · 5 min',
          proteinImpact: 31,
          calorieImpact: 220,
          effort: 'quick',
          foodItems: [tuna, riceCakes],
        },
        {
          id: 'rs-chicken',
          title: 'Chicken breast (pre-cooked)',
          subtitle: '+31g protein · 165 cal · 5 min',
          proteinImpact: 31,
          calorieImpact: 165,
          effort: 'quick',
          foodItems: [chicken],
        },
      ],
      quickLogItems: [whey, greekYogurt, tuna],
    };
  }

  if (topIssue === 'over_calories') {
    const over = Math.round(daily.totalCalories - daily.caloriesTarget);
    return {
      issue: 'over_calories',
      severity: over > 300 ? 'critical' : 'moderate',
      headline: `You're ${over} cal over your target`,
      explanation: 'You\'ve exceeded your calorie target. Focus on lean protein for the rest of the day to minimise the surplus.',
      suggestions: [
        {
          id: 'rs-skip-snack',
          title: 'Skip the evening snack',
          subtitle: '-180 cal · no effort needed',
          proteinImpact: 0,
          calorieImpact: -180,
          effort: 'instant',
          foodItems: [],
        },
        {
          id: 'rs-light-dinner',
          title: 'Light protein dinner',
          subtitle: '+31g protein · 200 cal · cook',
          proteinImpact: 31,
          calorieImpact: 200,
          effort: 'moderate',
          foodItems: [chicken],
        },
        {
          id: 'rs-shake-water',
          title: 'Protein shake only',
          subtitle: '+25g protein · 120 cal · instant',
          proteinImpact: 25,
          calorieImpact: 120,
          effort: 'instant',
          foodItems: [whey],
        },
      ],
      quickLogItems: [chicken, whey, greekYogurt],
    };
  }

  if (topIssue === 'under_calories') {
    return {
      issue: 'under_calories',
      severity: 'moderate',
      headline: `You're ${Math.round(calRemaining)} cal under target`,
      explanation: 'Eating too little can slow recovery and reduce training performance. Add a balanced meal or snack now.',
      suggestions: [
        {
          id: 'rs-balanced-meal',
          title: 'Add a balanced meal',
          subtitle: '+32g protein · 480 cal · cook',
          proteinImpact: 32,
          calorieImpact: 480,
          effort: 'moderate',
          foodItems: [chicken, rice, avocado],
        },
        {
          id: 'rs-protein-carb',
          title: 'Protein + carb snack',
          subtitle: '+35g protein · 420 cal · 5 min',
          proteinImpact: 35,
          calorieImpact: 420,
          effort: 'quick',
          foodItems: [oats, whey],
        },
        {
          id: 'rs-pb-banana',
          title: 'Peanut butter + banana',
          subtitle: '+9g protein · 295 cal · instant',
          proteinImpact: 9,
          calorieImpact: 295,
          effort: 'instant',
          foodItems: [peanutButter, banana],
        },
      ],
      quickLogItems: [chicken, oats, peanutButter],
    };
  }

  if (topIssue === 'low_carbs') {
    return {
      issue: 'low_carbs',
      severity: 'minor',
      headline: 'Low carbs after a workout day',
      explanation: 'Carbohydrates replenish glycogen stores after training. Refuelling now supports recovery and tomorrow\'s performance.',
      suggestions: [
        {
          id: 'rs-rice-banana',
          title: 'Refuel with carbs',
          subtitle: '+5g protein · 300 cal · 5 min',
          proteinImpact: 5,
          calorieImpact: 300,
          effort: 'quick',
          foodItems: [rice, banana],
        },
        {
          id: 'rs-oats-whey',
          title: 'Oats with protein',
          subtitle: '+35g protein · 420 cal · 5 min',
          proteinImpact: 35,
          calorieImpact: 420,
          effort: 'quick',
          foodItems: [oats, whey],
        },
      ],
      quickLogItems: [rice, banana, oats],
    };
  }

  // low_fat
  return {
    issue: 'low_fat',
    severity: 'minor',
    headline: 'Fat intake is low today',
    explanation: 'Dietary fat supports hormone production and nutrient absorption. Add a healthy fat source to your next meal.',
    suggestions: [
      {
        id: 'rs-avocado',
        title: 'Add avocado',
        subtitle: '+1g protein · 120 cal · instant',
        proteinImpact: 1,
        calorieImpact: 120,
        effort: 'instant',
        foodItems: [avocado],
      },
      {
        id: 'rs-almonds',
        title: 'Handful of almonds',
        subtitle: '+6g protein · 170 cal · instant',
        proteinImpact: 6,
        calorieImpact: 170,
        effort: 'instant',
        foodItems: [almonds],
      },
    ],
    quickLogItems: [avocado, almonds, peanutButter],
  };
}

// ── Meal Idea Suggestion Engine ────────────────────────────────────────────────

export type MealContext = {
  hour: number;
  proteinRemaining: number;
  caloriesRemaining: number;
  carbsRemaining: number;
  fatRemaining: number;
  hadWorkoutToday: boolean;
  workoutWasThisMorning: boolean;
  preferenceTag?: 'quick' | 'high-protein' | 'light' | 'filling' | 'meal-prep';
};

export interface MealIdea {
  id: string;
  name: string;
  description: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'post_workout';
  prepTime: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items: FoodItem[];
  tags: string[];
  matchScore: number;
  matchReason: string;
}

const HARDCODED_MEAL_IDEAS: Omit<MealIdea, 'matchScore' | 'matchReason'>[] = [
  {
    id: 'idea-post-workout-shake',
    name: 'Post-Workout Shake',
    description: 'Whey protein blended with banana and milk for fast recovery.',
    mealType: 'post_workout',
    prepTime: 10,
    calories: 375,
    protein: 34,
    carbs: 42,
    fat: 10,
    items: [whey, banana, milk],
    tags: ['post-workout', 'quick', 'high-protein'],
  },
  {
    id: 'idea-tuna-bowl',
    name: 'Quick Tuna Bowl',
    description: 'Tuna over rice with avocado — high protein, balanced macros.',
    mealType: 'lunch',
    prepTime: 10,
    calories: 403,
    protein: 34,
    carbs: 43,
    fat: 14,
    items: [tuna, rice, avocado],
    tags: ['high-protein', 'quick', 'lunch'],
  },
  {
    id: 'idea-egg-scramble',
    name: 'Egg White Scramble',
    description: 'Scrambled eggs with cottage cheese for a lean protein breakfast.',
    mealType: 'breakfast',
    prepTime: 8,
    calories: 238,
    protein: 23,
    carbs: 5,
    fat: 14,
    items: [eggs, cottage],
    tags: ['breakfast', 'high-protein', 'quick'],
  },
  {
    id: 'idea-bedtime-protein',
    name: 'Bedtime Protein',
    description: 'Greek yogurt with almonds — slow-digesting protein for overnight recovery.',
    mealType: 'snack',
    prepTime: 2,
    calories: 270,
    protein: 23,
    carbs: 12,
    fat: 16,
    items: [greekYogurt, almonds],
    tags: ['snack', 'quick', 'high-protein'],
  },
  {
    id: 'idea-light-protein-dinner',
    name: 'Light Protein Dinner',
    description: 'Chicken breast with sweet potato — lean and filling.',
    mealType: 'dinner',
    prepTime: 20,
    calories: 295,
    protein: 34,
    carbs: 30,
    fat: 4,
    items: [chicken, sweetPotato],
    tags: ['dinner', 'high-protein', 'meal-prep'],
  },
  {
    id: 'idea-macro-shake',
    name: 'Macro Shake',
    description: 'Whey protein blended with oats and milk — a complete macro shake.',
    mealType: 'snack',
    prepTime: 3,
    calories: 470,
    protein: 33,
    carbs: 57,
    fat: 8,
    items: [whey, oats, milk],
    tags: ['snack', 'filling', 'high-protein'],
  },
  {
    id: 'idea-salmon-rice',
    name: 'Salmon & Rice',
    description: 'Salmon fillet over white rice — omega-3 rich dinner.',
    mealType: 'dinner',
    prepTime: 15,
    calories: 403,
    protein: 24,
    carbs: 43,
    fat: 13,
    items: [salmon, rice],
    tags: ['dinner', 'omega-3', 'high-protein'],
  },
  {
    id: 'idea-overnight-oats',
    name: 'Overnight Oats',
    description: 'Oats with Greek yogurt and banana — prep the night before.',
    mealType: 'breakfast',
    prepTime: 5,
    calories: 505,
    protein: 28,
    carbs: 87,
    fat: 7,
    items: [oats, greekYogurt, banana],
    tags: ['breakfast', 'meal-prep', 'filling'],
  },
];

export function getMealIdeas(context: MealContext, _templates: MealTemplate[]): MealIdea[] {
  const ideas: MealIdea[] = HARDCODED_MEAL_IDEAS.map(idea => {
    let score = 0;
    let topReason = '';

    // Protein gap
    if (idea.protein >= context.proteinRemaining * 0.5) {
      score += 30;
      topReason = 'Closes your protein gap';
    }

    // Calorie budget
    if (idea.calories <= context.caloriesRemaining * 1.1) {
      score += 20;
      if (!topReason) topReason = 'Fits your calorie budget';
    }

    // Post-workout bonus
    if (context.hadWorkoutToday && idea.tags.includes('post-workout')) {
      score += 15;
      topReason = 'Perfect for post-workout recovery';
    }

    // Meal timing
    if (context.hour < 10 && idea.mealType === 'breakfast') {
      score += 10;
      if (!topReason) topReason = 'Great breakfast option';
    }
    if (context.hour >= 11 && context.hour < 15 && idea.mealType === 'lunch') {
      score += 10;
      if (!topReason) topReason = 'Ideal for lunch';
    }
    if (context.hour >= 17 && idea.mealType === 'dinner') {
      score += 10;
      if (!topReason) topReason = 'Good dinner choice';
    }
    if (context.hour >= 15 && context.hour < 17 && idea.mealType === 'snack') {
      score += 10;
      if (!topReason) topReason = 'Perfect afternoon snack';
    }

    // Penalty: too many calories
    if (idea.calories > context.caloriesRemaining * 1.3) {
      score -= 20;
    }

    // Penalty: low protein
    if (idea.protein < 10) {
      score -= 10;
    }

    // Preference tag bonus
    if (context.preferenceTag && idea.tags.includes(context.preferenceTag)) {
      score += 5;
    }

    if (!topReason) topReason = 'Balanced option for your goals';

    return {
      ...idea,
      matchScore: Math.max(0, score),
      matchReason: topReason,
    };
  });

  return ideas.sort((a, b) => b.matchScore - a.matchScore).slice(0, 6);
}
