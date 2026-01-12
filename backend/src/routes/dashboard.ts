import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte, lte } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { z } from 'zod';

const calculateCaloricGoalSchema = z.object({
  age: z.number().int().positive(),
  gender: z.enum(['male', 'female', 'other']),
  weight: z.number().positive(), // in kg
  height: z.number().positive(), // in cm
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  goal: z.enum(['weight_loss', 'maintenance', 'weight_gain']),
});

// Activity level multipliers
const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Calculate Basal Metabolic Rate using Mifflin-St Jeor equation
function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female' | 'other'
): number {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

// Calculate TDEE (Total Daily Energy Expenditure)
function calculateTDEE(bmr: number, activityLevel: string): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

// Adjust for goal
function adjustForGoal(tdee: number, goal: 'weight_loss' | 'maintenance' | 'weight_gain'): number {
  switch (goal) {
    case 'weight_loss':
      return Math.round(tdee * 0.85); // 15% deficit
    case 'maintenance':
      return tdee;
    case 'weight_gain':
      return Math.round(tdee * 1.1); // 10% surplus
  }
}

export function registerDashboardRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/dashboard/calculate-caloric-goal - Calculate and store caloric goal
   */
  app.fastify.post('/api/dashboard/calculate-caloric-goal', async (
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const validation = calculateCaloricGoalSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { age, gender, weight, height, activityLevel, goal } = validation.data;
      const userId = session.user.id;

      // Calculate BMR and TDEE
      const bmr = calculateBMR(weight, height, age, gender);
      const tdee = calculateTDEE(bmr, activityLevel);
      const dailyCalorieGoal = adjustForGoal(tdee, goal);

      // Check if goal already exists
      const existingGoal = await app.db
        .select()
        .from(schema.userCaloricGoals)
        .where(eq(schema.userCaloricGoals.userId, userId))
        .limit(1);

      let result;
      if (existingGoal.length > 0) {
        // Update existing goal
        [result] = await app.db
          .update(schema.userCaloricGoals)
          .set({
            dailyCalorieGoal,
            basalMetabolicRate: Math.round(bmr),
            activityLevel,
          })
          .where(eq(schema.userCaloricGoals.userId, userId))
          .returning();
      } else {
        // Create new goal
        [result] = await app.db
          .insert(schema.userCaloricGoals)
          .values({
            userId,
            dailyCalorieGoal,
            basalMetabolicRate: Math.round(bmr),
            activityLevel,
          })
          .returning();
      }

      return {
        id: result.id,
        dailyCalorieGoal: result.dailyCalorieGoal,
        basalMetabolicRate: result.basalMetabolicRate,
        activityLevel: result.activityLevel,
        calculatedAt: result.calculatedAt,
      };
    } catch (error) {
      app.logger.error(error, 'Error calculating caloric goal');
      return reply.status(500).send({ error: 'Failed to calculate caloric goal' });
    }
  });

  /**
   * GET /api/dashboard/caloric-goal - Get user's caloric goal
   */
  app.fastify.get('/api/dashboard/caloric-goal', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const userId = session.user.id;

      const goal = await app.db
        .select()
        .from(schema.userCaloricGoals)
        .where(eq(schema.userCaloricGoals.userId, userId))
        .limit(1);

      if (goal.length === 0) {
        return reply.status(404).send({ error: 'Caloric goal not found. Please calculate it first.' });
      }

      const g = goal[0];
      return {
        id: g.id,
        dailyCalorieGoal: g.dailyCalorieGoal,
        basalMetabolicRate: g.basalMetabolicRate,
        activityLevel: g.activityLevel,
        calculatedAt: g.calculatedAt,
        updatedAt: g.updatedAt,
      };
    } catch (error) {
      app.logger.error(error, 'Error retrieving caloric goal');
      return reply.status(500).send({ error: 'Failed to retrieve caloric goal' });
    }
  });

  /**
   * GET /api/dashboard/home - Home screen dashboard with caloric progress
   */
  app.fastify.get('/api/dashboard/home', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const userId = session.user.id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get user's caloric goal
      const goalRecord = await app.db
        .select()
        .from(schema.userCaloricGoals)
        .where(eq(schema.userCaloricGoals.userId, userId))
        .limit(1);

      if (goalRecord.length === 0) {
        return reply.status(400).send({
          error: 'Caloric goal not set. Please calculate it first.',
          requiresOnboarding: true,
        });
      }

      const dailyCalorieGoal = goalRecord[0].dailyCalorieGoal;

      // Get today's nutrition logs
      const todayNutritionLogs = await app.db
        .select()
        .from(schema.nutritionLogs)
        .where(
          and(
            eq(schema.nutritionLogs.userId, userId),
            gte(schema.nutritionLogs.logDate, today),
            lte(schema.nutritionLogs.logDate, tomorrow)
          )
        );

      // Calculate total calories consumed today
      const totalCaloriesConsumed = todayNutritionLogs.reduce((sum, log) => {
        const calories = parseFloat(log.totalCalories as any) || 0;
        return sum + calories;
      }, 0);

      const caloriesRemaining = dailyCalorieGoal - totalCaloriesConsumed;
      const percentageConsumed = Math.min(100, (totalCaloriesConsumed / dailyCalorieGoal) * 100);

      return {
        dailyCalorieGoal,
        caloriesConsumed: totalCaloriesConsumed,
        caloriesRemaining: Math.max(0, caloriesRemaining),
        percentageConsumed: Math.round(percentageConsumed * 10) / 10,
        goalMet: totalCaloriesConsumed >= dailyCalorieGoal,
        mealsLogged: todayNutritionLogs.length,
        lastUpdated: new Date(),
      };
    } catch (error) {
      app.logger.error(error, 'Error retrieving dashboard data');
      return reply.status(500).send({ error: 'Failed to retrieve dashboard data' });
    }
  });

  /**
   * GET /api/dashboard/summary - Weekly/monthly summary stats
   */
  app.fastify.get('/api/dashboard/summary', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const userId = session.user.id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get past 7 days
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get nutrition logs for past week
      const weekNutritionLogs = await app.db
        .select()
        .from(schema.nutritionLogs)
        .where(
          and(
            eq(schema.nutritionLogs.userId, userId),
            gte(schema.nutritionLogs.logDate, sevenDaysAgo)
          )
        );

      // Get workout sessions for past week
      const weekWorkouts = await app.db
        .select()
        .from(schema.workoutSessions)
        .where(
          and(
            eq(schema.workoutSessions.userId, userId),
            gte(schema.workoutSessions.completedDate, sevenDaysAgo)
          )
        );

      // Calculate stats
      const totalCaloriesWeek = weekNutritionLogs.reduce((sum, log) => {
        return sum + (parseFloat(log.totalCalories as any) || 0);
      }, 0);

      const averageDailyCalories = Math.round(totalCaloriesWeek / 7);
      const totalProtein = weekNutritionLogs.reduce((sum, log) => {
        return sum + (parseFloat(log.totalProtein as any) || 0);
      }, 0);

      const totalWorkoutMinutes = weekWorkouts.reduce((sum, workout) => {
        return sum + (workout.durationMinutes || 0);
      }, 0);

      return {
        weekSummary: {
          totalCalories: totalCaloriesWeek,
          averageDailyCalories,
          totalProtein: Math.round(totalProtein * 10) / 10,
          totalWorkoutMinutes,
          mealsLogged: weekNutritionLogs.length,
          workoutsCompleted: weekWorkouts.length,
        },
        dateRange: {
          start: sevenDaysAgo,
          end: today,
        },
      };
    } catch (error) {
      app.logger.error(error, 'Error retrieving summary data');
      return reply.status(500).send({ error: 'Failed to retrieve summary data' });
    }
  });
}
