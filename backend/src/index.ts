import { createApplication, resend } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';

// Import route registration functions
import { registerAuthSupabaseRoutes } from './routes/auth-supabase.js';
import { registerTrackingRoutes } from './routes/tracking.js';
import { registerUserRoutes } from './routes/user.js';
import { registerProgressPhotoRoutes } from './routes/progress-photos.js';
import { registerMeasurementRoutes } from './routes/measurements.js';
import { registerAchievementRoutes } from './routes/achievements.js';
import { registerFriendRoutes } from './routes/friends.js';
import { registerSocialRoutes } from './routes/social.js';
import { registerWorkoutRoutes } from './routes/workouts.js';
import { registerNutritionRoutes } from './routes/nutrition.js';
import { registerFitnessProfileRoutes } from './routes/fitness-profile.js';
import { registerAiRoutes } from './routes/ai.js';
import { registerPaymentRoutes } from './routes/payments.js';
import { registerExerciseRoutes } from './routes/exercises.js';
import { registerDashboardRoutes } from './routes/dashboard.js';
import { registerMealPlanRoutes } from './routes/meal-plans.js';
import { registerTaskRoutes } from './routes/tasks.js';

// Combine schemas
const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Helper function to validate password strength
function validatePassword(password: string): { valid: boolean; error?: string } {
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

// Enable storage for file uploads
app.withStorage();

// Enable Better Auth with email/password, email verification, password reset, and OAuth providers
app.withAuth({
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      app.logger.info({ email: user.email }, 'Sending verification email');
      resend.emails.send({
        from: 'APS Fitness <noreply@apsfitness.com>',
        to: user.email,
        subject: 'Verify your email address',
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
                .button { display: inline-block; background-color: #459b9b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Verify Your Email</h1>
                </div>
                <div class="content">
                  <p>Hi ${user.name || 'there'},</p>
                  <p>Welcome to APS Fitness! Please verify your email address to complete your registration.</p>
                  <a href="${url}" class="button">Verify Email</a>
                  <p style="margin-top: 20px; font-size: 12px; color: #666;">Or copy and paste this link: ${url}</p>
                </div>
                <div class="footer">
                  <p>&copy; 2024 APS Fitness. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }).catch((error) => {
        app.logger.error({ err: error, email: user.email }, 'Failed to send verification email');
      });
    },
  },
  emailAndPassword: {
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      app.logger.info({ email: user.email }, 'Sending password reset email');
      resend.emails.send({
        from: 'APS Fitness <noreply@apsfitness.com>',
        to: user.email,
        subject: 'Reset your password',
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
                .button { display: inline-block; background-color: #459b9b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Reset Your Password</h1>
                </div>
                <div class="content">
                  <p>Hi ${user.name || 'there'},</p>
                  <p>We received a request to reset your password. Click the button below to create a new password.</p>
                  <a href="${url}" class="button">Reset Password</a>
                  <p style="margin-top: 20px; font-size: 12px; color: #666;">This link expires in 1 hour. Or copy and paste this link: ${url}</p>
                  <p style="margin-top: 20px; font-size: 12px; color: #666;">If you didn't request a password reset, you can ignore this email.</p>
                </div>
                <div class="footer">
                  <p>&copy; 2024 APS Fitness. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }).catch((error) => {
        app.logger.error({ err: error, email: user.email }, 'Failed to send password reset email');
      });
    },
  },
});

// Register all route modules
registerAuthSupabaseRoutes(app);
registerUserRoutes(app);
registerTrackingRoutes(app);
registerProgressPhotoRoutes(app);
registerMeasurementRoutes(app);
registerAchievementRoutes(app);
registerFriendRoutes(app);
registerSocialRoutes(app);
registerWorkoutRoutes(app);
registerNutritionRoutes(app);
registerFitnessProfileRoutes(app);
registerAiRoutes(app);
registerPaymentRoutes(app);
registerExerciseRoutes(app);
registerDashboardRoutes(app);
registerMealPlanRoutes(app);
registerTaskRoutes(app);

await app.run();
app.logger.info('Fitness app backend running with Better Auth enabled');
