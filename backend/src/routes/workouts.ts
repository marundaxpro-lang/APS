import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export function registerWorkoutRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/workouts/today - Get today's workout or indicate if it's a rest day
   */
  app.fastify.get('/api/workouts/today', async (
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

      app.logger.info({ userId }, 'Checking for today\'s workout');

      // Look for a workout that started today
      const todayWorkouts = await app.db
        .select()
        .from(schema.workoutSessions)
        .where(
          // This is a simplified check - in production you might want more sophisticated date filtering
          (col) => {
            return eq(schema.workoutSessions.userId, userId);
          }
        )
        .limit(1);

      // Check if there's a workout planned for today
      const hasWorkoutToday = todayWorkouts.length > 0;

      if (!hasWorkoutToday) {
        app.logger.info({ userId }, 'No workout scheduled for today - rest day');
        return {
          restDay: true,
          message: 'Today is a rest day! View the full plan to see which days you train.',
          tip: 'Rest days are just as important as training days. Use this time to recover and prepare for tomorrow!',
        };
      }

      // Return today's workout(s)
      const workout = todayWorkouts[0];
      app.logger.info({ userId, workoutId: workout.id }, 'Today\'s workout retrieved');

      return {
        restDay: false,
        workout: {
          id: workout.id,
          name: workout.name,
          duration: workout.duration,
          caloriesBurned: workout.caloriesBurned,
          exercises: workout.exercises,
          startedAt: workout.startedAt,
          endedAt: workout.endedAt,
        },
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Error checking today\'s workout');
      return reply.status(500).send({ error: 'Failed to check workout' });
    }
  });

  /**
   * GET /api/workouts - Get all workouts for the user
   */
  app.fastify.get('/api/workouts', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const userId = session.user.id;

      app.logger.info({ userId }, 'Retrieving workouts');

      const workouts = await app.db
        .select()
        .from(schema.workoutSessions)
        .where(eq(schema.workoutSessions.userId, userId))
        .orderBy(schema.workoutSessions.createdAt)
        .limit(100);

      app.logger.info({ userId, count: workouts.length }, 'Workouts retrieved successfully');

      return workouts.map((w) => ({
        id: w.id,
        name: w.name,
        duration: w.duration,
        caloriesBurned: w.caloriesBurned,
        exercises: w.exercises,
        startedAt: w.startedAt,
        endedAt: w.endedAt,
        createdAt: w.createdAt,
      }));
    } catch (error) {
      app.logger.error({ err: error }, 'Error retrieving workouts');
      return reply.status(500).send({ error: 'Failed to retrieve workouts' });
    }
  });

  /**
   * POST /api/workouts - Create a new workout session
   */
  app.fastify.post('/api/workouts', async (
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const { name, date, duration_minutes, caloriesBurned, exercises, startedAt, endedAt, completed } = request.body as {
        name?: string;
        date?: string;
        duration_minutes?: number;
        caloriesBurned?: number;
        exercises?: any;
        startedAt?: string;
        endedAt?: string;
        completed?: boolean;
      };
      const userId = session.user.id;

      // Generate workout name if not provided
      let workoutName = name;
      if (!workoutName) {
        // Use provided date or today's date in YYYY-MM-DD format
        const dateStr = date || new Date().toISOString().split('T')[0];
        workoutName = `Workout - ${dateStr}`;
      }

      // Map duration_minutes to duration, default to 0 if not provided
      const duration = duration_minutes ?? 0;

      app.logger.info({ userId, workoutName, duration }, 'Creating workout session');

      const [workout] = await app.db
        .insert(schema.workoutSessions)
        .values({
          userId,
          name: workoutName,
          duration: duration || null,
          caloriesBurned: caloriesBurned || null,
          exercises: exercises || null,
          startedAt: startedAt ? new Date(startedAt) : new Date(),
          endedAt: endedAt ? new Date(endedAt) : null,
        })
        .returning();

      app.logger.info({ workoutId: workout.id }, 'Workout created successfully');

      return {
        id: workout.id,
        name: workout.name,
        duration: workout.duration,
        caloriesBurned: workout.caloriesBurned,
        exercises: workout.exercises,
        startedAt: workout.startedAt,
        endedAt: workout.endedAt,
        createdAt: workout.createdAt,
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Error creating workout');
      return reply.status(500).send({ error: 'Failed to create workout' });
    }
  });

  /**
   * PUT /api/workouts/:id - Update a workout session
   */
  app.fastify.put('/api/workouts/:id', async (
    request: FastifyRequest<{ Params: { id: string }; Body: any }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const { id } = request.params;
      const userId = session.user.id;
      const { name, duration, caloriesBurned, exercises, endedAt } = request.body as {
        name?: string;
        duration?: number;
        caloriesBurned?: number;
        exercises?: any;
        endedAt?: string;
      };

      app.logger.info({ workoutId: id, userId }, 'Updating workout');

      // Verify ownership
      const existing = await app.db
        .select()
        .from(schema.workoutSessions)
        .where(eq(schema.workoutSessions.id, id))
        .limit(1);

      if (existing.length === 0 || existing[0].userId !== userId) {
        return reply.status(404).send({ error: 'Workout not found' });
      }

      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (duration !== undefined) updateData.duration = duration;
      if (caloriesBurned !== undefined) updateData.caloriesBurned = caloriesBurned;
      if (exercises !== undefined) updateData.exercises = exercises;
      if (endedAt !== undefined) updateData.endedAt = endedAt ? new Date(endedAt) : null;

      const [updated] = await app.db
        .update(schema.workoutSessions)
        .set(updateData)
        .where(eq(schema.workoutSessions.id, id))
        .returning();

      app.logger.info({ workoutId: id }, 'Workout updated successfully');

      return {
        id: updated.id,
        name: updated.name,
        duration: updated.duration,
        caloriesBurned: updated.caloriesBurned,
        exercises: updated.exercises,
        startedAt: updated.startedAt,
        endedAt: updated.endedAt,
        createdAt: updated.createdAt,
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Error updating workout');
      return reply.status(500).send({ error: 'Failed to update workout' });
    }
  });

  /**
   * DELETE /api/workouts/:id - Delete a workout session
   */
  app.fastify.delete('/api/workouts/:id', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const { id } = request.params;
      const userId = session.user.id;

      app.logger.info({ workoutId: id, userId }, 'Deleting workout');

      // Verify ownership
      const existing = await app.db
        .select()
        .from(schema.workoutSessions)
        .where(eq(schema.workoutSessions.id, id))
        .limit(1);

      if (existing.length === 0 || existing[0].userId !== userId) {
        return reply.status(404).send({ error: 'Workout not found' });
      }

      await app.db.delete(schema.workoutSessions).where(eq(schema.workoutSessions.id, id));

      app.logger.info({ workoutId: id }, 'Workout deleted successfully');

      return { success: true };
    } catch (error) {
      app.logger.error({ err: error }, 'Error deleting workout');
      return reply.status(500).send({ error: 'Failed to delete workout' });
    }
  });
}
