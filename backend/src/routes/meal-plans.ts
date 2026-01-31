import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { z } from 'zod';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';

const generateMealPlanSchema = z.object({
  calorieGoal: z.number().int().positive(),
  dietaryPreferences: z.array(z.string()).optional(),
});

const saveMealPlanSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

// Sample meals database
const SAMPLE_MEALS = {
  breakfast: [
    {
      name: 'Oatmeal with Berries',
      description: 'Hearty oatmeal topped with fresh berries and honey',
      calories: 350,
      protein: 10,
      carbs: 60,
      fat: 8,
      ingredients: [
        { name: 'Rolled oats', quantity: '50', unit: 'g' },
        { name: 'Mixed berries', quantity: '100', unit: 'g' },
        { name: 'Honey', quantity: '1', unit: 'tbsp' },
        { name: 'Almond milk', quantity: '250', unit: 'ml' },
      ],
      instructions: [
        'Bring almond milk to a boil in a saucepan',
        'Add oats and reduce heat to low',
        'Stir occasionally for 5 minutes until thickened',
        'Pour into bowl and top with berries',
        'Drizzle with honey',
      ],
      prepTimeMinutes: 10,
      imageUrl: 'https://images.unsplash.com/photo-1590080876-5b087a325e20?w=400',
    },
    {
      name: 'Greek Yogurt Parfait',
      description: 'Protein-rich yogurt with granola and fruit layers',
      calories: 320,
      protein: 18,
      carbs: 45,
      fat: 6,
      ingredients: [
        { name: 'Greek yogurt', quantity: '200', unit: 'g' },
        { name: 'Granola', quantity: '30', unit: 'g' },
        { name: 'Honey', quantity: '0.5', unit: 'tbsp' },
        { name: 'Mixed berries', quantity: '80', unit: 'g' },
      ],
      instructions: [
        'Layer half of yogurt in a glass',
        'Add berries on top',
        'Layer remaining yogurt',
        'Top with granola',
        'Drizzle with honey',
      ],
      prepTimeMinutes: 5,
      imageUrl: 'https://images.unsplash.com/photo-1585518419759-8cce6e9f3a84?w=400',
    },
    {
      name: 'Scrambled Eggs with Toast',
      description: 'Simple and nutritious breakfast with whole grain toast',
      calories: 380,
      protein: 16,
      carbs: 42,
      fat: 12,
      ingredients: [
        { name: 'Large eggs', quantity: '2', unit: 'count' },
        { name: 'Whole grain bread', quantity: '2', unit: 'slices' },
        { name: 'Butter', quantity: '1', unit: 'tsp' },
        { name: 'Salt and pepper', quantity: 'to taste', unit: '' },
      ],
      instructions: [
        'Toast bread until golden',
        'Melt butter in a non-stick pan over medium heat',
        'Beat eggs and pour into pan',
        'Stir frequently until eggs are cooked through (3-4 minutes)',
        'Season with salt and pepper',
        'Serve with toast',
      ],
      prepTimeMinutes: 8,
      imageUrl: 'https://images.unsplash.com/photo-1609312283952-fdf7aa3e0e89?w=400',
    },
    {
      name: 'Protein Smoothie',
      description: 'Quick high-protein breakfast smoothie',
      calories: 310,
      protein: 25,
      carbs: 38,
      fat: 5,
      ingredients: [
        { name: 'Protein powder', quantity: '25', unit: 'g' },
        { name: 'Banana', quantity: '1', unit: 'count' },
        { name: 'Greek yogurt', quantity: '100', unit: 'g' },
        { name: 'Almond milk', quantity: '300', unit: 'ml' },
      ],
      instructions: [
        'Add almond milk to blender',
        'Add protein powder',
        'Add banana and yogurt',
        'Blend until smooth',
        'Pour into glass and serve immediately',
      ],
      prepTimeMinutes: 5,
      imageUrl: 'https://images.unsplash.com/photo-1590080876-8a5c4f0c7e23?w=400',
    },
  ],
  lunch: [
    {
      name: 'Grilled Chicken Salad',
      description: 'Lean protein with fresh vegetables',
      calories: 420,
      protein: 35,
      carbs: 35,
      fat: 12,
      ingredients: [
        { name: 'Chicken breast', quantity: '150', unit: 'g' },
        { name: 'Mixed greens', quantity: '150', unit: 'g' },
        { name: 'Cherry tomatoes', quantity: '100', unit: 'g' },
        { name: 'Cucumber', quantity: '100', unit: 'g' },
        { name: 'Olive oil', quantity: '1', unit: 'tbsp' },
        { name: 'Balsamic vinegar', quantity: '1', unit: 'tbsp' },
      ],
      instructions: [
        'Season and grill chicken until cooked through',
        'Let rest for 5 minutes, then slice',
        'Combine greens, tomatoes, and cucumber in a bowl',
        'Drizzle with olive oil and vinegar',
        'Top with sliced chicken',
      ],
      prepTimeMinutes: 20,
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    },
    {
      name: 'Turkey Sandwich',
      description: 'Lean protein sandwich with fresh vegetables',
      calories: 380,
      protein: 28,
      carbs: 45,
      fat: 8,
      ingredients: [
        { name: 'Turkey breast', quantity: '100', unit: 'g' },
        { name: 'Whole wheat bread', quantity: '2', unit: 'slices' },
        { name: 'Lettuce', quantity: '30', unit: 'g' },
        { name: 'Tomato', quantity: '50', unit: 'g' },
        { name: 'Mustard', quantity: '1', unit: 'tbsp' },
      ],
      instructions: [
        'Toast bread lightly',
        'Spread mustard on both slices',
        'Layer turkey, lettuce, and tomato',
        'Close sandwich and cut diagonally',
      ],
      prepTimeMinutes: 5,
      imageUrl: 'https://images.unsplash.com/photo-1586190936529-4d51313c2e41?w=400',
    },
    {
      name: 'Quinoa Bowl',
      description: 'Complete protein with vegetables',
      calories: 410,
      protein: 14,
      carbs: 62,
      fat: 10,
      ingredients: [
        { name: 'Cooked quinoa', quantity: '150', unit: 'g' },
        { name: 'Chickpeas', quantity: '100', unit: 'g' },
        { name: 'Roasted vegetables', quantity: '150', unit: 'g' },
        { name: 'Tahini dressing', quantity: '2', unit: 'tbsp' },
      ],
      instructions: [
        'Combine cooked quinoa in a bowl',
        'Add chickpeas',
        'Top with roasted vegetables',
        'Drizzle with tahini dressing',
        'Mix well before eating',
      ],
      prepTimeMinutes: 25,
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    },
    {
      name: 'Pasta with Vegetables',
      description: 'Whole wheat pasta with fresh vegetables',
      calories: 440,
      protein: 14,
      carbs: 72,
      fat: 8,
      ingredients: [
        { name: 'Whole wheat pasta', quantity: '100', unit: 'g' },
        { name: 'Mixed vegetables', quantity: '200', unit: 'g' },
        { name: 'Olive oil', quantity: '1', unit: 'tbsp' },
        { name: 'Garlic', quantity: '2', unit: 'cloves' },
      ],
      instructions: [
        'Cook pasta according to package directions',
        'Heat olive oil and sauté garlic',
        'Add vegetables and cook for 5 minutes',
        'Drain pasta and combine with vegetables',
        'Toss and serve',
      ],
      prepTimeMinutes: 20,
      imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400',
    },
  ],
  dinner: [
    {
      name: 'Baked Salmon with Rice',
      description: 'Omega-3 rich salmon with brown rice',
      calories: 520,
      protein: 40,
      carbs: 52,
      fat: 14,
      ingredients: [
        { name: 'Salmon fillet', quantity: '150', unit: 'g' },
        { name: 'Brown rice', quantity: '60', unit: 'g (uncooked)' },
        { name: 'Lemon', quantity: '0.5', unit: 'count' },
        { name: 'Olive oil', quantity: '1', unit: 'tsp' },
        { name: 'Asparagus', quantity: '100', unit: 'g' },
      ],
      instructions: [
        'Preheat oven to 200°C',
        'Season salmon with lemon and olive oil',
        'Bake salmon for 15-18 minutes',
        'Cook rice according to package directions',
        'Lightly steam asparagus',
        'Plate and serve',
      ],
      prepTimeMinutes: 25,
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    },
    {
      name: 'Chicken Stir-Fry',
      description: 'Quick and healthy stir-fried chicken with vegetables',
      calories: 480,
      protein: 38,
      carbs: 48,
      fat: 11,
      ingredients: [
        { name: 'Chicken breast', quantity: '150', unit: 'g' },
        { name: 'Mixed vegetables', quantity: '250', unit: 'g' },
        { name: 'Brown rice', quantity: '60', unit: 'g (uncooked)' },
        { name: 'Soy sauce', quantity: '2', unit: 'tbsp' },
        { name: 'Sesame oil', quantity: '1', unit: 'tsp' },
      ],
      instructions: [
        'Cook rice according to package directions',
        'Cut chicken into bite-sized pieces',
        'Heat sesame oil in a wok or large pan',
        'Stir-fry chicken until cooked through',
        'Add vegetables and stir-fry until tender-crisp',
        'Add soy sauce and toss',
        'Serve over rice',
      ],
      prepTimeMinutes: 20,
      imageUrl: 'https://images.unsplash.com/photo-1609312283952-fdf7aa3e0e89?w=400',
    },
    {
      name: 'Beef with Sweet Potato',
      description: 'Lean beef with nutrient-dense sweet potato',
      calories: 510,
      protein: 38,
      carbs: 55,
      fat: 12,
      ingredients: [
        { name: 'Lean beef', quantity: '150', unit: 'g' },
        { name: 'Sweet potato', quantity: '200', unit: 'g' },
        { name: 'Broccoli', quantity: '150', unit: 'g' },
        { name: 'Olive oil', quantity: '1', unit: 'tbsp' },
      ],
      instructions: [
        'Cube sweet potato and roast at 200°C for 20 minutes',
        'Season and cook beef in a pan until desired doneness',
        'Steam broccoli until tender-crisp',
        'Plate beef with sweet potato and broccoli',
      ],
      prepTimeMinutes: 25,
      imageUrl: 'https://images.unsplash.com/photo-1627873649417-af36141a4d77?w=400',
    },
    {
      name: 'Tofu Curry',
      description: 'Plant-based protein with aromatic curry sauce',
      calories: 420,
      protein: 18,
      carbs: 58,
      fat: 10,
      ingredients: [
        { name: 'Firm tofu', quantity: '200', unit: 'g' },
        { name: 'Coconut milk', quantity: '200', unit: 'ml' },
        { name: 'Mixed vegetables', quantity: '200', unit: 'g' },
        { name: 'Curry paste', quantity: '2', unit: 'tbsp' },
        { name: 'Brown rice', quantity: '60', unit: 'g (uncooked)' },
      ],
      instructions: [
        'Cook rice according to package directions',
        'Press tofu and cut into cubes',
        'Heat curry paste in a pan',
        'Add coconut milk and bring to simmer',
        'Add tofu and vegetables',
        'Simmer for 15 minutes',
        'Serve over rice',
      ],
      prepTimeMinutes: 25,
      imageUrl: 'https://images.unsplash.com/photo-1537314727592-0b5ca0ae41a6?w=400',
    },
  ],
  snack: [
    {
      name: 'Protein Shake',
      description: 'Quick protein boost',
      calories: 200,
      protein: 20,
      carbs: 25,
      fat: 3,
      ingredients: [
        { name: 'Protein powder', quantity: '25', unit: 'g' },
        { name: 'Water or milk', quantity: '300', unit: 'ml' },
        { name: 'Banana', quantity: '0.5', unit: 'count' },
      ],
      instructions: [
        'Add liquid to blender',
        'Add protein powder and banana',
        'Blend until smooth',
        'Serve immediately',
      ],
      prepTimeMinutes: 3,
      imageUrl: 'https://images.unsplash.com/photo-1590080876-8a5c4f0c7e23?w=400',
    },
    {
      name: 'Nuts and Fruits',
      description: 'Balanced snack with healthy fats and carbs',
      calories: 180,
      protein: 6,
      carbs: 22,
      fat: 8,
      ingredients: [
        { name: 'Almonds', quantity: '25', unit: 'g' },
        { name: 'Apple', quantity: '1', unit: 'count' },
      ],
      instructions: [
        'Slice apple',
        'Portion out almonds',
        'Enjoy together',
      ],
      prepTimeMinutes: 2,
      imageUrl: 'https://images.unsplash.com/photo-1585518419759-8cce6e9f3a84?w=400',
    },
    {
      name: 'Rice Cakes with Peanut Butter',
      description: 'Simple and satisfying snack',
      calories: 190,
      protein: 7,
      carbs: 24,
      fat: 8,
      ingredients: [
        { name: 'Rice cakes', quantity: '2', unit: 'count' },
        { name: 'Peanut butter', quantity: '1.5', unit: 'tbsp' },
      ],
      instructions: [
        'Spread peanut butter on rice cakes',
        'Enjoy as is or add banana slices',
      ],
      prepTimeMinutes: 2,
      imageUrl: 'https://images.unsplash.com/photo-1586190936529-4d51313c2e41?w=400',
    },
    {
      name: 'Cottage Cheese Bowl',
      description: 'High protein snack with fruit',
      calories: 160,
      protein: 24,
      carbs: 12,
      fat: 2,
      ingredients: [
        { name: 'Cottage cheese', quantity: '150', unit: 'g' },
        { name: 'Berries', quantity: '80', unit: 'g' },
      ],
      instructions: [
        'Scoop cottage cheese into bowl',
        'Top with fresh berries',
        'Enjoy cold',
      ],
      prepTimeMinutes: 2,
      imageUrl: 'https://images.unsplash.com/photo-1585518419759-8cce6e9f3a84?w=400',
    },
  ],
};

export function registerMealPlanRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/meal-plans - Get user's saved meal plans
   */
  app.fastify.get('/api/meal-plans', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const userId = session.user.id;

      const mealPlansData = await app.db
        .select()
        .from(schema.mealPlans)
        .where(eq(schema.mealPlans.userId, userId))
        .limit(100);

      // Get meals for each plan
      const plansWithMeals = await Promise.all(
        mealPlansData.map(async (plan) => {
          const meals = await app.db
            .select()
            .from(schema.mealPlanMeals)
            .where(eq(schema.mealPlanMeals.mealPlanId, plan.id))
            .limit(100);

          return {
            id: plan.id,
            name: plan.name,
            description: plan.description,
            totalCalories: plan.totalCalories,
            totalProtein: plan.totalProtein,
            totalCarbs: plan.totalCarbs,
            totalFat: plan.totalFat,
            difficultyLevel: plan.difficultyLevel,
            prepTimeMinutes: plan.prepTimeMinutes,
            meals: meals.map((m) => ({
              mealType: m.mealType,
              name: m.name,
              description: m.description,
              calories: m.calories,
              protein: m.protein,
              carbs: m.carbs,
              fat: m.fat,
              ingredients: m.ingredients,
              instructions: m.instructions,
              imageUrl: m.imageUrl,
              prepTimeMinutes: m.prepTimeMinutes,
            })),
          };
        })
      );

      return plansWithMeals;
    } catch (error) {
      app.logger.error(error, 'Error retrieving meal plans');
      return reply.status(500).send({ error: 'Failed to retrieve meal plans' });
    }
  });

  /**
   * GET /api/meal-plans/:id - Get specific meal plan with meals
   */
  app.fastify.get('/api/meal-plans/:id', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const { id } = request.params;
      const userId = session.user.id;

      const plan = await app.db
        .select()
        .from(schema.mealPlans)
        .where(and(eq(schema.mealPlans.id, id), eq(schema.mealPlans.userId, userId)))
        .limit(1);

      if (plan.length === 0) {
        return reply.status(404).send({ error: 'Meal plan not found' });
      }

      const meals = await app.db
        .select()
        .from(schema.mealPlanMeals)
        .where(eq(schema.mealPlanMeals.mealPlanId, id))
        .limit(100);

      const p = plan[0];
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        totalCalories: p.totalCalories,
        totalProtein: p.totalProtein,
        totalCarbs: p.totalCarbs,
        totalFat: p.totalFat,
        difficultyLevel: p.difficultyLevel,
        prepTimeMinutes: p.prepTimeMinutes,
        meals: meals.map((m) => ({
          mealType: m.mealType,
          name: m.name,
          description: m.description,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          ingredients: m.ingredients,
          instructions: m.instructions,
          imageUrl: m.imageUrl,
          prepTimeMinutes: m.prepTimeMinutes,
        })),
        createdAt: p.createdAt,
      };
    } catch (error) {
      app.logger.error(error, 'Error retrieving meal plan');
      return reply.status(500).send({ error: 'Failed to retrieve meal plan' });
    }
  });

  /**
   * POST /api/meal-plans/generate - Generate AI-powered meal plan
   */
  app.fastify.post('/api/meal-plans/generate', async (
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const validation = generateMealPlanSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { calorieGoal, dietaryPreferences } = validation.data;

      app.logger.info(
        { calorieGoal, dietaryPreferences },
        'Generating AI meal plan'
      );

      // Generate AI meal plan guidance
      const prompt = `Create a detailed daily meal plan with the following requirements:
- Total daily calories: ${calorieGoal}
- Dietary preferences: ${dietaryPreferences?.join(', ') || 'None'}
- Include breakfast, lunch, dinner, and snack
- Ensure balanced macronutrients (protein, carbs, fats)
- Keep meals practical and easy to prepare

Format the response as a JSON object with this structure:
{
  "meals": [
    {
      "mealType": "breakfast|lunch|dinner|snack",
      "name": "meal name",
      "description": "short description",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number
    }
  ],
  "totalCalories": number,
  "totalProtein": number,
  "totalCarbs": number,
  "totalFat": number,
  "recommendations": "brief dietary recommendations"
}`;

      const { text } = await generateText({
        model: gateway('openai/gpt-5-mini'),
        system: 'You are a nutrition expert. Respond only with valid JSON.',
        prompt,
        temperature: 0.7,
      });

      // Parse AI response
      let mealPlanGuidance;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          mealPlanGuidance = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (err) {
        app.logger.error(err, 'Failed to parse AI response');
        return reply.status(500).send({ error: 'Failed to generate meal plan' });
      }

      // Build meal plan from samples + AI guidance
      const meals: any[] = [];
      let totalCals = 0,
        totalProtein = 0,
        totalCarbs = 0,
        totalFat = 0;

      const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

      for (const mealType of mealTypes) {
        const sampleMeals = (SAMPLE_MEALS as any)[mealType] || [];
        if (sampleMeals.length > 0) {
          const randomMeal = sampleMeals[Math.floor(Math.random() * sampleMeals.length)];
          meals.push({
            ...randomMeal,
            mealType,
          });

          totalCals += randomMeal.calories;
          totalProtein += randomMeal.protein;
          totalCarbs += randomMeal.carbs;
          totalFat += randomMeal.fat;
        }
      }

      // Determine difficulty based on calorie goal
      let difficultyLevel = 'medium';
      if (calorieGoal < 1800) difficultyLevel = 'easy';
      if (calorieGoal > 2500) difficultyLevel = 'hard';

      // Calculate total prep time
      const totalPrepTime = meals.reduce((sum, m) => sum + (m.prepTimeMinutes || 0), 0);

      return {
        name: `${calorieGoal} Calorie Meal Plan`,
        description: `AI-generated personalized meal plan with ${calorieGoal} calories${
          dietaryPreferences?.length ? ` (${dietaryPreferences.join(', ')})` : ''
        }`,
        totalCalories: totalCals,
        totalProtein: totalProtein,
        totalCarbs: totalCarbs,
        totalFat: totalFat,
        difficultyLevel,
        prepTimeMinutes: totalPrepTime,
        meals: meals.map((m) => ({
          mealType: m.mealType,
          name: m.name,
          description: m.description,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          ingredients: m.ingredients,
          instructions: m.instructions,
          imageUrl: m.imageUrl,
          prepTimeMinutes: m.prepTimeMinutes,
        })),
        recommendations: mealPlanGuidance.recommendations,
      };
    } catch (error) {
      app.logger.error(error, 'Error generating meal plan');
      return reply.status(500).send({ error: 'Failed to generate meal plan' });
    }
  });

  /**
   * POST /api/meal-plans/:id/save - Save a generated meal plan
   */
  app.fastify.post('/api/meal-plans/:id/save', async (
    request: FastifyRequest<{ Body: any; Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const validation = saveMealPlanSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { name, description } = validation.data;
      const userId = session.user.id;

      // Type the request body properly
      const body = request.body as {
        meals?: Array<any>;
        totalCalories?: number;
        totalProtein?: number;
        totalCarbs?: number;
        totalFat?: number;
        difficultyLevel?: string;
        prepTimeMinutes?: number;
      };

      const mealData = body.meals;

      if (!mealData) {
        return reply.status(400).send({ error: 'Meal data not provided' });
      }

      // Create meal plan
      const [mealPlan] = await app.db
        .insert(schema.mealPlans)
        .values({
          userId,
          name,
          description: description || null,
          totalCalories: body.totalCalories || 0,
          totalProtein: body.totalProtein || 0,
          totalCarbs: body.totalCarbs || 0,
          totalFat: body.totalFat || 0,
          difficultyLevel: (body.difficultyLevel as 'easy' | 'medium' | 'hard') || 'medium',
          prepTimeMinutes: body.prepTimeMinutes || 0,
        })
        .returning();

      // Add meals to plan
      const savedMeals = await Promise.all(
        mealData.map((meal: any) =>
          app.db
            .insert(schema.mealPlanMeals)
            .values({
              mealPlanId: mealPlan.id,
              mealType: meal.mealType,
              name: meal.name,
              description: meal.description,
              calories: meal.calories,
              protein: meal.protein,
              carbs: meal.carbs,
              fat: meal.fat,
              ingredients: meal.ingredients || [],
              instructions: meal.instructions || [],
              imageUrl: meal.imageUrl || null,
              prepTimeMinutes: meal.prepTimeMinutes || 0,
            })
            .returning()
        )
      );

      return {
        id: mealPlan.id,
        name: mealPlan.name,
        description: mealPlan.description,
        totalCalories: mealPlan.totalCalories,
        totalProtein: mealPlan.totalProtein,
        totalCarbs: mealPlan.totalCarbs,
        totalFat: mealPlan.totalFat,
        difficultyLevel: mealPlan.difficultyLevel,
        prepTimeMinutes: mealPlan.prepTimeMinutes,
        meals: savedMeals.flat().map((m) => ({
          mealType: m[0].mealType,
          name: m[0].name,
          description: m[0].description,
          calories: m[0].calories,
          protein: m[0].protein,
          carbs: m[0].carbs,
          fat: m[0].fat,
          ingredients: m[0].ingredients,
          instructions: m[0].instructions,
          imageUrl: m[0].imageUrl,
          prepTimeMinutes: m[0].prepTimeMinutes,
        })),
      };
    } catch (error) {
      app.logger.error(error, 'Error saving meal plan');
      return reply.status(500).send({ error: 'Failed to save meal plan' });
    }
  });
}
