import { describe, it, expect, beforeAll } from 'vitest';
import { api, authenticatedApi, expectStatus, signUpTestUser } from './helpers';

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

  describe('Auth Error Cases', () => {
    it('should return 401 without authorization header', async () => {
      const response = await api('/api/auth/me');
      await expectStatus(response, 401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await authenticatedApi('/api/auth/me', 'invalid-token');
      await expectStatus(response, 401);
    });
  });

  describe('Authenticated User Workflow', () => {
    let authToken: string;
    let userId: string;

    it('should sign up and authenticate', async () => {
      const { token, user } = await signUpTestUser();
      authToken = token;
      userId = user.id;
      expect(authToken).toBeDefined();
      expect(userId).toBeDefined();
      expect(user.email).toBeDefined();
    });

    it('should retrieve current user profile', async () => {
      const response = await authenticatedApi('/api/auth/me', authToken);
      await expectStatus(response, 200);
      const data = await response.json();
      expect(data.id).toBe(userId);
      expect(data.email).toBeDefined();
    });

    describe('Workout Logs', () => {
      let workoutLogId: string;

      it('should create a workout log', async () => {
        const response = await authenticatedApi('/api/workout-logs', authToken, {
          method: 'POST',
          body: JSON.stringify({
            workout_id: 'w-001',
            workout_name: 'Running',
            duration_minutes: 30,
            calories_burned: 250,
            notes: 'Morning run',
          }),
        });
        await expectStatus(response, 201);
        const data = await response.json();
        workoutLogId = data.id;
        expect(data.workout_name).toBe('Running');
        expect(data.duration_minutes).toBe(30);
        expect(data.user_id).toBe(userId);
      });

      it('should get workout logs', async () => {
        const response = await authenticatedApi('/api/workout-logs', authToken);
        await expectStatus(response, 200);
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
        if (data.length > 0) {
          expect(data[0].workout_name).toBeDefined();
        }
      });

      it('should get workout logs with pagination', async () => {
        const response = await authenticatedApi('/api/workout-logs?limit=10&offset=0', authToken);
        await expectStatus(response, 200);
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      });

      it('should get workout stats', async () => {
        const response = await authenticatedApi('/api/workout-logs/stats', authToken);
        await expectStatus(response, 200);
        const data = await response.json();
        expect(data.total_workouts).toBeDefined();
        expect(data.total_minutes).toBeDefined();
        expect(data.total_calories).toBeDefined();
      });
    });

    describe('Habit Logs', () => {
      let habitLogId: string;

      it('should create a habit log', async () => {
        const response = await authenticatedApi('/api/habit-logs', authToken, {
          method: 'POST',
          body: JSON.stringify({
            habit_id: 'h-001',
            habit_name: 'Meditation',
            date: '2026-04-05',
          }),
        });
        await expectStatus(response, 201);
        const data = await response.json();
        habitLogId = data.id;
        expect(data.habit_name).toBe('Meditation');
        expect(data.user_id).toBe(userId);
      });

      it('should get habit logs', async () => {
        const response = await authenticatedApi('/api/habit-logs', authToken);
        await expectStatus(response, 200);
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      });

      it('should get habit logs filtered by date', async () => {
        const response = await authenticatedApi('/api/habit-logs?date=2026-04-05', authToken);
        await expectStatus(response, 200);
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      });

      it('should delete a habit log', async () => {
        const response = await authenticatedApi(`/api/habit-logs/${habitLogId}`, authToken, {
          method: 'DELETE',
        });
        await expectStatus(response, 204);
      });

      it('should return 404 when deleting nonexistent habit log', async () => {
        const response = await authenticatedApi('/api/habit-logs/nonexistent-id', authToken, {
          method: 'DELETE',
        });
        await expectStatus(response, 404);
      });
    });

    describe('Streaks', () => {
      it('should get user streak information', async () => {
        const response = await authenticatedApi('/api/streaks', authToken);
        await expectStatus(response, 200);
        const data = await response.json();
        expect(data.current_streak).toBeDefined();
        expect(data.longest_streak).toBeDefined();
        expect(data.user_id).toBe(userId);
      });

      it('should update streak information', async () => {
        const response = await authenticatedApi('/api/streaks/update', authToken, {
          method: 'POST',
        });
        await expectStatus(response, 200);
        const data = await response.json();
        expect(data.current_streak).toBeDefined();
        expect(data.longest_streak).toBeDefined();
      });
    });

    describe('User Profile', () => {
      it('should create/update user profile', async () => {
        const response = await authenticatedApi('/api/profile', authToken, {
          method: 'PUT',
          body: JSON.stringify({
            fitness_goal: 'weight_loss',
            fitness_level: 'beginner',
            weight_kg: 75,
            height_cm: 180,
            age: 30,
            onboarding_completed: true,
          }),
        });
        await expectStatus(response, 200);
        const data = await response.json();
        expect(data.fitness_goal).toBe('weight_loss');
        expect(data.weight_kg).toBe(75);
      });

      it('should get user profile', async () => {
        const response = await authenticatedApi('/api/profile', authToken);
        await expectStatus(response, 200);
        const data = await response.json();
        expect(data.user_id).toBe(userId);
        expect(data.fitness_goal).toBe('weight_loss');
      });
    });

    describe('Fitness Profile', () => {
      it('should create/update fitness profile', async () => {
        const response = await authenticatedApi('/api/fitness-profile', authToken, {
          method: 'POST',
          body: JSON.stringify({
            goal: 'weight_loss',
            name: 'My Profile',
            experienceLevel: 'beginner',
            gender: 'male',
            weight: 75,
            height: 180,
            age: 30,
            activityLevel: 'moderate',
            equipmentType: 'home',
            focusAreas: ['cardio', 'strength'],
          }),
        });
        await expectStatus(response, 200);
        const data = await response.json();
        expect(data.goal).toBe('weight_loss');
      });

      it('should get fitness profile', async () => {
        const response = await authenticatedApi('/api/fitness-profile', authToken);
        await expectStatus(response, 200);
        const data = await response.json();
        expect(data.goal).toBeDefined();
      });

      it('should calculate caloric needs with valid inputs', async () => {
        const response = await authenticatedApi('/api/fitness-profile/calculate-calories', authToken, {
          method: 'POST',
          body: JSON.stringify({
            gender: 'male',
            weight: 75,
            height: 180,
            age: 30,
            activityLevel: 'moderate',
            goal: 'weight_loss',
          }),
        });
        await expectStatus(response, 200);
        const data = await response.json();
        expect(data.dailyCalorieGoal).toBeDefined();
        expect(data.bmr).toBeDefined();
        expect(data.proteinGoal).toBeDefined();
        expect(data.carbsGoal).toBeDefined();
        expect(data.fatGoal).toBeDefined();
      });

      it('should reject invalid gender in caloric calculation', async () => {
        const response = await authenticatedApi('/api/fitness-profile/calculate-calories', authToken, {
          method: 'POST',
          body: JSON.stringify({
            gender: 'invalid',
            weight: 75,
            height: 180,
            age: 30,
            activityLevel: 'moderate',
            goal: 'weight_loss',
          }),
        });
        await expectStatus(response, 400);
      });

      it('should reject missing required fields in caloric calculation', async () => {
        const response = await authenticatedApi('/api/fitness-profile/calculate-calories', authToken, {
          method: 'POST',
          body: JSON.stringify({
            gender: 'male',
            weight: 75,
          }),
        });
        await expectStatus(response, 400);
      });
    });

    describe('Dashboard', () => {
      it('should calculate caloric goal', async () => {
        const response = await api('/api/dashboard/calculate-caloric-goal', {
          method: 'POST',
          body: JSON.stringify({
            age: 30,
            gender: 'male',
            weight: 75,
            height: 180,
            activity_level: 'moderate',
            goal: 'weight_loss',
          }),
        });
        await expectStatus(response, 200);
        const data = await response.json();
        expect(data.dailyCalorieGoal).toBeDefined();
        expect(data.basalMetabolicRate).toBeDefined();
        expect(data.protein).toBeDefined();
        expect(data.carbs).toBeDefined();
        expect(data.fat).toBeDefined();
      });
    });

    describe('Auth Logout', () => {
      it('should logout authenticated user', async () => {
        const response = await authenticatedApi('/api/auth/logout', authToken, {
          method: 'POST',
        });
        await expectStatus(response, 200);
      });

      it('should fail to access protected endpoints after logout', async () => {
        const response = await authenticatedApi('/api/auth/me', authToken);
        await expectStatus(response, 401);
      });
    });
  });
});
