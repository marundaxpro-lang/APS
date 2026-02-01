import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { z } from 'zod';

const createExerciseSchema = z.object({
  name: z.string().min(1).max(255),
  muscleGroup: z.string().min(1).max(100),
  equipmentType: z.enum(['gym', 'home', 'minimal']),
  description: z.string().optional(),
  isPremium: z.boolean().optional(),
});

const addVideoSchema = z.object({
  exerciseId: z.string().uuid(),
  videoUrl: z.string().url(),
  videoType: z.enum(['youtube', 's3']),
  title: z.string().min(1).max(255),
  duration: z.number().int().positive().optional(),
});

const updateVideoSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  duration: z.number().int().positive().optional(),
});

export function registerExerciseRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/exercises - Get all exercises with metadata
   */
  app.fastify.get('/api/exercises', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> => {
    try {
      app.logger.info('Retrieving all exercises');

      const exercises = await app.db
        .select()
        .from(schema.exercises)
        .limit(1000);

      app.logger.info({ exerciseCount: exercises.length }, 'Exercises retrieved successfully');

      return exercises.map((ex) => ({
        id: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        equipmentType: ex.equipmentType,
        description: ex.description,
        isPremium: ex.isPremium,
        createdAt: ex.createdAt,
      }));
    } catch (error) {
      app.logger.error({ err: error }, 'Error retrieving exercises');
      return reply.status(500).send({ error: 'Failed to retrieve exercises' });
    }
  });

  /**
   * GET /api/exercises/:id - Get exercise with videos
   */
  app.fastify.get('/api/exercises/:id', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<any> => {
    try {
      const { id } = request.params;

      app.logger.info({ exerciseId: id }, 'Retrieving exercise');

      const exercise = await app.db
        .select()
        .from(schema.exercises)
        .where(eq(schema.exercises.id, id))
        .limit(1);

      if (exercise.length === 0) {
        app.logger.warn({ exerciseId: id }, 'Exercise not found');
        return reply.status(404).send({ error: 'Exercise not found' });
      }

      // Get videos for this exercise
      const videos = await app.db
        .select()
        .from(schema.exerciseVideos)
        .where(eq(schema.exerciseVideos.exerciseId, id))
        .limit(100);

      const ex = exercise[0];

      return {
        id: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        equipmentType: ex.equipmentType,
        description: ex.description,
        isPremium: ex.isPremium,
        videos: videos.map((v) => ({
          id: v.id,
          videoUrl: v.videoUrl,
          videoType: v.videoType,
          title: v.title,
          duration: v.duration,
        })),
        createdAt: ex.createdAt,
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Error retrieving exercise');
      return reply.status(500).send({ error: 'Failed to retrieve exercise' });
    }
  });

  /**
   * POST /api/exercises - Create a new exercise (admin only)
   */
  app.fastify.post('/api/exercises', async (
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const validation = createExerciseSchema.safeParse(request.body);
      if (!validation.success) {
        app.logger.warn({ errors: validation.error.issues }, 'Invalid create exercise request');
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { name, muscleGroup, equipmentType, description, isPremium } = validation.data;

      app.logger.info({ name, muscleGroup, equipmentType }, 'Creating exercise');

      const [exercise] = await app.db
        .insert(schema.exercises)
        .values({
          name,
          muscleGroup,
          equipmentType,
          description: description || null,
          isPremium: isPremium || false,
        })
        .returning();

      return {
        id: exercise.id,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        equipmentType: exercise.equipmentType,
        description: exercise.description,
        isPremium: exercise.isPremium,
        createdAt: exercise.createdAt,
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Error creating exercise');
      return reply.status(500).send({ error: 'Failed to create exercise' });
    }
  });

  /**
   * POST /api/exercises/:id/videos - Add video to exercise
   */
  app.fastify.post('/api/exercises/:id/videos', async (
    request: FastifyRequest<{ Body: any; Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const validation = addVideoSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { exerciseId, videoUrl, videoType, title, duration } = validation.data;

      // Verify exercise exists
      const exercise = await app.db
        .select()
        .from(schema.exercises)
        .where(eq(schema.exercises.id, exerciseId))
        .limit(1);

      if (exercise.length === 0) {
        return reply.status(404).send({ error: 'Exercise not found' });
      }

      // Handle S3 uploads - if videoType is 's3', upload from request
      let finalVideoUrl = videoUrl;
      if (videoType === 's3') {
        const data = await request.file();
        if (!data) {
          return reply.status(400).send({ error: 'No video file provided for S3 upload' });
        }

        let buffer: Buffer;
        try {
          buffer = await data.toBuffer();
        } catch (err) {
          return reply.status(413).send({ error: 'File too large' });
        }

        // Upload to storage
        const key = `exercise-videos/${exerciseId}/${Date.now()}-${data.filename}`;
        finalVideoUrl = await app.storage.upload(key, buffer);
      }

      const [video] = await app.db
        .insert(schema.exerciseVideos)
        .values({
          exerciseId,
          videoUrl: finalVideoUrl,
          videoType,
          title,
          duration: duration || null,
        })
        .returning();

      return {
        id: video.id,
        exerciseId: video.exerciseId,
        videoUrl: video.videoUrl,
        videoType: video.videoType,
        title: video.title,
        duration: video.duration,
      };
    } catch (error) {
      app.logger.error(error, 'Error adding exercise video');
      return reply.status(500).send({ error: 'Failed to add video' });
    }
  });

  /**
   * PUT /api/exercises/:id/videos/:videoId - Update exercise video
   */
  app.fastify.put('/api/exercises/:id/videos/:videoId', async (
    request: FastifyRequest<{ Body: any; Params: { id: string; videoId: string } }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const { videoId } = request.params;
      const validation = updateVideoSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { title, duration } = validation.data;

      const [video] = await app.db
        .update(schema.exerciseVideos)
        .set({
          ...(title && { title }),
          ...(duration !== undefined && { duration }),
        })
        .where(eq(schema.exerciseVideos.id, videoId))
        .returning();

      if (!video) {
        return reply.status(404).send({ error: 'Video not found' });
      }

      return {
        id: video.id,
        exerciseId: video.exerciseId,
        videoUrl: video.videoUrl,
        videoType: video.videoType,
        title: video.title,
        duration: video.duration,
      };
    } catch (error) {
      app.logger.error(error, 'Error updating exercise video');
      return reply.status(500).send({ error: 'Failed to update video' });
    }
  });

  /**
   * DELETE /api/exercises/:id/videos/:videoId - Delete exercise video
   */
  app.fastify.delete('/api/exercises/:id/videos/:videoId', async (
    request: FastifyRequest<{ Params: { id: string; videoId: string } }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const { videoId } = request.params;

      // Get video first to check if it's S3
      const video = await app.db
        .select()
        .from(schema.exerciseVideos)
        .where(eq(schema.exerciseVideos.id, videoId))
        .limit(1);

      if (video.length === 0) {
        return reply.status(404).send({ error: 'Video not found' });
      }

      // If S3, delete from storage
      if (video[0].videoType === 's3') {
        try {
          await app.storage.delete(video[0].videoUrl);
        } catch (err) {
          app.logger.warn(err, 'Failed to delete S3 video');
        }
      }

      await app.db
        .delete(schema.exerciseVideos)
        .where(eq(schema.exerciseVideos.id, videoId));

      return { success: true };
    } catch (error) {
      app.logger.error(error, 'Error deleting exercise video');
      return reply.status(500).send({ error: 'Failed to delete video' });
    }
  });

  /**
   * DELETE /api/exercises/:id - Delete exercise
   */
  app.fastify.delete('/api/exercises/:id', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const { id } = request.params;

      // Get all videos for this exercise
      const videos = await app.db
        .select()
        .from(schema.exerciseVideos)
        .where(eq(schema.exerciseVideos.exerciseId, id));

      // Delete S3 videos
      for (const video of videos) {
        if (video.videoType === 's3') {
          try {
            await app.storage.delete(video.videoUrl);
          } catch (err) {
            app.logger.warn(err, 'Failed to delete S3 video during exercise deletion');
          }
        }
      }

      // Delete exercise (videos cascade delete)
      await app.db
        .delete(schema.exercises)
        .where(eq(schema.exercises.id, id));

      return { success: true };
    } catch (error) {
      app.logger.error(error, 'Error deleting exercise');
      return reply.status(500).send({ error: 'Failed to delete exercise' });
    }
  });
}
