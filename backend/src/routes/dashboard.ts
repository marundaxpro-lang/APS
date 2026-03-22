import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { z } from 'zod';

const calculateCaloricGoalSchema = z.object({
  age: z.number().optional(),
  gender: z.string().optional(),
  weight: z.number().optional(),
  height: z.number().optional(),
  activity_level: z.string().optional(),
  goal: z.string().optional(),
});

/**
 * Normalize goal string to standard format
 */
function normalizeGoal(goal: any): 'weight_loss' | 'weight_gain' | 'maintenance' {
  if (!goal || typeof goal !== 'string') {
    return 'maintenance';
  }

  const normalized = goal.toLowerCase().replace(/-/g, '_');

  if (['weight_loss', 'weight loss', 'lose_weight', 'lose weight'].includes(normalized)) {
    return 'weight_loss';
  }

  if (
    [
      'muscle',
      'strength',
      'build_muscle',
      'build muscle',
      'weight_gain',
      'weight gain',
      'gain',
      'gain_muscle',
      'gain muscle',
    ].includes(normalized)
  ) {
    return 'weight_gain';
  }

  return 'maintenance';
}

/**
 * Get activity multiplier based on activity level
 */
function getActivityMultiplier(activityLevel: string): number {
  const normalized = activityLevel?.toLowerCase().replace(/_/g, ' ') || 'moderate';

  switch (normalized) {
    case 'light':
    case 'sedentary':
      return 1.375;
    case 'moderate':
      return 1.55;
    case 'active':
      return 1.725;
    case 'very active':
    case 'very_active':
      return 1.9;
    default:
      return 1.55;
  }
}

/**
 * Calculate macro split based on goal
 */
function getMacroSplit(
  goal: 'weight_loss' | 'weight_gain' | 'maintenance'
): { proteinPercent: number; carbsPercent: number; fatPercent: number } {
  switch (goal) {
    case 'weight_loss':
      return { proteinPercent: 30, carbsPercent: 40, fatPercent: 30 };
    case 'weight_gain':
      return { proteinPercent: 25, carbsPercent: 50, fatPercent: 25 };
    case 'maintenance':
    default:
      return { proteinPercent: 25, carbsPercent: 45, fatPercent: 30 };
  }
}

/**
 * Calculate macros in grams
 */
function calculateMacros(
  calories: number,
  macroSplit: { proteinPercent: number; carbsPercent: number; fatPercent: number }
): { protein: number; carbs: number; fat: number } {
  return {
    protein: Math.round((macroSplit.proteinPercent * calories) / 4),
    carbs: Math.round((macroSplit.carbsPercent * calories) / 4),
    fat: Math.round((macroSplit.fatPercent * calories) / 9),
  };
}

export function registerDashboardRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/dashboard/calculate-caloric-goal - Calculate daily caloric goal based on user metrics
   */
  app.fastify.post(
    '/api/dashboard/calculate-caloric-goal',
    {
      schema: {
        description: 'Calculate daily caloric goal and macros based on user metrics',
        tags: ['dashboard'],
        body: {
          type: 'object',
          properties: {
            age: { type: 'number', description: 'Age in years' },
            gender: { type: 'string', description: 'male, female, or other' },
            weight: { type: 'number', description: 'Weight in kg' },
            height: { type: 'number', description: 'Height in cm' },
            activity_level: {
              type: 'string',
              description: 'sedentary, light, moderate, active, or very_active',
            },
            goal: {
              type: 'string',
              description: 'weight_loss, weight_gain, or maintenance',
            },
          },
        },
        response: {
          200: {
            description: 'Caloric goal calculated successfully',
            type: 'object',
            properties: {
              dailyCalorieGoal: { type: 'number' },
              basalMetabolicRate: { type: 'number' },
              protein: { type: 'number' },
              carbs: { type: 'number' },
              fat: { type: 'number' },
              activityLevel: { type: 'string' },
              goal: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply): Promise<any> => {
      try {
        const validation = calculateCaloricGoalSchema.safeParse(request.body);
        const data = validation.data || {};

        // Apply defaults for missing/invalid fields
        const age = typeof data.age === 'number' && data.age > 0 ? data.age : 30;
        const gender =
          data.gender?.toLowerCase() === 'female' || data.gender?.toLowerCase() === 'other'
            ? data.gender.toLowerCase()
            : 'male';
        const weight = typeof data.weight === 'number' && data.weight > 0 ? data.weight : 75;
        const height = typeof data.height === 'number' && data.height > 0 ? data.height : 175;
        const activityLevel = data.activity_level || 'moderate';

        // Normalize goal
        const goal = normalizeGoal(data.goal);

        // Calculate BMR using Mifflin-St Jeor formula
        let bmr: number;
        if (gender === 'female') {
          bmr = 10 * weight + 6.25 * height - 5 * age - 161;
        } else {
          bmr = 10 * weight + 6.25 * height - 5 * age + 5;
        }

        // Calculate TDEE with activity multiplier
        const activityMultiplier = getActivityMultiplier(activityLevel);
        let tdee = bmr * activityMultiplier;

        // Apply goal adjustments
        if (goal === 'weight_loss') {
          tdee -= 500;
        } else if (goal === 'weight_gain') {
          tdee += 300;
        }

        // Round to nearest 50 calories for cleaner numbers
        const dailyCalorieGoal = Math.round(tdee / 50) * 50;

        // Get macro split and calculate macros
        const macroSplit = getMacroSplit(goal);
        const macros = calculateMacros(dailyCalorieGoal, macroSplit);

        const result = {
          dailyCalorieGoal,
          basalMetabolicRate: Math.round(bmr),
          protein: macros.protein,
          carbs: macros.carbs,
          fat: macros.fat,
          activityLevel,
          goal,
        };

        // If authenticated, save to database
        const session = await requireAuth(request, reply);
        if (session) {
          try {
            const userId = session.user.id;

            // Check if record exists
            const existing = await app.db
              .select()
              .from(schema.userCaloricGoals)
              .where(eq(schema.userCaloricGoals.userId, userId))
              .limit(1);

            if (existing.length > 0) {
              // Update existing record
              await app.db
                .update(schema.userCaloricGoals)
                .set({
                  dailyCalorieGoal,
                  basalMetabolicRate: Math.round(bmr),
                  activityLevel,
                  calculatedAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(schema.userCaloricGoals.userId, userId));

              app.logger.info(
                { userId, dailyCalorieGoal, bmr: Math.round(bmr) },
                'User caloric goal updated'
              );
            } else {
              // Create new record
              await app.db.insert(schema.userCaloricGoals).values({
                userId,
                dailyCalorieGoal,
                basalMetabolicRate: Math.round(bmr),
                activityLevel,
                calculatedAt: new Date(),
                updatedAt: new Date(),
              });

              app.logger.info(
                { userId, dailyCalorieGoal, bmr: Math.round(bmr) },
                'User caloric goal created'
              );
            }
          } catch (dbError) {
            app.logger.error(
              { err: dbError, userId: session.user.id },
              'Failed to save caloric goal to database'
            );
            // Don't throw - just return the calculated values
          }
        }

        return result;
      } catch (error) {
        // Catch any unexpected errors and return default values
        app.logger.error({ err: error }, 'Error calculating caloric goal, returning defaults');

        const defaultResult = {
          dailyCalorieGoal: 2000,
          basalMetabolicRate: 1750,
          protein: 150,
          carbs: 225,
          fat: 67,
          activityLevel: 'moderate',
          goal: 'maintenance',
        };

        return defaultResult;
      }
    }
  );
}
