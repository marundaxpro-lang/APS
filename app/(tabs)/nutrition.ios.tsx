
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

interface MacroBlock {
  id: string;
  label: string;
  kcal: number;
  P: number;
  C: number;
  F: number;
  color: string;
  icon: string;
}

interface NutritionLogEntry {
  id: string;
  timestamp: string;
  mealSlot?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
  label: string;
  type: 'smart_add' | 'template' | 'manual';
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

const SMART_ADD_BLOCKS: MacroBlock[] = [
  { id: 'quick_meal', label: 'Quick Meal', kcal: 600, P: 35, C: 60, F: 15, color: '#459b9b', icon: 'restaurant' },
  { id: 'protein_boost', label: 'Protein Boost', kcal: 200, P: 30, C: 5, F: 5, color: '#ef4444', icon: 'fitness-center' },
  { id: 'carb_boost', label: 'Carb Boost', kcal: 280, P: 5, C: 60, F: 2, color: '#f59e0b', icon: 'grain' },
  { id: 'fat_addon', label: 'Fat Add-on', kcal: 180, P: 0, C: 0, F: 20, color: '#8b5cf6', icon: 'water-drop' },
];

const TEMPLATES: MacroBlock[] = [
  { id: 'balanced', label: 'Balanced', kcal: 600, P: 35, C: 60, F: 15, color: '#459b9b', icon: 'restaurant' },
  { id: 'high_protein', label: 'High Protein', kcal: 500, P: 45, C: 35, F: 15, color: '#ef4444', icon: 'fitness-center' },
  { id: 'light', label: 'Light', kcal: 350, P: 30, C: 30, F: 8, color: '#4ade80', icon: 'eco' },
];

const NEXT_MOVE_OPTIONS: MacroBlock[] = [
  { id: 'high_protein', label: 'High-protein', kcal: 200, P: 30, C: 5, F: 5, color: '#ef4444', icon: 'fitness-center' },
  { id: 'light_snack', label: 'Light snack', kcal: 250, P: 15, C: 25, F: 8, color: '#4ade80', icon: 'cookie' },
  { id: 'pre_workout', label: 'Pre-workout', kcal: 350, P: 20, C: 55, F: 5, color: '#f59e0b', icon: 'directions-run' },
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
  const [showMealModal, setShowMealModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showTargetsModal, setShowTargetsModal] = useState(false);
  const [selectedMealSlot, setSelectedMealSlot] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'>('Breakfast');
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
    } catch (error) {
      console.error('[Nutrition] Error loading data:', error);
    } finally {
      setLoading(false);
    }
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

  const handleSmartAdd = (block: MacroBlock) => {
    console.log('[Nutrition] User tapped Smart Add:', block.label);
    addEntry({
      label: block.label,
      type: 'smart_add',
      kcal: block.kcal,
      P: block.P,
      C: block.C,
      F: block.F,
    });
  };

  const handleNextMove = (option: MacroBlock) => {
    console.log('[Nutrition] User tapped Next Move:', option.label);
    addEntry({
      label: option.label,
      type: 'smart_add',
      kcal: option.kcal,
      P: option.P,
      C: option.C,
      F: option.F,
    });
  };

  const openMealSlot = (slot: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks') => {
    console.log('[Nutrition] User tapped Add to', slot);
    setSelectedMealSlot(slot);
    setShowMealModal(true);
  };

  const getSuggestedBlock = (): MacroBlock => {
    const remaining = {
      kcal: targets.calorieGoal - consumed.kcal,
      P: targets.proteinGoal - consumed.P,
      C: targets.carbsGoal - consumed.C,
      F: targets.fatGoal - consumed.F,
    };
    
    if (remaining.P > remaining.C && remaining.P > remaining.F) {
      return SMART_ADD_BLOCKS[1];
    } else if (remaining.C > remaining.P && remaining.C > remaining.F) {
      return SMART_ADD_BLOCKS[2];
    } else if (remaining.kcal < 300) {
      return NEXT_MOVE_OPTIONS[1];
    } else {
      return SMART_ADD_BLOCKS[0];
    }
  };

  const handleSuggested = () => {
    const suggested = getSuggestedBlock();
    console.log('[Nutrition] User selected Suggested:', suggested.label);
    addEntry({
      label: suggested.label,
      type: 'smart_add',
      mealSlot: selectedMealSlot,
      kcal: suggested.kcal,
      P: suggested.P,
      C: suggested.C,
      F: suggested.F,
    });
    setShowMealModal(false);
  };

  const handleTemplate = (template: MacroBlock) => {
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

  const handleQuickAdd = (block: MacroBlock) => {
    console.log('[Nutrition] User selected Quick Add:', block.label);
    addEntry({
      label: block.label,
      type: 'smart_add',
      mealSlot: selectedMealSlot,
      kcal: block.kcal,
      P: block.P,
      C: block.C,
      F: block.F,
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Smart Add</Text>
          <View style={styles.tilesGrid}>
            {SMART_ADD_BLOCKS.map((block) => (
              <TouchableOpacity
                key={block.id}
                style={[styles.tile, { borderColor: block.color }]}
                onPress={() => handleSmartAdd(block)}
              >
                <IconSymbol
                  ios_icon_name="plus.circle.fill"
                  android_material_icon_name={block.icon}
                  size={32}
                  color={block.color}
                />
                <Text style={styles.tileLabel}>{block.label}</Text>
                <Text style={styles.tileKcal}>{block.kcal} kcal</Text>
                <Text style={styles.tileMacros}>
                  P{block.P} C{block.C} F{block.F}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

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

        <View style={styles.nextMoveCard}>
          <Text style={styles.nextMoveTitle}>Next Move (recommended)</Text>
          <Text style={styles.nextMoveSubtitle}>
            You have {remainingKcal} kcal and {remainingP}g protein left today
          </Text>
          <View style={styles.nextMoveButtons}>
            {NEXT_MOVE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.nextMoveButton, { borderColor: option.color }]}
                onPress={() => handleNextMove(option)}
              >
                <Text style={styles.nextMoveButtonText}>{option.label}</Text>
                <Text style={styles.nextMoveButtonKcal}>{option.kcal} kcal</Text>
              </TouchableOpacity>
            ))}
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
              <Text style={styles.modalSectionTitle}>Suggested (1 tap)</Text>
              <TouchableOpacity
                style={styles.suggestedButton}
                onPress={handleSuggested}
              >
                <View style={styles.suggestedInfo}>
                  <Text style={styles.suggestedLabel}>{getSuggestedBlock().label}</Text>
                  <Text style={styles.suggestedMacros}>
                    {getSuggestedBlock().kcal} kcal • P{getSuggestedBlock().P} C{getSuggestedBlock().C} F{getSuggestedBlock().F}
                  </Text>
                </View>
                <IconSymbol
                  ios_icon_name="sparkles"
                  android_material_icon_name="auto-awesome"
                  size={24}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Templates</Text>
              {TEMPLATES.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={styles.templateButton}
                  onPress={() => handleTemplate(template)}
                >
                  <View style={styles.templateInfo}>
                    <Text style={styles.templateLabel}>{template.label}</Text>
                    <Text style={styles.templateMacros}>
                      {template.kcal} kcal • P{template.P} C{template.C} F{template.F}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Quick Add</Text>
              <View style={styles.quickAddGrid}>
                {SMART_ADD_BLOCKS.map((block) => (
                  <TouchableOpacity
                    key={block.id}
                    style={[styles.quickAddTile, { borderColor: block.color }]}
                    onPress={() => handleQuickAdd(block)}
                  >
                    <Text style={styles.quickAddLabel}>{block.label}</Text>
                    <Text style={styles.quickAddKcal}>{block.kcal} kcal</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: 60,
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
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  tileLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  tileKcal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  tileMacros: {
    fontSize: 11,
    color: colors.textSecondary,
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
  nextMoveButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  nextMoveButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  nextMoveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  nextMoveButtonKcal: {
    fontSize: 11,
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
    paddingTop: 60,
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
  suggestedButton: {
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    borderColor: colors.primary,
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
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
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAddTile: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  quickAddLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  quickAddKcal: {
    fontSize: 11,
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
});
