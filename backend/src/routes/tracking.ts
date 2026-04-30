import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte, lte, desc, count, sum } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';
import { randomUUID } from 'crypto';

function generateId(): string {
  return randomUUID();
}

function getTodayYYYYMMDD(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function getWeekStartDate(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(now.setDate(diff));
}

function getWeekEndDate(): Date {
  const start = getWeekStartDate();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

export function registerTrackingRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // ============ WORKOUT LOGS ============

  /**
   * POST /api/workout-logs
   * Create a new workout log entry
   */
  app.fastify.post<{
    Body: {
      workout_id: string;
      workout_name: string;
      duration_minutes: number;
      calories_burned?: number;
      notes?: string;
    };
  }>('/api/workout-logs', {
    schema: {
      description: 'Log a completed workout',
      tags: ['workout-logs'],
      body: {
        type: 'object',
        required: ['workout_id', 'workout_name', 'duration_minutes'],
        properties: {
          workout_id: { type: 'string' },
          workout_name: { type: 'string' },
          duration_minutes: { type: 'number' },
          calories_burned: { type: 'number' },
          notes: { type: 'string' },
        },
      },
      response: {
        201: {
          description: 'Workout log created',
          type: 'object',
          properties: {
            id: { type: 'string' },
            user_id: { type: 'string' },
            workout_id: { type: 'string' },
            workout_name: { type: 'string' },
            duration_minutes: { type: 'number' },
            calories_burned: { type: 'number' },
            completed_at: { type: 'string' },
            notes: { type: 'string' },
          },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request, reply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { workout_id, workout_name, duration_minutes, calories_burned, notes } = request.body;
    const userId = session.user.id;

    app.logger.info(
      { userId, workout_name, duration_minutes },
      'Creating workout log'
    );

    try {
      const id = generateId();
      const completedAt = new Date().toISOString();

      const [result] = await app.db
        .insert(schema.workoutLogs)
        .values({
          id,
          userId,
          workoutId: workout_id,
          workoutName: workout_name,
          durationMinutes: duration_minutes,
          caloriesBurned: calories_burned || null,
          completedAt,
          notes: notes || null,
        })
        .returning();

      app.logger.info({ id, userId }, 'Workout log created successfully');

      return reply.status(201).send({
        id: result.id,
        user_id: result.userId,
        workout_id: result.workoutId,
        workout_name: result.workoutName,
        duration_minutes: result.durationMinutes,
        calories_burned: result.caloriesBurned,
        completed_at: result.completedAt,
        notes: result.notes,
      });
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to create workout log');
      throw error;
    }
  });

  /**
   * GET /api/workout-logs
   * Get workout logs for the current user
   */
  app.fastify.get<{
    Querystring: {
      limit?: string;
      offset?: string;
    };
  }>('/api/workout-logs', {
    schema: {
      description: 'Get workout logs',
      tags: ['workout-logs'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string', default: '20' },
          offset: { type: 'string', default: '0' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              user_id: { type: 'string' },
              workout_id: { type: 'string' },
              workout_name: { type: 'string' },
              duration_minutes: { type: 'number' },
              calories_burned: { type: 'number' },
              completed_at: { type: 'string' },
              notes: { type: 'string' },
            },
          },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request, reply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const limit = Math.min(parseInt(request.query.limit || '20'), 100);
    const offset = parseInt(request.query.offset || '0');
    const userId = session.user.id;

    app.logger.info({ userId, limit, offset }, 'Fetching workout logs');

    try {
      const logs = await app.db
        .select()
        .from(schema.workoutLogs)
        .where(eq(schema.workoutLogs.userId, userId))
        .orderBy(desc(schema.workoutLogs.completedAt))
        .limit(limit)
        .offset(offset);

      return logs.map((log) => ({
        id: log.id,
        user_id: log.userId,
        workout_id: log.workoutId,
        workout_name: log.workoutName,
        duration_minutes: log.durationMinutes,
        calories_burned: log.caloriesBurned,
        completed_at: log.completedAt,
        notes: log.notes,
      }));
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to fetch workout logs');
      throw error;
    }
  });

  /**
   * GET /api/workout-logs/stats
   * Get workout statistics for the current user
   */
  app.fastify.get('/api/workout-logs/stats', {
    schema: {
      description: 'Get workout statistics',
      tags: ['workout-logs'],
      response: {
        200: {
          type: 'object',
          properties: {
            total_workouts: { type: 'number' },
            total_minutes: { type: 'number' },
            total_calories: { type: 'number' },
            workouts_this_week: { type: 'number' },
          },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request, reply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    app.logger.info({ userId }, 'Fetching workout stats');

    try {
      const weekStart = getWeekStartDate().toISOString();
      const weekEnd = getWeekEndDate().toISOString();

      const allLogs = await app.db
        .select({
          count: count(),
          totalMinutes: sum(schema.workoutLogs.durationMinutes),
          totalCalories: sum(schema.workoutLogs.caloriesBurned),
        })
        .from(schema.workoutLogs)
        .where(eq(schema.workoutLogs.userId, userId));

      const weekLogs = await app.db
        .select({ count: count() })
        .from(schema.workoutLogs)
        .where(
          and(
            eq(schema.workoutLogs.userId, userId),
            gte(schema.workoutLogs.completedAt, weekStart),
            lte(schema.workoutLogs.completedAt, weekEnd)
          )
        );

      return {
        total_workouts: allLogs[0]?.count || 0,
        total_minutes: allLogs[0]?.totalMinutes || 0,
        total_calories: allLogs[0]?.totalCalories || 0,
        workouts_this_week: weekLogs[0]?.count || 0,
      };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to fetch workout stats');
      throw error;
    }
  });

  // ============ HABIT LOGS ============

  /**
   * POST /api/habit-logs
   * Log a completed habit
   */
  app.fastify.post<{
    Body: {
      habit_id: string;
      habit_name: string;
      date: string;
    };
  }>('/api/habit-logs', {
    schema: {
      description: 'Log a completed habit',
      tags: ['habit-logs'],
      body: {
        type: 'object',
        required: ['habit_id', 'habit_name', 'date'],
        properties: {
          habit_id: { type: 'string' },
          habit_name: { type: 'string' },
          date: { type: 'string', description: 'YYYY-MM-DD format' },
        },
      },
      response: {
        201: {
          description: 'Habit log created',
          type: 'object',
          properties: {
            id: { type: 'string' },
            user_id: { type: 'string' },
            habit_id: { type: 'string' },
            habit_name: { type: 'string' },
            completed_at: { type: 'string' },
            date: { type: 'string' },
          },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request, reply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { habit_id, habit_name, date } = request.body;
    const userId = session.user.id;

    app.logger.info({ userId, habit_name, date }, 'Creating habit log');

    try {
      const id = generateId();
      const completedAt = new Date().toISOString();

      const [result] = await app.db
        .insert(schema.habitLogs)
        .values({
          id,
          userId,
          habitId: habit_id,
          habitName: habit_name,
          completedAt,
          date,
        })
        .returning();

      app.logger.info({ id, userId }, 'Habit log created successfully');

      return reply.status(201).send({
        id: result.id,
        user_id: result.userId,
        habit_id: result.habitId,
        habit_name: result.habitName,
        completed_at: result.completedAt,
        date: result.date,
      });
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to create habit log');
      throw error;
    }
  });

  /**
   * GET /api/habit-logs
   * Get habit logs for the current user
   */
  app.fastify.get<{
    Querystring: {
      date?: string;
    };
  }>('/api/habit-logs', {
    schema: {
      description: 'Get habit logs',
      tags: ['habit-logs'],
      querystring: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Optional filter by date (YYYY-MM-DD)' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              user_id: { type: 'string' },
              habit_id: { type: 'string' },
              habit_name: { type: 'string' },
              completed_at: { type: 'string' },
              date: { type: 'string' },
            },
          },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request, reply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    const dateFilter = request.query.date;

    app.logger.info({ userId, dateFilter }, 'Fetching habit logs');

    try {
      let whereConditions = eq(schema.habitLogs.userId, userId);
      if (dateFilter) {
        whereConditions = and(whereConditions, eq(schema.habitLogs.date, dateFilter))!;
      }

      const logs = await app.db
        .select()
        .from(schema.habitLogs)
        .where(whereConditions)
        .orderBy(desc(schema.habitLogs.completedAt));

      return logs.map((log) => ({
        id: log.id,
        user_id: log.userId,
        habit_id: log.habitId,
        habit_name: log.habitName,
        completed_at: log.completedAt,
        date: log.date,
      }));
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to fetch habit logs');
      throw error;
    }
  });

  /**
   * DELETE /api/habit-logs/:id
   * Delete a habit log entry
   */
  app.fastify.delete<{
    Params: { id: string };
  }>('/api/habit-logs/:id', {
    schema: {
      description: 'Delete a habit log',
      tags: ['habit-logs'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        204: { description: 'Habit log deleted' },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request, reply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    const { id } = request.params;

    app.logger.info({ userId, id }, 'Deleting habit log');

    try {
      const log = await app.db
        .select()
        .from(schema.habitLogs)
        .where(eq(schema.habitLogs.id, id));

      if (!log.length) {
        app.logger.warn({ id }, 'Habit log not found');
        return reply.status(404).send({ error: 'Habit log not found' });
      }

      if (log[0].userId !== userId) {
        app.logger.warn({ userId, id, ownerId: log[0].userId }, 'Unauthorized delete attempt');
        return reply.status(403).send({ error: 'Not authorized to delete this habit log' });
      }

      await app.db.delete(schema.habitLogs).where(eq(schema.habitLogs.id, id));

      app.logger.info({ userId, id }, 'Habit log deleted successfully');
      return reply.status(204).send();
    } catch (error) {
      app.logger.error({ err: error, userId, id }, 'Failed to delete habit log');
      throw error;
    }
  });

  // ============ STREAKS ============

  /**
   * GET /api/streaks
   * Get streak information for the current user
   */
  app.fastify.get('/api/streaks', {
    schema: {
      description: 'Get user streak information',
      tags: ['streaks'],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            user_id: { type: 'string' },
            current_streak: { type: 'number' },
            longest_streak: { type: 'number' },
            last_activity_date: { type: 'string' },
            updated_at: { type: 'string' },
          },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request, reply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    app.logger.info({ userId }, 'Fetching streak data');

    try {
      const streakRow = await app.db
        .select()
        .from(schema.streaks)
        .where(eq(schema.streaks.userId, userId));

      if (streakRow.length === 0) {
        return {
          current_streak: 0,
          longest_streak: 0,
          last_activity_date: null,
        };
      }

      const streak = streakRow[0];
      return {
        id: streak.id,
        user_id: streak.userId,
        current_streak: streak.currentStreak,
        longest_streak: streak.longestStreak,
        last_activity_date: streak.lastActivityDate,
        updated_at: streak.updatedAt,
      };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to fetch streak data');
      throw error;
    }
  });

  /**
   * POST /api/streaks/update
   * Recalculate and update streaks based on recent activity
   */
  app.fastify.post('/api/streaks/update', {
    schema: {
      description: 'Update user streak based on recent activity',
      tags: ['streaks'],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            user_id: { type: 'string' },
            current_streak: { type: 'number' },
            longest_streak: { type: 'number' },
            last_activity_date: { type: 'string' },
            updated_at: { type: 'string' },
          },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request, reply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    app.logger.info({ userId }, 'Updating streak');

    try {
      // Get all distinct dates from workout and habit logs
      const workoutLogs = await app.db
        .select({ completedAt: schema.workoutLogs.completedAt })
        .from(schema.workoutLogs)
        .where(eq(schema.workoutLogs.userId, userId));

      const habitLogsData = await app.db
        .select({ date: schema.habitLogs.date })
        .from(schema.habitLogs)
        .where(eq(schema.habitLogs.userId, userId));

      // Combine and deduplicate dates
      const dateSet = new Set<string>();
      workoutLogs.forEach((row) => {
        if (row.completedAt) {
          const dateStr = row.completedAt.substring(0, 10); // Extract YYYY-MM-DD from ISO string
          dateSet.add(dateStr);
        }
      });
      habitLogsData.forEach((row) => dateSet.add(row.date));

      const uniqueDates = Array.from(dateSet).sort().reverse(); // Descending order

      // Calculate streaks
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      let lastActivityDate: string | null = null;

      const today = getTodayYYYYMMDD();
      let expectedDate = new Date(today);

      for (const dateStr of uniqueDates) {
        const activityDate = new Date(dateStr);

        if (lastActivityDate === null) {
          lastActivityDate = dateStr;
        }

        const diffDays = Math.floor((expectedDate.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          tempStreak++;
          if (currentStreak === 0) currentStreak = tempStreak;
        } else if (diffDays === 1) {
          tempStreak++;
        } else {
          if (tempStreak > longestStreak) longestStreak = tempStreak;
          tempStreak = 0;
        }

        expectedDate = activityDate;
      }

      if (tempStreak > longestStreak) longestStreak = tempStreak;

      // Update or insert streak record
      const streakId = generateId();
      const updatedAt = new Date().toISOString();

      const existingStreak = await app.db
        .select()
        .from(schema.streaks)
        .where(eq(schema.streaks.userId, userId));

      let result;
      if (existingStreak.length === 0) {
        [result] = await app.db
          .insert(schema.streaks)
          .values({
            id: streakId,
            userId,
            currentStreak,
            longestStreak,
            lastActivityDate,
            updatedAt,
          })
          .returning();
      } else {
        [result] = await app.db
          .update(schema.streaks)
          .set({
            currentStreak,
            longestStreak,
            lastActivityDate,
            updatedAt,
          })
          .where(eq(schema.streaks.userId, userId))
          .returning();
      }

      app.logger.info(
        { userId, currentStreak, longestStreak },
        'Streak updated successfully'
      );

      return {
        id: result.id,
        user_id: result.userId,
        current_streak: result.currentStreak,
        longest_streak: result.longestStreak,
        last_activity_date: result.lastActivityDate,
        updated_at: result.updatedAt,
      };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to update streak');
      throw error;
    }
  });

  // ============ USER PROFILES ============

  /**
   * GET /api/profile
   * Get the current user's profile
   */
  app.fastify.get('/api/profile', {
    schema: {
      description: 'Get user profile',
      tags: ['user-profile'],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            user_id: { type: 'string' },
            fitness_goal: { type: 'string' },
            fitness_level: { type: 'string' },
            weight_kg: { type: 'number' },
            height_cm: { type: 'number' },
            age: { type: 'number' },
            onboarding_completed: { type: 'boolean' },
            updated_at: { type: 'string' },
          },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request, reply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    app.logger.info({ userId }, 'Fetching user profile');

    try {
      const profiles = await app.db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, userId));

      if (profiles.length === 0) {
        // Return empty profile with defaults
        return {
          user_id: userId,
          fitness_goal: null,
          fitness_level: null,
          weight_kg: null,
          height_cm: null,
          age: null,
          onboarding_completed: false,
          updated_at: new Date().toISOString(),
        };
      }

      const profile = profiles[0];
      return {
        id: profile.id,
        user_id: profile.userId,
        fitness_goal: profile.fitnessGoal,
        fitness_level: profile.fitnessLevel,
        weight_kg: profile.weightKg ? parseFloat(profile.weightKg.toString()) : null,
        height_cm: profile.heightCm ? parseFloat(profile.heightCm.toString()) : null,
        age: profile.age,
        onboarding_completed: profile.onboardingCompleted,
        updated_at: profile.updatedAt,
      };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to fetch user profile');
      throw error;
    }
  });

  /**
   * PUT /api/profile
   * Create or update the user's profile
   */
  app.fastify.put<{
    Body: {
      fitness_goal?: string;
      fitness_level?: string;
      weight_kg?: number;
      height_cm?: number;
      age?: number;
      onboarding_completed?: boolean;
    };
  }>('/api/profile', {
    schema: {
      description: 'Create or update user profile',
      tags: ['user-profile'],
      body: {
        type: 'object',
        properties: {
          fitness_goal: { type: 'string' },
          fitness_level: { type: 'string' },
          weight_kg: { type: 'number' },
          height_cm: { type: 'number' },
          age: { type: 'number' },
          onboarding_completed: { type: 'boolean' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            user_id: { type: 'string' },
            fitness_goal: { type: 'string' },
            fitness_level: { type: 'string' },
            weight_kg: { type: 'number' },
            height_cm: { type: 'number' },
            age: { type: 'number' },
            onboarding_completed: { type: 'boolean' },
            updated_at: { type: 'string' },
          },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request, reply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    const { fitness_goal, fitness_level, weight_kg, height_cm, age, onboarding_completed } = request.body;

    app.logger.info({ userId }, 'Updating user profile');

    try {
      const existingProfiles = await app.db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, userId));

      const updatedAt = new Date().toISOString();

      let result;
      if (existingProfiles.length === 0) {
        const id = generateId();
        [result] = await app.db
          .insert(schema.userProfiles)
          .values({
            id,
            userId,
            fitnessGoal: fitness_goal || null,
            fitnessLevel: fitness_level || null,
            weightKg: weight_kg !== undefined ? String(weight_kg) : null,
            heightCm: height_cm !== undefined ? String(height_cm) : null,
            age: age || null,
            onboardingCompleted: onboarding_completed || false,
            updatedAt,
          })
          .returning();
      } else {
        const updateValues: any = {
          fitnessGoal: fitness_goal !== undefined ? fitness_goal : existingProfiles[0].fitnessGoal,
          fitnessLevel: fitness_level !== undefined ? fitness_level : existingProfiles[0].fitnessLevel,
          weightKg: weight_kg !== undefined ? String(weight_kg) : existingProfiles[0].weightKg,
          heightCm: height_cm !== undefined ? String(height_cm) : existingProfiles[0].heightCm,
          age: age !== undefined ? age : existingProfiles[0].age,
          onboardingCompleted: onboarding_completed !== undefined ? onboarding_completed : existingProfiles[0].onboardingCompleted,
          updatedAt,
        };
        [result] = await app.db
          .update(schema.userProfiles)
          .set(updateValues)
          .where(eq(schema.userProfiles.userId, userId))
          .returning();
      }

      app.logger.info({ userId, id: result.id }, 'User profile updated successfully');

      return {
        id: result.id,
        user_id: result.userId,
        fitness_goal: result.fitnessGoal,
        fitness_level: result.fitnessLevel,
        weight_kg: result.weightKg ? parseFloat(result.weightKg.toString()) : null,
        height_cm: result.heightCm ? parseFloat(result.heightCm.toString()) : null,
        age: result.age,
        onboarding_completed: result.onboardingCompleted,
        updated_at: result.updatedAt,
      };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to update user profile');
      throw error;
    }
  });
}
