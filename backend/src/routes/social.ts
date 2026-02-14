import type { App } from '../index.js';

// Social routes have schema mismatches and need to be redesigned
// Keeping this stub to prevent import errors
export function registerSocialRoutes(app: App) {
  app.logger.info('Social routes registered (placeholder)');
}
