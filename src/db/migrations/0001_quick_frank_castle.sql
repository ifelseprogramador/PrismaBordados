CREATE TYPE "public"."pedido_status" AS ENUM('orcamento', 'aprovado', 'em_producao', 'pronto', 'entregue', 'cancelado');--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"document" text,
	"phone" text NOT NULL,
	"address" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalogo_bordado_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"tipo_produto" text NOT NULL,
	"modelo_padrao" text,
	"tamanhos_aceitos" text[] DEFAULT '{}' NOT NULL,
	"cores_aceitas" text[] DEFAULT '{}' NOT NULL,
	"default_price_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedido_counters" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedido_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"catalogo_item_id" uuid,
	"produto" text NOT NULL,
	"modelo" text,
	"tamanho" text,
	"cor" text,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"total_cents" integer GENERATED ALWAYS AS (round(quantity * unit_price_cents)) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"customer_id" uuid NOT NULL,
	"order_date" date NOT NULL,
	"delivery_date" date,
	"delivery_time" text,
	"status" "pedido_status" DEFAULT 'orcamento' NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"adiantamento_cents" integer DEFAULT 0 NOT NULL,
	"saldo_cents" integer GENERATED ALWAYS AS (total_cents - adiantamento_cents) STORED,
	"approved_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogo_bordado_itens" ADD CONSTRAINT "catalogo_bordado_itens_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_counters" ADD CONSTRAINT "pedido_counters_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_catalogo_item_id_catalogo_bordado_itens_id_fk" FOREIGN KEY ("catalogo_item_id") REFERENCES "public"."catalogo_bordado_itens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_customer_id_clientes_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clientes_organization_id_idx" ON "clientes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "clientes_name_idx" ON "clientes" USING btree ("name");--> statement-breakpoint
CREATE INDEX "catalogo_bordado_itens_organization_id_idx" ON "catalogo_bordado_itens" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "catalogo_bordado_itens_tipo_produto_idx" ON "catalogo_bordado_itens" USING btree ("organization_id","tipo_produto");--> statement-breakpoint
CREATE INDEX "pedido_itens_pedido_id_idx" ON "pedido_itens" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "pedidos_organization_id_idx" ON "pedidos" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pedidos_customer_id_idx" ON "pedidos" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "pedidos_status_idx" ON "pedidos" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "pedidos_org_number_unique" ON "pedidos" USING btree ("organization_id","number");