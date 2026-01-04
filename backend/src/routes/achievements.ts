import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { z } from 'zod';

const unlockAchievementSchema = z.object({
  achievementType: z.string(),
  unlockedDate: z.string().datetime(),
  shared: z.boolean().optional(),
});

export function registerAchievementRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/achievements - Unlock an achievement
   */
  app.fastify.post('/api/achievements', async (
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const validation = unlockAchievementSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { achievementType, unlockedDate, shared } = validation.data;
      const userId = session.user.id;

      const [achievement] = await app.db
        .insert(schema.achievements)
        .values({
          userId,
          achievementType,
          unlockedDate: new Date(unlockedDate),
          shared: shared || false,
        })
        .returning();

      return {
        id: achievement.id,
        achievementType: achievement.achievementType,
        unlockedDate: achievement.unlockedDate,
        shared: achievement.shared,
        createdAt: achievement.createdAt,
      };
    } catch (error) {
      app.logger.error(error, 'Error unlocking achievement');
      return reply.status(500).send({ error: 'Failed to unlock achievement' });
    }
  });

  /**
   * GET /api/achievements - Get user's achievements
   */
  app.fastify.get('/api/achievements', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const userId = session.user.id;

      const achievements = await app.db
        .select()
        .from(schema.achievements)
        .where(eq(schema.achievements.userId, userId))
        .orderBy(schema.achievements.unlockedDate);

      return achievements.map((a) => ({
        id: a.id,
        achievementType: a.achievementType,
        unlockedDate: a.unlockedDate,
        shared: a.shared,
        createdAt: a.createdAt,
      }));
    } catch (error) {
      app.logger.error(error, 'Error retrieving achievements');
      return reply.status(500).send({ error: 'Failed to retrieve achievements' });
    }
  });
}
