CREATE TYPE "public"."financeiro_lancamento_categoria" AS ENUM('venda', 'adiantamento', 'saldo_recebido', 'compra_material', 'despesa_fixa', 'outro');--> statement-breakpoint
CREATE TYPE "public"."financeiro_lancamento_reference_type" AS ENUM('pedido', 'manual');--> statement-breakpoint
CREATE TYPE "public"."financeiro_lancamento_type" AS ENUM('entrada', 'saida');--> statement-breakpoint
CREATE TYPE "public"."fiscal_nota_status" AS ENUM('pendente', 'emitida', 'erro', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."fiscal_nota_tipo" AS ENUM('nfe', 'nfse');--> statement-breakpoint
CREATE TABLE "financeiro_lancamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" "financeiro_lancamento_type" NOT NULL,
	"categoria" "financeiro_lancamento_categoria" NOT NULL,
	"amount_cents" integer NOT NULL,
	"date" date NOT NULL,
	"description" text,
	"reference_type" "financeiro_lancamento_reference_type",
	"reference_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal_credentials" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"provider_slug" text,
	"api_key_encrypted" text,
	"cnpj" text,
	"regime_tributario" text,
	"serie_nota" text,
	"provider_config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal_notas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"pedido_id" uuid NOT NULL,
	"tipo" "fiscal_nota_tipo" NOT NULL,
	"status" "fiscal_nota_status" DEFAULT 'pendente' NOT NULL,
	"provider_nota_id" text,
	"xml_url" text,
	"pdf_url" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "financeiro_lancamentos" ADD CONSTRAINT "financeiro_lancamentos_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_credentials" ADD CONSTRAINT "fiscal_credentials_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_notas" ADD CONSTRAINT "fiscal_notas_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_notas" ADD CONSTRAINT "fiscal_notas_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financeiro_lancamentos_organization_id_idx" ON "financeiro_lancamentos" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "financeiro_lancamentos_org_date_idx" ON "financeiro_lancamentos" USING btree ("organization_id","date");--> statement-breakpoint
CREATE INDEX "financeiro_lancamentos_reference_idx" ON "financeiro_lancamentos" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "fiscal_notas_organization_id_idx" ON "fiscal_notas" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "fiscal_notas_pedido_id_idx" ON "fiscal_notas" USING btree ("pedido_id");