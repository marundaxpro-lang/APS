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

const DEFAULT_BACKEND_URL = 'https://6n56k42q4ee7wx23tvj24hjhn64k9a89.app.specular.dev';

function envFirst(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

function splitEnvList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const betterAuthUrl =
  envFirst(['BETTER_AUTH_URL', 'BACKEND_URL', 'SPECULAR_BACKEND_URL', 'APP_PUBLIC_BACKEND_URL']) ??
  DEFAULT_BACKEND_URL;

const trustedOrigins = Array.from(new Set([
  betterAuthUrl,
  DEFAULT_BACKEND_URL,
  'aps://',
  'aps://auth',
  'aps://auth-callback',
  'aps://onboarding',
  'exp://',
  'http://localhost:8081',
  'http://localhost:19000',
  'http://localhost:19006',
  'http://localhost:3000',
  'https://*.app.specular.dev',
  'https://*.newly.dev',
  'https://*.natively.dev',
  'https://appleid.apple.com',
  ...splitEnvList(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
  ...splitEnvList(process.env.TRUSTED_ORIGINS),
].filter(Boolean)));

function buildSocialProviders(): Record<string, any> {
  const providers: Record<string, any> = {};

  const googleClientId = envFirst([
    'GOOGLE_CLIENT_ID',
    'GOOGLE_OAUTH_CLIENT_ID',
    'AUTH_GOOGLE_CLIENT_ID',
    'BETTER_AUTH_GOOGLE_CLIENT_ID',
  ]);
  const googleClientSecret = envFirst([
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_OAUTH_CLIENT_SECRET',
    'AUTH_GOOGLE_CLIENT_SECRET',
    'BETTER_AUTH_GOOGLE_CLIENT_SECRET',
  ]);

  if (googleClientId && googleClientSecret) {
    providers.google = {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      redirectURI:
        envFirst(['GOOGLE_REDIRECT_URI', 'GOOGLE_OAUTH_REDIRECT_URI']) ??
        `${betterAuthUrl}/api/auth/callback/google`,
    };
  }

  const appleClientId = envFirst([
    'APPLE_CLIENT_ID',
    'APPLE_OAUTH_CLIENT_ID',
    'AUTH_APPLE_CLIENT_ID',
    'BETTER_AUTH_APPLE_CLIENT_ID',
  ]);
  const appleClientSecret = envFirst([
    'APPLE_CLIENT_SECRET',
    'APPLE_OAUTH_CLIENT_SECRET',
    'AUTH_APPLE_CLIENT_SECRET',
    'BETTER_AUTH_APPLE_CLIENT_SECRET',
  ]);

  if (appleClientId && appleClientSecret) {
    providers.apple = {
      clientId: appleClientId,
      clientSecret: appleClientSecret,
      appBundleIdentifier: envFirst([
        'APPLE_APP_BUNDLE_IDENTIFIER',
        'IOS_BUNDLE_IDENTIFIER',
        'EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER',
      ]),
      redirectURI:
        envFirst(['APPLE_REDIRECT_URI', 'APPLE_OAUTH_REDIRECT_URI']) ??
        `${betterAuthUrl}/api/auth/callback/apple`,
    };
  }

  return providers;
}

const socialProviders = buildSocialProviders();

function authEmailTemplate(title: string, message: string, buttonText: string, link: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff; border-radius: 8px; }
          .header { padding: 30px 20px; text-align: center; border-bottom: 1px solid #e0e0e0; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; color: #00D4AA; }
          .content { padding: 30px 20px; }
          .message { margin: 20px 0; font-size: 14px; line-height: 1.8; }
          .button { display: inline-block; background-color: #00D4AA; color: #000000; padding: 14px 40px; text-decoration: none; border-radius: 6px; margin: 25px 0; font-weight: 600; font-size: 14px; }
          .note { margin: 15px 0; font-size: 12px; color: #999; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>${title}</h1></div>
          <div class="content">
            <p class="message">${message}</p>
            <center><a href="${link}" class="button">${buttonText}</a></center>
            <p class="note">If you did not request this, you can safely ignore this email.</p>
          </div>
          <div class="footer"><p>&copy; 2024 APS Fitness. All rights reserved.</p></div>
        </div>
      </body>
    </html>
  `;
}

async function sendAuthEmail(to: string, subject: string, html: string): Promise<void> {
  await resend.emails.send({
    from: 'APS Fitness <noreply@aps-fitness.com>',
    to,
    subject,
    html,
  });
}

// Enable storage for file uploads
app.withStorage();

// Enable Better Auth with email/password, email verification, password reset, and OAuth providers.
app.withAuth({
  appName: 'APS Fitness',
  baseURL: betterAuthUrl,
  trustedOrigins,
  ...(Object.keys(socialProviders).length > 0 ? { socialProviders } : {}),
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, token }) => {
      app.logger.info({ email: user.email }, 'Sending verification email');
      const deepLink = `aps://auth?token=${token}&mode=verify-email`;
      const html = authEmailTemplate(
        'Verify your email',
        `Hi ${user.name || 'there'}, thank you for signing up for APS Fitness. Please verify your email address to complete your registration.`,
        'Verify Email',
        deepLink,
      );

      sendAuthEmail(user.email, 'Verify your APS account', html)
        .then(() => app.logger.info({ email: user.email }, 'Verification email sent successfully'))
        .catch((error) => {
          app.logger.error({ err: error, email: user.email }, 'Failed to send verification email');
        });
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, token }) => {
      app.logger.info({ email: user.email }, 'Sending password reset email');
      const deepLink = `aps://auth?token=${token}&mode=reset-password`;
      const html = authEmailTemplate(
        'Reset your password',
        'We received a request to reset your APS account password. Click the button below to set a new password. This link expires in 1 hour.',
        'Reset Password',
        deepLink,
      );

      sendAuthEmail(user.email, 'Reset your APS password', html)
        .then(() => app.logger.info({ email: user.email }, 'Password reset email sent successfully'))
        .catch((error) => {
          app.logger.error({ err: error, email: user.email }, 'Failed to send password reset email');
        });
    },
  },
});

app.logger.info(
  {
    authBaseUrl: betterAuthUrl,
    trustedOrigins,
    socialProviders: Object.keys(socialProviders),
  },
  'Better Auth configured',
);

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
