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
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  foodItems: z.array(foodSchema),
  totalCalories: z.number().optional(),
  totalProtein: z.number().optional(),
  totalCarbs: z.number().optional(),
  totalFat: z.number().optional(),
  logDate: z.string().datetime(),
});

const getNutritionLogsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
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
        foodItems,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        logDate,
      } = validation.data;
      const userId = session.user.id;

      app.logger.info({ userId, mealType }, 'Logging nutrition');

      // Calculate totals if not provided
      let calories = totalCalories || foodItems.reduce((sum, f) => sum + f.calories, 0);
      let protein = totalProtein || foodItems.reduce((sum, f) => sum + f.protein, 0);
      let carbs = totalCarbs || foodItems.reduce((sum, f) => sum + f.carbs, 0);
      let fat = totalFat || foodItems.reduce((sum, f) => sum + f.fat, 0);

      const [nutritionLog] = await app.db
        .insert(schema.nutritionLogs)
        .values({
          userId,
          mealType,
          foodItems: foodItems as any,
          totalCalories: Math.round(calories),
          totalProtein: Math.round(protein),
          totalCarbs: Math.round(carbs),
          totalFat: Math.round(fat),
          logDate: new Date(logDate),
        })
        .returning();

      app.logger.info({ logId: nutritionLog.id }, 'Nutrition logged');

      return {
        id: nutritionLog.id,
        mealType: nutritionLog.mealType,
        foodItems: nutritionLog.foodItems,
        totalCalories: nutritionLog.totalCalories,
        totalProtein: nutritionLog.totalProtein,
        totalCarbs: nutritionLog.totalCarbs,
        totalFat: nutritionLog.totalFat,
        logDate: nutritionLog.logDate,
        createdAt: nutritionLog.createdAt,
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Error creating nutrition log');
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

      app.logger.info({ userId }, 'Retrieving nutrition logs');

      let conditions: any[] = [eq(schema.nutritionLogs.userId, userId)];

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

      app.logger.info({ userId, count: logs.length }, 'Nutrition logs retrieved');

      return logs.map((log) => ({
        id: log.id,
        mealType: log.mealType,
        foodItems: log.foodItems,
        totalCalories: log.totalCalories,
        totalProtein: log.totalProtein,
        totalCarbs: log.totalCarbs,
        totalFat: log.totalFat,
        logDate: log.logDate,
        createdAt: log.createdAt,
      }));
    } catch (error) {
      app.logger.error({ err: error }, 'Error retrieving nutrition logs');
      return reply.status(500).send({ error: 'Failed to retrieve nutrition logs' });
    }
  });
}
