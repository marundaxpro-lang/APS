import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { z } from 'zod';

const fitnessProfileSchema = z.object({
  name: z.string().optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  goal: z.string(),
  trainingFrequency: z.number().int().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  weight: z.number().positive().optional(), // in kg
  height: z.number().positive().optional(), // in cm
  age: z.number().int().positive().optional(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
  equipmentType: z.enum(['gym', 'home', 'minimal']).optional(),
  focusAreas: z.array(z.string()).optional(), // e.g., ['chest', 'back', 'legs']
});

const calculateCaloriesSchema = z.object({
  gender: z.enum(['male', 'female', 'other']),
  weight: z.number().positive(), // in kg
  height: z.number().positive(), // in cm
  age: z.number().int().positive(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  goal: z.enum(['weight_loss', 'muscle_gain', 'strength', 'endurance']),
});

// Activity level multipliers
const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Calculate BMR using Mifflin-St Jeor equation
function calculateBMR(weight: number, height: number, age: number, gender: string): number {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

// Calculate TDEE
function calculateTDEE(bmr: number, activityLevel: string): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

// Adjust for goal
function adjustForGoal(tdee: number, goal: string): number {
  switch (goal) {
    case 'weight_loss':
      return Math.round(tdee - 500); // 500 calorie deficit
    case 'muscle_gain':
      return Math.round(tdee + 300); // 300 calorie surplus
    case 'strength':
      return Math.round(tdee + 200); // 200 calorie surplus
    case 'endurance':
      return tdee; // Maintenance
    default:
      return tdee;
  }
}

// Calculate macros
function calculateMacros(
  dailyCalories: number,
  weight: number
): { protein: number; fat: number; carbs: number } {
  const protein = Math.round(weight * 2); // 2g per kg
  const proteinCals = protein * 4;

  const fatGrams = Math.round((dailyCalories * 0.25) / 9); // 25% of calories from fat
  const fatCals = fatGrams * 9;

  const carbCals = dailyCalories - proteinCals - fatCals;
  const carbs = Math.round(carbCals / 4);

  return { protein, fat: fatGrams, carbs };
}

export function registerFitnessProfileRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/fitness-profile - Save or update fitness profile
   */
  app.fastify.post('/api/fitness-profile', async (
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const validation = fitnessProfileSchema.safeParse(request.body);
      if (!validation.success) {
        app.logger.warn({ errors: validation.error.issues }, 'Invalid fitness profile request body');
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const {
        name,
        experienceLevel,
        goal,
        trainingFrequency,
        gender,
        weight,
        height,
        age,
        activityLevel,
        equipmentType,
        focusAreas,
      } = validation.data;
      const userId = session.user.id;

      app.logger.info(
        {
          userId,
          goal,
          trainingFrequency,
          gender,
          equipmentType,
          focusAreasCount: focusAreas?.length || 0,
        },
        'Saving fitness profile'
      );

      // Check if profile exists
      const existingProfile = await app.db
        .select()
        .from(schema.fitnessProfiles)
        .where(eq(schema.fitnessProfiles.userId, userId))
        .limit(1);

      if (existingProfile.length > 0) {
        // Update existing profile
        const [updated] = await app.db
          .update(schema.fitnessProfiles)
          .set({
            name: name ?? existingProfile[0].name,
            experienceLevel: experienceLevel || existingProfile[0].experienceLevel,
            goal,
            trainingFrequency: trainingFrequency ?? existingProfile[0].trainingFrequency,
            gender: gender ?? existingProfile[0].gender,
            weight: weight ? (weight.toString() as any) : existingProfile[0].weight,
            height: height ? (height.toString() as any) : existingProfile[0].height,
            age: age ?? existingProfile[0].age,
            activityLevel: activityLevel ?? existingProfile[0].activityLevel,
            equipmentType: equipmentType ?? existingProfile[0].equipmentType,
            focusAreas: focusAreas ?? existingProfile[0].focusAreas,
          })
          .where(eq(schema.fitnessProfiles.userId, userId))
          .returning();

        app.logger.info({ profileId: updated.id }, 'Fitness profile updated successfully');

        return {
          id: updated.id,
          name: updated.name,
          experienceLevel: updated.experienceLevel,
          goal: updated.goal,
          trainingFrequency: updated.trainingFrequency,
          gender: updated.gender,
          weight: updated.weight,
          height: updated.height,
          age: updated.age,
          activityLevel: updated.activityLevel,
          equipmentType: updated.equipmentType,
          focusAreas: updated.focusAreas,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        };
      } else {
        // Create new profile
        const [profile] = await app.db
          .insert(schema.fitnessProfiles)
          .values({
            userId,
            name: name || null,
            experienceLevel: experienceLevel || 'beginner',
            goal,
            trainingFrequency: trainingFrequency || 3,
            gender: gender || null,
            weight: weight ? (weight.toString() as any) : null,
            height: height ? (height.toString() as any) : null,
            age: age || null,
            activityLevel: activityLevel || null,
            equipmentType: equipmentType || null,
            focusAreas: focusAreas || [],
          })
          .returning();

        app.logger.info({ profileId: profile.id }, 'Fitness profile created successfully');

        return {
          id: profile.id,
          name: profile.name,
          experienceLevel: profile.experienceLevel,
          goal: profile.goal,
          trainingFrequency: profile.trainingFrequency,
          gender: profile.gender,
          weight: profile.weight,
          height: profile.height,
          age: profile.age,
          activityLevel: profile.activityLevel,
          equipmentType: profile.equipmentType,
          focusAreas: profile.focusAreas,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        };
      }
    } catch (error) {
      app.logger.error({ err: error }, 'Error saving fitness profile');
      return reply.status(500).send({ error: 'Failed to save fitness profile' });
    }
  });

  /**
   * GET /api/fitness-profile - Get user's fitness profile
   */
  app.fastify.get('/api/fitness-profile', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const userId = session.user.id;

      app.logger.info({ userId }, 'Retrieving fitness profile');

      const profile = await app.db
        .select()
        .from(schema.fitnessProfiles)
        .where(eq(schema.fitnessProfiles.userId, userId))
        .limit(1);

      if (profile.length === 0) {
        app.logger.warn({ userId }, 'Fitness profile not found');
        return reply.status(404).send({ error: 'Fitness profile not found' });
      }

      const p = profile[0];

      app.logger.info(
        { profileId: p.id, goal: p.goal, equipmentType: p.equipmentType },
        'Fitness profile retrieved successfully'
      );

      return {
        id: p.id,
        name: p.name,
        experienceLevel: p.experienceLevel,
        goal: p.goal,
        trainingFrequency: p.trainingFrequency,
        gender: p.gender,
        weight: p.weight,
        height: p.height,
        age: p.age,
        activityLevel: p.activityLevel,
        equipmentType: p.equipmentType,
        focusAreas: p.focusAreas || [],
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Error retrieving fitness profile');
      return reply.status(500).send({ error: 'Failed to retrieve fitness profile' });
    }
  });

  /**
   * POST /api/fitness-profile/calculate-calories - Calculate caloric needs
   */
  app.fastify.post('/api/fitness-profile/calculate-calories', async (
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const validation = calculateCaloriesSchema.safeParse(request.body);
      if (!validation.success) {
        app.logger.warn({ errors: validation.error.issues }, 'Invalid calculate calories request body');
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { gender, weight, height, age, activityLevel, goal } = validation.data;
      const userId = session.user.id;

      app.logger.info(
        { gender, weight, height, age, activityLevel, goal },
        'Calculating caloric needs'
      );

      // Calculate BMR and TDEE
      const bmr = calculateBMR(weight, height, age, gender);
      const tdee = calculateTDEE(bmr, activityLevel);
      const dailyCalorieGoal = adjustForGoal(tdee, goal);
      const macros = calculateMacros(dailyCalorieGoal, weight);

      // Update fitness profile with new data
      await app.db
        .update(schema.fitnessProfiles)
        .set({
          gender,
          weight: weight.toString() as any,
          height: height.toString() as any,
          age,
          activityLevel,
        })
        .where(eq(schema.fitnessProfiles.userId, userId));

      app.logger.info({ userId }, 'Updated fitness profile with biometric data');

      // Check if caloric goal exists
      const existingGoal = await app.db
        .select()
        .from(schema.userCaloricGoals)
        .where(eq(schema.userCaloricGoals.userId, userId))
        .limit(1);

      if (existingGoal.length > 0) {
        // Update existing goal
        await app.db
          .update(schema.userCaloricGoals)
          .set({
            dailyCalorieGoal: Math.round(dailyCalorieGoal),
            basalMetabolicRate: Math.round(bmr),
            activityLevel,
          })
          .where(eq(schema.userCaloricGoals.userId, userId));

        app.logger.info(
          { dailyCalorieGoal: Math.round(dailyCalorieGoal) },
          'Updated user caloric goal'
        );
      } else {
        // Create new goal
        await app.db.insert(schema.userCaloricGoals).values({
          userId,
          dailyCalorieGoal: Math.round(dailyCalorieGoal),
          basalMetabolicRate: Math.round(bmr),
          activityLevel,
        });

        app.logger.info(
          { dailyCalorieGoal: Math.round(dailyCalorieGoal) },
          'Created new user caloric goal'
        );
      }

      app.logger.info(
        {
          bmr: Math.round(bmr),
          tdee: Math.round(tdee),
          dailyCalorieGoal: Math.round(dailyCalorieGoal),
          proteinGoal: macros.protein,
          carbsGoal: macros.carbs,
          fatGoal: macros.fat,
        },
        'Caloric calculation completed'
      );

      return {
        dailyCalorieGoal: Math.round(dailyCalorieGoal),
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        proteinGoal: macros.protein,
        carbsGoal: macros.carbs,
        fatGoal: macros.fat,
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Error calculating calories');
      return reply.status(500).send({ error: 'Failed to calculate calories' });
    }
  });
}
