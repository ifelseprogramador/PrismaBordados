CREATE TABLE "status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_table" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"changed_by" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cliente_enderecos" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "cliente_enderecos" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "catalogo_bordado_itens" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "catalogo_bordado_itens" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "pedido_itens" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "pedido_itens" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "header_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "financeiro_lancamentos" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "financeiro_lancamentos" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "financeiro_lancamentos" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "status_history_entity_idx" ON "status_history" USING btree ("entity_table","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financeiro_lancamentos_org_idempotency_unique" ON "financeiro_lancamentos" USING btree ("organization_id","idempotency_key") WHERE idempotency_key is not null;