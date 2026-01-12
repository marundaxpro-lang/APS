CREATE TABLE "exercise_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_id" uuid NOT NULL,
	"video_url" text NOT NULL,
	"video_type" text NOT NULL,
	"title" text NOT NULL,
	"duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"muscle_group" text NOT NULL,
	"equipment_type" text NOT NULL,
	"description" text,
	"is_premium" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_caloric_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"daily_calorie_goal" integer NOT NULL,
	"basal_metabolic_rate" integer,
	"activity_level" text,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_caloric_goals_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "exercise_videos" ADD CONSTRAINT "exercise_videos_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_caloric_goals" ADD CONSTRAINT "user_caloric_goals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_exercise_videos" ON "exercise_videos" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "idx_muscle_group" ON "exercises" USING btree ("muscle_group");--> statement-breakpoint
CREATE INDEX "idx_user_caloric_goals" ON "user_caloric_goals" USING btree ("user_id");