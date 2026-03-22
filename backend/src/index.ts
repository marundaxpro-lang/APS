import { createApplication, resend } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';

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

// Enable authentication with Better Auth, email verification, and password reset
const fromEmail = process.env.FROM_EMAIL ?? 'noreply@aps-fitness.com';

app.withAuth({
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      // Don't await to prevent timing attacks - email sends in background
      resend.emails
        .send({
          from: fromEmail,
          to: user.email,
          subject: 'Verify your APS Fitness email',
          html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:16px;overflow:hidden;max-width:560px;width:100%">
        <tr><td style="background:linear-gradient(135deg,#6c47ff,#a78bfa);padding:32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;letter-spacing:-0.5px">APS Fitness</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px">Your AI-Powered Training Partner</p>
        </td></tr>
        <tr><td style="padding:40px 32px">
          <h2 style="margin:0 0 16px;color:#fff;font-size:22px;font-weight:600">Verify your email address</h2>
          <p style="margin:0 0 24px;color:#a0a0a0;font-size:15px;line-height:1.6">Click the button below to verify your email and activate your APS Fitness account.</p>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#6c47ff,#a78bfa);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600">Verify Email Address</a>
          </td></tr></table>
          <p style="margin:24px 0 0;color:#666;font-size:13px">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #2a2a2a;text-align:center">
          <p style="margin:0;color:#555;font-size:12px">© 2025 APS Fitness. All rights reserved.</p>
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
    sendResetPassword: async ({ user, url }) => {
      // Don't await to prevent timing attacks - email sends in background
      resend.emails
        .send({
          from: fromEmail,
          to: user.email,
          subject: 'Reset your APS Fitness password',
          html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:16px;overflow:hidden;max-width:560px;width:100%">
        <tr><td style="background:linear-gradient(135deg,#6c47ff,#a78bfa);padding:32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;letter-spacing:-0.5px">APS Fitness</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px">Your AI-Powered Training Partner</p>
        </td></tr>
        <tr><td style="padding:40px 32px">
          <h2 style="margin:0 0 16px;color:#fff;font-size:22px;font-weight:600">Reset your password</h2>
          <p style="margin:0 0 24px;color:#a0a0a0;font-size:15px;line-height:1.6">We received a request to reset your APS Fitness password. Click the button below to choose a new password.</p>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#6c47ff,#a78bfa);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600">Reset Password</a>
          </td></tr></table>
          <p style="margin:24px 0 0;color:#666;font-size:13px">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #2a2a2a;text-align:center">
          <p style="margin:0;color:#555;font-size:12px">© 2025 APS Fitness. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        })
        .catch((error) => {
          app.logger.error({ err: error, email: user.email }, 'Failed to send password reset email');
        });

      app.logger.info({ email: user.email }, 'Password reset email queued for sending');
    },
  },
});

// Send welcome email after successful sign-up (after user creation)
const sendWelcomeEmailAfterSignup = async (user: any) => {
  const userName = user.name || user.email?.split('@')[0] || 'there';

  resend.emails
    .send({
      from: fromEmail,
      to: user.email,
      subject: 'Welcome to APS Fitness!',
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:16px;overflow:hidden;max-width:560px;width:100%">
        <tr><td style="background:linear-gradient(135deg,#6c47ff,#a78bfa);padding:32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;letter-spacing:-0.5px">APS Fitness</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px">Your AI-Powered Training Partner</p>
        </td></tr>
        <tr><td style="padding:40px 32px">
          <h2 style="margin:0 0 16px;color:#fff;font-size:22px;font-weight:600">Welcome aboard, ${userName}! 🎉</h2>
          <p style="margin:0 0 16px;color:#a0a0a0;font-size:15px;line-height:1.6">Your account is verified and ready to go. Here's what you can do with APS Fitness:</p>
          <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px">
            <tr><td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#d0d0d0;font-size:14px">💪 <strong>AI-Powered Workouts</strong> — Personalised plans that adapt to you</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#d0d0d0;font-size:14px">🥗 <strong>Nutrition Tracking</strong> — Log meals and hit your macro goals</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#d0d0d0;font-size:14px">📈 <strong>Progress Analytics</strong> — Track streaks, adherence, and growth</td></tr>
            <tr><td style="padding:10px 0;color:#d0d0d0;font-size:14px">🤖 <strong>AI Coach</strong> — Get real-time guidance and insights</td></tr>
          </table>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="https://aps-fitness.com" style="display:inline-block;background:linear-gradient(135deg,#6c47ff,#a78bfa);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600">Open APS Fitness</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #2a2a2a;text-align:center">
          <p style="margin:0;color:#555;font-size:12px">© 2025 APS Fitness. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })
    .catch((error) => {
      app.logger.error({ err: error, email: user.email }, 'Failed to send welcome email');
    });

  app.logger.info({ email: user.email }, 'Welcome email queued for sending');
};

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
