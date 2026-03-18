import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';
import { z } from 'zod';

const onboardingSchema = z.object({
  name: z.string().optional(),
  fitness_goal: z.string().optional(),
  fitness_level: z.string().optional(),
  age: z.number().optional(),
  weight: z.number().optional(),
  height: z.number().optional(),
  workout_days_per_week: z.number().optional(),
  preferred_workout_type: z.string().optional(),
  dietary_preference: z.string().optional(),
});

export function registerUserRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * PUT /api/user/onboarding - Update user onboarding information
   */
  app.fastify.put(
    '/api/user/onboarding',
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply): Promise<any> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      try {
        const validation = onboardingSchema.safeParse(request.body);
        if (!validation.success) {
          app.logger.warn({ errors: validation.error.issues }, 'Invalid onboarding request');
          return reply.status(400).send({ error: 'Invalid request body' });
        }

        const userId = session.user.id;
        const data = validation.data;

        app.logger.info({ userId }, 'Updating user onboarding information');

        // Build update object with only provided fields
        const updateData: any = {
          onboardingCompleted: true,
          updatedAt: new Date(),
        };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.fitness_goal !== undefined) updateData.fitnessGoal = data.fitness_goal;
        if (data.fitness_level !== undefined) updateData.fitnessLevel = data.fitness_level;
        if (data.age !== undefined) updateData.age = data.age.toString();
        if (data.weight !== undefined) updateData.weight = data.weight.toString();
        if (data.height !== undefined) updateData.height = data.height.toString();
        if (data.workout_days_per_week !== undefined)
          updateData.workoutDaysPerWeek = data.workout_days_per_week.toString();
        if (data.preferred_workout_type !== undefined)
          updateData.preferredWorkoutType = data.preferred_workout_type;
        if (data.dietary_preference !== undefined)
          updateData.dietaryPreference = data.dietary_preference;

        // Update user in database
        const [updatedUser] = await app.db
          .update(user)
          .set(updateData)
          .where(eq(user.id, userId))
          .returning();

        app.logger.info({ userId }, 'User onboarding information updated successfully');

        return {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          onboardingCompleted: updatedUser.onboardingCompleted,
          fitnessGoal: updatedUser.fitnessGoal,
          fitnessLevel: updatedUser.fitnessLevel,
          age: updatedUser.age ? parseInt(updatedUser.age) : null,
          weight: updatedUser.weight ? parseFloat(updatedUser.weight) : null,
          height: updatedUser.height ? parseFloat(updatedUser.height) : null,
          workoutDaysPerWeek: updatedUser.workoutDaysPerWeek
            ? parseInt(updatedUser.workoutDaysPerWeek)
            : null,
          preferredWorkoutType: updatedUser.preferredWorkoutType,
          dietaryPreference: updatedUser.dietaryPreference,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        };
      } catch (error) {
        app.logger.error({ err: error }, 'Error updating user onboarding');
        return reply.status(500).send({ error: 'Failed to update user onboarding' });
      }
    }
  );

  /**
   * GET /api/user/profile - Get user profile with onboarding information
   */
  app.fastify.get(
    '/api/user/profile',
    async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      try {
        const userId = session.user.id;

        app.logger.info({ userId }, 'Retrieving user profile');

        const [userRecord] = await app.db
          .select()
          .from(user)
          .where(eq(user.id, userId))
          .limit(1);

        if (!userRecord) {
          app.logger.warn({ userId }, 'User not found');
          return reply.status(404).send({ error: 'User not found' });
        }

        app.logger.info({ userId }, 'User profile retrieved successfully');

        return {
          id: userRecord.id,
          name: userRecord.name,
          email: userRecord.email,
          emailVerified: userRecord.emailVerified,
          image: userRecord.image,
          onboardingCompleted: userRecord.onboardingCompleted,
          fitnessGoal: userRecord.fitnessGoal,
          fitnessLevel: userRecord.fitnessLevel,
          age: userRecord.age ? parseInt(userRecord.age) : null,
          weight: userRecord.weight ? parseFloat(userRecord.weight) : null,
          height: userRecord.height ? parseFloat(userRecord.height) : null,
          workoutDaysPerWeek: userRecord.workoutDaysPerWeek
            ? parseInt(userRecord.workoutDaysPerWeek)
            : null,
          preferredWorkoutType: userRecord.preferredWorkoutType,
          dietaryPreference: userRecord.dietaryPreference,
          createdAt: userRecord.createdAt,
          updatedAt: userRecord.updatedAt,
        };
      } catch (error) {
        app.logger.error({ err: error }, 'Error retrieving user profile');
        return reply.status(500).send({ error: 'Failed to retrieve user profile' });
      }
    }
  );

  /**
   * GET /api/user/coach-insights - Generate personalized fitness insights based on user profile
   */
  app.fastify.get(
    '/api/user/coach-insights',
    async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      try {
        const userId = session.user.id;

        app.logger.info({ userId }, 'Generating coach insights');

        const [userRecord] = await app.db
          .select()
          .from(user)
          .where(eq(user.id, userId))
          .limit(1);

        if (!userRecord) {
          app.logger.warn({ userId }, 'User not found');
          return reply.status(404).send({ error: 'User not found' });
        }

        const insights: string[] = [];

        // Parse numeric fields
        const age = userRecord.age ? parseInt(userRecord.age) : null;
        const weight = userRecord.weight ? parseFloat(userRecord.weight) : null;
        const workoutDaysPerWeek = userRecord.workoutDaysPerWeek
          ? parseInt(userRecord.workoutDaysPerWeek)
          : null;

        // Insight 1: fitness_goal + workout_days_per_week
        if (userRecord.fitnessGoal && workoutDaysPerWeek) {
          let goalInsight = '';
          const days = workoutDaysPerWeek;

          switch (userRecord.fitnessGoal) {
            case 'weight_loss':
              goalInsight = `Based on your ${days}-day schedule, aim for ${Math.ceil(
                days * 0.6
              )} cardio + ${Math.floor(days * 0.4)} strength sessions per week to maximize fat burn.`;
              break;
            case 'muscle_gain':
              goalInsight = `With ${days} training days, structure your week as push/pull/legs splits to maximize hypertrophy.`;
              break;
            case 'endurance':
              goalInsight = `Your ${days}-day plan is ideal for building aerobic base — include one long session and one interval day.`;
              break;
            default:
              goalInsight = `Your ${days}-day training schedule is a solid foundation for reaching your fitness goal.`;
          }
          insights.push(goalInsight);
        }

        // Insight 2: fitness_level
        if (userRecord.fitnessLevel) {
          let levelInsight = '';

          switch (userRecord.fitnessLevel) {
            case 'beginner':
              levelInsight =
                'As a beginner, focus on mastering form before increasing weight — consistency beats intensity at this stage.';
              break;
            case 'intermediate':
              levelInsight =
                'At the intermediate level, progressive overload is your best friend — aim to increase weight or reps every 2 weeks.';
              break;
            case 'advanced':
              levelInsight =
                'Advanced athletes benefit most from periodization — cycle between hypertrophy, strength, and deload phases.';
              break;
          }

          if (levelInsight) insights.push(levelInsight);
        }

        // Insight 3: age
        if (age !== null) {
          let ageInsight = '';

          if (age < 30) {
            ageInsight = `At ${age}, your recovery is fast — you can push hard but don't skip rest days to avoid overtraining.`;
          } else if (age >= 30 && age < 50) {
            ageInsight = `At ${age}, prioritize sleep and nutrition for recovery — they become increasingly important for performance.`;
          } else if (age >= 50) {
            ageInsight = `At ${age}, mobility work and joint health are as important as strength training — include stretching daily.`;
          }

          if (ageInsight) insights.push(ageInsight);
        }

        // Insight 4: dietary_preference
        if (userRecord.dietaryPreference) {
          let dietInsight = '';

          switch (userRecord.dietaryPreference) {
            case 'vegan':
              dietInsight =
                "On a vegan diet, ensure you're hitting protein targets with legumes, tofu, and plant-based protein supplements.";
              break;
            case 'vegetarian':
              dietInsight =
                'As a vegetarian, combine dairy, eggs, and legumes to meet your daily protein needs for muscle recovery.';
              break;
            case 'keto':
              dietInsight =
                'On keto, time your workouts around your highest energy windows and ensure adequate electrolyte intake.';
              break;
            case 'paleo':
              dietInsight =
                'A paleo diet pairs well with strength training — focus on lean meats and sweet potatoes for workout fuel.';
              break;
            default:
              dietInsight =
                'Maintain a balanced diet with adequate protein (0.8–1g per lb of bodyweight) to support your training.';
          }

          insights.push(dietInsight);
        }

        // Insight 5: weight + fitness_goal
        if (weight !== null && userRecord.fitnessGoal) {
          let weightInsight = '';

          switch (userRecord.fitnessGoal) {
            case 'weight_loss':
              weightInsight = `At ${weight}kg, a moderate caloric deficit of 300–500 calories/day combined with your training will yield steady fat loss.`;
              break;
            case 'muscle_gain':
              weightInsight = `At ${weight}kg, a slight caloric surplus of 200–300 calories/day will support lean muscle growth without excess fat gain.`;
              break;
            default:
              weightInsight =
                'Tracking your weight weekly (same time, same conditions) gives you the clearest picture of your progress.';
          }

          insights.push(weightInsight);
        }

        // Limit to 5 insights
        const finalInsights = insights.slice(0, 5);

        app.logger.info({ userId, insightCount: finalInsights.length }, 'Coach insights generated');

        return {
          insights: finalInsights,
          profile: {
            id: userRecord.id,
            name: userRecord.name,
            email: userRecord.email,
            emailVerified: userRecord.emailVerified,
            image: userRecord.image,
            onboardingCompleted: userRecord.onboardingCompleted,
            fitnessGoal: userRecord.fitnessGoal,
            fitnessLevel: userRecord.fitnessLevel,
            age: age,
            weight: weight,
            height: userRecord.height ? parseFloat(userRecord.height) : null,
            workoutDaysPerWeek: workoutDaysPerWeek,
            preferredWorkoutType: userRecord.preferredWorkoutType,
            dietaryPreference: userRecord.dietaryPreference,
            createdAt: userRecord.createdAt,
            updatedAt: userRecord.updatedAt,
          },
        };
      } catch (error) {
        app.logger.error({ err: error }, 'Error generating coach insights');
        return reply.status(500).send({ error: 'Failed to generate coach insights' });
      }
    }
  );
}
