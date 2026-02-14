import { createApplication, resend } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';

// Import route registration functions
import { registerAuthRoutes } from './routes/auth.js';
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

// Helper function to send welcome email
async function sendWelcomeEmail(user: { email: string; name: string }) {
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
      app.logger.error({ err: error, email: user.email }, 'Failed to send welcome email');
    });

  app.logger.info({ email: user.email }, 'Welcome email queued for sending');
}

// Enable authentication with Better Auth
app.withAuth();

// Enable storage for file uploads
app.withStorage();

// Register all route modules
registerAuthRoutes(app);
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
