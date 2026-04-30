import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getSupabaseAdmin, verifyToken } from '../utils/supabase.js';
import type { App } from '../index.js';

export function registerAuthSupabaseRoutes(app: App) {
  /**
   * POST /api/auth/signup
   * Create a new user with email and password
   */
  app.fastify.post<{
    Body: {
      email: string;
      password: string;
      name?: string;
    };
  }>('/api/auth/signup', {
    schema: {
      description: 'Sign up with email and password',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: { type: 'object' },
            message: { type: 'string' },
          },
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request, reply) => {
    const { email, password, name } = request.body;

    app.logger.info({ email }, 'Signing up user');

    try {
      // Create user via Supabase auth
      const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (error || !data.user) {
        app.logger.warn({ email, error }, 'Sign up failed');
        return reply.status(400).send({ error: error?.message || 'Sign up failed' });
      }

      // Create profile row
      const { error: profileError } = await (getSupabaseAdmin() as any)
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          name: name || null,
          onboarding_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        app.logger.error({ err: profileError, userId: data.user.id }, 'Failed to create profile');
      }

      app.logger.info({ userId: data.user.id }, 'User signed up successfully');

      return {
        user: {
          id: data.user.id,
          email: data.user.email,
          name: name || null,
        },
        message: 'Sign up successful. Please log in with your credentials.',
      };
    } catch (error) {
      app.logger.error({ err: error, email }, 'Sign up error');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/auth/login
   * Sign in with email and password
   */
  app.fastify.post<{
    Body: {
      email: string;
      password: string;
    };
  }>('/api/auth/login', {
    schema: {
      description: 'Sign in with email and password',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: { type: 'object' },
            session: {
              type: 'object',
              properties: {
                access_token: { type: 'string' },
                refresh_token: { type: 'string' },
              },
            },
          },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body;

    app.logger.info({ email }, 'User signing in');

    try {
      const { data, error } = await getSupabaseAdmin().auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session || !data.user) {
        app.logger.warn({ email, error }, 'Sign in failed');
        return reply.status(401).send({ error: 'Invalid email or password' });
      }

      // Get user profile
      const { data: profileData } = await (getSupabaseAdmin() as any)
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      app.logger.info({ userId: data.user.id }, 'User signed in successfully');

      return {
        user: {
          id: data.user.id,
          email: data.user.email,
          name: (profileData as any)?.name || null,
          onboarding_completed: (profileData as any)?.onboarding_completed || false,
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        },
      };
    } catch (error) {
      app.logger.error({ err: error, email }, 'Sign in error');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/auth/logout
   * Sign out the current user
   */
  app.fastify.post('/api/auth/logout', {
    schema: {
      description: 'Sign out current user',
      tags: ['auth'],
      response: {
        200: { type: 'object', properties: { message: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request, reply) => {
    const user = await verifyToken(request.headers.authorization);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    app.logger.info({ userId: user.id }, 'User signing out');

    try {
      // Invalidate session - note: Supabase doesn't have a direct logout endpoint
      // The client should just discard the tokens
      app.logger.info({ userId: user.id }, 'User signed out successfully');
      return { message: 'Signed out successfully' };
    } catch (error) {
      app.logger.error({ err: error, userId: user.id }, 'Sign out error');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/auth/me
   * Get current authenticated user
   */
  app.fastify.get('/api/auth/me', {
    schema: {
      description: 'Get current user profile',
      tags: ['auth'],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            onboarding_completed: { type: 'boolean' },
          },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request, reply) => {
    const user = await verifyToken(request.headers.authorization);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    app.logger.info({ userId: user.id }, 'Fetching current user');

    try {
      const { data: profileData, error } = await getSupabaseAdmin()
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        app.logger.warn({ userId: user.id, error }, 'Profile not found');
        return reply.status(404).send({ error: 'Profile not found' });
      }

      return {
        id: user.id,
        email: user.email || (profileData as any).email,
        name: (profileData as any).name || null,
        onboarding_completed: (profileData as any).onboarding_completed || false,
      };
    } catch (error) {
      app.logger.error({ err: error, userId: user.id }, 'Error fetching user');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/auth/refresh
   * Refresh the access token
   */
  app.fastify.post<{
    Body: {
      refresh_token: string;
    };
  }>('/api/auth/refresh', {
    schema: {
      description: 'Refresh access token',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['refresh_token'],
        properties: {
          refresh_token: { type: 'string' },
        },
      },
      response: {
        200: { type: 'object' },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request, reply) => {
    const { refresh_token } = request.body;

    app.logger.info('Refreshing access token');

    try {
      const { data, error } = await getSupabaseAdmin().auth.refreshSession({
        refresh_token,
      } as any);

      if (error || !data.session) {
        app.logger.warn({ error }, 'Token refresh failed');
        return reply.status(401).send({ error: 'Invalid refresh token' });
      }

      app.logger.info('Token refreshed successfully');

      const session = data.session as any;
      const result: Record<string, string> = {};
      result['access_token'] = session.access_token;
      result['refresh_token'] = session.refresh_token || refresh_token;
      return result;
    } catch (error) {
      app.logger.error({ err: error }, 'Token refresh error');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
