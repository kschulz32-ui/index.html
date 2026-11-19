CREATE TYPE "public"."notify_channel" AS ENUM('push', 'email');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('opened', 'chose', 'acted', 'finished');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."commit_mode" AS ENUM('do', 'pray', 'say', 'share');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('member', 'leader', 'admin');--> statement-breakpoint
CREATE TABLE "action_day" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commitment_id" uuid NOT NULL,
	"day_index" smallint NOT NULL,
	"text" varchar(400) NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"note" varchar(200),
	"done_at" timestamp with time zone,
	CONSTRAINT "day_index_range" CHECK ("action_day"."day_index" between 0 and 4)
);
--> statement-breakpoint
CREATE TABLE "church" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"timezone" varchar(64) DEFAULT 'America/Chicago' NOT NULL,
	"recap_day" smallint DEFAULT 1 NOT NULL,
	"recap_time" varchar(5) DEFAULT '12:00' NOT NULL,
	"join_code" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "church_join_code_unique" UNIQUE("join_code"),
	CONSTRAINT "recap_day_range" CHECK ("church"."recap_day" between 0 and 6),
	CONSTRAINT "recap_time_format" CHECK ("church"."recap_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
--> statement-breakpoint
CREATE TABLE "commitment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"takeaway_index" smallint NOT NULL,
	"i_will" varchar(280) NOT NULL,
	"mode" "commit_mode",
	"start_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "takeaway_index_range" CHECK ("commitment"."takeaway_index" between 0 and 4)
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"type" "event_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "login_token_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "lookback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commitment_id" uuid NOT NULL,
	"text" varchar(1000) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lookback_commitment_id_unique" UNIQUE("commitment_id")
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"title" varchar(140) NOT NULL,
	"speaker" varchar(80),
	"date" date NOT NULL,
	"scripture" text[] DEFAULT '{}'::text[] NOT NULL,
	"takeaways" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"transformation" varchar(300),
	"link" varchar(500),
	"transcript_excerpt" varchar(6000),
	"status" "message_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "published_has_time" CHECK (("message"."status" = 'draft') or ("message"."published_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "notification_send" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"channel" "notify_channel" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscription_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"key" varchar(200) PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"name" varchar(80),
	"church_id" uuid,
	"role" "role" DEFAULT 'member' NOT NULL,
	"notify_push" boolean DEFAULT true NOT NULL,
	"notify_email" boolean DEFAULT true NOT NULL,
	"share_counts" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "action_day" ADD CONSTRAINT "action_day_commitment_id_commitment_id_fk" FOREIGN KEY ("commitment_id") REFERENCES "public"."commitment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitment" ADD CONSTRAINT "commitment_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitment" ADD CONSTRAINT "commitment_message_id_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_message_id_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lookback" ADD CONSTRAINT "lookback_commitment_id_commitment_id_fk" FOREIGN KEY ("commitment_id") REFERENCES "public"."commitment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_church_id_church_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."church"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_send" ADD CONSTRAINT "notification_send_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_send" ADD CONSTRAINT "notification_send_message_id_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_church_id_church_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."church"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "action_day_commitment_day" ON "action_day" USING btree ("commitment_id","day_index");--> statement-breakpoint
CREATE UNIQUE INDEX "commitment_user_message" ON "commitment" USING btree ("user_id","message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_once" ON "event" USING btree ("user_id","message_id","type");--> statement-breakpoint
CREATE INDEX "event_message" ON "event" USING btree ("message_id","type");--> statement-breakpoint
CREATE INDEX "login_token_email" ON "login_token" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "message_church_status" ON "message" USING btree ("church_id","status","date");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_once" ON "notification_send" USING btree ("user_id","message_id","channel");--> statement-breakpoint
CREATE INDEX "session_user" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_user_email_lower" ON "app_user" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "app_user_church" ON "app_user" USING btree ("church_id");