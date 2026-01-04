import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { z } from 'zod';

const fitnessProfileSchema = z.object({
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  goal: z.string(),
  trainingFrequency: z.number().optional(),
});

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
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { experienceLevel, goal, trainingFrequency } = validation.data;
      const userId = session.user.id;

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
            experienceLevel: experienceLevel || existingProfile[0].experienceLevel,
            goal,
            trainingFrequency: trainingFrequency ?? existingProfile[0].trainingFrequency,
          })
          .where(eq(schema.fitnessProfiles.userId, userId))
          .returning();

        return {
          id: updated.id,
          experienceLevel: updated.experienceLevel,
          goal: updated.goal,
          trainingFrequency: updated.trainingFrequency,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        };
      } else {
        // Create new profile
        const [profile] = await app.db
          .insert(schema.fitnessProfiles)
          .values({
            userId,
            experienceLevel: experienceLevel || 'beginner',
            goal,
            trainingFrequency: trainingFrequency || 3,
          })
          .returning();

        return {
          id: profile.id,
          experienceLevel: profile.experienceLevel,
          goal: profile.goal,
          trainingFrequency: profile.trainingFrequency,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        };
      }
    } catch (error) {
      app.logger.error(error, 'Error saving fitness profile');
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

      const profile = await app.db
        .select()
        .from(schema.fitnessProfiles)
        .where(eq(schema.fitnessProfiles.userId, userId))
        .limit(1);

      if (profile.length === 0) {
        return reply.status(404).send({ error: 'Fitness profile not found' });
      }

      const p = profile[0];
      return {
        id: p.id,
        experienceLevel: p.experienceLevel,
        goal: p.goal,
        trainingFrequency: p.trainingFrequency,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    } catch (error) {
      app.logger.error(error, 'Error retrieving fitness profile');
      return reply.status(500).send({ error: 'Failed to retrieve fitness profile' });
    }
  });
}
