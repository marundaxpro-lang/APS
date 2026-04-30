DROP INDEX "idx_account_user_id";--> statement-breakpoint
DROP INDEX "idx_account_provider";--> statement-breakpoint
DROP INDEX "idx_session_token";--> statement-breakpoint
DROP INDEX "idx_session_user_id";--> statement-breakpoint
DROP INDEX "idx_session_expires_at";--> statement-breakpoint
DROP INDEX "idx_user_email";--> statement-breakpoint
DROP INDEX "idx_verification_identifier";--> statement-breakpoint
DROP INDEX "idx_verification_expires_at";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "onboarding_completed";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "fitness_goal";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "fitness_level";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "age";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "weight";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "height";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "workout_days_per_week";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "preferred_workout_type";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "dietary_preference";