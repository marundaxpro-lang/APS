ALTER TABLE "user" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "fitness_goal" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "fitness_level" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "age" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "weight" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "height" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "workout_days_per_week" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "preferred_workout_type" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "dietary_preference" text;