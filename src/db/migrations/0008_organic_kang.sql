CREATE TYPE "public"."cliente_endereco_kind" AS ENUM('principal', 'cobranca', 'entrega');--> statement-breakpoint
CREATE TYPE "public"."cliente_ie_indicator" AS ENUM('contribuinte', 'isento', 'nao_contribuinte');--> statement-breakpoint
CREATE TYPE "public"."cliente_type" AS ENUM('pf', 'pj');--> statement-breakpoint
CREATE TABLE "cliente_enderecos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"kind" "cliente_endereco_kind" DEFAULT 'principal' NOT NULL,
	"zip" text,
	"street" text,
	"number" text,
	"complement" text,
	"district" text,
	"city" text,
	"state" text,
	"ibge_code" text,
	"country_code" text DEFAULT '1058' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "type" "cliente_type" DEFAULT 'pf' NOT NULL;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "legal_name" text;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "trade_name" text;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "ie_indicator" "cliente_ie_indicator" DEFAULT 'nao_contribuinte' NOT NULL;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "ie" text;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "im" text;--> statement-breakpoint
ALTER TABLE "cliente_enderecos" ADD CONSTRAINT "cliente_enderecos_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliente_enderecos" ADD CONSTRAINT "cliente_enderecos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cliente_enderecos_organization_id_idx" ON "cliente_enderecos" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "cliente_enderecos_cliente_id_idx" ON "cliente_enderecos" USING btree ("cliente_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cliente_enderecos_principal_uq" ON "cliente_enderecos" USING btree ("cliente_id") WHERE "cliente_enderecos"."kind" = 'principal';
-- Backfill: clientes antigos com CNPJ (14 dígitos) passam a ser PJ.
UPDATE "clientes" SET "type" = 'pj' WHERE length(regexp_replace(coalesce("document", ''), '\D', '', 'g')) = 14;
