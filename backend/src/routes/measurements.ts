import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte, lte } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { z } from 'zod';

const createMeasurementSchema = z.object({
  weight: z.string().optional(),
  bodyFatPercentage: z.string().optional(),
  muscleMass: z.string().optional(),
  measurementDate: z.string().datetime(),
  notes: z.string().optional(),
});

const getMeasurementsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export function registerMeasurementRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/measurements - Create a measurement entry
   */
  app.fastify.post('/api/measurements', async (
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const validation = createMeasurementSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { weight, bodyFatPercentage, muscleMass, measurementDate, notes } =
        validation.data;
      const userId = session.user.id;

      const [measurement] = await app.db
        .insert(schema.measurements)
        .values([
          {
            userId,
            weight: weight ? (parseFloat(weight).toString() as any) : null,
            bodyFatPercentage: bodyFatPercentage ? (parseFloat(bodyFatPercentage).toString() as any) : null,
            muscleMass: muscleMass ? (parseFloat(muscleMass).toString() as any) : null,
            measurementDate: new Date(measurementDate),
            notes: notes || null,
          },
        ])
        .returning();

      return {
        id: measurement.id,
        weight: measurement.weight,
        bodyFatPercentage: measurement.bodyFatPercentage,
        muscleMass: measurement.muscleMass,
        measurementDate: measurement.measurementDate,
        notes: measurement.notes,
        createdAt: measurement.createdAt,
      };
    } catch (error) {
      app.logger.error(error, 'Error creating measurement');
      return reply.status(500).send({ error: 'Failed to create measurement' });
    }
  });

  /**
   * GET /api/measurements - Get user's measurements with date range filter
   */
  app.fastify.get('/api/measurements', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const query = request.query as Record<string, any>;
      const validation = getMeasurementsSchema.safeParse(query);

      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid query parameters' });
      }

      const { startDate, endDate } = validation.data;
      const userId = session.user.id;

      let conditions = [eq(schema.measurements.userId, userId)];

      if (startDate) {
        conditions.push(gte(schema.measurements.measurementDate, new Date(startDate)));
      }

      if (endDate) {
        conditions.push(lte(schema.measurements.measurementDate, new Date(endDate)));
      }

      const measurements = await app.db
        .select()
        .from(schema.measurements)
        .where(and(...conditions))
        .orderBy(schema.measurements.measurementDate)
        .limit(100);

      return measurements.map((m) => ({
        id: m.id,
        weight: m.weight,
        bodyFatPercentage: m.bodyFatPercentage,
        muscleMass: m.muscleMass,
        measurementDate: m.measurementDate,
        notes: m.notes,
        createdAt: m.createdAt,
      }));
    } catch (error) {
      app.logger.error(error, 'Error retrieving measurements');
      return reply.status(500).send({ error: 'Failed to retrieve measurements' });
    }
  });
}
