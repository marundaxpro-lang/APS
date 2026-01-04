import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte, lte } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { z } from 'zod';

const foodSchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  quantity: z.string().optional(),
});

const createNutritionLogSchema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snacks']),
  foods: z.array(foodSchema),
  totalCalories: z.string().optional(),
  totalProtein: z.string().optional(),
  totalCarbs: z.string().optional(),
  totalFat: z.string().optional(),
  logDate: z.string().datetime(),
  notes: z.string().optional(),
});

const getNutritionLogsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snacks']).optional(),
});

export function registerNutritionRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/nutrition - Log a meal
   */
  app.fastify.post('/api/nutrition', async (
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const validation = createNutritionLogSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const {
        mealType,
        foods,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        logDate,
        notes,
      } = validation.data;
      const userId = session.user.id;

      // Calculate totals if not provided
      let calories = totalCalories ? parseFloat(totalCalories) : foods.reduce((sum, f) => sum + f.calories, 0);
      let protein = totalProtein ? parseFloat(totalProtein) : foods.reduce((sum, f) => sum + f.protein, 0);
      let carbs = totalCarbs ? parseFloat(totalCarbs) : foods.reduce((sum, f) => sum + f.carbs, 0);
      let fat = totalFat ? parseFloat(totalFat) : foods.reduce((sum, f) => sum + f.fat, 0);

      const [nutritionLog] = await app.db
        .insert(schema.nutritionLogs)
        .values([
          {
            userId,
            mealType,
            foods: foods as any,
            totalCalories: calories.toString() as any,
            totalProtein: protein.toString() as any,
            totalCarbs: carbs.toString() as any,
            totalFat: fat.toString() as any,
            logDate: new Date(logDate),
            notes: notes || null,
          },
        ])
        .returning();

      return {
        id: nutritionLog.id,
        mealType: nutritionLog.mealType,
        foods: nutritionLog.foods,
        totalCalories: nutritionLog.totalCalories,
        totalProtein: nutritionLog.totalProtein,
        totalCarbs: nutritionLog.totalCarbs,
        totalFat: nutritionLog.totalFat,
        logDate: nutritionLog.logDate,
        notes: nutritionLog.notes,
        createdAt: nutritionLog.createdAt,
      };
    } catch (error) {
      app.logger.error(error, 'Error creating nutrition log');
      return reply.status(500).send({ error: 'Failed to log meal' });
    }
  });

  /**
   * GET /api/nutrition - Get nutrition logs with date filter
   */
  app.fastify.get('/api/nutrition', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const query = request.query as Record<string, any>;
      const validation = getNutritionLogsSchema.safeParse(query);

      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid query parameters' });
      }

      const { startDate, endDate, mealType } = validation.data;
      const userId = session.user.id;

      let conditions = [eq(schema.nutritionLogs.userId, userId)];

      if (startDate) {
        conditions.push(gte(schema.nutritionLogs.logDate, new Date(startDate)));
      }

      if (endDate) {
        conditions.push(lte(schema.nutritionLogs.logDate, new Date(endDate)));
      }

      if (mealType) {
        conditions.push(eq(schema.nutritionLogs.mealType, mealType));
      }

      const logs = await app.db
        .select()
        .from(schema.nutritionLogs)
        .where(and(...conditions))
        .orderBy(schema.nutritionLogs.logDate)
        .limit(100);

      return logs.map((log) => ({
        id: log.id,
        mealType: log.mealType,
        foods: log.foods,
        totalCalories: log.totalCalories,
        totalProtein: log.totalProtein,
        totalCarbs: log.totalCarbs,
        totalFat: log.totalFat,
        logDate: log.logDate,
        notes: log.notes,
        createdAt: log.createdAt,
      }));
    } catch (error) {
      app.logger.error(error, 'Error retrieving nutrition logs');
      return reply.status(500).send({ error: 'Failed to retrieve nutrition logs' });
    }
  });
}
