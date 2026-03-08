
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
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
  {
    id: 'oatmeal_banana',
    label: 'Oatmeal with banana',
    kcal: 400,
    P: 15,
    C: 65,
    F: 8,
    category: 'high_carb',
    ingredients: [
      { name: 'Oats', amount: '80g', kcal: 300, P: 10, C: 54, F: 6 },
      { name: 'Banana', amount: '1 medium', kcal: 105, P: 1, C: 27, F: 0 },
      { name: 'Almond butter', amount: '10g', kcal: 60, P: 2, C: 2, F: 5 },
      { name: 'Cinnamon', amount: '1 tsp', kcal: 0, P: 0, C: 0, F: 0 },
    ],
    instructions: [
      'Cook oats with water or milk',
      'Slice banana',
      'Top oatmeal with banana slices',
      'Add almond butter',
      'Sprinkle with cinnamon',
    ],
  },
  {
    id: 'greek_salad',
    label: 'Greek salad with feta',
    kcal: 300,
    P: 12,
    C: 15,
    F: 20,
    category: 'light',
    ingredients: [
      { name: 'Mixed greens', amount: '100g', kcal: 25, P: 2, C: 5, F: 0 },
      { name: 'Feta cheese', amount: '50g', kcal: 130, P: 7, C: 2, F: 10 },
      { name: 'Cherry tomatoes', amount: '100g', kcal: 18, P: 1, C: 4, F: 0 },
      { name: 'Cucumber', amount: '100g', kcal: 15, P: 1, C: 4, F: 0 },
      { name: 'Olive oil', amount: '15ml', kcal: 120, P: 0, C: 0, F: 14 },
    ],
    instructions: [
      'Chop all vegetables',
      'Combine in a large bowl',
      'Crumble feta on top',
      'Drizzle with olive oil',
      'Toss and serve',
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
      Breakfast: highCarb.length > 0 ? highCarb[Math.floor(Math.random() * highCarb.length)] : MACRO_MEALS_LIBRARY[0],
      Lunch: balanced.length > 0 ? balanced[Math.floor(Math.random() * balanced.length)] : MACRO_MEALS_LIBRARY[1],
      Dinner: balanced.length > 0 ? balanced[Math.floor(Math.random() * balanced.length)] : MACRO_MEALS_LIBRARY[1],
      Snacks: highProtein.length > 0 ? highProtein[Math.floor(Math.random() * highProtein.length)] : MACRO_MEALS_LIBRARY[0],
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
    setSelectedMealSlot(slot);
    setShowMealDetailsModal(true);
  };

  const handleSwapMeal = (slot: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks') => {
    console.log('[Nutrition] User tapped Swap for', slot);
    if (!isPremium) {
      setShowPaywallModal(true);
      return;
    }
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

  const getSuggestedMeals = (): MacroMeal[] => {
    const sortedByProtein = [...MACRO_MEALS_LIBRARY].sort((a, b) => {
      const aScore = Math.abs(a.P - remaining.P) + Math.abs(a.C - remaining.C) + Math.abs(a.F - remaining.F);
      const bScore = Math.abs(b.P - remaining.P) + Math.abs(b.C - remaining.C) + Math.abs(b.F - remaining.F);
      return aScore - bScore;
    });
    return sortedByProtein.slice(0, 3);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Nutrition</Text>
          <TouchableOpacity onPress={() => setShowTargetsModal(true)} style={styles.settingsButton}>
            <IconSymbol ios_icon_name="gearshape.fill" android_material_icon_name="settings" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Daily Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.calorieCircle}>
            <Text style={styles.calorieNumber}>{consumedKcal}</Text>
            <Text style={styles.calorieLabel}>consumed</Text>
          </View>
          <View style={styles.summaryStats}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Remaining</Text>
              <Text style={styles.statValue}>{remainingKcal} kcal</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Goal</Text>
              <Text style={styles.statValue}>{goalKcal} kcal</Text>
            </View>
          </View>
        </View>

        {/* Macros */}
        <View style={styles.macrosCard}>
          <View style={styles.macroRow}>
            <Text style={styles.macroLabel}>Protein</Text>
            <View style={styles.macroBar}>
              <View style={[styles.macroFill, { width: `${proteinPercent}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={styles.macroText}>{consumedP}g / {proteinGoal}g</Text>
          </View>
          <View style={styles.macroRow}>
            <Text style={styles.macroLabel}>Carbs</Text>
            <View style={styles.macroBar}>
              <View style={[styles.macroFill, { width: `${carbsPercent}%`, backgroundColor: '#4CAF50' }]} />
            </View>
            <Text style={styles.macroText}>{consumedC}g / {carbsGoal}g</Text>
          </View>
          <View style={styles.macroRow}>
            <Text style={styles.macroLabel}>Fat</Text>
            <View style={styles.macroBar}>
              <View style={[styles.macroFill, { width: `${fatPercent}%`, backgroundColor: '#FF9800' }]} />
            </View>
            <Text style={styles.macroText}>{consumedF}g / {fatGoal}g</Text>
          </View>
        </View>

        {/* Today's Plan */}
        {todaysPlan && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today&apos;s Plan</Text>
            {(['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const).map((slot) => {
              const meal = todaysPlan[slot];
              const entries = getMealEntries(slot);
              const slotTotal = entries.reduce((sum, e) => sum + e.kcal, 0);
              
              return (
                <View key={slot} style={styles.mealSlot}>
                  <View style={styles.mealSlotHeader}>
                    <Text style={styles.mealSlotTitle}>{slot}</Text>
                    {slotTotal > 0 && <Text style={styles.mealSlotTotal}>{Math.round(slotTotal)} kcal</Text>}
                  </View>
                  
                  <TouchableOpacity style={styles.planMealCard} onPress={() => handlePlanMealTap(slot)}>
                    <View style={styles.planMealInfo}>
                      <Text style={styles.planMealName}>{meal.label}</Text>
                      <Text style={styles.planMealMacros}>{meal.kcal} kcal • P: {meal.P}g • C: {meal.C}g • F: {meal.F}g</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleSwapMeal(slot)} style={styles.swapButton}>
                      <IconSymbol ios_icon_name="arrow.2.squarepath" android_material_icon_name="sync" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  </TouchableOpacity>

                  {entries.map((entry) => (
                    <View key={entry.id} style={styles.loggedEntry}>
                      <View style={styles.loggedEntryInfo}>
                        <Text style={styles.loggedEntryName}>{entry.label}</Text>
                        <Text style={styles.loggedEntryMacros}>{entry.kcal} kcal • P: {entry.P}g</Text>
                      </View>
                      <TouchableOpacity onPress={() => deleteEntry(entry.id)}>
                        <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={20} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity style={styles.addButton} onPress={() => openMealSlot(slot)}>
                    <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add-circle" size={20} color={colors.primary} />
                    <Text style={styles.addButtonText}>Add to {slot}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Next Move Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next Move</Text>
          <Text style={styles.sectionSubtitle}>Based on your remaining macros</Text>
          {getSuggestedMeals().map((meal) => (
            <TouchableOpacity key={meal.id} style={styles.recommendationCard} onPress={() => {
              setSelectedMeal(meal);
              setShowMealDetailsModal(true);
            }}>
              <View style={styles.recommendationInfo}>
                <Text style={styles.recommendationName}>{meal.label}</Text>
                <Text style={styles.recommendationMacros}>{meal.kcal} kcal • P: {meal.P}g • C: {meal.C}g • F: {meal.F}g</Text>
              </View>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Meal Selection Modal */}
      <Modal visible={showMealModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to {selectedMealSlot}</Text>
              <TouchableOpacity onPress={() => setShowMealModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="close" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalSectionTitle}>Suggested Meals</Text>
              {getSuggestedMeals().map((meal) => (
                <TouchableOpacity key={meal.id} style={styles.modalMealCard} onPress={() => handleMacroMealSelect(meal)}>
                  <Text style={styles.modalMealName}>{meal.label}</Text>
                  <Text style={styles.modalMealMacros}>{meal.kcal} kcal • P: {meal.P}g • C: {meal.C}g • F: {meal.F}g</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.modalSectionTitle}>Templates</Text>
              {TEMPLATES.map((template) => (
                <TouchableOpacity key={template.id} style={styles.modalMealCard} onPress={() => handleTemplate(template)}>
                  <Text style={styles.modalMealName}>{template.label}</Text>
                  <Text style={styles.modalMealMacros}>{template.kcal} kcal • P: {template.P}g • C: {template.C}g • F: {template.F}g</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={styles.manualButton} onPress={() => setShowManualModal(true)}>
                <IconSymbol ios_icon_name="pencil.circle.fill" android_material_icon_name="edit" size={24} color={colors.primary} />
                <Text style={styles.manualButtonText}>Manual Entry</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Manual Entry Modal */}
      <Modal visible={showManualModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manual Entry</Text>
              <TouchableOpacity onPress={() => setShowManualModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="close" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <TextInput
                style={styles.input}
                placeholder="Meal name"
                placeholderTextColor={colors.textSecondary}
                value={manualLabel}
                onChangeText={setManualLabel}
              />
              <TextInput
                style={styles.input}
                placeholder="Calories"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={manualKcal}
                onChangeText={setManualKcal}
              />
              <TextInput
                style={styles.input}
                placeholder="Protein (g)"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={manualP}
                onChangeText={setManualP}
              />
              <TextInput
                style={styles.input}
                placeholder="Carbs (g)"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={manualC}
                onChangeText={setManualC}
              />
              <TextInput
                style={styles.input}
                placeholder="Fat (g)"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={manualF}
                onChangeText={setManualF}
              />
              <TouchableOpacity style={styles.saveButton} onPress={handleManualAdd}>
                <Text style={styles.saveButtonText}>Add Entry</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Meal Details Modal */}
      <Modal visible={showMealDetailsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedMeal?.label}</Text>
              <TouchableOpacity onPress={() => setShowMealDetailsModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="close" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {selectedMeal && (
                <>
                  <View style={styles.detailsMacros}>
                    <Text style={styles.detailsMacroText}>{selectedMeal.kcal} kcal</Text>
                    <Text style={styles.detailsMacroText}>P: {selectedMeal.P}g</Text>
                    <Text style={styles.detailsMacroText}>C: {selectedMeal.C}g</Text>
                    <Text style={styles.detailsMacroText}>F: {selectedMeal.F}g</Text>
                  </View>

                  <Text style={styles.detailsSectionTitle}>Ingredients</Text>
                  {selectedMeal.ingredients.map((ing, idx) => (
                    <View key={idx} style={styles.ingredientRow}>
                      <Text style={styles.ingredientName}>{ing.name}</Text>
                      <Text style={styles.ingredientAmount}>{ing.amount}</Text>
                    </View>
                  ))}

                  <Text style={styles.detailsSectionTitle}>Instructions</Text>
                  {selectedMeal.instructions.map((step, idx) => (
                    <View key={idx} style={styles.instructionRow}>
                      <Text style={styles.instructionNumber}>{idx + 1}.</Text>
                      <Text style={styles.instructionText}>{step}</Text>
                    </View>
                  ))}

                  <TouchableOpacity style={styles.addToLogButton} onPress={handleAddMealFromDetails}>
                    <Text style={styles.addToLogButtonText}>Add to Log</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Targets Modal */}
      <Modal visible={showTargetsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Daily Targets</Text>
              <TouchableOpacity onPress={() => setShowTargetsModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="close" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Calories</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={targets.calorieGoal.toString()}
                onChangeText={(text) => setTargets({ ...targets, calorieGoal: parseInt(text) || 0 })}
              />
              <Text style={styles.inputLabel}>Protein (g)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={targets.proteinGoal.toString()}
                onChangeText={(text) => setTargets({ ...targets, proteinGoal: parseInt(text) || 0 })}
              />
              <Text style={styles.inputLabel}>Carbs (g)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={targets.carbsGoal.toString()}
                onChangeText={(text) => setTargets({ ...targets, carbsGoal: parseInt(text) || 0 })}
              />
              <Text style={styles.inputLabel}>Fat (g)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={targets.fatGoal.toString()}
                onChangeText={(text) => setTargets({ ...targets, fatGoal: parseInt(text) || 0 })}
              />
              <TouchableOpacity style={styles.saveButton} onPress={saveTargets}>
                <Text style={styles.saveButtonText}>Save Targets</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Swap Modal */}
      <Modal visible={showSwapModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Swap {swapMealSlot}</Text>
              <TouchableOpacity onPress={() => setShowSwapModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="close" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {MACRO_MEALS_LIBRARY.map((meal) => (
                <TouchableOpacity key={meal.id} style={styles.modalMealCard} onPress={() => confirmSwap(meal)}>
                  <Text style={styles.modalMealName}>{meal.label}</Text>
                  <Text style={styles.modalMealMacros}>{meal.kcal} kcal • P: {meal.P}g • C: {meal.C}g • F: {meal.F}g</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Paywall Modal */}
      <Modal visible={showPaywallModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Premium Feature</Text>
              <TouchableOpacity onPress={() => setShowPaywallModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="close" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.paywallContent}>
              <Text style={styles.paywallText}>Unlimited meal swaps are available with Premium</Text>
              <TouchableOpacity style={styles.upgradeButton} onPress={() => {
                setShowPaywallModal(false);
                router.push('/(tabs)/shop');
              }}>
                <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
              </TouchableOpacity>
            </View>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  settingsButton: {
    padding: 8,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  calorieCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  calorieNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  calorieLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  summaryStats: {
    flex: 1,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  macrosCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  macroRow: {
    marginBottom: 16,
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  macroBar: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  macroFill: {
    height: '100%',
    borderRadius: 4,
  },
  macroText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  mealSlot: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  mealSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealSlotTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  mealSlotTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  planMealCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  planMealInfo: {
    flex: 1,
  },
  planMealName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  planMealMacros: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  swapButton: {
    padding: 8,
  },
  loggedEntry: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loggedEntryInfo: {
    flex: 1,
  },
  loggedEntryName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  loggedEntryMacros: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  recommendationCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationInfo: {
    flex: 1,
  },
  recommendationName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  recommendationMacros: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.card,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  modalScroll: {
    padding: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  modalMealCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  modalMealName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  modalMealMacros: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginTop: 16,
  },
  manualButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailsMacros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailsMacroText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  detailsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.card,
  },
  ingredientName: {
    fontSize: 14,
    color: colors.text,
  },
  ingredientAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  instructionRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  instructionNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 8,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  addToLogButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  addToLogButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  paywallContent: {
    padding: 40,
    alignItems: 'center',
  },
  paywallText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 32,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
