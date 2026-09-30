CREATE TABLE "availability" (
	"poll_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"slot_start" timestamp with time zone NOT NULL,
	CONSTRAINT "availability_poll_id_user_id_slot_start_pk" PRIMARY KEY("poll_id","user_id","slot_start")
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"poll_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"tz" text NOT NULL,
	"display_name" text NOT NULL,
	"responded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participants_poll_id_user_id_pk" PRIMARY KEY("poll_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "poll_slots" (
	"poll_id" uuid NOT NULL,
	"slot_start" timestamp with time zone NOT NULL,
	CONSTRAINT "poll_slots_poll_id_slot_start_pk" PRIMARY KEY("poll_id","slot_start")
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"message_ts" text,
	"creator_id" text NOT NULL,
	"title" text NOT NULL,
	"creator_tz" text NOT NULL,
	"slot_minutes" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"final_slot_start" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "polls_slot_minutes_check" CHECK ("polls"."slot_minutes" in (15, 30, 60)),
	CONSTRAINT "polls_status_check" CHECK ("polls"."status" in ('open', 'closed', 'scheduled'))
);
--> statement-breakpoint
CREATE TABLE "slack_users" (
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"tz" text NOT NULL,
	"display_name" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slack_users_team_id_user_id_pk" PRIMARY KEY("team_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_slot_fk" FOREIGN KEY ("poll_id","slot_start") REFERENCES "public"."poll_slots"("poll_id","slot_start") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_participant_fk" FOREIGN KEY ("poll_id","user_id") REFERENCES "public"."participants"("poll_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_slots" ADD CONSTRAINT "poll_slots_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_slot_idx" ON "availability" USING btree ("poll_id","slot_start");--> statement-breakpoint
CREATE INDEX "participants_user_idx" ON "participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "polls_creator_idx" ON "polls" USING btree ("team_id","creator_id");--> statement-breakpoint
CREATE INDEX "polls_message_idx" ON "polls" USING btree ("channel_id","message_ts");