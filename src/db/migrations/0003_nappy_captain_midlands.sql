CREATE TYPE "public"."lgpd_action" AS ENUM('export', 'anonymize', 'delete');--> statement-breakpoint
CREATE TABLE "lgpd_request_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"performed_by" uuid NOT NULL,
	"action" "lgpd_action" NOT NULL,
	"subject_table" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "anonymized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lgpd_request_log" ADD CONSTRAINT "lgpd_request_log_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lgpd_request_log_organization_id_idx" ON "lgpd_request_log" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "lgpd_request_log_subject_idx" ON "lgpd_request_log" USING btree ("subject_table","subject_id");