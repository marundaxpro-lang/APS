
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { FitnessProfile } from '@/types/fitness';

interface MacroMeal {
  id: string;
  label: string;
  kcal: number;
  P: number;
  C: number;
  F: number;
  category: 'high_protein' | 'high_carb' | 'balanced' | 'light';
  ingredients: Array<{ name: string; amount: string; kcal: number; P: number; C: number; F: number }>;
  instructions: string[];
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
      { name: 'Honey', amount: '10g', kcal: 30, P: 0, C: 8, F: 0 },
    ],
    instructions: [
      'Add skyr to a bowl',
      'Mix in whey protein powder until smooth',
      'Top with fresh or frozen berries',
      'Drizzle with honey',
      'Enjoy immediately',
    ],
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
      { name: 'White rice (cooked)', amount: '200g', kcal: 260, P: 5, C: 56, F: 0 },
      { name: 'Broccoli', amount: '100g', kcal: 35, P: 3, C: 7, F: 0 },
      { name: 'Soy sauce', amount: '15ml', kcal: 10, P: 1, C: 1, F: 0 },
      { name: 'Olive oil', amount: '5ml', kcal: 45, P: 0, C: 0, F: 5 },
    ],
    instructions: [
      'Season chicken breast with salt and pepper',
      'Heat olive oil in a pan over medium heat',
      'Cook chicken for 6-7 minutes per side until golden',
      'Steam broccoli for 5 minutes',
      'Serve chicken sliced over rice with broccoli',
      'Drizzle with soy sauce',
    ],
  },
];

const TEMPLATES = [
  { id: 'balanced', label: 'Balanced Meal', kcal: 600, P: 35, C: 60, F: 15 },
  { id: 'high_protein', label: 'High Protein', kcal: 500, P: 45, C: 35, F: 15 },
  { id: 'light', label: 'Light Meal', kcal: 350, P: 30, C: 30, F: 8 },
];

export default function NutritionScreen() {
  const router = useRouter();
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
  const [selectedMeal, setSelectedMeal] = useState<MacroMeal | null>(null);
  const [selectedMealSlot, setSelectedMealSlot] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'>('Breakfast');
  const [swapMealSlot, setSwapMealSlot] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'>('Breakfast');
  const [manualKcal, setManualKcal] = useState('');
  const [manualP, setManualP] = useState('');
  const [manualC, setManualC] = useState('');
  const [manualF, setManualF] = useState('');
  const [manualLabel, setManualLabel] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
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
  };

  const generateTodaysPlan = () => {
    const balanced = MACRO_MEALS_LIBRARY.filter(m => m.category === 'balanced');
    const highProtein = MACRO_MEALS_LIBRARY.filter(m => m.category === 'high_protein');
    const highCarb = MACRO_MEALS_LIBRARY.filter(m => m.category === 'high_carb');
    
    const plan: TodaysPlan = {
      Breakfast: highCarb[Math.floor(Math.random() * highCarb.length)] || MACRO_MEALS_LIBRARY[0],
      Lunch: balanced[Math.floor(Math.random() * balanced.length)] || MACRO_MEALS_LIBRARY[1],
      Dinner: balanced[Math.floor(Math.random() * balanced.length)] || MACRO_MEALS_LIBRARY[1],
      Snacks: highProtein[Math.floor(Math.random() * highProtein.length)] || MACRO_MEALS_LIBRARY[0],
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
    setSelectedMeal(meal);
    setShowMealDetailsModal(true);
  };

  const handleSwapMeal = (slot: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks') => {
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

  const handleMacroMealSelect = (meal: MacroMeal) => {
    console.log('[Nutrition] User selected Macro Meal:', meal.label);
    setSelectedMeal(meal);
    setShowMealModal(false);
    setShowMealDetailsModal(true);
  };

  const handleAddMealFromDetails = () => {
    if (!selectedMeal) return;
    addEntry({
      label: selectedMeal.label,
      type: 'macro_meal',
      mealSlot: selectedMealSlot,
      kcal: selectedMeal.kcal,
      P: selectedMeal.P,
      C: selectedMeal.C,
      F: selectedMeal.F,
    });
    setShowMealDetailsModal(false);
    setSelectedMeal(null);
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
      <Text style={styles.title}>iOS Nutrition Screen</Text>
      <Text style={styles.subtitle}>This is the iOS-specific version</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  header: {
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
});
