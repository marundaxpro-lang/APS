import { createApplication, resend } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { sendWelcomeEmail, sendLoginNotificationEmail, sendPasswordResetEmail } from './utils/email.js';

// Import route registration functions
import { registerAuthRoutes } from './routes/auth.js';
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

// Enable authentication with Better Auth, email verification, and transactional emails
app.withAuth({
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      app.logger.info({ email: user.email }, 'Sending email verification');
      resend.emails
        .send({
          from: process.env.FROM_EMAIL ?? 'APS App <noreply@aps.app>',
          to: user.email,
          subject: 'Verify your APS email',
          html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:16px;overflow:hidden;max-width:600px;width:100%">
        <tr><td style="background:linear-gradient(135deg,#FF6B35,#FF8C42);padding:32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:32px;font-weight:700;letter-spacing:-1px">APS</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:13px;font-weight:500">Your Fitness Companion</p>
        </td></tr>
        <tr><td style="padding:40px 32px">
          <h2 style="margin:0 0 16px;color:#fff;font-size:24px;font-weight:700">Verify your email</h2>
          <p style="margin:0 0 24px;color:#e0e0e0;font-size:15px;line-height:1.6">Click the button below to verify your email and activate your APS account.</p>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#FF6B35,#FF8C42);color:#fff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:15px;font-weight:600">Verify Email Address</a>
          </td></tr></table>
          <p style="margin:24px 0 0;color:#999;font-size:13px">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #2a2a2a;text-align:center">
          <p style="margin:0;color:#555;font-size:12px">© 2025 APS App. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        })
        .catch((error) => {
          app.logger.error({ err: error, email: user.email }, 'Failed to send verification email');
        });

      app.logger.info({ email: user.email }, 'Verification email queued for sending');
    },
  },
  emailAndPassword: {
    sendResetPassword: async ({ user, token }) => {
      app.logger.info({ email: user.email }, 'Sending password reset email');
      await sendPasswordResetEmail(user.email, user.name || '', token);
    },
  },
});

// Enable storage for file uploads
app.withStorage();

// Register all route modules
registerAuthRoutes(app);
registerUserRoutes(app);
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
