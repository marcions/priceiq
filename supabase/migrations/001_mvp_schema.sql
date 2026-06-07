-- ============================================================
-- PriceIQ MVP — Schema inicial
-- Migration: 001_mvp_schema.sql
-- Executar no Supabase self-hosted (Srv05)
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgsodium";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ────────────────────────────────────────────────────────────
-- CATÁLOGO
-- ────────────────────────────────────────────────────────────

CREATE TABLE categories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         text NOT NULL,
  parent_id    uuid REFERENCES categories(id),
  bling_id     text,
  ordem        int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE suppliers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         text NOT NULL,
  cnpj         text,
  bling_id     text,
  ativo        boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- cost_policies e pricing_policies criadas antes de products (FK)
CREATE TABLE cost_policies (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                  text NOT NULL,
  metodo                text NOT NULL DEFAULT 'LAST'
                          CHECK (metodo IN ('LAST','SIMPLE_AVG','WEIGHTED_AVG')),
  periodo_dias          int,
  periodo_qtd_pedidos   int,
  incluir_frete         boolean NOT NULL DEFAULT false,
  incluir_impostos      boolean NOT NULL DEFAULT false,
  scope                 text NOT NULL DEFAULT 'global'
                          CHECK (scope IN ('global','category','product')),
  scope_id              uuid,
  ativo                 boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pricing_policies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text NOT NULL,
  tecnica         text NOT NULL DEFAULT 'MARKUP'
                    CHECK (tecnica IN ('MARKUP','MARGIN')),
  markup_pct      numeric(8,4),
  margem_pct      numeric(8,4),
  preco_minimo    numeric(15,4),
  preco_maximo    numeric(15,4),
  arredondamento  text NOT NULL DEFAULT 'none'
                    CHECK (arredondamento IN ('none','psychological','integer')),
  scope           text NOT NULL DEFAULT 'global'
                    CHECK (scope IN ('global','category','product')),
  scope_id        uuid,
  ativo           boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku                       text NOT NULL UNIQUE,
  nome                      text NOT NULL,
  unidade                   text NOT NULL DEFAULT 'UN',
  ncm                       text,
  categoria_id              uuid REFERENCES categories(id),
  fornecedor_principal_id   uuid REFERENCES suppliers(id),
  cost_policy_id            uuid REFERENCES cost_policies(id),
  pricing_policy_id         uuid REFERENCES pricing_policies(id),
  bling_id                  text UNIQUE,
  fonte                     text NOT NULL DEFAULT 'local'
                              CHECK (fonte IN ('local','bling')),
  custo_vigente             numeric(15,4),
  preco_venda_vigente       numeric(15,4),
  preco_minimo              numeric(15,4),
  preco_bling               numeric(15,4),
  sync_status_bling         text NOT NULL DEFAULT 'not_connected'
                              CHECK (sync_status_bling IN ('synced','pending','divergent','error','not_connected')),
  ativo                     boolean NOT NULL DEFAULT true,
  ultima_revisao_id         uuid,   -- FK adicionada depois
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_bling   ON products(bling_id) WHERE bling_id IS NOT NULL;
CREATE INDEX idx_products_ativo   ON products(ativo) WHERE ativo = true;
CREATE INDEX idx_products_sync    ON products(sync_status_bling) WHERE sync_status_bling != 'synced';

-- ────────────────────────────────────────────────────────────
-- MOTOR DE CUSTO
-- ────────────────────────────────────────────────────────────

CREATE TABLE cost_components (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         text NOT NULL,
  tipo         text NOT NULL CHECK (tipo IN ('PERCENT','FIXED','PER_UNIT')),
  valor        numeric(10,4) NOT NULL,
  base         text NOT NULL CHECK (base IN ('ON_COST','ON_PRICE')),
  obrigatorio  boolean NOT NULL DEFAULT true,
  ativo        boolean NOT NULL DEFAULT true,
  ordem        int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE purchase_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bling_pedido_id text NOT NULL UNIQUE,
  numero          text,
  supplier_id     uuid REFERENCES suppliers(id),
  data_pedido     date NOT NULL,
  status          text NOT NULL,
  total           numeric(15,4),
  importado_em    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_po_data ON purchase_orders(data_pedido DESC);

CREATE TABLE purchase_order_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id       uuid REFERENCES products(id),
  bling_produto_id text,
  sku              text,
  descricao        text NOT NULL,
  quantidade       numeric(15,4) NOT NULL,
  preco_unitario   numeric(15,4) NOT NULL,
  preco_total      numeric(15,4) NOT NULL
);

CREATE INDEX idx_poi_product ON purchase_order_items(product_id);
CREATE INDEX idx_poi_order   ON purchase_order_items(order_id);

CREATE TABLE cost_snapshots (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            uuid NOT NULL REFERENCES products(id),
  cost_policy_id        uuid REFERENCES cost_policies(id),
  custo_base            numeric(15,4) NOT NULL,
  custo_total           numeric(15,4) NOT NULL,
  components_breakdown  jsonb NOT NULL DEFAULT '{}',
  metodo_usado          text NOT NULL,
  pedidos_count         int NOT NULL DEFAULT 0,
  pedidos_ids           uuid[],
  triggered_by          text NOT NULL DEFAULT 'manual'
                          CHECK (triggered_by IN ('manual','scheduler')),
  triggered_by_user     uuid REFERENCES auth.users(id),
  calculado_em          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_snapshots_product ON cost_snapshots(product_id, calculado_em DESC);

-- ────────────────────────────────────────────────────────────
-- MOTOR DE PRECIFICAÇÃO
-- ────────────────────────────────────────────────────────────

CREATE TABLE pricing_reviews (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        uuid NOT NULL REFERENCES products(id),
  snapshot_id       uuid NOT NULL REFERENCES cost_snapshots(id),
  pricing_policy_id uuid REFERENCES pricing_policies(id),
  custo_calculado   numeric(15,4) NOT NULL,
  preco_sugerido    numeric(15,4) NOT NULL,
  preco_minimo      numeric(15,4),
  preco_anterior    numeric(15,4),
  variacao_pct      numeric(8,4),
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected','expired')),
  preco_aprovado    numeric(15,4),
  aprovado_por      uuid REFERENCES auth.users(id),
  aprovado_em       timestamptz,
  motivo_rejeicao   text,
  expira_em         timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_pending ON pricing_reviews(status, created_at DESC)
  WHERE status = 'pending';
CREATE INDEX idx_reviews_product ON pricing_reviews(product_id, created_at DESC);

-- FK circular products → pricing_reviews
ALTER TABLE products
  ADD CONSTRAINT fk_ultima_revisao
  FOREIGN KEY (ultima_revisao_id) REFERENCES pricing_reviews(id);

CREATE TABLE price_history (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            uuid NOT NULL REFERENCES products(id),
  review_id             uuid REFERENCES pricing_reviews(id),
  preco_custo           numeric(15,4) NOT NULL,
  preco_venda           numeric(15,4) NOT NULL,
  margem_realizada_pct  numeric(8,4),
  sincronizado_bling    boolean NOT NULL DEFAULT false,
  bling_sync_at         timestamptz,
  origem                text NOT NULL CHECK (origem IN ('manual','approved')),
  alterado_por          uuid REFERENCES auth.users(id),
  alterado_em           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_history_product ON price_history(product_id, alterado_em DESC);

-- ────────────────────────────────────────────────────────────
-- INTEGRAÇÃO BLING
-- ────────────────────────────────────────────────────────────

CREATE TABLE integration_configs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider         text NOT NULL DEFAULT 'bling',
  active           boolean NOT NULL DEFAULT true,
  credentials_enc  jsonb NOT NULL DEFAULT '{}',
  sync_config      jsonb NOT NULL DEFAULT '{}',
  last_sync_at     timestamptz,
  last_sync_status text CHECK (last_sync_status IN ('success','error','partial')),
  last_error       text,
  token_expires_at timestamptz,
  connected_by     uuid NOT NULL REFERENCES auth.users(id),
  connected_at     timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider)
);

CREATE TABLE sync_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider          text NOT NULL DEFAULT 'bling',
  direction         text NOT NULL CHECK (direction IN ('inbound','outbound')),
  operation         text NOT NULL,
  status            text NOT NULL CHECK (status IN ('success','error','partial')),
  records_ok        int,
  records_failed    int,
  error             text,
  duration_ms       int,
  triggered_by      text CHECK (triggered_by IN ('scheduler','manual')),
  triggered_by_user uuid REFERENCES auth.users(id),
  executed_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_logs_recent ON sync_logs(executed_at DESC);

-- ────────────────────────────────────────────────────────────
-- AUDITORIA
-- ────────────────────────────────────────────────────────────

CREATE TABLE audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      uuid REFERENCES auth.users(id),
  actor_type    text NOT NULL DEFAULT 'user',
  action        text NOT NULL,
  resource_type text,
  resource_id   uuid,
  old_value     jsonb,
  new_value     jsonb,
  ip_address    inet,
  occurred_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id, occurred_at DESC);
CREATE INDEX idx_audit_actor    ON audit_logs(actor_id, occurred_at DESC) WHERE actor_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- TRIGGER: updated_at automático
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER integration_configs_updated_at
  BEFORE UPDATE ON integration_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────
-- RLS — Row Level Security
-- MVP: single-tenant, todos os usuários autenticados acessam tudo
-- Ajustar para multi-tenant na V1
-- ────────────────────────────────────────────────────────────

ALTER TABLE categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_policies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_components    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_policies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_snapshots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_reviews    ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         ENABLE ROW LEVEL SECURITY;

-- Política padrão MVP: qualquer usuário autenticado acessa
CREATE POLICY "authenticated_read_all"  ON categories         FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_all" ON categories         FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_all"  ON suppliers          FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_all" ON suppliers          FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_all"  ON products           FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_all" ON products           FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_all"  ON cost_policies      FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_all" ON cost_policies      FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_all"  ON cost_components    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_all" ON cost_components    FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_all"  ON pricing_policies   FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_all" ON pricing_policies   FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_all"  ON purchase_orders    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_all" ON purchase_orders    FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_all"  ON purchase_order_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_all" ON purchase_order_items FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_all"  ON cost_snapshots     FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_all" ON cost_snapshots     FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_all"  ON pricing_reviews    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_all" ON pricing_reviews    FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_all"  ON price_history      FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert"    ON price_history      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_all"  ON integration_configs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_all" ON integration_configs FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_all"  ON sync_logs          FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert"    ON sync_logs          FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_all"  ON audit_logs         FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert"    ON audit_logs         FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ────────────────────────────────────────────────────────────
-- DADOS INICIAIS
-- ────────────────────────────────────────────────────────────

-- Política de custo padrão (último preço)
INSERT INTO cost_policies (nome, metodo, scope) VALUES
  ('Padrão — Último Preço', 'LAST', 'global'),
  ('Média Ponderada (90 dias)', 'WEIGHTED_AVG', 'global');

-- Política de precificação padrão (markup 2x)
INSERT INTO pricing_policies (nome, tecnica, markup_pct, scope) VALUES
  ('Markup 100%', 'MARKUP', 1.0, 'global'),
  ('Margem 50%',  'MARGIN', null, 'global');

UPDATE pricing_policies SET margem_pct = 50 WHERE nome = 'Margem 50%';
