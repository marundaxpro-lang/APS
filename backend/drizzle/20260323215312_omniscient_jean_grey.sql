CREATE TABLE "habit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"habit_id" text NOT NULL,
	"habit_name" text NOT NULL,
	"completed_at" text NOT NULL,
	"date" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streaks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_activity_date" text,
	"updated_at" text NOT NULL,
	CONSTRAINT "streaks_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"fitness_goal" text,
	"fitness_level" text,
	"weight_kg" numeric(6, 2),
	"height_cm" numeric(5, 2),
	"age" integer,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "workout_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workout_id" text NOT NULL,
	"workout_name" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"calories_burned" integer,
	"completed_at" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_habit_logs_user_id" ON "habit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_habit_logs_user_date" ON "habit_logs" USING btree ("user_id","date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_streaks_user_id" ON "streaks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_profiles_user_id" ON "user_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_workout_logs_user_id" ON "workout_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_workout_logs_user_completed" ON "workout_logs" USING btree ("user_id","completed_at" DESC NULLS LAST);