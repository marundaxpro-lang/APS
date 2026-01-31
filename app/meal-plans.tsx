
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import ParticleBackground from '@/components/ParticleBackground';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import { MealPlan, CaloricGoal } from '@/types/fitness';

function resolveImageSource(source: string | number | undefined) {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source;
}

export default function MealPlansScreen() {
  const router = useRouter();
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [caloricGoal, setCaloricGoal] = useState<CaloricGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [plans, goalData] = await Promise.all([
        authenticatedGet('/api/meal-plans'),
        authenticatedGet('/api/dashboard/caloric-goal'),
      ]);
      
      if (plans) setMealPlans(plans);
      
      if (goalData) {
        // Calculate macros from calorie goal
        // Protein: 2g per kg bodyweight (estimate 30% of calories)
        // Fat: 25% of calories
        // Carbs: remaining calories
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
      }
      
      console.log('[MealPlans] Loaded meal plans and caloric goal');
    } catch (error) {
      console.error('[MealPlans] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMealPlan = async () => {
    if (!caloricGoal) {
      console.log('[MealPlans] No caloric goal available');
      return;
    }
    
    try {
      setGenerating(true);
      console.log('[MealPlans] Generating meal plan for', caloricGoal.dailyCalorieGoal, 'calories');
      
      const newPlan = await authenticatedPost('/api/meal-plans/generate', {
        calorieGoal: caloricGoal.dailyCalorieGoal,
        dietaryPreferences: [],
      });
      
      if (newPlan) {
        setMealPlans([newPlan, ...mealPlans]);
        console.log('[MealPlans] Generated new meal plan');
      }
    } catch (error) {
      console.error('[MealPlans] Error generating meal plan:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Meal Plans',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <ParticleBackground />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {caloricGoal && (
          <View style={styles.goalCard}>
            <Text style={styles.goalTitle}>Your Daily Goal</Text>
            <Text style={styles.goalCalories}>{caloricGoal.dailyCalorieGoal} cal</Text>
            <View style={styles.macrosRow}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{caloricGoal.proteinGoal}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{caloricGoal.carbsGoal}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{caloricGoal.fatGoal}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.generateButton, generating && styles.generateButtonDisabled]}
          onPress={generateMealPlan}
          disabled={generating || !caloricGoal}
        >
          {generating ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <IconSymbol
                ios_icon_name="sparkles"
                android_material_icon_name="auto-awesome"
                size={20}
                color="#ffffff"
              />
              <Text style={styles.generateButtonText}>Generate New Meal Plan</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>Your Meal Plans</Text>
          
          {mealPlans.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="fork.knife"
                android_material_icon_name="restaurant"
                size={60}
                color={colors.grey}
              />
              <Text style={styles.emptyText}>No meal plans yet</Text>
              <Text style={styles.emptySubtext}>Generate your first meal plan above!</Text>
            </View>
          ) : (
            mealPlans.map((plan) => (
              <View key={plan.id} style={styles.planCard}>
                <View style={styles.planHeader}>
                  <View style={styles.planHeaderLeft}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planDescription}>{plan.description}</Text>
                  </View>
                  <View style={styles.difficultyBadge}>
                    <Text style={styles.difficultyText}>{plan.difficultyLevel}</Text>
                  </View>
                </View>

                <View style={styles.planStats}>
                  <View style={styles.planStat}>
                    <IconSymbol
                      ios_icon_name="flame.fill"
                      android_material_icon_name="local-fire-department"
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={styles.planStatText}>{plan.totalCalories} cal</Text>
                  </View>
                  <View style={styles.planStat}>
                    <IconSymbol
                      ios_icon_name="clock.fill"
                      android_material_icon_name="access-time"
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={styles.planStatText}>{plan.prepTimeMinutes} min</Text>
                  </View>
                </View>

                <View style={styles.mealsGrid}>
                  {plan.meals.map((meal) => (
                    <View key={meal.id} style={styles.mealCard}>
                      {meal.imageUrl && (
                        <Image
                          source={resolveImageSource(meal.imageUrl)}
                          style={styles.mealImage}
                        />
                      )}
                      <View style={styles.mealInfo}>
                        <Text style={styles.mealType}>{meal.mealType}</Text>
                        <Text style={styles.mealName}>{meal.name}</Text>
                        <Text style={styles.mealCalories}>{meal.calories} cal</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  goalCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  goalTitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  goalCalories: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 16,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: 24,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  macroLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  generateButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  plansSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  planCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planHeaderLeft: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  difficultyBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  planStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  planStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planStatText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  mealsGrid: {
    gap: 12,
  },
  mealCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  mealImage: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  mealInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  mealType: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  mealCalories: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
