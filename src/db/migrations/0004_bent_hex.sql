CREATE TABLE "organization_privacy_settings" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"legal_name" text,
	"cnpj" text,
	"address" text,
	"dpo_name" text,
	"dpo_contact" text,
	"retention_years" integer DEFAULT 5 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_privacy_settings" ADD CONSTRAINT "organization_privacy_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;