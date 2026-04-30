DROP INDEX "idx_user_friends";--> statement-breakpoint
DROP INDEX "idx_post_likes";--> statement-breakpoint
CREATE INDEX "idx_friend_connections_user_id" ON "friend_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_friend_connections_friend_id" ON "friend_connections" USING btree ("friend_id");--> statement-breakpoint
CREATE INDEX "idx_measurements_user_date" ON "measurements" USING btree ("user_id","measurement_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_nutrition_logs_user_date" ON "nutrition_logs" USING btree ("user_id","log_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_social_post_likes_post_id" ON "social_post_likes" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_social_post_likes_user_id" ON "social_post_likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_workout_sessions_user_started" ON "workout_sessions" USING btree ("user_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_account_user_id" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_account_provider" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_session_token" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_session_user_id" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_session_expires_at" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_email" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_verification_identifier" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "idx_verification_expires_at" ON "verification" USING btree ("expires_at");