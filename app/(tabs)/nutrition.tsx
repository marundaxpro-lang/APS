
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { foodDatabase } from '@/data/foods';
import { MealEntry, FoodItem, CaloricGoal } from '@/types/fitness';
import { authenticatedPost, authenticatedGet } from '@/utils/api';
import AIAssistant from '@/components/AIAssistant';

interface QuickAddItem {
  type: 'calories' | 'protein' | 'carbs' | 'fat';
  label: string;
  icon: string;
  color: string;
}

const QUICK_ADD_ITEMS: QuickAddItem[] = [
  { type: 'calories', label: 'Calories', icon: 'local-fire-department', color: '#ef4444' },
  { type: 'protein', label: 'Protein', icon: 'fitness-center', color: colors.primary },
  { type: 'carbs', label: 'Carbs', icon: 'grain', color: '#f59e0b' },
  { type: 'fat', label: 'Fat', icon: 'water-drop', color: '#8b5cf6' },
];

export default function NutritionScreen() {
  const router = useRouter();
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [caloricGoal, setCaloricGoal] = useState<CaloricGoal | null>(null);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snacks'>('breakfast');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState('100');
  const [loading, setLoading] = useState(true);
  const [caloricGoalError, setCaloricGoalError] = useState(false);
  const [recentFoods, setRecentFoods] = useState<FoodItem[]>([]);
  const [favoriteFoods, setFavoriteFoods] = useState<FoodItem[]>([]);
  const [quickAddType, setQuickAddType] = useState<QuickAddItem | null>(null);
  const [quickAddValue, setQuickAddValue] = useState('');

  useEffect(() => {
    loadMeals();
    loadCaloricGoal();
    loadRecentFoods();
    loadFavoriteFoods();
  }, []);

  const loadMeals = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const response = await authenticatedGet(`/api/nutrition?date=${today}`);
      if (response && Array.isArray(response)) {
        setMeals(response);
        console.log('[Nutrition] Loaded meals from backend');
      }
    } catch (error) {
      console.error('[Nutrition] Error loading meals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCaloricGoal = async () => {
    try {
      console.log('[Nutrition] Fetching caloric goal from backend...');
      const goalData = await authenticatedGet('/api/dashboard/caloric-goal');
      
      if (goalData && goalData.dailyCalorieGoal) {
        const calories = goalData.dailyCalorieGoal;
        const proteinCalories = calories * 0.30;
        const fatCalories = calories * 0.25;
        const carbsCalories = calories * 0.45;
        
        const goal: CaloricGoal = {
          dailyCalorieGoal: calories,
          bmr: goalData.basalMetabolicRate || 0,
          tdee: calories,
          proteinGoal: Math.round(proteinCalories / 4),
          carbsGoal: Math.round(carbsCalories / 4),
          fatGoal: Math.round(fatCalories / 9),
        };
        
        setCaloricGoal(goal);
        setCaloricGoalError(false);
        console.log('[Nutrition] Loaded caloric goal from backend:', goal);
      } else {
        console.warn('[Nutrition] No caloric goal found in response');
        setCaloricGoalError(true);
      }
    } catch (error) {
      console.error('[Nutrition] Error loading caloric goal:', error);
      setCaloricGoalError(true);
    }
  };

  const loadRecentFoods = async () => {
    try {
      const stored = await AsyncStorage.getItem('recentFoods');
      if (stored) {
        setRecentFoods(JSON.parse(stored));
      }
    } catch (error) {
      console.error('[Nutrition] Error loading recent foods:', error);
    }
  };

  const loadFavoriteFoods = async () => {
    try {
      const stored = await AsyncStorage.getItem('favoriteFoods');
      if (stored) {
        setFavoriteFoods(JSON.parse(stored));
      }
    } catch (error) {
      console.error('[Nutrition] Error loading favorite foods:', error);
    }
  };

  const saveRecentFood = async (food: FoodItem) => {
    try {
      const updated = [food, ...recentFoods.filter(f => f.id !== food.id)].slice(0, 10);
      await AsyncStorage.setItem('recentFoods', JSON.stringify(updated));
      setRecentFoods(updated);
    } catch (error) {
      console.error('[Nutrition] Error saving recent food:', error);
    }
  };

  const toggleFavorite = async (food: FoodItem) => {
    try {
      const isFavorite = favoriteFoods.some(f => f.id === food.id);
      const updated = isFavorite
        ? favoriteFoods.filter(f => f.id !== food.id)
        : [...favoriteFoods, food];
      
      await AsyncStorage.setItem('favoriteFoods', JSON.stringify(updated));
      setFavoriteFoods(updated);
      console.log('[Nutrition] Toggled favorite:', food.name, isFavorite ? 'removed' : 'added');
    } catch (error) {
      console.error('[Nutrition] Error toggling favorite:', error);
    }
  };

  const goals = caloricGoal ? {
    calories: caloricGoal.dailyCalorieGoal,
    protein: caloricGoal.proteinGoal,
    carbs: caloricGoal.carbsGoal,
    fat: caloricGoal.fatGoal,
  } : null;

  const consumed = meals.reduce(
    (acc, meal) => {
      const multiplier = meal.grams / 100;
      return {
        calories: acc.calories + meal.food_item.calories * multiplier,
        protein: acc.protein + meal.food_item.protein * multiplier,
        carbs: acc.carbs + meal.food_item.carbs * multiplier,
        fat: acc.fat + meal.food_item.fat * multiplier,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const openFoodModal = (mealType: typeof selectedMealType) => {
    console.log('[Nutrition] User tapped Add Food for', mealType);
    setSelectedMealType(mealType);
    setSearchQuery('');
    setSelectedFood(null);
    setShowFoodModal(true);
  };

  const openQuickAddModal = (item: QuickAddItem) => {
    console.log('[Nutrition] User tapped Quick Add:', item.label);
    setQuickAddType(item);
    setQuickAddValue('');
    setShowQuickAddModal(true);
  };

  const addQuickEntry = async () => {
    if (!quickAddType || !quickAddValue) return;
    
    const value = parseInt(quickAddValue);
    if (isNaN(value) || value <= 0) return;
    
    console.log('[Nutrition] Adding quick entry:', quickAddType.type, value);
    
    // Create a custom food item for quick add
    const quickFood: FoodItem = {
      id: `quick-${Date.now()}`,
      name: `Quick Add ${quickAddType.label}`,
      calories: quickAddType.type === 'calories' ? value : 0,
      protein: quickAddType.type === 'protein' ? value : 0,
      carbs: quickAddType.type === 'carbs' ? value : 0,
      fat: quickAddType.type === 'fat' ? value : 0,
    };
    
    const newMeal: MealEntry = {
      id: Date.now().toString(),
      food_item: quickFood,
      grams: 100,
      meal_type: 'snacks',
    };
    
    setMeals([...meals, newMeal]);
    
    try {
      const mealData = {
        food_item_id: quickFood.id,
        food_name: quickFood.name,
        grams: 100,
        meal_type: 'snacks',
        calories: quickFood.calories,
        protein: quickFood.protein,
        carbs: quickFood.carbs,
        fat: quickFood.fat,
        date: new Date().toISOString().split('T')[0],
      };
      
      await authenticatedPost('/api/nutrition', mealData);
      console.log('[Nutrition] Quick entry saved successfully');
    } catch (error) {
      console.error('[Nutrition] Error saving quick entry:', error);
    }
    
    setShowQuickAddModal(false);
    setQuickAddType(null);
    setQuickAddValue('');
  };

  const addFood = async () => {
    if (selectedFood) {
      console.log('[Nutrition] Adding food:', selectedFood.name, grams, 'g');
      const newMeal: MealEntry = {
        id: Date.now().toString(),
        food_item: selectedFood,
        grams: parseInt(grams),
        meal_type: selectedMealType,
      };
      
      setMeals([...meals, newMeal]);
      await saveRecentFood(selectedFood);
      
      try {
        const mealData = {
          food_item_id: selectedFood.id,
          food_name: selectedFood.name,
          grams: parseInt(grams),
          meal_type: selectedMealType,
          calories: selectedFood.calories,
          protein: selectedFood.protein,
          carbs: selectedFood.carbs,
          fat: selectedFood.fat,
          date: new Date().toISOString().split('T')[0],
        };
        
        await authenticatedPost('/api/nutrition', mealData);
        console.log('[Nutrition] Meal saved successfully');
      } catch (error) {
        console.error('[Nutrition] Error saving meal:', error);
      }
      
      setShowFoodModal(false);
      setSelectedFood(null);
      setGrams('100');
      setSearchQuery('');
    }
  };

  const filteredFoods = foodDatabase.filter((food) =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMealsByType = (type: typeof selectedMealType) =>
    meals.filter((m) => m.meal_type === type);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Show error state if caloric goal is not set
  if (caloricGoalError || !goals) {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Nutrition</Text>
              <Text style={styles.subtitle}>Track your daily intake</Text>
            </View>
          </View>

          <View style={styles.errorCard}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={48}
              color={colors.warning}
            />
            <Text style={styles.errorTitle}>Calorie Goal Not Set</Text>
            <Text style={styles.errorMessage}>
              Complete your profile to calculate your daily calorie goal and start tracking.
            </Text>
            <TouchableOpacity
              style={styles.setupButton}
              onPress={() => {
                console.log('[Nutrition] User tapped Complete Profile Setup');
                router.push('/onboarding');
              }}
            >
              <Text style={styles.setupButtonText}>Complete Profile Setup</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const hasNoMeals = meals.length === 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Nutrition</Text>
            <Text style={styles.subtitle}>Track your daily intake</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                console.log('[Nutrition] User tapped Meal Plans button');
                router.push('/meal-plans');
              }}
            >
              <IconSymbol
                ios_icon_name="book.fill"
                android_material_icon_name="menu-book"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                console.log('[Nutrition] User tapped AI Assistant button');
                setShowAIAssistant(true);
              }}
            >
              <IconSymbol
                ios_icon_name="sparkles"
                android_material_icon_name="auto-awesome"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Add Actions */}
        <View style={styles.quickAddSection}>
          <Text style={styles.sectionTitle}>Quick Add</Text>
          <View style={styles.quickAddGrid}>
            {QUICK_ADD_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.type}
                style={styles.quickAddCard}
                onPress={() => openQuickAddModal(item)}
              >
                <IconSymbol
                  ios_icon_name="plus.circle.fill"
                  android_material_icon_name={item.icon}
                  size={28}
                  color={item.color}
                />
                <Text style={styles.quickAddLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Calorie Overview */}
        <View style={styles.caloriesCard}>
          <Text style={styles.caloriesLabel}>Daily Calories</Text>
          <View style={styles.caloriesRow}>
            <View style={styles.caloriesStat}>
              <Text style={styles.caloriesValue}>{Math.round(consumed.calories)}</Text>
              <Text style={styles.caloriesSubtext}>consumed</Text>
            </View>
            <View style={styles.caloriesDivider} />
            <View style={styles.caloriesStat}>
              <Text style={styles.caloriesValue}>{Math.round(goals.calories - consumed.calories)}</Text>
              <Text style={styles.caloriesSubtext}>remaining</Text>
            </View>
            <View style={styles.caloriesDivider} />
            <View style={styles.caloriesStat}>
              <Text style={styles.caloriesValue}>{goals.calories}</Text>
              <Text style={styles.caloriesSubtext}>goal</Text>
            </View>
          </View>
          <View style={styles.caloriesBar}>
            <View
              style={[
                styles.caloriesBarFill,
                { width: `${Math.min((consumed.calories / goals.calories) * 100, 100)}%` },
              ]}
            />
          </View>
        </View>

        {/* Macros */}
        <View style={styles.macrosCard}>
          <View style={styles.macroItem}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroValue}>
                {Math.round(consumed.protein)}g / {goals.protein}g
              </Text>
            </View>
            <View style={styles.macroBar}>
              <View
                style={[
                  styles.macroBarFill,
                  { width: `${Math.min((consumed.protein / goals.protein) * 100, 100)}%` },
                  { backgroundColor: colors.primary },
                ]}
              />
            </View>
          </View>

          <View style={styles.macroItem}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroValue}>
                {Math.round(consumed.carbs)}g / {goals.carbs}g
              </Text>
            </View>
            <View style={styles.macroBar}>
              <View
                style={[
                  styles.macroBarFill,
                  { width: `${Math.min((consumed.carbs / goals.carbs) * 100, 100)}%` },
                  { backgroundColor: '#f59e0b' },
                ]}
              />
            </View>
          </View>

          <View style={styles.macroItem}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel}>Fat</Text>
              <Text style={styles.macroValue}>
                {Math.round(consumed.fat)}g / {goals.fat}g
              </Text>
            </View>
            <View style={styles.macroBar}>
              <View
                style={[
                  styles.macroBarFill,
                  { width: `${Math.min((consumed.fat / goals.fat) * 100, 100)}%` },
                  { backgroundColor: '#8b5cf6' },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Recent Foods & Favorites */}
        {(recentFoods.length > 0 || favoriteFoods.length > 0) && (
          <View style={styles.quickAccessSection}>
            {favoriteFoods.length > 0 && (
              <View style={styles.quickAccessGroup}>
                <Text style={styles.sectionTitle}>Favorites</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickAccessScroll}>
                  {favoriteFoods.map((food) => (
                    <TouchableOpacity
                      key={food.id}
                      style={styles.quickAccessCard}
                      onPress={() => {
                        setSelectedFood(food);
                        setGrams('100');
                        setSelectedMealType('snacks');
                        setShowFoodModal(true);
                      }}
                    >
                      <IconSymbol
                        ios_icon_name="star.fill"
                        android_material_icon_name="star"
                        size={20}
                        color="#f59e0b"
                      />
                      <Text style={styles.quickAccessName} numberOfLines={1}>{food.name}</Text>
                      <Text style={styles.quickAccessCals}>{food.calories} cal</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {recentFoods.length > 0 && (
              <View style={styles.quickAccessGroup}>
                <Text style={styles.sectionTitle}>Recent Foods</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickAccessScroll}>
                  {recentFoods.map((food) => (
                    <TouchableOpacity
                      key={food.id}
                      style={styles.quickAccessCard}
                      onPress={() => {
                        setSelectedFood(food);
                        setGrams('100');
                        setSelectedMealType('snacks');
                        setShowFoodModal(true);
                      }}
                    >
                      <IconSymbol
                        ios_icon_name="clock.fill"
                        android_material_icon_name="history"
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={styles.quickAccessName} numberOfLines={1}>{food.name}</Text>
                      <Text style={styles.quickAccessCals}>{food.calories} cal</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Meals */}
        {(['breakfast', 'lunch', 'dinner', 'snacks'] as const).map((mealType) => {
          const mealItems = getMealsByType(mealType);
          const hasItems = mealItems.length > 0;
          
          return (
            <View key={mealType} style={styles.mealSection}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealTitle}>
                  {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                </Text>
                <TouchableOpacity onPress={() => openFoodModal(mealType)}>
                  <IconSymbol
                    ios_icon_name="plus.circle.fill"
                    android_material_icon_name="add-circle"
                    size={28}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
              
              {!hasItems && hasNoMeals && (
                <View style={styles.emptyMealCard}>
                  <Text style={styles.emptyMealText}>Log your first meal to see progress</Text>
                </View>
              )}
              
              {mealItems.map((meal) => (
                <View key={meal.id} style={styles.mealItem}>
                  <View style={styles.mealItemInfo}>
                    <Text style={styles.mealItemName}>{meal.food_item.name}</Text>
                    <Text style={styles.mealItemDetails}>
                      {meal.grams}g • {Math.round((meal.food_item.calories * meal.grams) / 100)} cal
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>

      {/* Food Modal */}
      <Modal visible={showFoodModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Food</Text>
            <TouchableOpacity onPress={() => setShowFoodModal(false)}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="close"
                size={28}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search foods..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {selectedFood ? (
            <View style={styles.selectedFoodContainer}>
              <View style={styles.selectedFoodHeader}>
                <Text style={styles.selectedFoodName}>{selectedFood.name}</Text>
                <TouchableOpacity onPress={() => toggleFavorite(selectedFood)}>
                  <IconSymbol
                    ios_icon_name={favoriteFoods.some(f => f.id === selectedFood.id) ? "star.fill" : "star"}
                    android_material_icon_name={favoriteFoods.some(f => f.id === selectedFood.id) ? "star" : "star-border"}
                    size={24}
                    color="#f59e0b"
                  />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.gramsInput}
                placeholder="Grams"
                placeholderTextColor={colors.textSecondary}
                value={grams}
                onChangeText={setGrams}
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.addButton} onPress={addFood}>
                <Text style={styles.addButtonText}>Add to {selectedMealType}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredFoods}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.foodItem}
                  onPress={() => setSelectedFood(item)}
                >
                  <View style={styles.foodItemContent}>
                    <Text style={styles.foodName}>{item.name}</Text>
                    <Text style={styles.foodDetails}>
                      {item.calories} cal • P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g
                    </Text>
                  </View>
                  {item.premium && (
                    <View style={styles.premiumBadge}>
                      <Text style={styles.premiumText}>PRO</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>

      {/* Quick Add Modal */}
      <Modal visible={showQuickAddModal} transparent animationType="fade">
        <View style={styles.quickAddModalOverlay}>
          <View style={styles.quickAddModalContent}>
            <Text style={styles.quickAddModalTitle}>Quick Add {quickAddType?.label}</Text>
            <TextInput
              style={styles.quickAddInput}
              placeholder={`Enter ${quickAddType?.label.toLowerCase()} amount`}
              placeholderTextColor={colors.textSecondary}
              value={quickAddValue}
              onChangeText={setQuickAddValue}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.quickAddModalButtons}>
              <TouchableOpacity
                style={styles.quickAddCancelButton}
                onPress={() => {
                  setShowQuickAddModal(false);
                  setQuickAddType(null);
                  setQuickAddValue('');
                }}
              >
                <Text style={styles.quickAddCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickAddConfirmButton}
                onPress={addQuickEntry}
              >
                <Text style={styles.quickAddConfirmText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AIAssistant
        visible={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        context="nutrition"
      />
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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  setupButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  setupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  quickAddSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAddCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  quickAddLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  caloriesCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  caloriesLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
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
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  caloriesSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  caloriesDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 8,
  },
  caloriesBar: {
    width: '100%',
    height: 6,
    backgroundColor: colors.grey,
    borderRadius: 3,
    overflow: 'hidden',
  },
  caloriesBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  macrosCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    gap: 16,
  },
  macroItem: {
    gap: 8,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  macroBar: {
    height: 6,
    backgroundColor: colors.grey,
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
  },
  quickAccessSection: {
    marginBottom: 24,
  },
  quickAccessGroup: {
    marginBottom: 20,
  },
  quickAccessScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  quickAccessCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 120,
    alignItems: 'center',
    gap: 6,
  },
  quickAccessName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  quickAccessCals: {
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
  emptyMealCard: {
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(69, 155, 155, 0.3)',
  },
  emptyMealText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  mealItem: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  mealItemInfo: {
    flex: 1,
  },
  mealItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  mealItemDetails: {
    fontSize: 14,
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
  searchInput: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  foodItemContent: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  foodDetails: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  premiumBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  selectedFoodContainer: {
    paddingHorizontal: 20,
  },
  selectedFoodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedFoodName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  gramsInput: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  quickAddModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  quickAddModalContent: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  quickAddModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  quickAddInput: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 20,
  },
  quickAddModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAddCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  quickAddCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  quickAddConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  quickAddConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
