ALTER TABLE "catalogo_bordado_itens" ADD COLUMN "ncm" text;--> statement-breakpoint
ALTER TABLE "catalogo_bordado_itens" ADD COLUMN "cfop" text;--> statement-breakpoint
ALTER TABLE "catalogo_bordado_itens" ADD COLUMN "unidade" text DEFAULT 'UN' NOT NULL;--> statement-breakpoint
ALTER TABLE "catalogo_bordado_itens" ADD COLUMN "origem" text DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "catalogo_bordado_itens" ADD COLUMN "cst" text;--> statement-breakpoint
ALTER TABLE "fiscal_credentials" ADD COLUMN "razao_social" text;--> statement-breakpoint
ALTER TABLE "fiscal_credentials" ADD COLUMN "nome_fantasia" text;--> statement-breakpoint
ALTER TABLE "fiscal_credentials" ADD COLUMN "ie" text;--> statement-breakpoint
ALTER TABLE "fiscal_credentials" ADD COLUMN "im" text;--> statement-breakpoint
ALTER TABLE "fiscal_credentials" ADD COLUMN "zip" text;--> statement-breakpoint
ALTER TABLE "fiscal_credentials" ADD COLUMN "street" text;--> statement-breakpoint
ALTER TABLE "fiscal_credentials" ADD COLUMN "number" text;--> statement-breakpoint
ALTER TABLE "fiscal_credentials" ADD COLUMN "complement" text;--> statement-breakpoint
ALTER TABLE "fiscal_credentials" ADD COLUMN "district" text;--> statement-breakpoint
ALTER TABLE "fiscal_credentials" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "fiscal_credentials" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "fiscal_credentials" ADD COLUMN "ibge_code" text;--> statement-breakpoint
ALTER TABLE "fiscal_credentials" ADD COLUMN "default_ncm" text;--> statement-breakpoint
ALTER TABLE "fiscal_credentials" ADD COLUMN "default_cfop" text;--> statement-breakpoint
ALTER TABLE "fiscal_credentials" ADD COLUMN "codigo_servico" text;--> statement-breakpoint
ALTER TABLE "fiscal_credentials" ADD COLUMN "cnae" text;--> statement-breakpoint
ALTER TABLE "fiscal_credentials" ADD COLUMN "iss_rate_bps" integer;