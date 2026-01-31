
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
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { foodDatabase } from '@/data/foods';
import { MealEntry, FoodItem, CaloricGoal } from '@/types/fitness';
import { authenticatedPost, authenticatedGet } from '@/utils/api';
import AIAssistant from '@/components/AIAssistant';

export default function NutritionScreen() {
  const router = useRouter();
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [caloricGoal, setCaloricGoal] = useState<CaloricGoal | null>(null);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snacks'>('breakfast');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState('100');
  const [loading, setLoading] = useState(true);
  const [caloricGoalError, setCaloricGoalError] = useState(false);

  useEffect(() => {
    loadMeals();
    loadCaloricGoal();
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
        // Calculate macros from calorie goal
        // Protein: 30% of calories (4 cal per gram)
        // Fat: 25% of calories (9 cal per gram)
        // Carbs: 45% of calories (4 cal per gram)
        const calories = goalData.dailyCalorieGoal;
        const proteinCalories = calories * 0.30;
        const fatCalories = calories * 0.25;
        const carbsCalories = calories * 0.45;
        
        const goal: CaloricGoal = {
          dailyCalorieGoal: calories,
          bmr: goalData.basalMetabolicRate || 0,
          tdee: calories,
          proteinGoal: Math.round(proteinCalories / 4), // 4 cal per gram
          carbsGoal: Math.round(carbsCalories / 4), // 4 cal per gram
          fatGoal: Math.round(fatCalories / 9), // 9 cal per gram
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

  // Use the caloric goal if available, otherwise show error state
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
    setShowFoodModal(true);
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
              We need your profile information to calculate your daily calorie goal.
              Please complete your profile setup.
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

        <View style={styles.caloriesCard}>
          <Text style={styles.caloriesLabel}>Calories</Text>
          <View style={styles.caloriesCircle}>
            <Text style={styles.caloriesValue}>{Math.round(consumed.calories)}</Text>
            <Text style={styles.caloriesGoal}>/ {goals.calories}</Text>
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

        <View style={styles.macrosCard}>
          <View style={styles.macroItem}>
            <Text style={styles.macroLabel}>Protein</Text>
            <Text style={styles.macroValue}>
              {Math.round(consumed.protein)}g / {goals.protein}g
            </Text>
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
            <Text style={styles.macroLabel}>Carbs</Text>
            <Text style={styles.macroValue}>
              {Math.round(consumed.carbs)}g / {goals.carbs}g
            </Text>
            <View style={styles.macroBar}>
              <View
                style={[
                  styles.macroBarFill,
                  { width: `${Math.min((consumed.carbs / goals.carbs) * 100, 100)}%` },
                  { backgroundColor: colors.warning },
                ]}
              />
            </View>
          </View>

          <View style={styles.macroItem}>
            <Text style={styles.macroLabel}>Fat</Text>
            <Text style={styles.macroValue}>
              {Math.round(consumed.fat)}g / {goals.fat}g
            </Text>
            <View style={styles.macroBar}>
              <View
                style={[
                  styles.macroBarFill,
                  { width: `${Math.min((consumed.fat / goals.fat) * 100, 100)}%` },
                  { backgroundColor: colors.error },
                ]}
              />
            </View>
          </View>
        </View>

        {(['breakfast', 'lunch', 'dinner', 'snacks'] as const).map((mealType) => (
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
            {getMealsByType(mealType).map((meal) => (
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
        ))}
      </ScrollView>

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
              <Text style={styles.selectedFoodName}>{selectedFood.name}</Text>
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
                  <Text style={styles.foodName}>{item.name}</Text>
                  <Text style={styles.foodDetails}>
                    {item.calories} cal • P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g
                  </Text>
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
  caloriesCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  caloriesLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  caloriesCircle: {
    alignItems: 'center',
    marginBottom: 16,
  },
  caloriesValue: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.primary,
  },
  caloriesGoal: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  caloriesBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.grey,
    borderRadius: 4,
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
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    gap: 16,
  },
  macroItem: {
    gap: 8,
  },
  macroLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '600',
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
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
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
    position: 'absolute',
    top: 12,
    right: 12,
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
  selectedFoodName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
