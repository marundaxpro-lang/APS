import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { z } from 'zod';

const createSocialPostSchema = z.object({
  content: z.string().min(1).max(5000),
  postType: z.enum(['achievement', 'workout', 'general', 'milestone']).optional(),
  achievementData: z.record(z.string(), z.any()).optional(),
});

const addCommentSchema = z.object({
  text: z.string().min(1).max(1000),
});

export function registerSocialRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/social/posts - Create a social post
   */
  app.fastify.post('/api/social/posts', async (
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const validation = createSocialPostSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { content, postType, achievementData } = validation.data;
      const userId = session.user.id;

      const [post] = await app.db
        .insert(schema.socialPosts)
        .values({
          userId,
          content,
          postType: postType || 'general',
          achievementData: achievementData || null,
        })
        .returning();

      return {
        id: post.id,
        userId: post.userId,
        content: post.content,
        postType: post.postType,
        achievementData: post.achievementData,
        likesCount: post.likesCount,
        comments: post.comments,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      };
    } catch (error) {
      app.logger.error(error, 'Error creating social post');
      return reply.status(500).send({ error: 'Failed to create post' });
    }
  });

  /**
   * GET /api/social/feed - Get social feed (user + friends posts)
   */
  app.fastify.get('/api/social/feed', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const userId = session.user.id;

      // Get user's friends
      const friendConnections = await app.db
        .select()
        .from(schema.friendConnections)
        .where(
          and(
            eq(schema.friendConnections.userId, userId),
            eq(schema.friendConnections.status, 'accepted')
          )
        );

      const friendIds = friendConnections
        .map((fc) => fc.friendUserId)
        .filter((id) => id !== null);

      // Get posts from user and friends
      const validUserIds = [userId, ...friendIds];

      // Get all posts and filter by valid user IDs
      const allPosts = await app.db
        .select()
        .from(schema.socialPosts)
        .orderBy(schema.socialPosts.createdAt)
        .limit(200);

      const feedPosts = allPosts.filter((p) => validUserIds.includes(p.userId));

      return feedPosts.map((p) => ({
        id: p.id,
        userId: p.userId,
        content: p.content,
        postType: p.postType,
        achievementData: p.achievementData,
        likesCount: p.likesCount,
        comments: p.comments,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
    } catch (error) {
      app.logger.error(error, 'Error retrieving social feed');
      return reply.status(500).send({ error: 'Failed to retrieve feed' });
    }
  });

  /**
   * POST /api/social/posts/:id/like - Like a post
   */
  app.fastify.post('/api/social/posts/:id/like', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const { id } = request.params;
      const userId = session.user.id;

      // Check if post exists
      const post = await app.db
        .select()
        .from(schema.socialPosts)
        .where(eq(schema.socialPosts.id, id))
        .limit(1);

      if (post.length === 0) {
        return reply.status(404).send({ error: 'Post not found' });
      }

      // Check if already liked
      const existingLike = await app.db
        .select()
        .from(schema.socialPostLikes)
        .where(
          and(
            eq(schema.socialPostLikes.postId, id),
            eq(schema.socialPostLikes.userId, userId)
          )
        )
        .limit(1);

      if (existingLike.length > 0) {
        // Unlike the post
        await app.db
          .delete(schema.socialPostLikes)
          .where(
            and(
              eq(schema.socialPostLikes.postId, id),
              eq(schema.socialPostLikes.userId, userId)
            )
          );

        // Decrement likes count
        await app.db
          .update(schema.socialPosts)
          .set({ likesCount: post[0].likesCount - 1 })
          .where(eq(schema.socialPosts.id, id));

        return { liked: false, likesCount: post[0].likesCount - 1 };
      } else {
        // Like the post
        await app.db.insert(schema.socialPostLikes).values({
          postId: id,
          userId,
        });

        // Increment likes count
        await app.db
          .update(schema.socialPosts)
          .set({ likesCount: post[0].likesCount + 1 })
          .where(eq(schema.socialPosts.id, id));

        return { liked: true, likesCount: post[0].likesCount + 1 };
      }
    } catch (error) {
      app.logger.error(error, 'Error liking post');
      return reply.status(500).send({ error: 'Failed to like post' });
    }
  });

  /**
   * POST /api/social/posts/:id/comment - Comment on post
   */
  app.fastify.post('/api/social/posts/:id/comment', async (
    request: FastifyRequest<{ Body: any; Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const { id } = request.params;
      const validation = addCommentSchema.safeParse(request.body);

      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { text } = validation.data;
      const userId = session.user.id;

      // Get the post
      const post = await app.db
        .select()
        .from(schema.socialPosts)
        .where(eq(schema.socialPosts.id, id))
        .limit(1);

      if (post.length === 0) {
        return reply.status(404).send({ error: 'Post not found' });
      }

      const currentComments = (post[0].comments as Array<any>) || [];
      const newComment = {
        userId,
        text,
        createdAt: new Date().toISOString(),
      };

      const updatedComments = [...currentComments, newComment];

      const [updated] = await app.db
        .update(schema.socialPosts)
        .set({ comments: updatedComments })
        .where(eq(schema.socialPosts.id, id))
        .returning();

      return {
        id: updated.id,
        comments: updated.comments,
      };
    } catch (error) {
      app.logger.error(error, 'Error adding comment');
      return reply.status(500).send({ error: 'Failed to add comment' });
    }
  });
}
