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
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fitness_profiles" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "fitness_profiles" ADD COLUMN "weight" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "fitness_profiles" ADD COLUMN "height" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "fitness_profiles" ADD COLUMN "age" integer;--> statement-breakpoint
ALTER TABLE "fitness_profiles" ADD COLUMN "activity_level" text;--> statement-breakpoint
ALTER TABLE "meal_plan_meals" ADD CONSTRAINT "meal_plan_meals_meal_plan_id_meal_plans_id_fk" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_meal_plan_meals" ON "meal_plan_meals" USING btree ("meal_plan_id");--> statement-breakpoint
CREATE INDEX "idx_user_meal_plans" ON "meal_plans" USING btree ("user_id");