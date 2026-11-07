CREATE TABLE "source_preferences" (
	"owner_id" text NOT NULL,
	"product" text NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_preferences_owner_id_product_pk" PRIMARY KEY("owner_id","product")
);
--> statement-breakpoint
CREATE TABLE "job_source_runs" (
	"job_id" text NOT NULL,
	"source" text NOT NULL,
	"adapter_version" text NOT NULL,
	"status" text NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"discovered_count" integer DEFAULT 0 NOT NULL,
	"unique_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "job_source_runs_job_id_source_pk" PRIMARY KEY("job_id","source")
);
--> statement-breakpoint
ALTER TABLE "source_preferences" ADD CONSTRAINT "source_preferences_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_source_runs" ADD CONSTRAINT "job_source_runs_job_id_search_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."search_jobs"("id") ON DELETE cascade ON UPDATE no action;