ALTER TYPE "public"."notification_type" ADD VALUE 'banner';--> statement-breakpoint
CREATE TABLE "banner_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_member" integer NOT NULL,
	"to_member" integer,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "banner" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "banner_text" text;--> statement-breakpoint
ALTER TABLE "banner_messages" ADD CONSTRAINT "banner_messages_from_member_members_id_fk" FOREIGN KEY ("from_member") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banner_messages" ADD CONSTRAINT "banner_messages_to_member_members_id_fk" FOREIGN KEY ("to_member") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "banner_messages_expires_idx" ON "banner_messages" USING btree ("expires_at");