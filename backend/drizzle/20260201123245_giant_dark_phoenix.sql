ALTER TABLE "fitness_profiles" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fitness_profiles" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "fitness_profiles" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fitness_profiles" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "fitness_profiles" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "fitness_profiles" ADD COLUMN "equipment_type" text;--> statement-breakpoint
ALTER TABLE "fitness_profiles" ADD COLUMN "focus_areas" jsonb DEFAULT '[]'::jsonb;