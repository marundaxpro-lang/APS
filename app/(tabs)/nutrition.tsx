
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
  { id: 'protein_shake', label: 'Protein shake', kcal: 180, P: 30, C: 8, F: 3, category: 'high_protein' },
  { id: 'chicken_rice_bowl', label: 'Chicken rice bowl', kcal: 650, P: 50, C: 70, F: 15, category: 'balanced' },
  { id: 'oats_banana', label: 'Oats + banana', kcal: 300, P: 10, C: 50, F: 7, category: 'high_carb' },
  { id: 'eggs_toast', label: 'Eggs + toast', kcal: 380, P: 25, C: 35, F: 15, category: 'balanced' },
  { id: 'tuna_wrap', label: 'Tuna wrap', kcal: 400, P: 30, C: 40, F: 12, category: 'balanced' },
  { id: 'greek_yogurt_granola', label: 'Greek yogurt + granola', kcal: 320, P: 20, C: 40, F: 8, category: 'balanced' },
  { id: 'salmon_sweet_potato', label: 'Salmon + sweet potato', kcal: 550, P: 40, C: 50, F: 18, category: 'balanced' },
  { id: 'turkey_avocado_wrap', label: 'Turkey avocado wrap', kcal: 480, P: 35, C: 45, F: 16, category: 'balanced' },
  { id: 'cottage_cheese_fruit', label: 'Cottage cheese + fruit', kcal: 250, P: 25, C: 30, F: 5, category: 'high_protein' },
  { id: 'beef_quinoa_bowl', label: 'Beef quinoa bowl', kcal: 620, P: 45, C: 60, F: 20, category: 'balanced' },
  { id: 'protein_pancakes', label: 'Protein pancakes', kcal: 420, P: 35, C: 45, F: 10, category: 'high_protein' },
  { id: 'chicken_pasta', label: 'Chicken pasta', kcal: 680, P: 48, C: 75, F: 18, category: 'high_carb' },
  { id: 'egg_white_omelette', label: 'Egg white omelette', kcal: 220, P: 28, C: 10, F: 8, category: 'high_protein' },
  { id: 'rice_cakes_pb', label: 'Rice cakes + PB', kcal: 280, P: 12, C: 35, F: 12, category: 'high_carb' },
  { id: 'tuna_salad', label: 'Tuna salad', kcal: 320, P: 35, C: 15, F: 14, category: 'high_protein' },
  { id: 'smoothie_bowl', label: 'Smoothie bowl', kcal: 380, P: 20, C: 55, F: 10, category: 'high_carb' },
  { id: 'steak_veggies', label: 'Steak + veggies', kcal: 520, P: 48, C: 25, F: 26, category: 'high_protein' },
  { id: 'bagel_cream_cheese', label: 'Bagel + cream cheese', kcal: 350, P: 12, C: 50, F: 12, category: 'high_carb' },
  { id: 'protein_bar', label: 'Protein bar', kcal: 200, P: 20, C: 22, F: 6, category: 'high_protein' },
  { id: 'apple_almond_butter', label: 'Apple + almond butter', kcal: 220, P: 6, C: 28, F: 12, category: 'light' },
  { id: 'chicken_salad', label: 'Chicken salad', kcal: 380, P: 40, C: 20, F: 16, category: 'high_protein' },
  { id: 'pasta_marinara', label: 'Pasta marinara', kcal: 480, P: 18, C: 75, F: 12, category: 'high_carb' },
  { id: 'turkey_sandwich', label: 'Turkey sandwich', kcal: 420, P: 32, C: 48, F: 12, category: 'balanced' },
  { id: 'protein_oats', label: 'Protein oats', kcal: 380, P: 28, C: 50, F: 8, category: 'balanced' },
  { id: 'shrimp_rice', label: 'Shrimp + rice', kcal: 450, P: 38, C: 55, F: 8, category: 'balanced' },
  { id: 'nuts_mix', label: 'Mixed nuts', kcal: 180, P: 6, C: 8, F: 16, category: 'light' },
  { id: 'hummus_veggies', label: 'Hummus + veggies', kcal: 200, P: 8, C: 24, F: 10, category: 'light' },
  { id: 'chicken_wrap', label: 'Chicken wrap', kcal: 520, P: 42, C: 50, F: 16, category: 'balanced' },
  { id: 'overnight_oats', label: 'Overnight oats', kcal: 340, P: 15, C: 52, F: 9, category: 'high_carb' },
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
  const [showTargetsModal, setShowTargetsModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const generateTodaysPlan = useCallback(() => {
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
  }, []);

  const loadData = useCallback(async () => {
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
  }, [generateTodaysPlan]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const saveTargets = async () => {
    await AsyncStorage.setItem('nutritionTargets', JSON.stringify(targets));
    console.log('[Nutrition] Saved targets:', targets);
    setShowTargetsModal(false);
  };

  const getMealEntries = (slot: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'): NutritionLogEntry[] => {
    return dailyData.entries.filter(e => e.mealSlot === slot);
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
    kcal: targets.calorieGoal - consumed.kcal,
    P: targets.proteinGoal - consumed.P,
    C: targets.carbsGoal - consumed.C,
    F: targets.fatGoal - consumed.F,
  };

  const percentages = {
    kcal: Math.min(100, Math.round((consumed.kcal / targets.calorieGoal) * 100)),
    P: Math.min(100, Math.round((consumed.P / targets.proteinGoal) * 100)),
    C: Math.min(100, Math.round((consumed.C / targets.carbsGoal) * 100)),
    F: Math.min(100, Math.round((consumed.F / targets.fatGoal) * 100)),
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nutrition</Text>
        <TouchableOpacity onPress={() => setShowTargetsModal(true)}>
          <IconSymbol
            ios_icon_name="slider.horizontal.3"
            android_material_icon_name="tune"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.macroOverview}>
          <View style={styles.calorieCircle}>
            <Text style={styles.calorieValue}>{consumed.kcal}</Text>
            <Text style={styles.calorieLabel}>of {targets.calorieGoal} kcal</Text>
            <Text style={styles.calorieRemaining}>{remaining.kcal} remaining</Text>
          </View>

          <View style={styles.macroGrid}>
            <View style={styles.macroCard}>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroValue}>{consumed.P}g</Text>
              <View style={styles.macroBar}>
                <View style={[styles.macroBarFill, { width: `${percentages.P}%`, backgroundColor: colors.primary }]} />
              </View>
              <Text style={styles.macroTarget}>of {targets.proteinGoal}g</Text>
            </View>

            <View style={styles.macroCard}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroValue}>{consumed.C}g</Text>
              <View style={styles.macroBar}>
                <View style={[styles.macroBarFill, { width: `${percentages.C}%`, backgroundColor: '#FFA500' }]} />
              </View>
              <Text style={styles.macroTarget}>of {targets.carbsGoal}g</Text>
            </View>

            <View style={styles.macroCard}>
              <Text style={styles.macroLabel}>Fat</Text>
              <Text style={styles.macroValue}>{consumed.F}g</Text>
              <View style={styles.macroBar}>
                <View style={[styles.macroBarFill, { width: `${percentages.F}%`, backgroundColor: '#FF5722' }]} />
              </View>
              <Text style={styles.macroTarget}>of {targets.fatGoal}g</Text>
            </View>
          </View>
        </View>

        {todaysPlan && (
          <View style={styles.todaysPlanSection}>
            <Text style={styles.sectionTitle}>Today&apos;s Plan</Text>
            {(['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const).map((slot) => {
              const meal = todaysPlan[slot];
              const entries = getMealEntries(slot);
              const logged = entries.length > 0;

              return (
                <View key={slot} style={styles.planMealCard}>
                  <View style={styles.planMealHeader}>
                    <Text style={styles.planMealSlot}>{slot}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.planMealContent, logged && styles.planMealLogged]}
                    onPress={() => handlePlanMealTap(slot)}
                    disabled={logged}
                  >
                    <Text style={styles.planMealLabel}>{meal.label}</Text>
                    <Text style={styles.planMealMacros}>
                      {meal.kcal} kcal • {meal.P}P • {meal.C}C • {meal.F}F
                    </Text>
                    {logged && (
                      <View style={styles.loggedBadge}>
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check-circle"
                          size={16}
                          color={colors.primary}
                        />
                        <Text style={styles.loggedText}>Logged</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.loggedMealsSection}>
          <View style={styles.loggedMealsHeader}>
            <Text style={styles.sectionTitle}>Logged Meals</Text>
          </View>

          {dailyData.entries.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="fork.knife"
                android_material_icon_name="restaurant"
                size={48}
                color={colors.grey}
              />
              <Text style={styles.emptyStateText}>No meals logged yet</Text>
              <Text style={styles.emptyStateSubtext}>Tap a meal from Today&apos;s Plan to get started</Text>
            </View>
          ) : (
            <View style={styles.loggedMealsList}>
              {dailyData.entries.map((entry) => (
                <View key={entry.id} style={styles.loggedMealCard}>
                  <View style={styles.loggedMealInfo}>
                    <Text style={styles.loggedMealLabel}>{entry.label}</Text>
                    <Text style={styles.loggedMealMacros}>
                      {entry.kcal} kcal • {entry.P}P • {entry.C}C • {entry.F}F
                    </Text>
                    {entry.mealSlot && (
                      <Text style={styles.loggedMealSlot}>{entry.mealSlot}</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => deleteEntry(entry.id)}>
                    <IconSymbol
                      ios_icon_name="trash"
                      android_material_icon_name="delete"
                      size={20}
                      color={colors.grey}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showTargetsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nutrition Targets</Text>
            <View style={styles.targetInputs}>
              <View style={styles.targetInput}>
                <Text style={styles.targetLabel}>Calories</Text>
                <TextInput
                  style={styles.targetField}
                  value={targets.calorieGoal.toString()}
                  onChangeText={(text) => setTargets({ ...targets, calorieGoal: parseInt(text) || 0 })}
                  keyboardType="numeric"
                  placeholderTextColor={colors.grey}
                />
              </View>
              <View style={styles.targetInput}>
                <Text style={styles.targetLabel}>Protein (g)</Text>
                <TextInput
                  style={styles.targetField}
                  value={targets.proteinGoal.toString()}
                  onChangeText={(text) => setTargets({ ...targets, proteinGoal: parseInt(text) || 0 })}
                  keyboardType="numeric"
                  placeholderTextColor={colors.grey}
                />
              </View>
              <View style={styles.targetInput}>
                <Text style={styles.targetLabel}>Carbs (g)</Text>
                <TextInput
                  style={styles.targetField}
                  value={targets.carbsGoal.toString()}
                  onChangeText={(text) => setTargets({ ...targets, carbsGoal: parseInt(text) || 0 })}
                  keyboardType="numeric"
                  placeholderTextColor={colors.grey}
                />
              </View>
              <View style={styles.targetInput}>
                <Text style={styles.targetLabel}>Fat (g)</Text>
                <TextInput
                  style={styles.targetField}
                  value={targets.fatGoal.toString()}
                  onChangeText={(text) => setTargets({ ...targets, fatGoal: parseInt(text) || 0 })}
                  keyboardType="numeric"
                  placeholderTextColor={colors.grey}
                />
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setShowTargetsModal(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={saveTargets}>
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Save</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  macroOverview: {
    marginBottom: 32,
  },
  calorieCircle: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 24,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  calorieValue: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.text,
  },
  calorieLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  calorieRemaining: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 8,
    fontWeight: '600',
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  macroCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  macroValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  macroBar: {
    height: 6,
    backgroundColor: colors.cardBorder,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  macroTarget: {
    fontSize: 11,
    color: colors.grey,
  },
  todaysPlanSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  planMealCard: {
    marginBottom: 12,
  },
  planMealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planMealSlot: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  planMealContent: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  planMealLogged: {
    opacity: 0.6,
  },
  planMealLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  planMealMacros: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  loggedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  loggedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  loggedMealsSection: {
    marginBottom: 32,
  },
  loggedMealsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  loggedMealsList: {
    gap: 12,
  },
  loggedMealCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  loggedMealInfo: {
    flex: 1,
  },
  loggedMealLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  loggedMealMacros: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  loggedMealSlot: {
    fontSize: 12,
    color: colors.grey,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 24,
  },
  targetInputs: {
    gap: 16,
    marginBottom: 24,
  },
  targetInput: {
    gap: 8,
  },
  targetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  targetField: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonTextPrimary: {
    color: '#fff',
  },
});
