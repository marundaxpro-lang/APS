
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  LayoutAnimation,
  UIManager,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { authenticatedPut } from '@/utils/api';
import {
  FoodItem,
  MealTemplate,
  MealLog,
  DailyNutrition,
  QUICK_FOODS,
  DEFAULT_MEAL_TEMPLATES,
  getProteinStatus,
  getDailyNutrition,
  logMealFromTemplate,
  logFoodItem,
  logFoodItems,
  getFrequentTemplates,
  getNutritionFeedback,
  MEAL_TYPE_LABELS,
  ProteinStatus,
  getMealIdeas,
  MealIdea,
  MealContext,
} from '@/utils/nutritionEngine';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Theme ────────────────────────────────────────────────────────────────────

const TEAL = '#00D4AA';
const TEAL_DIM = 'rgba(0,212,170,0.10)';
const TEAL_BORDER = 'rgba(0,212,170,0.22)';
const ORANGE = '#FF8C42';
const BLUE = '#60A5FA';
const YELLOW = '#F59E0B';
const RED = '#EF4444';
const CARD_BG = '#161616';
const CARD_BORDER = 'rgba(255,255,255,0.06)';
const SCREEN_BG = '#0A0A0A';
const TEXT_PRIMARY = '#F0F0F0';
const TEXT_SECONDARY = '#888';
const TEXT_MUTED = 'rgba(255,255,255,0.28)';
const DIVIDER = 'rgba(255,255,255,0.05)';
const INSET_BG = 'rgba(255,255,255,0.03)';

const STORAGE_KEYS = {
  MEAL_LOGS: 'apex_meal_logs',
  MEAL_TEMPLATES: 'apex_meal_templates',
  NUTRITION_TARGETS: 'apex_nutrition_targets',
} as const;

const DIET_LABELS: Record<string, string> = {
  'standard': '🍽️ Standard',
  'balanced': '⚖️ Balanced',
  'high-protein': '🥩 High Protein',
  'low-carb': '🥑 Low Carb',
  'vegan': '🌱 Vegan',
  'vegetarian': '🥦 Vegetarian',
  'keto': '🔥 Keto',
  'paleo': '🦴 Paleo',
  'mediterranean': '🫒 Mediterranean',
};

// ─── Diet-specific meal sets ──────────────────────────────────────────────────

interface DietMeal {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const DIET_MEALS: Record<string, DietMeal[]> = {
  standard: [
    { name: 'Chicken Breast & Rice', calories: 480, protein: 42, carbs: 52, fat: 8 },
    { name: 'Brown Rice Bowl', calories: 360, protein: 12, carbs: 68, fat: 5 },
    { name: 'Mixed Vegetables Stir-fry', calories: 220, protein: 8, carbs: 28, fat: 9 },
    { name: 'Scrambled Eggs', calories: 280, protein: 22, carbs: 2, fat: 20 },
    { name: 'Oats with Banana', calories: 340, protein: 10, carbs: 62, fat: 6 },
  ],
  balanced: [
    { name: 'Chicken Breast & Rice', calories: 480, protein: 42, carbs: 52, fat: 8 },
    { name: 'Brown Rice Bowl', calories: 360, protein: 12, carbs: 68, fat: 5 },
    { name: 'Mixed Vegetables Stir-fry', calories: 220, protein: 8, carbs: 28, fat: 9 },
    { name: 'Scrambled Eggs', calories: 280, protein: 22, carbs: 2, fat: 20 },
    { name: 'Oats with Banana', calories: 340, protein: 10, carbs: 62, fat: 6 },
  ],
  'high-protein': [
    { name: 'Grilled Chicken Breast', calories: 320, protein: 58, carbs: 0, fat: 8 },
    { name: 'Greek Yogurt & Berries', calories: 220, protein: 20, carbs: 24, fat: 4 },
    { name: 'Tuna Salad', calories: 280, protein: 40, carbs: 6, fat: 10 },
    { name: 'Protein Oats', calories: 380, protein: 32, carbs: 44, fat: 8 },
    { name: 'Egg White Omelette', calories: 240, protein: 36, carbs: 4, fat: 6 },
  ],
  'low-carb': [
    { name: 'Grilled Salmon', calories: 380, protein: 42, carbs: 0, fat: 22 },
    { name: 'Avocado & Egg Bowl', calories: 340, protein: 18, carbs: 8, fat: 28 },
    { name: 'Chicken Caesar Salad', calories: 320, protein: 36, carbs: 6, fat: 16 },
    { name: 'Beef & Broccoli', calories: 360, protein: 38, carbs: 10, fat: 18 },
    { name: 'Zucchini Noodles & Meatballs', calories: 300, protein: 32, carbs: 12, fat: 14 },
  ],
  vegetarian: [
    { name: 'Tofu Scramble', calories: 280, protein: 22, carbs: 14, fat: 16 },
    { name: 'Quinoa Bowl', calories: 380, protein: 16, carbs: 58, fat: 10 },
    { name: 'Lentil Soup', calories: 320, protein: 18, carbs: 48, fat: 6 },
    { name: 'Greek Yogurt Parfait', calories: 260, protein: 18, carbs: 32, fat: 6 },
    { name: 'Veggie Stir-fry', calories: 300, protein: 14, carbs: 42, fat: 10 },
  ],
  vegan: [
    { name: 'Tempeh Bowl', calories: 360, protein: 28, carbs: 38, fat: 12 },
    { name: 'Chickpea Curry', calories: 400, protein: 18, carbs: 56, fat: 12 },
    { name: 'Smoothie Bowl', calories: 320, protein: 10, carbs: 58, fat: 8 },
    { name: 'Avocado Toast', calories: 280, protein: 8, carbs: 32, fat: 16 },
    { name: 'Black Bean Tacos', calories: 380, protein: 16, carbs: 52, fat: 12 },
  ],
  keto: [
    { name: 'Bacon & Eggs', calories: 420, protein: 28, carbs: 2, fat: 34 },
    { name: 'Avocado Salad', calories: 340, protein: 8, carbs: 8, fat: 30 },
    { name: 'Salmon with Butter', calories: 460, protein: 42, carbs: 0, fat: 32 },
    { name: 'Cheese Omelette', calories: 380, protein: 26, carbs: 2, fat: 30 },
    { name: 'Beef Stir-fry', calories: 440, protein: 38, carbs: 6, fat: 28 },
  ],
  paleo: [
    { name: 'Grilled Chicken', calories: 360, protein: 48, carbs: 0, fat: 16 },
    { name: 'Sweet Potato & Beef', calories: 440, protein: 36, carbs: 38, fat: 14 },
    { name: 'Mixed Nuts & Fruit', calories: 280, protein: 8, carbs: 28, fat: 18 },
    { name: 'Fruit Salad', calories: 180, protein: 2, carbs: 44, fat: 1 },
    { name: 'Grass-fed Beef Bowl', calories: 480, protein: 44, carbs: 12, fat: 26 },
  ],
  mediterranean: [
    { name: 'Grilled Fish & Veggies', calories: 380, protein: 40, carbs: 18, fat: 16 },
    { name: 'Hummus & Veggie Plate', calories: 280, protein: 12, carbs: 32, fat: 14 },
    { name: 'Falafel Wrap', calories: 420, protein: 16, carbs: 52, fat: 18 },
    { name: 'Greek Salad', calories: 240, protein: 8, carbs: 18, fat: 16 },
    { name: 'Olive Oil Pasta', calories: 460, protein: 14, carbs: 68, fat: 16 },
  ],
};

const DEFAULT_TARGETS = { calories: 2200, protein: 175, carbs: 220, fat: 70 };

type MealType = MealLog['mealType'];

const FOUR_MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function statusColor(status: ProteinStatus['status']): string {
  if (status === 'achieved' || status === 'on_track') return TEAL;
  if (status === 'behind') return ORANGE;
  return RED;
}

function currentMealType(): MealType {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 14) return 'lunch';
  if (h < 19) return 'dinner';
  return 'snack';
}

// ─── Animated Progress Bar ────────────────────────────────────────────────────

function SlimBar({ fraction, color }: { fraction: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(1, Math.max(0, fraction)),
      duration: 600,
      useNativeDriver: false,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fraction]);
  return (
    <View style={barS.track}>
      <Animated.View
        style={[
          barS.fill,
          {
            backgroundColor: color,
            width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </View>
  );
}

const barS = StyleSheet.create({
  track: { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 99 },
});

// ─── Staggered List Item ──────────────────────────────────────────────────────

function AnimatedItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: index * 50, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

// ─── Macro Pill ───────────────────────────────────────────────────────────────

function MacroPill({
  label,
  logged,
  goal,
  color,
}: {
  label: string;
  logged: number;
  goal: number;
  color: string;
}) {
  const fraction = goal > 0 ? logged / goal : 0;
  const loggedRounded = Math.round(logged);
  const goalRounded = Math.round(goal);
  const loggedStr = String(loggedRounded);
  const goalStr = String(goalRounded);

  return (
    <View style={pillS.pill}>
      <Text style={[pillS.label, { color }]}>{label}</Text>
      <View style={pillS.nums}>
        <Text style={pillS.logged}>{loggedStr}</Text>
        <Text style={pillS.sep}>/</Text>
        <Text style={pillS.goal}>{goalStr}g</Text>
      </View>
      <SlimBar fraction={fraction} color={color} />
    </View>
  );
}

const pillS = StyleSheet.create({
  pill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  nums: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  logged: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  sep: { fontSize: 11, color: TEXT_MUTED },
  goal: { fontSize: 11, color: TEXT_SECONDARY },
});

// ─── Meal Row ─────────────────────────────────────────────────────────────────

function MealRow({
  mealType,
  logs,
  isEaten,
  onMarkEaten,
  onSwap,
  onAdd,
}: {
  mealType: MealType;
  logs: MealLog[];
  isEaten: boolean;
  onMarkEaten: () => void;
  onSwap: () => void;
  onAdd: () => void;
}) {
  const label = MEAL_TYPE_LABELS[mealType];
  const hasContent = logs.length > 0;
  const totalCal = logs.reduce((s, l) => s + l.totalCalories, 0);
  const firstItemName = hasContent ? logs[0].items[0]?.name ?? 'Logged meal' : '';
  const calStr = String(Math.round(totalCal));

  return (
    <View style={mealRowS.row}>
      <View style={mealRowS.left}>
        <Text style={[mealRowS.mealLabel, isEaten && mealRowS.mealLabelEaten]}>{label}</Text>
        {hasContent ? (
          <View style={mealRowS.contentLine}>
            <Text style={mealRowS.foodName} numberOfLines={1}>{firstItemName}</Text>
            <Text style={mealRowS.dot}> · </Text>
            <Text style={mealRowS.cal}>{calStr} kcal</Text>
          </View>
        ) : (
          <Text style={mealRowS.empty}>—</Text>
        )}
      </View>
      <View style={mealRowS.actions}>
        {hasContent ? (
          <>
            <AnimatedPressable
              style={[mealRowS.pill, isEaten && mealRowS.pillEaten]}
              onPress={() => {
                console.log('[Nutrition] User marked meal as eaten:', label);
                onMarkEaten();
              }}
            >
              <Text style={[mealRowS.pillText, isEaten && mealRowS.pillTextEaten]}>
                {isEaten ? '✓' : '✓ Eaten'}
              </Text>
            </AnimatedPressable>
            {!isEaten && (
              <AnimatedPressable
                style={mealRowS.pillGhost}
                onPress={() => {
                  console.log('[Nutrition] User tapped Swap for meal:', label);
                  onSwap();
                }}
              >
                <Text style={mealRowS.pillGhostText}>↕ Swap</Text>
              </AnimatedPressable>
            )}
          </>
        ) : (
          <AnimatedPressable
            style={mealRowS.addBtn}
            onPress={() => {
              console.log('[Nutrition] User tapped Add for meal:', label);
              onAdd();
            }}
          >
            <Text style={mealRowS.addBtnText}>+ Add</Text>
          </AnimatedPressable>
        )}
      </View>
    </View>
  );
}

const mealRowS = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  left: { flex: 1, gap: 3 },
  mealLabel: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY },
  mealLabelEaten: { color: TEXT_SECONDARY },
  contentLine: { flexDirection: 'row', alignItems: 'center' },
  foodName: { fontSize: 12, color: TEXT_SECONDARY, flexShrink: 1 },
  dot: { fontSize: 11, color: TEXT_MUTED },
  cal: { fontSize: 12, color: TEXT_SECONDARY },
  empty: { fontSize: 13, color: TEXT_MUTED },
  actions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  pill: {
    backgroundColor: TEAL_DIM,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: TEAL_BORDER,
  },
  pillEaten: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pillText: { fontSize: 11, fontWeight: '600', color: TEAL },
  pillTextEaten: { color: TEXT_MUTED },
  pillGhost: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  pillGhostText: { fontSize: 11, fontWeight: '500', color: TEXT_SECONDARY },
  addBtn: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  addBtnText: { fontSize: 11, fontWeight: '500', color: TEXT_SECONDARY },
});

// ─── Next-Up Suggestion Row ───────────────────────────────────────────────────

function SuggestionRow({
  idea,
  onLog,
}: {
  idea: MealIdea;
  onLog: () => void;
}) {
  const calStr = String(idea.calories);
  return (
    <View style={sugS.row}>
      <View style={sugS.left}>
        <Text style={sugS.name} numberOfLines={1}>{idea.name}</Text>
        <Text style={sugS.cal}>{calStr} kcal</Text>
      </View>
      <AnimatedPressable
        style={sugS.logBtn}
        onPress={() => {
          console.log('[Nutrition] User tapped + Log suggestion:', idea.name);
          onLog();
        }}
      >
        <Text style={sugS.logBtnText}>+ Log</Text>
      </AnimatedPressable>
    </View>
  );
}

const sugS = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  left: { flex: 1, gap: 2 },
  name: { fontSize: 13, fontWeight: '500', color: TEXT_PRIMARY },
  cal: { fontSize: 11, color: TEXT_MUTED },
  logBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  logBtnText: { fontSize: 11, fontWeight: '600', color: TEXT_SECONDARY },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NutritionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [allLogs, setAllLogs] = useState<Record<string, MealLog[]>>({});
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [loaded, setLoaded] = useState(false);
  const [eatenMeals, setEatenMeals] = useState<Set<MealType>>(new Set());
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [dietPreference, setDietPreference] = useState<string>('balanced');
  const [dietMeals, setDietMeals] = useState<DietMeal[]>(DIET_MEALS['balanced']);
  const [swappedMealIndices, setSwappedMealIndices] = useState<Record<number, number>>({});

  const today = todayStr();
  const hour = new Date().getHours();
  const todayLogs: MealLog[] = useMemo(() => allLogs[today] ?? [], [allLogs, today]);

  // ── Load ──
  useEffect(() => {
    async function load() {
      console.log('[Nutrition] Loading data from AsyncStorage');
      try {
        const [logsRaw, tplRaw, targetsRaw, profileRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.MEAL_LOGS),
          AsyncStorage.getItem(STORAGE_KEYS.MEAL_TEMPLATES),
          AsyncStorage.getItem(STORAGE_KEYS.NUTRITION_TARGETS),
          AsyncStorage.getItem('fitnessProfile'),
        ]);

        const savedLogs: Record<string, MealLog[]> = logsRaw ? JSON.parse(logsRaw) : {};
        setAllLogs(savedLogs);

        const savedTpls: MealTemplate[] = tplRaw ? JSON.parse(tplRaw) : [];
        const savedIds = new Set(savedTpls.map((t) => t.id));
        const merged = [
          ...savedTpls,
          ...DEFAULT_MEAL_TEMPLATES.filter((t) => !savedIds.has(t.id)),
        ];
        setTemplates(merged);

        if (targetsRaw) setTargets(JSON.parse(targetsRaw));

        // Load diet preference from local profile
        let loadedDiet = 'balanced';
        if (profileRaw) {
          const localProfile = JSON.parse(profileRaw);
          if (localProfile.dietPreference) {
            loadedDiet = localProfile.dietPreference;
            setDietPreference(localProfile.dietPreference);
            console.log('[Nutrition] Loaded diet preference from AsyncStorage:', localProfile.dietPreference);
          }
        }

        // Fetch backend profile for diet_preference
        try {
          const { authenticatedGet } = await import('@/utils/api');
          const backendProfile = await authenticatedGet<any>('/api/profile');
          if (backendProfile?.diet_preference) {
            loadedDiet = backendProfile.diet_preference;
            setDietPreference(backendProfile.diet_preference);
            console.log('[Nutrition] Loaded diet preference from backend:', backendProfile.diet_preference);
          }
        } catch (profileErr) {
          console.log('[Nutrition] Could not fetch backend profile for diet preference:', profileErr);
        }

        // Apply diet meals for loaded preference
        const meals = DIET_MEALS[loadedDiet] || DIET_MEALS['balanced'];
        setDietMeals(meals);
        console.log('[Nutrition] Applied diet meals for:', loadedDiet, '—', meals.length, 'meals');

        console.log('[Nutrition] Loaded', Object.keys(savedLogs).length, 'log days,', merged.length, 'templates');
      } catch (e) {
        console.error('[Nutrition] Load error:', e);
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, []);

  // ── Derived ──
  const daily: DailyNutrition = useMemo(
    () => getDailyNutrition(todayLogs, targets),
    [todayLogs, targets]
  );

  const proteinStatus: ProteinStatus = useMemo(
    () => getProteinStatus(daily.totalProtein, targets.protein, hour, true),
    [daily.totalProtein, targets.protein, hour]
  );

  const logsByMealType = useMemo(() => {
    const map: Partial<Record<MealType, MealLog[]>> = {};
    for (const log of todayLogs) {
      if (!map[log.mealType]) map[log.mealType] = [];
      map[log.mealType]!.push(log);
    }
    return map;
  }, [todayLogs]);

  const mealContext: MealContext = useMemo(
    () => ({
      hour,
      proteinRemaining: Math.max(0, targets.protein - daily.totalProtein),
      caloriesRemaining: Math.max(0, targets.calories - daily.totalCalories),
      carbsRemaining: Math.max(0, targets.carbs - daily.totalCarbs),
      fatRemaining: Math.max(0, targets.fat - daily.totalFat),
      hadWorkoutToday: false,
      workoutWasThisMorning: false,
    }),
    [hour, targets, daily]
  );

  const mealIdeas: MealIdea[] = useMemo(
    () => getMealIdeas(mealContext, templates),
    [mealContext, templates]
  );

  const visibleSuggestions = useMemo(
    () => mealIdeas.filter((i) => !dismissedSuggestions.has(i.id)).slice(0, 3),
    [mealIdeas, dismissedSuggestions]
  );

  // ── Next uncompleted meal ──
  const nextMeal = useMemo((): MealType => {
    const current = currentMealType();
    const idx = FOUR_MEALS.indexOf(current);
    for (let i = idx; i < FOUR_MEALS.length; i++) {
      if (!eatenMeals.has(FOUR_MEALS[i])) return FOUR_MEALS[i];
    }
    return FOUR_MEALS[FOUR_MEALS.length - 1];
  }, [eatenMeals]);

  // ── Save diet preference ──
  const saveDietPreference = useCallback(async (value: string) => {
    console.log('[Nutrition] User selected diet preference:', value);
    setDietPreference(value);
    const meals = DIET_MEALS[value] || DIET_MEALS['balanced'];
    setDietMeals(meals);
    setSwappedMealIndices({});
    console.log('[Nutrition] Diet meals updated for:', value, '—', meals.length, 'meals');
    try {
      // Persist to AsyncStorage
      const profileRaw = await AsyncStorage.getItem('fitnessProfile');
      const profile = profileRaw ? JSON.parse(profileRaw) : {};
      profile.dietPreference = value;
      await AsyncStorage.setItem('fitnessProfile', JSON.stringify(profile));
      console.log('[Nutrition] Diet preference saved to AsyncStorage:', value);
      // Persist to backend
      await authenticatedPut('/api/profile', { diet_preference: value });
      console.log('[Nutrition] Diet preference saved to backend:', value);
    } catch (e) {
      console.error('[Nutrition] Error saving diet preference:', e);
    }
  }, []);

  // ── Persist ──
  const saveLogs = useCallback(async (newLogs: Record<string, MealLog[]>) => {
    await AsyncStorage.setItem(STORAGE_KEYS.MEAL_LOGS, JSON.stringify(newLogs));
  }, []);

  const saveTemplates = useCallback(async (newTpls: MealTemplate[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.MEAL_TEMPLATES, JSON.stringify(newTpls));
  }, []);

  // ── Actions ──
  const logFood = useCallback(
    async (food: FoodItem, mealType: MealType = 'snack') => {
      console.log('[Nutrition] Logging food item:', food.name, 'for meal:', mealType);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const newLog = logFoodItem(food, today, mealType);
      const updatedLogs = { ...allLogs, [today]: [...(allLogs[today] ?? []), newLog] };
      setAllLogs(updatedLogs);
      await saveLogs(updatedLogs);
    },
    [allLogs, today, saveLogs]
  );

  const logMealIdea = useCallback(
    async (idea: MealIdea) => {
      console.log('[Nutrition] Logging meal idea:', idea.name);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const newLog = logFoodItems(idea.items, today, idea.mealType === 'post_workout' ? 'post_workout' : idea.mealType);
      const updatedLogs = { ...allLogs, [today]: [...(allLogs[today] ?? []), newLog] };
      setAllLogs(updatedLogs);
      await saveLogs(updatedLogs);
      setDismissedSuggestions((prev) => new Set([...prev, idea.id]));
    },
    [allLogs, today, saveLogs]
  );

  const logTemplate = useCallback(
    async (template: MealTemplate) => {
      console.log('[Nutrition] Logging template:', template.name);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const newLog = logMealFromTemplate(template, today);
      const updatedLogs = { ...allLogs, [today]: [...(allLogs[today] ?? []), newLog] };
      setAllLogs(updatedLogs);
      await saveLogs(updatedLogs);
      const updatedTpls = templates.map((t) =>
        t.id === template.id ? { ...t, useCount: t.useCount + 1, lastUsed: today } : t
      );
      setTemplates(updatedTpls);
      await saveTemplates(updatedTpls);
    },
    [allLogs, templates, today, saveLogs, saveTemplates]
  );

  const markEaten = useCallback((mealType: MealType) => {
    console.log('[Nutrition] User marked meal eaten:', mealType);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEatenMeals((prev) => {
      const next = new Set(prev);
      if (next.has(mealType)) {
        next.delete(mealType);
      } else {
        next.add(mealType);
      }
      return next;
    });
  }, []);

  // ── Meal swap with free-user limit ──
  const handleSwapDietMeal = useCallback(async (mealIndex: number) => {
    console.log('[Nutrition] User tapped swap on diet meal index:', mealIndex);
    const today = todayStr();
    const swapKey = `mealSwaps_${today}`;
    try {
      const raw = await AsyncStorage.getItem(swapKey);
      const count = raw ? parseInt(raw, 10) : 0;
      const FREE_LIMIT = 3;
      if (count >= FREE_LIMIT) {
        const { Alert } = await import('react-native');
        Alert.alert(
          'Swap Limit Reached',
          "You've used your 3 free swaps today. Upgrade to Pro for unlimited swaps.",
          [{ text: 'OK' }]
        );
        console.log('[Nutrition] Swap limit reached for today:', count);
        return;
      }
      const meals = DIET_MEALS[dietPreference] || DIET_MEALS['balanced'];
      const currentIdx = swappedMealIndices[mealIndex] ?? mealIndex;
      const nextIdx = (currentIdx + 1) % meals.length;
      setSwappedMealIndices((prev) => ({ ...prev, [mealIndex]: nextIdx }));
      await AsyncStorage.setItem(swapKey, String(count + 1));
      console.log('[Nutrition] Diet meal swapped, new index:', nextIdx, 'swaps today:', count + 1);
    } catch (e) {
      console.error('[Nutrition] Error handling meal swap:', e);
    }
  }, [dietPreference, swappedMealIndices]);

  const handleSwap = useCallback(
    (mealType: MealType) => {
      console.log('[Nutrition] User tapped Swap for meal:', mealType);
      const swapTemplate = templates.find((t) => t.mealType === mealType);
      if (swapTemplate) logTemplate(swapTemplate);
    },
    [templates, logTemplate]
  );

  const handleAdd = useCallback(
    (mealType: MealType) => {
      console.log('[Nutrition] User tapped Add for meal:', mealType);
      const addTemplate = templates.find((t) => t.mealType === mealType);
      if (addTemplate) logTemplate(addTemplate);
    },
    [templates, logTemplate]
  );

  // ── Display values ──
  const caloriesEaten = Math.round(daily.totalCalories);
  const caloriesGoal = targets.calories;
  const caloriesRemaining = Math.max(0, caloriesGoal - caloriesEaten);
  const calFraction = caloriesGoal > 0 ? caloriesEaten / caloriesGoal : 0;
  const pColor = statusColor(proteinStatus.status);

  const caloriesRemainingStr = caloriesRemaining.toLocaleString();
  const caloriesEatenStr = caloriesEaten.toLocaleString();
  const caloriesGoalStr = caloriesGoal.toLocaleString();

  const nextMealLabel = MEAL_TYPE_LABELS[nextMeal];

  const frequentTemplates = useMemo(() => getFrequentTemplates(templates), [templates]);

  if (!loaded) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.loadingState}>
          <Text style={s.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <AnimatedPressable
            onPress={() => {
              console.log('[Nutrition] User pressed back');
              router.back();
            }}
            style={s.backBtn}
          >
            <Text style={s.backArrow}>‹</Text>
          </AnimatedPressable>
          <Text style={s.headerTitle}>Nutrition</Text>
          <View style={s.headerRight} />
        </View>

        {/* ── Hero Card ── */}
        <AnimatedItem index={0}>
          <View style={s.heroCard}>
            {/* Calories remaining */}
            <View style={s.heroTop}>
              <View style={s.heroCalBlock}>
                <Text style={s.heroNumber}>{caloriesRemainingStr}</Text>
                <Text style={s.heroLabel}>Calories remaining</Text>
                <Text style={s.heroSub}>
                  {caloriesEatenStr} eaten · {caloriesGoalStr} goal
                </Text>
              </View>
              {/* Diet preference chip — tappable to cycle through options */}
              <TouchableOpacity
                style={s.dietChip}
                onPress={() => {
                  const options = ['balanced', 'high-protein', 'low-carb', 'vegan', 'vegetarian', 'keto'];
                  const currentIdx = options.indexOf(dietPreference);
                  const nextVal = options[(currentIdx + 1) % options.length];
                  console.log('[Nutrition] User tapped diet chip, cycling to:', nextVal);
                  saveDietPreference(nextVal);
                }}
              >
                <Text style={s.dietChipText}>{DIET_LABELS[dietPreference] ?? dietPreference}</Text>
              </TouchableOpacity>
            </View>

            {/* Calorie bar */}
            <View style={s.calBarWrap}>
              <SlimBar fraction={calFraction} color={TEAL} />
            </View>

            {/* Macro pills */}
            <View style={s.macroPills}>
              <MacroPill
                label="Protein"
                logged={daily.totalProtein}
                goal={targets.protein}
                color={pColor}
              />
              <MacroPill
                label="Carbs"
                logged={daily.totalCarbs}
                goal={targets.carbs}
                color={BLUE}
              />
              <MacroPill
                label="Fat"
                logged={daily.totalFat}
                goal={targets.fat}
                color={YELLOW}
              />
            </View>
          </View>
        </AnimatedItem>

        {/* ── Today's Meals ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Today</Text>

          <View style={s.mealsCard}>
            {FOUR_MEALS.map((mealType, idx) => {
              const logs = logsByMealType[mealType] ?? [];
              const isEaten = eatenMeals.has(mealType);
              const isNextUp = mealType === nextMeal && !isEaten;

              return (
                <AnimatedItem key={mealType} index={idx + 1}>
                  <View>
                    {idx > 0 && <View style={s.divider} />}
                    <MealRow
                      mealType={mealType}
                      logs={logs}
                      isEaten={isEaten}
                      onMarkEaten={() => markEaten(mealType)}
                      onSwap={() => handleSwap(mealType)}
                      onAdd={() => handleAdd(mealType)}
                    />

                    {/* Next-Up inline block */}
                    {isNextUp && visibleSuggestions.length > 0 && (
                      <View style={s.nextUpBlock}>
                        <Text style={s.nextUpHeader}>
                          Next up · {nextMealLabel}
                        </Text>
                        {visibleSuggestions.map((idea) => (
                          <SuggestionRow
                            key={idea.id}
                            idea={idea}
                            onLog={() => logMealIdea(idea)}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                </AnimatedItem>
              );
            })}
          </View>
        </View>

        {/* ── Diet Meal Plan ── */}
        <AnimatedItem index={5}>
          <View style={s.section}>
            <Text style={s.sectionTitle}>Your Meal Plan</Text>
            <View style={s.mealsCard}>
              {FOUR_MEALS.map((mealType, idx) => {
                const mealIdx = swappedMealIndices[idx] ?? idx;
                const meal = dietMeals[mealIdx % dietMeals.length];
                const mealLabel = MEAL_TYPE_LABELS[mealType];
                const mealCalStr = String(meal.calories);
                const mealProteinStr = String(meal.protein);
                return (
                  <View key={mealType}>
                    {idx > 0 && <View style={s.divider} />}
                    <View style={s.dietMealRow}>
                      <View style={s.dietMealLeft}>
                        <Text style={s.dietMealType}>{mealLabel}</Text>
                        <Text style={s.dietMealName} numberOfLines={1}>{meal.name}</Text>
                        <Text style={s.dietMealMeta}>{mealCalStr} kcal · {mealProteinStr}g protein</Text>
                      </View>
                      <TouchableOpacity
                        style={s.dietMealSwapBtn}
                        onPress={() => {
                          console.log('[Nutrition] User tapped swap on diet meal:', mealLabel);
                          handleSwapDietMeal(idx);
                        }}
                      >
                        <Text style={s.dietMealSwapText}>↕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </AnimatedItem>

        {/* ── Quick Log (frequent templates) ── */}
        {frequentTemplates.length > 0 && (
          <AnimatedItem index={6}>
            <View style={s.section}>
              <Text style={s.sectionTitle}>Quick log</Text>
              <View style={s.mealsCard}>
                {frequentTemplates.slice(0, 4).map((tpl, idx) => {
                  const calStr = String(tpl.totalCalories);
                  const proteinStr = String(Math.round(tpl.totalProtein));
                  return (
                    <View key={tpl.id}>
                      {idx > 0 && <View style={s.divider} />}
                      <View style={s.quickRow}>
                        <View style={s.quickLeft}>
                          <Text style={s.quickName} numberOfLines={1}>{tpl.name}</Text>
                          <Text style={s.quickMeta}>{calStr} kcal · {proteinStr}g protein</Text>
                        </View>
                        <AnimatedPressable
                          style={s.quickLogBtn}
                          onPress={() => {
                            console.log('[Nutrition] User tapped quick log template:', tpl.name);
                            logTemplate(tpl);
                          }}
                        >
                          <Text style={s.quickLogBtnText}>Log</Text>
                        </AnimatedPressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </AnimatedItem>
        )}

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SCREEN_BG },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, color: TEXT_MUTED },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  backArrow: { fontSize: 24, color: TEXT_PRIMARY, lineHeight: 28, marginTop: -2 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  headerRight: { width: 36 },

  // Hero card
  heroCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    gap: 16,
    marginBottom: 24,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroCalBlock: { gap: 4 },
  heroNumber: {
    fontSize: 44,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -1.5,
    lineHeight: 48,
  },
  heroLabel: { fontSize: 12, color: TEXT_SECONDARY, fontWeight: '500' },
  heroSub: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  dietChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginTop: 4,
  },
  dietChipText: { fontSize: 11, color: TEXT_SECONDARY, fontWeight: '500' },
  calBarWrap: { marginTop: -4 },
  macroPills: { flexDirection: 'row', gap: 8 },

  // Section
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
    marginBottom: 12,
  },

  // Meals card
  mealsCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
  },

  // Next-up block
  nextUpBlock: {
    backgroundColor: INSET_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  nextUpHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: TEAL,
    letterSpacing: 0.4,
    marginBottom: 2,
  },

  // Diet meal plan
  dietMealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  dietMealLeft: { flex: 1, gap: 3 },
  dietMealType: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 0.8, textTransform: 'uppercase' },
  dietMealName: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY },
  dietMealMeta: { fontSize: 11, color: TEXT_SECONDARY },
  dietMealSwapBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dietMealSwapText: { fontSize: 16, color: TEXT_SECONDARY },

  // Quick log
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  quickLeft: { flex: 1, gap: 3 },
  quickName: { fontSize: 14, fontWeight: '500', color: TEXT_PRIMARY },
  quickMeta: { fontSize: 11, color: TEXT_MUTED },
  quickLogBtn: {
    backgroundColor: TEAL_DIM,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: TEAL_BORDER,
  },
  quickLogBtnText: { fontSize: 12, fontWeight: '600', color: TEAL },
});
