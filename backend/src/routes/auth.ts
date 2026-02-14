// Authentication is handled automatically by Better Auth framework
// Framework provides all auth endpoints at /api/auth/*
// No custom auth routes needed

import type { App } from '../index.js';

export function registerAuthRoutes(app: App) {
  // Better Auth handles all authentication automatically:
  // POST /api/auth/sign-in/email - Sign in with email/password
  // POST /api/auth/sign-up/email - Sign up with email/password
  // POST /api/auth/sign-in/social - OAuth sign-in (Google, Apple, etc.)
  // GET /api/auth/get-session - Get current session
  // POST /api/auth/sign-out - Sign out
  // And many more endpoints - see https://better-auth.com/docs

  app.logger.info('Better Auth routes automatically registered by framework');
}
