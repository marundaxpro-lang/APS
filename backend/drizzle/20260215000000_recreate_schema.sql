-- Drop all old tables to start fresh
DROP TABLE IF EXISTS "workout_sessions" CASCADE;
DROP TABLE IF EXISTS "social_post_likes" CASCADE;
DROP TABLE IF EXISTS "social_posts" CASCADE;
DROP TABLE IF EXISTS "nutrition_logs" CASCADE;
DROP TABLE IF EXISTS "progress_photos" CASCADE;
DROP TABLE IF EXISTS "achievements" CASCADE;
DROP TABLE IF EXISTS "friend_connections" CASCADE;
DROP TABLE IF EXISTS "measurements" CASCADE;
DROP TABLE IF EXISTS "fitness_profiles" CASCADE;
DROP TABLE IF EXISTS "user_tasks" CASCADE;
DROP TABLE IF EXISTS "subscriptions" CASCADE;
DROP TABLE IF EXISTS "exercises" CASCADE;
DROP TABLE IF EXISTS "exercise_videos" CASCADE;
DROP TABLE IF EXISTS "user_caloric_goals" CASCADE;
DROP TABLE IF EXISTS "meal_plans" CASCADE;
DROP TABLE IF EXISTS "meal_plan_meals" CASCADE;

-- Create fitness profiles table
CREATE TABLE "fitness_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text,
	"experience_level" text DEFAULT 'beginner',
	"goal" text NOT NULL,
	"training_frequency" integer DEFAULT 3,
	"gender" text,
	"weight" numeric(6, 2),
	"height" numeric(5, 2),
	"age" integer,
	"activity_level" text,
	"equipment_type" text,
	"focus_areas" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fitness_profiles_user_id_unique" UNIQUE("user_id")
);

-- Create progress photos table
CREATE TABLE "progress_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"photo_url" text NOT NULL,
	"photo_date" timestamp with time zone NOT NULL,
	"weight_at_time" numeric(8, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create measurements table
CREATE TABLE "measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"weight" numeric(8, 2),
	"body_fat_percentage" numeric(5, 2),
	"muscle_mass" numeric(8, 2),
	"measurement_date" timestamp with time zone NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create achievements table
CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"icon" text,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create friend connections table
CREATE TABLE "friend_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"friend_id" text NOT NULL,
	"status" text DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create social posts table
CREATE TABLE "social_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"image_url" text,
	"likes" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create social post likes table
CREATE TABLE "social_post_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create workout sessions table
CREATE TABLE "workout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"duration" integer,
	"calories_burned" integer,
	"exercises" jsonb,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create nutrition logs table
CREATE TABLE "nutrition_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"meal_type" text NOT NULL,
	"food_items" jsonb,
	"total_calories" integer,
	"total_protein" integer,
	"total_carbs" integer,
	"total_fat" integer,
	"log_date" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create subscriptions table
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"plan_type" text DEFAULT 'free',
	"status" text DEFAULT 'active',
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id")
);

-- Create exercises table
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"muscle_group" text NOT NULL,
	"equipment_type" text NOT NULL,
	"description" text,
	"is_premium" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create exercise videos table
CREATE TABLE "exercise_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_id" uuid NOT NULL,
	"video_url" text NOT NULL,
	"video_type" text NOT NULL,
	"title" text NOT NULL,
	"duration" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create user caloric goals table
CREATE TABLE "user_caloric_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"daily_calorie_goal" integer NOT NULL,
	"basal_metabolic_rate" integer,
	"activity_level" text,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_caloric_goals_user_id_unique" UNIQUE("user_id")
);

-- Create meal plans table
CREATE TABLE "meal_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"total_calories" integer,
	"total_protein" integer,
	"total_carbs" integer,
	"total_fat" integer,
	"difficulty_level" text DEFAULT 'medium',
	"prep_time_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create meal plan meals table
CREATE TABLE "meal_plan_meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_plan_id" uuid NOT NULL,
	"meal_type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"calories" integer,
	"protein" integer,
	"carbs" integer,
	"fat" integer,
	"ingredients" jsonb,
	"instructions" jsonb,
	"image_url" text,
	"prep_time_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create user tasks table
CREATE TABLE "user_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"due_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign keys
ALTER TABLE "fitness_profiles" ADD CONSTRAINT "fitness_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "friend_connections" ADD CONSTRAINT "friend_connections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "friend_connections" ADD CONSTRAINT "friend_connections_friend_id_user_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "social_post_likes" ADD CONSTRAINT "social_post_likes_post_id_social_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."social_posts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "social_post_likes" ADD CONSTRAINT "social_post_likes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "nutrition_logs" ADD CONSTRAINT "nutrition_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "exercise_videos" ADD CONSTRAINT "exercise_videos_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_caloric_goals" ADD CONSTRAINT "user_caloric_goals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "meal_plan_meals" ADD CONSTRAINT "meal_plan_meals_meal_plan_id_meal_plans_id_fk" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_tasks" ADD CONSTRAINT "user_tasks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;

-- Create indexes
CREATE INDEX "idx_user_profile" ON "fitness_profiles" USING btree ("user_id");
CREATE INDEX "idx_user_progress_photos" ON "progress_photos" USING btree ("user_id");
CREATE INDEX "idx_user_measurements" ON "measurements" USING btree ("user_id");
CREATE INDEX "idx_user_achievements" ON "achievements" USING btree ("user_id");
CREATE INDEX "idx_user_friends" ON "friend_connections" USING btree ("user_id");
CREATE INDEX "idx_user_social_posts" ON "social_posts" USING btree ("user_id");
CREATE INDEX "idx_post_likes" ON "social_post_likes" USING btree ("post_id");
CREATE INDEX "idx_user_workout_sessions" ON "workout_sessions" USING btree ("user_id");
CREATE INDEX "idx_user_nutrition_logs" ON "nutrition_logs" USING btree ("user_id");
CREATE INDEX "idx_user_subscription" ON "subscriptions" USING btree ("user_id");
CREATE INDEX "idx_muscle_group" ON "exercises" USING btree ("muscle_group");
CREATE INDEX "idx_exercise_videos" ON "exercise_videos" USING btree ("exercise_id");
CREATE INDEX "idx_user_caloric_goals" ON "user_caloric_goals" USING btree ("user_id");
CREATE INDEX "idx_user_meal_plans" ON "meal_plans" USING btree ("user_id");
CREATE INDEX "idx_meal_plan_meals" ON "meal_plan_meals" USING btree ("meal_plan_id");
CREATE INDEX "idx_user_tasks" ON "user_tasks" USING btree ("user_id");
