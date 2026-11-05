CREATE TABLE "testimonials" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"role_or_business" text NOT NULL,
	"text" text NOT NULL,
	"photo_path" text,
	"photo_permission" boolean DEFAULT false NOT NULL,
	"permission_status" text DEFAULT 'PENDING' NOT NULL,
	"permission_evidence" text NOT NULL,
	"approval_status" text DEFAULT 'DRAFT' NOT NULL,
	"published_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "update_subscription_events" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_id" text NOT NULL,
	"action" text NOT NULL,
	"consent_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "update_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"consent_version" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"confirm_token_hash" text,
	"confirm_expires_at" timestamp with time zone,
	"confirmation_sent_at" timestamp with time zone,
	CONSTRAINT "update_subscriptions_email_unique" UNIQUE("email"),
	CONSTRAINT "update_subscriptions_confirm_token_hash_unique" UNIQUE("confirm_token_hash")
);
--> statement-breakpoint
ALTER TABLE "update_subscription_events" ADD CONSTRAINT "update_subscription_events_subscription_id_update_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."update_subscriptions"("id") ON DELETE cascade ON UPDATE no action;