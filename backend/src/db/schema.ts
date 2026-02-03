import {
  pgTable,
  text,
  timestamp,
  uuid,
  decimal,
  integer,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth-schema.js';

/**
 * ProgressPhoto: Track user's progress photos with metadata
 */
export const progressPhotos = pgTable(
  'progress_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    photoUrl: text('photo_url').notNull(), // Storage key from app.storage
    photoDate: timestamp('photo_date').notNull(),
    weightAtTime: decimal('weight_at_time', { precision: 8, scale: 2 }),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('idx_user_progress_photos').on(table.userId)]
);

/**
 * Measurement: Track body measurements over time
 */
export const measurements = pgTable(
  'measurements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    weight: decimal('weight', { precision: 8, scale: 2 }),
    bodyFatPercentage: decimal('body_fat_percentage', { precision: 5, scale: 2 }),
    muscleMass: decimal('muscle_mass', { precision: 8, scale: 2 }),
    measurementDate: timestamp('measurement_date').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('idx_user_measurements').on(table.userId)]
);

/**
 * Achievement: Track fitness achievements unlocked by users
 */
export const achievements = pgTable(
  'achievements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    achievementType: text('achievement_type').notNull(), // e.g., 'weight_loss_5kg', 'first_workout', etc.
    unlockedDate: timestamp('unlocked_date').notNull(),
    shared: boolean('shared').default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('idx_user_achievements').on(table.userId)]
);

/**
 * FriendConnection: Manage friend relationships between users
 */
export const friendConnections = pgTable(
  'friend_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    friendUserId: text('friend_user_id').references(() => user.id, { onDelete: 'cascade' }),
    friendEmail: text('friend_email'), // Used when friend hasn't joined yet
    status: text('status', { enum: ['pending', 'accepted', 'rejected'] }).default('pending'),
    connectedDate: timestamp('connected_date'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_user_friends').on(table.userId),
    index('idx_friend_user_id').on(table.friendUserId),
  ]
);

/**
 * SocialPost: User posts for the social feed
 */
export const socialPosts = pgTable(
  'social_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    postType: text('post_type', { enum: ['achievement', 'workout', 'general', 'milestone'] }).default('general'),
    achievementData: jsonb('achievement_data'), // JSON object with achievement details
    likesCount: integer('likes_count').default(0),
    comments: jsonb('comments').$type<Array<{ userId: string; text: string; createdAt: string }>>().default([]),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index('idx_user_posts').on(table.userId)]
);

/**
 * SocialPostLike: Track likes on social posts
 */
export const socialPostLikes = pgTable(
  'social_post_likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id').notNull().references(() => socialPosts.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_post_likes').on(table.postId),
    index('idx_user_likes').on(table.userId),
  ]
);

/**
 * WorkoutSession: Track workout sessions with exercises
 */
export const workoutSessions = pgTable(
  'workout_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    workoutType: text('workout_type').notNull(), // e.g., 'chest_day', 'cardio', 'full_body'
    exercises: jsonb('exercises').$type<
      Array<{
        name: string;
        sets: number;
        reps: number;
        weight?: number;
        duration?: number;
        notes?: string;
      }>
    >().notNull(),
    durationMinutes: integer('duration_minutes'),
    completedDate: timestamp('completed_date').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('idx_user_workouts').on(table.userId)]
);

/**
 * NutritionLog: Track daily nutrition intake
 */
export const nutritionLogs = pgTable(
  'nutrition_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    mealType: text('meal_type', { enum: ['breakfast', 'lunch', 'dinner', 'snacks'] }).notNull(),
    foods: jsonb('foods').$type<
      Array<{
        name: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        quantity?: string;
      }>
    >().notNull(),
    totalCalories: decimal('total_calories', { precision: 10, scale: 2 }),
    totalProtein: decimal('total_protein', { precision: 10, scale: 2 }),
    totalCarbs: decimal('total_carbs', { precision: 10, scale: 2 }),
    totalFat: decimal('total_fat', { precision: 10, scale: 2 }),
    logDate: timestamp('log_date').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('idx_user_nutrition').on(table.userId)]
);

/**
 * FitnessProfile: Store user's fitness goals and preferences
 */
export const fitnessProfiles = pgTable(
  'fitness_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
    name: text('name'), // user's name/profile name
    experienceLevel: text('experience_level', { enum: ['beginner', 'intermediate', 'advanced'] }).default('beginner'),
    goal: text('goal').notNull(), // e.g., 'weight_loss', 'muscle_gain', 'maintenance'
    trainingFrequency: integer('training_frequency').default(3), // times per week
    gender: text('gender', { enum: ['male', 'female', 'other'] }),
    weight: decimal('weight', { precision: 6, scale: 2 }), // in kg
    height: decimal('height', { precision: 5, scale: 2 }), // in cm
    age: integer('age'),
    activityLevel: text('activity_level', { enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'] }),
    equipmentType: text('equipment_type', { enum: ['gym', 'home', 'minimal'] }), // available equipment for workouts
    focusAreas: jsonb('focus_areas').$type<string[]>().default([]), // e.g., ['chest', 'back', 'legs']
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index('idx_user_profile').on(table.userId)]
);

/**
 * Relations for Drizzle ORM
 */
export const progressPhotosRelations = relations(progressPhotos, ({ one }) => ({
  user: one(user, {
    fields: [progressPhotos.userId],
    references: [user.id],
  }),
}));

export const measurementsRelations = relations(measurements, ({ one }) => ({
  user: one(user, {
    fields: [measurements.userId],
    references: [user.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ one }) => ({
  user: one(user, {
    fields: [achievements.userId],
    references: [user.id],
  }),
}));

export const friendConnectionsRelations = relations(friendConnections, ({ one }) => ({
  user: one(user, {
    fields: [friendConnections.userId],
    references: [user.id],
  }),
  friend: one(user, {
    fields: [friendConnections.friendUserId],
    references: [user.id],
  }),
}));

export const socialPostsRelations = relations(socialPosts, ({ one, many }) => ({
  user: one(user, {
    fields: [socialPosts.userId],
    references: [user.id],
  }),
  likes: many(socialPostLikes),
}));

export const socialPostLikesRelations = relations(socialPostLikes, ({ one }) => ({
  post: one(socialPosts, {
    fields: [socialPostLikes.postId],
    references: [socialPosts.id],
  }),
  user: one(user, {
    fields: [socialPostLikes.userId],
    references: [user.id],
  }),
}));

export const workoutSessionsRelations = relations(workoutSessions, ({ one }) => ({
  user: one(user, {
    fields: [workoutSessions.userId],
    references: [user.id],
  }),
}));

export const nutritionLogsRelations = relations(nutritionLogs, ({ one }) => ({
  user: one(user, {
    fields: [nutritionLogs.userId],
    references: [user.id],
  }),
}));

export const fitnessProfilesRelations = relations(fitnessProfiles, ({ one }) => ({
  user: one(user, {
    fields: [fitnessProfiles.userId],
    references: [user.id],
  }),
}));

/**
 * Subscription: Store user subscription information for Stripe payments
 */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
    planType: text('plan_type', { enum: ['free', 'pro', 'elite'] }).default('free'),
    status: text('status', { enum: ['active', 'cancelled', 'expired'] }).default('active'),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    currentPeriodEnd: timestamp('current_period_end'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index('idx_user_subscription').on(table.userId)]
);

/**
 * Relations for Subscriptions
 */
export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(user, {
    fields: [subscriptions.userId],
    references: [user.id],
  }),
}));

/**
 * Exercise: Store available exercises with metadata
 */
export const exercises = pgTable(
  'exercises',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    muscleGroup: text('muscle_group').notNull(), // e.g., 'chest', 'back', 'legs', 'shoulders', 'arms'
    equipmentType: text('equipment_type', { enum: ['gym', 'home', 'minimal'] }).notNull(),
    description: text('description'),
    isPremium: boolean('is_premium').default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('idx_muscle_group').on(table.muscleGroup)]
);

/**
 * ExerciseVideo: Store video demonstrations for exercises
 */
export const exerciseVideos = pgTable(
  'exercise_videos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    exerciseId: uuid('exercise_id').notNull().references(() => exercises.id, { onDelete: 'cascade' }),
    videoUrl: text('video_url').notNull(), // YouTube URL or S3 storage key
    videoType: text('video_type', { enum: ['youtube', 's3'] }).notNull(),
    title: text('title').notNull(),
    duration: integer('duration'), // in seconds
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('idx_exercise_videos').on(table.exerciseId)]
);

/**
 * UserCaloricGoal: Store calculated caloric goals for users
 */
export const userCaloricGoals = pgTable(
  'user_caloric_goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
    dailyCalorieGoal: integer('daily_calorie_goal').notNull(),
    basalMetabolicRate: integer('basal_metabolic_rate'), // BMR in calories
    activityLevel: text('activity_level'), // sedentary, light, moderate, active, very_active
    calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index('idx_user_caloric_goals').on(table.userId)]
);

/**
 * Relations for Exercises
 */
export const exercisesRelations = relations(exercises, ({ many }) => ({
  videos: many(exerciseVideos),
}));

export const exerciseVideosRelations = relations(exerciseVideos, ({ one }) => ({
  exercise: one(exercises, {
    fields: [exerciseVideos.exerciseId],
    references: [exercises.id],
  }),
}));

export const userCaloricGoalsRelations = relations(userCaloricGoals, ({ one }) => ({
  user: one(user, {
    fields: [userCaloricGoals.userId],
    references: [user.id],
  }),
}));

/**
 * MealPlan: Store user's meal plans
 */
export const mealPlans = pgTable(
  'meal_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    totalCalories: integer('total_calories'),
    totalProtein: integer('total_protein'),
    totalCarbs: integer('total_carbs'),
    totalFat: integer('total_fat'),
    difficultyLevel: text('difficulty_level', { enum: ['easy', 'medium', 'hard'] }).default('medium'),
    prepTimeMinutes: integer('prep_time_minutes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index('idx_user_meal_plans').on(table.userId)]
);

/**
 * MealPlanMeal: Store individual meals within a meal plan
 */
export const mealPlanMeals = pgTable(
  'meal_plan_meals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mealPlanId: uuid('meal_plan_id').notNull().references(() => mealPlans.id, { onDelete: 'cascade' }),
    mealType: text('meal_type', { enum: ['breakfast', 'lunch', 'dinner', 'snack'] }).notNull(),
    name: text('name').notNull(),
    description: text('description'),
    calories: integer('calories'),
    protein: integer('protein'),
    carbs: integer('carbs'),
    fat: integer('fat'),
    ingredients: jsonb('ingredients').$type<
      Array<{
        name: string;
        quantity: string;
        unit: string;
      }>
    >(),
    instructions: jsonb('instructions').$type<Array<string>>(),
    imageUrl: text('image_url'),
    prepTimeMinutes: integer('prep_time_minutes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('idx_meal_plan_meals').on(table.mealPlanId)]
);

/**
 * Relations for Meal Plans
 */
export const mealPlansRelations = relations(mealPlans, ({ one, many }) => ({
  user: one(user, {
    fields: [mealPlans.userId],
    references: [user.id],
  }),
  meals: many(mealPlanMeals),
}));

export const mealPlanMealsRelations = relations(mealPlanMeals, ({ one }) => ({
  mealPlan: one(mealPlans, {
    fields: [mealPlanMeals.mealPlanId],
    references: [mealPlans.id],
  }),
}));

/**
 * UserTask: Store user's tasks with categories and due dates
 */
export const userTasks = pgTable(
  'user_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    category: text('category', { enum: ['study', 'work', 'fitness', 'personal', 'other'] }).notNull(),
    completed: boolean('completed').default(false).notNull(),
    dueDate: timestamp('due_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index('idx_user_tasks').on(table.userId)]
);

/**
 * Relations for UserTask
 */
export const userTasksRelations = relations(userTasks, ({ one }) => ({
  user: one(user, {
    fields: [userTasks.userId],
    references: [user.id],
  }),
}));
