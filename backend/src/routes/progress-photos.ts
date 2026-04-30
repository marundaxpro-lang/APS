import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte, lte } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { z } from 'zod';

const uploadProgressPhotoSchema = z.object({
  photoDate: z.string().datetime(),
  weightAtTime: z.string().optional(),
  notes: z.string().optional(),
});

const getProgressPhotosSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export function registerProgressPhotoRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/progress-photos - Upload a progress photo
   */
  app.fastify.post('/api/progress-photos', async (
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    try {
      app.logger.info({ userId }, 'Uploading progress photo');

      const data = await request.file();
      if (!data) {
        app.logger.warn({ userId }, 'No file provided for progress photo upload');
        return reply.status(400).send({ error: 'No file provided' });
      }

      let buffer: Buffer;
      try {
        buffer = await data.toBuffer();
      } catch (err) {
        return reply.status(413).send({ error: 'File too large' });
      }

      // Parse metadata from request body
      let parsedMetadata;
      try {
        if (!request.body) {
          return reply.status(400).send({ error: 'Missing metadata' });
        }
        parsedMetadata = request.body;
        uploadProgressPhotoSchema.parse(parsedMetadata);
      } catch (err) {
        return reply.status(400).send({ error: 'Invalid metadata format' });
      }

      // Upload to storage
      const key = `progress-photos/${userId}/${Date.now()}-${data.filename}`;
      const uploadedKey = await app.storage.upload(key, buffer);
      const { url } = await app.storage.getSignedUrl(uploadedKey);

      // Save to database - cast to string for decimal type
      const weightAtTime = parsedMetadata.weightAtTime
        ? (parseFloat(parsedMetadata.weightAtTime).toString() as any)
        : null;

      const [progressPhoto] = await app.db
        .insert(schema.progressPhotos)
        .values({
          userId,
          photoUrl: uploadedKey,
          photoDate: new Date(parsedMetadata.photoDate),
          weightAtTime,
          notes: parsedMetadata.notes || null,
        })
        .returning();

      app.logger.info({ photoId: progressPhoto.id, userId }, 'Progress photo uploaded successfully');

      return {
        id: progressPhoto.id,
        photoUrl: url,
        photoDate: progressPhoto.photoDate,
        weightAtTime: progressPhoto.weightAtTime,
        notes: progressPhoto.notes,
        createdAt: progressPhoto.createdAt,
      };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Error uploading progress photo');
      return reply.status(500).send({ error: 'Failed to upload photo' });
    }
  });

  /**
   * GET /api/progress-photos - Get user's progress photos
   */
  app.fastify.get('/api/progress-photos', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    try {
      const query = request.query as Record<string, any>;
      const validation = getProgressPhotosSchema.safeParse(query);

      if (!validation.success) {
        app.logger.warn({ errors: validation.error.issues }, 'Invalid progress photos query parameters');
        return reply.status(400).send({ error: 'Invalid query parameters' });
      }

      const { startDate, endDate } = validation.data;

      app.logger.info({ userId }, 'Retrieving progress photos');

      let conditions: any[] = [eq(schema.progressPhotos.userId, userId)];

      if (startDate) {
        conditions.push(gte(schema.progressPhotos.photoDate, new Date(startDate)));
      }

      if (endDate) {
        conditions.push(lte(schema.progressPhotos.photoDate, new Date(endDate)));
      }

      const photos = await app.db
        .select()
        .from(schema.progressPhotos)
        .where(and(...conditions))
        .orderBy(schema.progressPhotos.photoDate)
        .limit(100);

      // Generate signed URLs for all photos
      const photosWithUrls = await Promise.all(
        photos.map(async (photo) => {
          try {
            const { url } = await app.storage.getSignedUrl(photo.photoUrl);
            return {
              id: photo.id,
              photoUrl: url,
              photoDate: photo.photoDate,
              weightAtTime: photo.weightAtTime,
              notes: photo.notes,
              createdAt: photo.createdAt,
            };
          } catch {
            return {
              id: photo.id,
              photoUrl: null,
              photoDate: photo.photoDate,
              weightAtTime: photo.weightAtTime,
              notes: photo.notes,
              createdAt: photo.createdAt,
            };
          }
        })
      );

      app.logger.info({ photoCount: photosWithUrls.length, userId }, 'Progress photos retrieved successfully');

      return photosWithUrls;
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Error retrieving progress photos');
      return reply.status(500).send({ error: 'Failed to retrieve photos' });
    }
  });
}
