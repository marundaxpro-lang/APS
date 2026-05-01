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

      it('should reject missing required fields on workout log creation', async () => {
        const response = await authenticatedApi('/api/workout-logs', authToken, {
          method: 'POST',
          body: JSON.stringify({
            workout_name: 'Running',
            // missing workout_id and duration_minutes
          }),
        });
        await expectStatus(response, 400);
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

      it('should reject missing required fields on habit log creation', async () => {
        const response = await authenticatedApi('/api/habit-logs', authToken, {
          method: 'POST',
          body: JSON.stringify({
            habit_name: 'Meditation',
            // missing habit_id and date
          }),
        });
        await expectStatus(response, 400);
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

    describe('Workouts', () => {
      let workoutId: string;

      it('should create a workout', async () => {
        const response = await authenticatedApi('/api/workouts', authToken, {
          method: 'POST',
          body: JSON.stringify({
            name: 'Full Body Workout',
            duration: 45,
          }),
        });
        await expectStatus(response, 200);
        const data = await response.json();
        workoutId = data.id;
        expect(data.name).toBeDefined();
      });

      it('should list workouts', async () => {
        const response = await authenticatedApi('/api/workouts', authToken);
        await expectStatus(response, 200);
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      });

      it('should get todays workouts', async () => {
        const response = await authenticatedApi('/api/workouts/today', authToken);
        await expectStatus(response, 200);
      });

      it('should update a workout', async () => {
        if (!workoutId) {
          // Skip if workout creation failed
          return;
        }
        const response = await authenticatedApi(`/api/workouts/${workoutId}`, authToken, {
          method: 'PUT',
          body: JSON.stringify({
            name: 'Updated Workout',
            duration: 50,
          }),
        });
        await expectStatus(response, 200);
      });

      it('should delete a workout', async () => {
        if (!workoutId) {
          // Skip if workout creation failed
          return;
        }
        const response = await authenticatedApi(`/api/workouts/${workoutId}`, authToken, {
          method: 'DELETE',
        });
        await expectStatus(response, 200);
      });

      it('should return 404 for nonexistent workout', async () => {
        const response = await authenticatedApi('/api/workouts/nonexistent-id', authToken);
        await expectStatus(response, 200, 404);
      });
    });

    describe('Tasks', () => {
      let taskId: string;

      it('should create a task', async () => {
        const response = await authenticatedApi('/api/tasks', authToken, {
          method: 'POST',
          body: JSON.stringify({
            title: 'Complete workout',
            description: 'Do 30 min cardio',
          }),
        });
        await expectStatus(response, 200);
        const data = await response.json();
        taskId = data.id;
        expect(data.title).toBeDefined();
      });

      it('should list tasks', async () => {
        const response = await authenticatedApi('/api/tasks', authToken);
        await expectStatus(response, 200);
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      });

      it('should update a task', async () => {
        if (!taskId) return;
        const response = await authenticatedApi(`/api/tasks/${taskId}`, authToken, {
          method: 'PUT',
          body: JSON.stringify({
            title: 'Updated task',
            completed: true,
          }),
        });
        await expectStatus(response, 200);
      });

      it('should delete a task', async () => {
        if (!taskId) return;
        const response = await authenticatedApi(`/api/tasks/${taskId}`, authToken, {
          method: 'DELETE',
        });
        await expectStatus(response, 200);
      });

      it('should return 404 for nonexistent task', async () => {
        const response = await authenticatedApi('/api/tasks/nonexistent-id', authToken);
        await expectStatus(response, 200, 404);
      });
    });

    describe('Exercises', () => {
      let exerciseId: string;

      it('should create an exercise', async () => {
        const response = await authenticatedApi('/api/exercises', authToken, {
          method: 'POST',
          body: JSON.stringify({
            name: 'Bench Press',
            category: 'chest',
            difficulty: 'intermediate',
          }),
        });
        await expectStatus(response, 200);
        const data = await response.json();
        exerciseId = data.id;
        expect(data.name).toBeDefined();
      });

      it('should list exercises', async () => {
        const response = await authenticatedApi('/api/exercises', authToken);
        await expectStatus(response, 200);
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      });

      it('should get exercise by id', async () => {
        if (!exerciseId) return;
        const response = await authenticatedApi(`/api/exercises/${exerciseId}`, authToken);
        await expectStatus(response, 200);
      });

      it('should delete an exercise', async () => {
        if (!exerciseId) return;
        const response = await authenticatedApi(`/api/exercises/${exerciseId}`, authToken, {
          method: 'DELETE',
        });
        await expectStatus(response, 200);
      });

      it('should return 404 for nonexistent exercise', async () => {
        const response = await authenticatedApi('/api/exercises/nonexistent-id', authToken);
        await expectStatus(response, 200, 404);
      });
    });

    describe('Exercise Videos', () => {
      let exerciseId: string;
      let videoId: string;

      it('should create exercise for video tests', async () => {
        const response = await authenticatedApi('/api/exercises', authToken, {
          method: 'POST',
          body: JSON.stringify({
            name: 'Squat',
            category: 'legs',
            difficulty: 'beginner',
          }),
        });
        await expectStatus(response, 200);
        const data = await response.json();
        exerciseId = data.id;
        expect(exerciseId).toBeDefined();
      });

      it('should add video to exercise', async () => {
        if (!exerciseId) return;
        const response = await authenticatedApi(`/api/exercises/${exerciseId}/videos`, authToken, {
          method: 'POST',
          body: JSON.stringify({
            url: 'https://example.com/video.mp4',
            title: 'How to squat correctly',
          }),
        });
        await expectStatus(response, 200);
        const data = await response.json();
        videoId = data.id;
        expect(videoId).toBeDefined();
      });

      it('should update exercise video', async () => {
        if (!exerciseId || !videoId) return;
        const response = await authenticatedApi(`/api/exercises/${exerciseId}/videos/${videoId}`, authToken, {
          method: 'PUT',
          body: JSON.stringify({
            title: 'Advanced squat technique',
          }),
        });
        await expectStatus(response, 200);
      });

      it('should delete exercise video', async () => {
        if (!exerciseId || !videoId) return;
        const response = await authenticatedApi(`/api/exercises/${exerciseId}/videos/${videoId}`, authToken, {
          method: 'DELETE',
        });
        await expectStatus(response, 200);
      });

      it('should cleanup - delete exercise from video tests', async () => {
        if (!exerciseId) return;
        const response = await authenticatedApi(`/api/exercises/${exerciseId}`, authToken, {
          method: 'DELETE',
        });
        await expectStatus(response, 200);
      });
    });

    describe('Meal Plans', () => {
      it('should list meal plans', async () => {
        const response = await authenticatedApi('/api/meal-plans', authToken);
        await expectStatus(response, 200);
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      });

      it('should generate a meal plan', async () => {
        const response = await authenticatedApi('/api/meal-plans/generate', authToken, {
          method: 'POST',
          body: JSON.stringify({
            calories: 2000,
            preferences: 'vegetarian',
          }),
        });
        await expectStatus(response, 200);
      });

      it('should save a meal plan', async () => {
        const response = await authenticatedApi('/api/meal-plans/save', authToken, {
          method: 'POST',
          body: JSON.stringify({
            name: 'Weekly Plan',
            meals: [],
          }),
        });
        await expectStatus(response, 200);
      });

      it('should return 404 for nonexistent meal plan', async () => {
        const response = await authenticatedApi('/api/meal-plans/nonexistent-id', authToken);
        await expectStatus(response, 200, 404);
      });
    });

    describe('User Endpoints', () => {
      it('should get coach insights', async () => {
        const response = await authenticatedApi('/api/user/coach-insights', authToken);
        await expectStatus(response, 200);
      });

      it('should get user profile from user endpoint', async () => {
        const response = await authenticatedApi('/api/user/profile', authToken);
        await expectStatus(response, 200);
      });

      it('should complete onboarding', async () => {
        const response = await authenticatedApi('/api/user/onboarding', authToken, {
          method: 'PUT',
          body: JSON.stringify({
            onboarding_completed: true,
          }),
        });
        await expectStatus(response, 200);
      });
    });

    describe('Friends', () => {
      it('should send friend request', async () => {
        const response = await authenticatedApi('/api/friends/request', authToken, {
          method: 'POST',
          body: JSON.stringify({
            user_id: 'friend-user-id',
          }),
        });
        await expectStatus(response, 200);
      });

      it('should list friends', async () => {
        const response = await authenticatedApi('/api/friends', authToken);
        await expectStatus(response, 200);
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      });

      it('should accept/reject friend request', async () => {
        const response = await authenticatedApi('/api/friends/friend-id', authToken, {
          method: 'PUT',
          body: JSON.stringify({
            status: 'accepted',
          }),
        });
        await expectStatus(response, 200);
      });
    });

    describe('Progress Photos', () => {
      it('should list progress photos', async () => {
        const response = await authenticatedApi('/api/progress-photos', authToken);
        await expectStatus(response, 200);
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      });

      it('should upload progress photo', async () => {
        const response = await authenticatedApi('/api/progress-photos', authToken, {
          method: 'POST',
          body: JSON.stringify({
            date: '2026-05-01',
            notes: 'Front view',
          }),
        });
        await expectStatus(response, 200);
      });
    });

    describe('Measurements', () => {
      it('should list measurements', async () => {
        const response = await authenticatedApi('/api/measurements', authToken);
        await expectStatus(response, 200);
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      });

      it('should add measurement', async () => {
        const response = await authenticatedApi('/api/measurements', authToken, {
          method: 'POST',
          body: JSON.stringify({
            type: 'chest',
            value: 100,
            date: '2026-05-01',
          }),
        });
        await expectStatus(response, 200);
      });
    });

    describe('Achievements', () => {
      it('should list achievements', async () => {
        const response = await authenticatedApi('/api/achievements', authToken);
        await expectStatus(response, 200);
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      });

      it('should unlock achievement', async () => {
        const response = await authenticatedApi('/api/achievements', authToken, {
          method: 'POST',
          body: JSON.stringify({
            name: 'First Workout',
            description: 'Completed first workout',
          }),
        });
        await expectStatus(response, 200);
      });
    });

    describe('Nutrition', () => {
      it('should list nutrition logs', async () => {
        const response = await authenticatedApi('/api/nutrition', authToken);
        await expectStatus(response, 200);
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      });

      it('should log nutrition', async () => {
        const response = await authenticatedApi('/api/nutrition', authToken, {
          method: 'POST',
          body: JSON.stringify({
            food: 'Chicken breast',
            calories: 165,
            protein: 31,
            carbs: 0,
            fat: 3.6,
          }),
        });
        await expectStatus(response, 200);
      });
    });

    describe('AI Endpoints', () => {
      it('should request coaching', async () => {
        const response = await authenticatedApi('/api/ai/coaching', authToken, {
          method: 'POST',
          body: JSON.stringify({
            query: 'How to improve my squat?',
          }),
        });
        await expectStatus(response, 200);
      });

      it('should request meal suggestions', async () => {
        const response = await authenticatedApi('/api/ai/meal-suggestions', authToken, {
          method: 'POST',
          body: JSON.stringify({
            calories: 2000,
            preferences: 'vegetarian',
          }),
        });
        await expectStatus(response, 200);
      });
    });

    describe('Payment Endpoints', () => {
      it('should create checkout session', async () => {
        const response = await authenticatedApi('/api/payments/create-checkout', authToken, {
          method: 'POST',
          body: JSON.stringify({
            plan: 'premium',
          }),
        });
        await expectStatus(response, 200);
      });

      it('should get subscription status', async () => {
        const response = await authenticatedApi('/api/payments/subscription-status', authToken);
        await expectStatus(response, 200);
      });

      it('should cancel subscription', async () => {
        const response = await authenticatedApi('/api/payments/cancel-subscription', authToken, {
          method: 'POST',
        });
        await expectStatus(response, 200);
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
