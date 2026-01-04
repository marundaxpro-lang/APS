import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte, lte } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { z } from 'zod';

const exerciseSchema = z.object({
  name: z.string(),
  sets: z.number(),
  reps: z.number(),
  weight: z.number().optional(),
  duration: z.number().optional(),
  notes: z.string().optional(),
});

const createWorkoutSessionSchema = z.object({
  workoutType: z.string(),
  exercises: z.array(exerciseSchema),
  durationMinutes: z.number().optional(),
  completedDate: z.string().datetime(),
  notes: z.string().optional(),
});

const getWorkoutsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export function registerWorkoutRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/workouts - Save a workout session
   */
  app.fastify.post('/api/workouts', async (
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const validation = createWorkoutSessionSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { workoutType, exercises, durationMinutes, completedDate, notes } =
        validation.data;
      const userId = session.user.id;

      const [workout] = await app.db
        .insert(schema.workoutSessions)
        .values({
          userId,
          workoutType,
          exercises: exercises as any,
          durationMinutes: durationMinutes || null,
          completedDate: new Date(completedDate),
          notes: notes || null,
        })
        .returning();

      return {
        id: workout.id,
        workoutType: workout.workoutType,
        exercises: workout.exercises,
        durationMinutes: workout.durationMinutes,
        completedDate: workout.completedDate,
        notes: workout.notes,
        createdAt: workout.createdAt,
      };
    } catch (error) {
      app.logger.error(error, 'Error creating workout session');
      return reply.status(500).send({ error: 'Failed to create workout' });
    }
  });

  /**
   * GET /api/workouts - Get user's workout history
   */
  app.fastify.get('/api/workouts', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const query = request.query as Record<string, any>;
      const validation = getWorkoutsSchema.safeParse(query);

      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid query parameters' });
      }

      const { startDate, endDate } = validation.data;
      const userId = session.user.id;

      let conditions = [eq(schema.workoutSessions.userId, userId)];

      if (startDate) {
        conditions.push(gte(schema.workoutSessions.completedDate, new Date(startDate)));
      }

      if (endDate) {
        conditions.push(lte(schema.workoutSessions.completedDate, new Date(endDate)));
      }

      const workouts = await app.db
        .select()
        .from(schema.workoutSessions)
        .where(and(...conditions))
        .orderBy(schema.workoutSessions.completedDate)
        .limit(100);

      return workouts.map((w) => ({
        id: w.id,
        workoutType: w.workoutType,
        exercises: w.exercises,
        durationMinutes: w.durationMinutes,
        completedDate: w.completedDate,
        notes: w.notes,
        createdAt: w.createdAt,
      }));
    } catch (error) {
      app.logger.error(error, 'Error retrieving workouts');
      return reply.status(500).send({ error: 'Failed to retrieve workouts' });
    }
  });
}
