import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { resend } from '@specific-dev/framework';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

// Password validation helper
function validatePasswordRequirements(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  return { valid: true };
}

// Welcome email sender
async function sendWelcomeEmail(user: { email: string; name?: string }) {
  // Don't await to prevent timing attacks - email sends in background
  resend.emails
    .send({
      from: 'APS Fitness <noreply@apsfitness.com>',
      to: user.email,
      subject: 'Welcome to APS Fitness - Let\'s Get Started!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #459b9b; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .message { margin: 20px 0; }
              .cta-button { display: inline-block; background-color: #459b9b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
              .tips { background-color: #fff; padding: 15px; border-left: 4px solid #459b9b; margin: 20px 0; }
              .tip-item { margin: 10px 0; }
              .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to APS Fitness</h1>
              </div>
              <div class="content">
                <div class="message">
                  <p>Hi ${user.name || 'there'},</p>
                  <p>Welcome to APS Fitness! We're excited to help you achieve your fitness goals.</p>
                </div>

                <div class="message">
                  <p><strong>Get started by completing your fitness profile and exploring your personalized workout plans.</strong></p>
                </div>

                <div class="tips">
                  <p><strong>Quick Start Guide:</strong></p>
                  <div class="tip-item">1. Complete your fitness profile with your goals and preferences</div>
                  <div class="tip-item">2. Explore personalized workout plans tailored to your needs</div>
                  <div class="tip-item">3. Track your progress and celebrate your achievements</div>
                </div>

                <div class="message">
                  <a href="${process.env.APP_URL || 'https://apsfitness.com'}/dashboard" class="cta-button">Start Your Journey</a>
                </div>

                <div class="message">
                  <p>Your fitness journey starts now. We're here to support you every step of the way!</p>
                </div>

                <div class="footer">
                  <p>&copy; 2024 APS Fitness. All rights reserved.</p>
                  <p>If you didn't create this account, please ignore this email.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    })
    .catch((error) => {
      console.error('Failed to send welcome email:', error);
    });
}

export function registerAuthRoutes(app: App) {
  /**
   * POST /api/auth/signup/email-with-welcome - Email signup with welcome email
   * This is a wrapper around Better Auth's signup that also sends a welcome email
   */
  app.fastify.post('/api/auth/signup/email-with-welcome', async (
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ): Promise<any> => {
    try {
      const validation = signupSchema.safeParse(request.body);
      if (!validation.success) {
        app.logger.warn({ errors: validation.error.issues }, 'Invalid signup request');
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { email, password, name } = validation.data;

      // Validate password requirements
      const passwordValidation = validatePasswordRequirements(password);
      if (!passwordValidation.valid) {
        app.logger.warn({ email }, `Password validation failed: ${passwordValidation.error}`);
        return reply.status(400).send({ error: passwordValidation.error });
      }

      app.logger.info({ email }, 'User attempting email signup');

      // Call Better Auth's sign up endpoint
      // We proxy the request to the actual Better Auth endpoint
      const signupUrl = `${request.protocol}://${request.hostname}/api/auth/sign-up/email`;
      const signupResponse = await fetch(signupUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name: name || email,
        }),
      });

      const signupData = await signupResponse.json() as any;

      if (signupResponse.ok && signupData?.user) {
        const user = signupData.user as { id: string; email: string; name?: string };
        app.logger.info({ userId: user.id, email }, 'User signed up successfully');

        // Send welcome email asynchronously
        sendWelcomeEmail({
          email: user.email,
          name: user.name || email,
        });

        return signupData;
      } else {
        app.logger.warn({ email, error: signupData }, 'Sign up failed');
        return reply.status(signupResponse.status).send(signupData);
      }
    } catch (error) {
      app.logger.error({ err: error }, 'Error during signup');
      return reply.status(500).send({ error: 'Failed to sign up' });
    }
  });

  // Better Auth handles all authentication automatically:
  // POST /api/auth/sign-in/email - Sign in with email/password
  // POST /api/auth/sign-up/email - Sign up with email/password (with password validation)
  // POST /api/auth/sign-in/social - OAuth sign-in (Google, Apple, etc.)
  // GET /api/auth/get-session - Get current session
  // POST /api/auth/sign-out - Sign out
  // And many more endpoints - see https://better-auth.com/docs

  app.logger.info('Custom auth routes registered with password validation and welcome emails');
}
