-- ============================================================
-- PriceIQ — Semana 5: Motor de Precificação
-- Migration: 004_pricing_reviews.sql
-- ============================================================

-- Fila de aprovação de preços
CREATE TABLE IF NOT EXISTS pricing_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  custo_base      numeric(15,4) NOT NULL,
  metodo          text NOT NULL CHECK (metodo IN ('MARKUP', 'MARGEM')),
  parametro       numeric(8,4)  NOT NULL,  -- markup% ou margem%
  preco_sugerido  numeric(15,4) NOT NULL,
  preco_atual     numeric(15,4),           -- preco_venda_vigente no momento
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
  nota            text,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  revisado_em     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pricing_reviews_status
  ON pricing_reviews(status, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_pricing_reviews_product
  ON pricing_reviews(product_id, criado_em DESC);

-- FK reversa: produto aponta para última revisão aprovada
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS ultima_revisao_preco_id uuid REFERENCES pricing_reviews(id);
