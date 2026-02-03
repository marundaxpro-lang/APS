import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { z } from 'zod';

const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  category: z.enum(['study', 'work', 'fitness', 'personal', 'other']),
  dueDate: z.string().datetime().optional(), // ISO 8601 format
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  category: z.enum(['study', 'work', 'fitness', 'personal', 'other']).optional(),
  completed: z.boolean().optional(),
  dueDate: z.string().datetime().optional(), // ISO 8601 format
});

export function registerTaskRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/tasks - Get all tasks for the authenticated user
   */
  app.fastify.get('/api/tasks', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const userId = session.user.id;

      app.logger.info({ userId }, 'Retrieving user tasks');

      const tasks = await app.db
        .select()
        .from(schema.userTasks)
        .where(eq(schema.userTasks.userId, userId))
        .orderBy(schema.userTasks.createdAt);

      app.logger.info({ userId, taskCount: tasks.length }, 'User tasks retrieved successfully');

      return tasks.map((task) => ({
        id: task.id,
        title: task.title,
        category: task.category,
        completed: task.completed,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      }));
    } catch (error) {
      app.logger.error({ err: error }, 'Error retrieving tasks');
      return reply.status(500).send({ error: 'Failed to retrieve tasks' });
    }
  });

  /**
   * POST /api/tasks - Create a new task for the authenticated user
   */
  app.fastify.post('/api/tasks', async (
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const validation = createTaskSchema.safeParse(request.body);
      if (!validation.success) {
        app.logger.warn({ errors: validation.error.issues }, 'Invalid create task request');
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { title, category, dueDate } = validation.data;
      const userId = session.user.id;

      app.logger.info(
        { userId, title, category, hasDueDate: !!dueDate },
        'Creating new task'
      );

      const [task] = await app.db
        .insert(schema.userTasks)
        .values({
          userId,
          title,
          category,
          dueDate: dueDate ? new Date(dueDate) : null,
          completed: false,
        })
        .returning();

      app.logger.info({ taskId: task.id, userId }, 'Task created successfully');

      return {
        id: task.id,
        title: task.title,
        category: task.category,
        completed: task.completed,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Error creating task');
      return reply.status(500).send({ error: 'Failed to create task' });
    }
  });

  /**
   * PUT /api/tasks/:id - Update a task (only if user owns it)
   */
  app.fastify.put('/api/tasks/:id', async (
    request: FastifyRequest<{ Params: { id: string }; Body: any }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const { id } = request.params;
      const userId = session.user.id;

      app.logger.info({ taskId: id, userId }, 'Updating task');

      // Verify task belongs to user
      const existingTask = await app.db
        .select()
        .from(schema.userTasks)
        .where(and(eq(schema.userTasks.id, id), eq(schema.userTasks.userId, userId)))
        .limit(1);

      if (existingTask.length === 0) {
        app.logger.warn({ taskId: id, userId }, 'Task not found or unauthorized');
        return reply.status(404).send({ error: 'Task not found' });
      }

      const validation = updateTaskSchema.safeParse(request.body);
      if (!validation.success) {
        app.logger.warn({ errors: validation.error.issues }, 'Invalid update task request');
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { title, category, completed, dueDate } = validation.data;

      // Build update object with only provided fields
      const updateData: Record<string, any> = {};
      if (title !== undefined) updateData.title = title;
      if (category !== undefined) updateData.category = category;
      if (completed !== undefined) updateData.completed = completed;
      if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

      const [updatedTask] = await app.db
        .update(schema.userTasks)
        .set(updateData)
        .where(eq(schema.userTasks.id, id))
        .returning();

      app.logger.info({ taskId: id, userId }, 'Task updated successfully');

      return {
        id: updatedTask.id,
        title: updatedTask.title,
        category: updatedTask.category,
        completed: updatedTask.completed,
        dueDate: updatedTask.dueDate,
        createdAt: updatedTask.createdAt,
        updatedAt: updatedTask.updatedAt,
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Error updating task');
      return reply.status(500).send({ error: 'Failed to update task' });
    }
  });

  /**
   * DELETE /api/tasks/:id - Delete a task (only if user owns it)
   */
  app.fastify.delete('/api/tasks/:id', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const { id } = request.params;
      const userId = session.user.id;

      app.logger.info({ taskId: id, userId }, 'Deleting task');

      // Verify task belongs to user
      const existingTask = await app.db
        .select()
        .from(schema.userTasks)
        .where(and(eq(schema.userTasks.id, id), eq(schema.userTasks.userId, userId)))
        .limit(1);

      if (existingTask.length === 0) {
        app.logger.warn({ taskId: id, userId }, 'Task not found or unauthorized');
        return reply.status(404).send({ error: 'Task not found' });
      }

      await app.db.delete(schema.userTasks).where(eq(schema.userTasks.id, id));

      app.logger.info({ taskId: id, userId }, 'Task deleted successfully');

      return { success: true };
    } catch (error) {
      app.logger.error({ err: error }, 'Error deleting task');
      return reply.status(500).send({ error: 'Failed to delete task' });
    }
  });
}
