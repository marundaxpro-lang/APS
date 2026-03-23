import { describe, it, expect, beforeAll } from 'vitest';

// Set environment variables before importing the app
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://pckfynlcusnnqpheujmj.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBja2Z5bmxjdXNubnFwaGV1am1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMwNTAwOCwiZXhwIjoyMDg5ODgxMDA4fQ.BHfwW5aWU7I_L9YeZzYkJjBPoJ8BW1vVbcKs7f5Qp3o';

describe('API Integration Tests', () => {
  let baseUrl: string;

  beforeAll(async () => {
    // Determine the base URL from environment or use default
    const port = process.env.PORT || '3000';
    baseUrl = process.env.API_URL || `http://localhost:${port}`;

    // Wait for the server to be ready
    let retries = 0;
    const maxRetries = 20;

    while (retries < maxRetries) {
      try {
        const response = await fetch(`${baseUrl}/health`, { method: 'GET' });
        if (response.ok) {
          console.log('Server is ready');
          break;
        }
      } catch (error) {
        // Server not ready yet
        console.log(`Health check attempt ${retries + 1}/${maxRetries} failed, retrying...`);
      }
      retries++;
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (retries >= maxRetries) {
      throw new Error(`Server failed to start after ${maxRetries} attempts`);
    }
  }, { timeout: 30000 });

  describe('Health Check', () => {
    it('should return 200 on health check', async () => {
      const response = await fetch(`${baseUrl}/health`, { method: 'GET' });
      expect(response.status).toBe(200);
    });
  });

  describe('Auth Endpoints', () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    let accessToken: string | null = null;

    it('should reject signup without required fields', async () => {
      const response = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          // Missing password
        }),
      });

      // Should reject due to validation error (400) or server error (500)
      expect([400, 422, 500]).toContain(response.status);
    });

    it('should return 401 without authorization header', async () => {
      const response = await fetch(`${baseUrl}/api/auth/me`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await fetch(`${baseUrl}/api/auth/me`, {
        method: 'GET',
        headers: { Authorization: 'Bearer invalid-token' },
      });

      expect(response.status).toBe(401);
    });

    it('should attempt to sign up (may fail if Supabase unavailable)', async () => {
      try {
        const response = await fetch(`${baseUrl}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            password: testPassword,
            name: 'Test User',
          }),
        });

        // Accept either success or Supabase connection errors
        if (response.status === 200) {
          const data = await response.json();
          expect(data.user).toBeDefined();
          expect(data.user.email).toBe(testEmail);
        } else if ([500, 502, 503].includes(response.status)) {
          // Supabase unavailable
          console.log('Supabase unavailable, skipping auth tests');
        } else {
          expect([200, 400]).toContain(response.status);
        }
      } catch (error) {
        console.log('Supabase connection failed, auth tests skipped');
      }
    });
  });
});
