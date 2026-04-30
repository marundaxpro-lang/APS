import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { z } from 'zod';

const unlockAchievementSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(), // emoji or icon name
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

      const { title, description, icon } = validation.data;
      const userId = session.user.id;

      app.logger.info({ userId, title }, 'Unlocking achievement');

      const [achievement] = await app.db
        .insert(schema.achievements)
        .values({
          userId,
          title,
          description: description || null,
          icon: icon || null,
        })
        .returning();

      app.logger.info({ achievementId: achievement.id }, 'Achievement unlocked');

      return {
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        unlockedAt: achievement.unlockedAt,
        createdAt: achievement.createdAt,
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Error unlocking achievement');
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

      app.logger.info({ userId }, 'Retrieving achievements');

      const achievements = await app.db
        .select()
        .from(schema.achievements)
        .where(eq(schema.achievements.userId, userId))
        .orderBy(schema.achievements.unlockedAt);

      app.logger.info({ userId, count: achievements.length }, 'Achievements retrieved');

      return achievements.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        icon: a.icon,
        unlockedAt: a.unlockedAt,
        createdAt: a.createdAt,
      }));
    } catch (error) {
      app.logger.error({ err: error }, 'Error retrieving achievements');
      return reply.status(500).send({ error: 'Failed to retrieve achievements' });
    }
  });
}
