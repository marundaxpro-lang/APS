import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, or } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { z } from 'zod';

const sendFriendRequestSchema = z.object({
  friendId: z.string(),
});

const acceptFriendRequestSchema = z.object({
  status: z.enum(['accepted', 'blocked']),
});

export function registerFriendRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/friends/request - Send friend request by user ID
   */
  app.fastify.post('/api/friends/request', async (
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const validation = sendFriendRequestSchema.safeParse(request.body);
      if (!validation.success) {
        app.logger.warn({ errors: validation.error.issues }, 'Invalid friend request');
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { friendId } = validation.data;
      const userId = session.user.id;

      app.logger.info({ userId, friendId }, 'Sending friend request');

      // Prevent sending friend request to self
      if (userId === friendId) {
        return reply.status(400).send({ error: 'Cannot add yourself as a friend' });
      }

      // Check if friend request already exists
      const existingRequest = await app.db
        .select()
        .from(schema.friendConnections)
        .where(
          and(
            eq(schema.friendConnections.userId, userId),
            eq(schema.friendConnections.friendId, friendId)
          )
        )
        .limit(1);

      if (existingRequest.length > 0) {
        return reply.status(400).send({ error: 'Friend request already sent' });
      }

      const [friendConnection] = await app.db
        .insert(schema.friendConnections)
        .values({
          userId,
          friendId,
          status: 'pending',
        })
        .returning();

      app.logger.info({ connectionId: friendConnection.id }, 'Friend request sent');

      return {
        id: friendConnection.id,
        friendId: friendConnection.friendId,
        status: friendConnection.status,
        createdAt: friendConnection.createdAt,
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Error sending friend request');
      return reply.status(500).send({ error: 'Failed to send friend request' });
    }
  });

  /**
   * GET /api/friends - Get user's friend connections
   */
  app.fastify.get('/api/friends', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const userId = session.user.id;

      app.logger.info({ userId }, 'Retrieving friend connections');

      const friendConnections = await app.db
        .select()
        .from(schema.friendConnections)
        .where(
          or(
            eq(schema.friendConnections.userId, userId),
            eq(schema.friendConnections.friendId, userId)
          )
        )
        .orderBy(schema.friendConnections.updatedAt);

      app.logger.info({ userId, count: friendConnections.length }, 'Friend connections retrieved');

      return friendConnections.map((fc) => ({
        id: fc.id,
        userId: fc.userId,
        friendId: fc.friendId,
        status: fc.status,
        createdAt: fc.createdAt,
        updatedAt: fc.updatedAt,
      }));
    } catch (error) {
      app.logger.error({ err: error }, 'Error retrieving friends');
      return reply.status(500).send({ error: 'Failed to retrieve friends' });
    }
  });

  /**
   * PUT /api/friends/:id - Accept or block friend request
   */
  app.fastify.put('/api/friends/:id', async (
    request: FastifyRequest<{ Body: any; Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const { id } = request.params;
      const validation = acceptFriendRequestSchema.safeParse(request.body);

      if (!validation.success) {
        app.logger.warn({ errors: validation.error.issues }, 'Invalid friend request update');
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { status } = validation.data;
      const userId = session.user.id;

      app.logger.info({ connectionId: id, status }, 'Updating friend connection');

      // Get the friend connection
      const friendConnection = await app.db
        .select()
        .from(schema.friendConnections)
        .where(eq(schema.friendConnections.id, id))
        .limit(1);

      if (friendConnection.length === 0) {
        app.logger.warn({ connectionId: id }, 'Friend connection not found');
        return reply.status(404).send({ error: 'Friend connection not found' });
      }

      const fc = friendConnection[0];

      // Only the recipient can accept/block
      if (fc.friendId !== userId) {
        app.logger.warn({ userId, connectionId: id }, 'Unauthorized friend connection update');
        return reply.status(403).send({ error: 'Unauthorized' });
      }

      const [updated] = await app.db
        .update(schema.friendConnections)
        .set({
          status,
        })
        .where(eq(schema.friendConnections.id, id))
        .returning();

      app.logger.info({ connectionId: id, status }, 'Friend connection updated');

      return {
        id: updated.id,
        userId: updated.userId,
        friendId: updated.friendId,
        status: updated.status,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Error updating friend connection');
      return reply.status(500).send({ error: 'Failed to update friend connection' });
    }
  });
}
