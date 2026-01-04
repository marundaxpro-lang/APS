import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, or } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { z } from 'zod';

const sendFriendRequestSchema = z.object({
  friendEmail: z.string().email(),
});

const acceptFriendRequestSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
});

export function registerFriendRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/friends/request - Send friend request by email
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
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { friendEmail } = validation.data;
      const userId = session.user.id;

      // Prevent sending friend request to self
      if (session.user.email === friendEmail) {
        return reply.status(400).send({ error: 'Cannot add yourself as a friend' });
      }

      // Check if friend request already exists
      const existingRequest = await app.db
        .select()
        .from(schema.friendConnections)
        .where(
          and(
            eq(schema.friendConnections.userId, userId),
            eq(schema.friendConnections.friendEmail, friendEmail)
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
          friendEmail,
          status: 'pending',
        })
        .returning();

      return {
        id: friendConnection.id,
        friendEmail: friendConnection.friendEmail,
        status: friendConnection.status,
        createdAt: friendConnection.createdAt,
      };
    } catch (error) {
      app.logger.error(error, 'Error sending friend request');
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

      const friendConnections = await app.db
        .select()
        .from(schema.friendConnections)
        .where(
          or(
            eq(schema.friendConnections.userId, userId),
            eq(schema.friendConnections.friendUserId, userId)
          )
        )
        .orderBy(schema.friendConnections.connectedDate);

      return friendConnections.map((fc) => ({
        id: fc.id,
        userId: fc.userId,
        friendUserId: fc.friendUserId,
        friendEmail: fc.friendEmail,
        status: fc.status,
        connectedDate: fc.connectedDate,
        createdAt: fc.createdAt,
      }));
    } catch (error) {
      app.logger.error(error, 'Error retrieving friends');
      return reply.status(500).send({ error: 'Failed to retrieve friends' });
    }
  });

  /**
   * PUT /api/friends/:id/accept - Accept or reject friend request
   */
  app.fastify.put('/api/friends/:id/accept', async (
    request: FastifyRequest<{ Body: any; Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const { id } = request.params;
      const validation = acceptFriendRequestSchema.safeParse(request.body);

      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { status } = validation.data;
      const userId = session.user.id;

      // Get the friend connection
      const friendConnection = await app.db
        .select()
        .from(schema.friendConnections)
        .where(eq(schema.friendConnections.id, id))
        .limit(1);

      if (friendConnection.length === 0) {
        return reply.status(404).send({ error: 'Friend request not found' });
      }

      const fc = friendConnection[0];

      // Only the recipient can accept/reject
      if (fc.friendUserId !== userId && fc.friendEmail !== session.user.email) {
        return reply.status(403).send({ error: 'Unauthorized' });
      }

      const [updated] = await app.db
        .update(schema.friendConnections)
        .set({
          status,
          connectedDate: status === 'accepted' ? new Date() : null,
        })
        .where(eq(schema.friendConnections.id, id))
        .returning();

      return {
        id: updated.id,
        userId: updated.userId,
        friendUserId: updated.friendUserId,
        friendEmail: updated.friendEmail,
        status: updated.status,
        connectedDate: updated.connectedDate,
        createdAt: updated.createdAt,
      };
    } catch (error) {
      app.logger.error(error, 'Error accepting friend request');
      return reply.status(500).send({ error: 'Failed to accept friend request' });
    }
  });
}
