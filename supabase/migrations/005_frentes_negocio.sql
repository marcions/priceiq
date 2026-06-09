-- ============================================================
-- Migration 005: Frentes de Negócio (Parametrizable)
-- Cada frente define seu próprio conjunto de componentes de
-- custo e políticas de precificação. Adicionar uma nova frente
-- não requer nenhuma mudança de código — apenas configuração.
-- ============================================================

-- ─── 1. TABELA PRINCIPAL ────────────────────────────────────

CREATE TABLE IF NOT EXISTS frentes_negocio (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text        NOT NULL,
  slug        text        UNIQUE NOT NULL,   -- 'impressao_3d', 'laser', etc.
  descricao   text,
  icone       text,                          -- emoji ou nome de ícone (lucide)
  ativo       boolean     NOT NULL DEFAULT true,
  ordem       integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE frentes_negocio IS
  'Frentes de negócio parametrizáveis. Cada frente define seu próprio DNA de custo e precificação.';

-- ─── 2. VINCULAR FRENTE AOS PRODUTOS ────────────────────────

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS frente_id uuid REFERENCES frentes_negocio(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_frente ON products(frente_id);

-- ─── 3. VINCULAR FRENTE AOS COMPONENTES DE CUSTO ────────────
-- NULL = global (aplica a todas as frentes quando não há específico)

ALTER TABLE cost_components
  ADD COLUMN IF NOT EXISTS frente_id uuid REFERENCES frentes_negocio(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_cost_components_frente ON cost_components(frente_id);

-- ─── 4. VINCULAR FRENTE ÀS POLÍTICAS DE CUSTO ───────────────

ALTER TABLE cost_policies
  ADD COLUMN IF NOT EXISTS frente_id uuid REFERENCES frentes_negocio(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cost_policies_frente ON cost_policies(frente_id);

-- ─── 5. VINCULAR FRENTE ÀS POLÍTICAS DE PRECIFICAÇÃO ────────

ALTER TABLE pricing_policies
  ADD COLUMN IF NOT EXISTS frente_id uuid REFERENCES frentes_negocio(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pricing_policies_frente ON pricing_policies(frente_id);

-- ─── 6. FRENTES INICIAIS ────────────────────────────────────

INSERT INTO frentes_negocio (nome, slug, descricao, icone, ordem) VALUES
  (
    'Impressão 3D',
    'impressao_3d',
    'Produtos fabricados por impressão 3D FDM ou resina. Alto custo de mão de obra e depreciação de equipamento.',
    'Layers',
    10
  ),
  (
    'Gravação a Laser',
    'laser',
    'Gravação e corte a laser em MDF, acrílico, couro e similares. Rápido, material variado.',
    'Zap',
    20
  ),
  (
    'Sublimação',
    'sublimacao',
    'Impressão por sublimação em itens de poliéster: canecas, camisetas, almofadas, bonés.',
    'Droplets',
    30
  ),
  (
    'DTF Têxtil',
    'dtf_textil',
    'Direct To Film — transferência em qualquer tecido incluindo algodão. Custo por cm² de impressão.',
    'Printer',
    40
  ),
  (
    'Venda de Produto',
    'venda_produto',
    'Revenda de produtos prontos com ou sem personalização simples. CMV domina o custo total.',
    'ShoppingBag',
    50
  )
ON CONFLICT (slug) DO NOTHING;

-- ─── 7. POLÍTICAS DE CUSTO POR FRENTE ───────────────────────

-- Remove políticas globais antigas de teste e recria vinculadas por frente
-- (mantém as 2 que existiam originalmente: Padrão LAST e Ponderada 90d)

WITH f AS (SELECT id, slug FROM frentes_negocio)
INSERT INTO cost_policies (nome, metodo, periodo_dias, periodo_qtd_pedidos, incluir_frete, frente_id)
SELECT nome, metodo, periodo_dias, periodo_qtd_pedidos, incluir_frete, f.id
FROM (VALUES
  -- Impressão 3D: ponderada 90 dias (filamento varia com mercado)
  ('Impressão 3D — Média Ponderada 90d',   'WEIGHTED_AVG', 90,   NULL, true,  'impressao_3d'),
  ('Impressão 3D — Último Preço',          'LAST',         NULL, NULL, true,  'impressao_3d'),
  -- Laser: último preço (material varia muito por tipo)
  ('Laser — Último Preço',                 'LAST',         NULL, NULL, true,  'laser'),
  ('Laser — Média Simples 5 pedidos',      'SIMPLE_AVG',   NULL, 5,   false, 'laser'),
  -- Sublimação: ponderada 30 dias (insumos estáveis)
  ('Sublimação — Média Ponderada 30d',     'WEIGHTED_AVG', 30,   NULL, false, 'sublimacao'),
  ('Sublimação — Último Preço',            'LAST',         NULL, NULL, false, 'sublimacao'),
  -- DTF: média simples últimos 5 pedidos (custo por cm² estável)
  ('DTF Têxtil — Média Simples 5 pedidos', 'SIMPLE_AVG',   NULL, 5,   false, 'dtf_textil'),
  ('DTF Têxtil — Média Ponderada 60d',     'WEIGHTED_AVG', 60,   NULL, false, 'dtf_textil'),
  -- Venda de Produto: último preço (CMV = preço de compra recente)
  ('Venda de Produto — Último Preço',      'LAST',         NULL, NULL, true,  'venda_produto'),
  ('Venda de Produto — Ponderada 90d',     'WEIGHTED_AVG', 90,   NULL, true,  'venda_produto')
) AS v(nome, metodo, periodo_dias, periodo_qtd_pedidos, incluir_frete, slug)
JOIN f ON f.slug = v.slug;

-- ─── 8. COMPONENTES DE CUSTO POR FRENTE ─────────────────────

-- Limpa componentes antigos (sem frente definida = eram de teste)
DELETE FROM cost_components WHERE frente_id IS NULL;

WITH f AS (SELECT id, slug FROM frentes_negocio)
INSERT INTO cost_components (nome, tipo, valor, base, obrigatorio, ordem, frente_id)
SELECT nome, tipo, valor, base, obrigatorio, ordem, f.id
FROM (VALUES

  -- ── IMPRESSÃO 3D ──────────────────────────────────────────
  -- CMV = custo do filamento (via purchase_orders)
  -- ON_COST: aplicados sobre o CMV de material
  ('3D — Frete de Material',          'PERCENT',  3.00, 'ON_COST',  false, 10, 'impressao_3d'),
  ('3D — Perdas (falhas de impressão)','PERCENT',  5.00, 'ON_COST',  true,  20, 'impressao_3d'),
  ('3D — Mão de Obra Direta',         'PERCENT', 40.00, 'ON_COST',  true,  30, 'impressao_3d'),
  ('3D — Depreciação Impressora',     'PERCENT', 15.00, 'ON_COST',  true,  40, 'impressao_3d'),
  ('3D — Energia Elétrica',           'PERCENT',  5.00, 'ON_COST',  true,  50, 'impressao_3d'),
  ('3D — Pós-processamento',          'PERCENT', 10.00, 'ON_COST',  false, 60, 'impressao_3d'),
  ('3D — Embalagem',                  'FIXED',    5.00, 'ON_COST',  false, 70, 'impressao_3d'),
  -- ON_PRICE: despesas variáveis sobre preço de venda
  ('3D — Simples Nacional Faixa 1',   'PERCENT',  4.00, 'ON_PRICE', true,  80, 'impressao_3d'),
  ('3D — Simples Nacional Faixa 2',   'PERCENT',  6.50, 'ON_PRICE', false, 81, 'impressao_3d'),
  ('3D — Comissão Vendedor',          'PERCENT',  4.00, 'ON_PRICE', false, 90, 'impressao_3d'),
  ('3D — Taxa Gateway/Maquininha',    'PERCENT',  2.50, 'ON_PRICE', false, 100,'impressao_3d'),
  ('3D — Frete de Venda Embutido',    'PERCENT',  7.00, 'ON_PRICE', false, 110,'impressao_3d'),
  ('3D — Taxa ML Classic',            'PERCENT', 13.00, 'ON_PRICE', false, 120,'impressao_3d'),
  ('3D — Taxa Shopee',                'PERCENT', 20.00, 'ON_PRICE', false, 130,'impressao_3d'),
  ('3D — Lucro Pretendido',           'PERCENT', 10.00, 'ON_PRICE', true,  200,'impressao_3d'),

  -- ── GRAVAÇÃO A LASER ──────────────────────────────────────
  -- CMV = material base (MDF, acrílico, couro)
  ('Laser — Frete de Material',       'PERCENT',  4.00, 'ON_COST',  false, 10, 'laser'),
  ('Laser — Perdas e Refugos',        'PERCENT',  3.00, 'ON_COST',  true,  20, 'laser'),
  ('Laser — Mão de Obra Direta',      'PERCENT', 25.00, 'ON_COST',  true,  30, 'laser'),
  ('Laser — Depreciação Equipamento', 'PERCENT', 12.00, 'ON_COST',  true,  40, 'laser'),
  ('Laser — Energia Elétrica',        'PERCENT',  4.00, 'ON_COST',  true,  50, 'laser'),
  ('Laser — Embalagem',               'FIXED',    3.00, 'ON_COST',  false, 60, 'laser'),
  ('Laser — Simples Nacional Faixa 1','PERCENT',  4.00, 'ON_PRICE', true,  80, 'laser'),
  ('Laser — Simples Nacional Faixa 2','PERCENT',  6.50, 'ON_PRICE', false, 81, 'laser'),
  ('Laser — Comissão Vendedor',       'PERCENT',  4.00, 'ON_PRICE', false, 90, 'laser'),
  ('Laser — Taxa Gateway/Maquininha', 'PERCENT',  2.50, 'ON_PRICE', false, 100,'laser'),
  ('Laser — Frete de Venda Embutido', 'PERCENT',  7.00, 'ON_PRICE', false, 110,'laser'),
  ('Laser — Taxa ML Classic',         'PERCENT', 13.00, 'ON_PRICE', false, 120,'laser'),
  ('Laser — Lucro Pretendido',        'PERCENT', 10.00, 'ON_PRICE', true,  200,'laser'),

  -- ── SUBLIMAÇÃO ────────────────────────────────────────────
  -- CMV = item branco (caneca, camiseta poliéster) + papel transfer + tinta
  ('Subli — Frete de Insumos',        'PERCENT',  3.00, 'ON_COST',  false, 10, 'sublimacao'),
  ('Subli — Perdas (erros de cor)',   'PERCENT',  2.00, 'ON_COST',  true,  20, 'sublimacao'),
  ('Subli — Papel + Tinta Transfer',  'PERCENT',  8.00, 'ON_COST',  true,  25, 'sublimacao'),
  ('Subli — Mão de Obra Direta',      'PERCENT', 15.00, 'ON_COST',  true,  30, 'sublimacao'),
  ('Subli — Depreciação Prensa',      'PERCENT',  5.00, 'ON_COST',  true,  40, 'sublimacao'),
  ('Subli — Energia Elétrica',        'PERCENT',  2.00, 'ON_COST',  true,  50, 'sublimacao'),
  ('Subli — Embalagem',               'FIXED',    2.50, 'ON_COST',  false, 60, 'sublimacao'),
  ('Subli — Simples Nacional Faixa 1','PERCENT',  4.00, 'ON_PRICE', true,  80, 'sublimacao'),
  ('Subli — Simples Nacional Faixa 2','PERCENT',  6.50, 'ON_PRICE', false, 81, 'sublimacao'),
  ('Subli — Comissão Vendedor',       'PERCENT',  4.00, 'ON_PRICE', false, 90, 'sublimacao'),
  ('Subli — Taxa Gateway/Maquininha', 'PERCENT',  2.50, 'ON_PRICE', false, 100,'sublimacao'),
  ('Subli — Frete de Venda Embutido', 'PERCENT',  7.00, 'ON_PRICE', false, 110,'sublimacao'),
  ('Subli — Taxa ML Classic',         'PERCENT', 13.00, 'ON_PRICE', false, 120,'sublimacao'),
  ('Subli — Lucro Pretendido',        'PERCENT', 10.00, 'ON_PRICE', true,  200,'sublimacao'),

  -- ── DTF TÊXTIL ────────────────────────────────────────────
  -- CMV = film DTF + tinta (custo por cm²) + item de vestuário
  ('DTF — Frete de Insumos',          'PERCENT',  3.00, 'ON_COST',  false, 10, 'dtf_textil'),
  ('DTF — Perdas de Film/Impressão',  'PERCENT',  4.00, 'ON_COST',  true,  20, 'dtf_textil'),
  ('DTF — Mão de Obra Direta',        'PERCENT', 20.00, 'ON_COST',  true,  30, 'dtf_textil'),
  ('DTF — Depreciação Impressora DTF','PERCENT', 10.00, 'ON_COST',  true,  40, 'dtf_textil'),
  ('DTF — Depreciação Prensa',        'PERCENT',  5.00, 'ON_COST',  true,  45, 'dtf_textil'),
  ('DTF — Energia Elétrica',          'PERCENT',  3.00, 'ON_COST',  true,  50, 'dtf_textil'),
  ('DTF — Embalagem',                 'FIXED',    3.00, 'ON_COST',  false, 60, 'dtf_textil'),
  ('DTF — Simples Nacional Faixa 1',  'PERCENT',  4.00, 'ON_PRICE', true,  80, 'dtf_textil'),
  ('DTF — Simples Nacional Faixa 2',  'PERCENT',  6.50, 'ON_PRICE', false, 81, 'dtf_textil'),
  ('DTF — Comissão Vendedor',         'PERCENT',  4.00, 'ON_PRICE', false, 90, 'dtf_textil'),
  ('DTF — Taxa Gateway/Maquininha',   'PERCENT',  2.50, 'ON_PRICE', false, 100,'dtf_textil'),
  ('DTF — Frete de Venda Embutido',   'PERCENT',  7.00, 'ON_PRICE', false, 110,'dtf_textil'),
  ('DTF — Taxa ML Classic',           'PERCENT', 13.00, 'ON_PRICE', false, 120,'dtf_textil'),
  ('DTF — Lucro Pretendido',          'PERCENT', 10.00, 'ON_PRICE', true,  200,'dtf_textil'),

  -- ── VENDA DE PRODUTO ──────────────────────────────────────
  -- CMV = preço de compra do produto pronto (alto % do preço final)
  -- Menos componentes: produto já vem pronto, só revenda
  ('Produto — Frete de Entrada',      'PERCENT',  4.00, 'ON_COST',  true,  10, 'venda_produto'),
  ('Produto — Perdas e Avarias',      'PERCENT',  1.50, 'ON_COST',  true,  20, 'venda_produto'),
  ('Produto — Embalagem/Personaliz.', 'FIXED',    2.00, 'ON_COST',  false, 30, 'venda_produto'),
  ('Produto — Overhead (armazenagem)','PERCENT',  5.00, 'ON_COST',  true,  40, 'venda_produto'),
  ('Produto — Simples Nacional Faixa 1','PERCENT', 4.00, 'ON_PRICE', true,  80, 'venda_produto'),
  ('Produto — Simples Nacional Faixa 2','PERCENT', 6.50, 'ON_PRICE', false, 81, 'venda_produto'),
  ('Produto — Comissão Vendedor',     'PERCENT',  3.00, 'ON_PRICE', false, 90, 'venda_produto'),
  ('Produto — Taxa Gateway/Maquininha','PERCENT',  2.50, 'ON_PRICE', false, 100,'venda_produto'),
  ('Produto — Frete de Venda Embutido','PERCENT',  6.00, 'ON_PRICE', false, 110,'venda_produto'),
  ('Produto — Taxa ML Classic',       'PERCENT', 13.00, 'ON_PRICE', false, 120,'venda_produto'),
  ('Produto — Taxa Shopee',           'PERCENT', 20.00, 'ON_PRICE', false, 130,'venda_produto'),
  ('Produto — Lucro Pretendido',      'PERCENT',  8.00, 'ON_PRICE', true,  200,'venda_produto')

) AS v(nome, tipo, valor, base, obrigatorio, ordem, slug)
JOIN f ON f.slug = v.slug;

-- ─── 9. POLÍTICAS DE PRECIFICAÇÃO POR FRENTE ────────────────
-- Markup Divisor pré-calculado por frente × canal
-- Fórmula: MD = 1 - (impostos + comercialização + overhead_rateado + lucro)
--
-- Componentes ON_PRICE obrigatórios por frente:
--   3D:      Simples4% + MO40%*via_custo... lucro10%
--            Varejo:      4 + 4(comissão) + 10 = 18% → MD=0.82 → mk=22%
--            E-com:       4 + 2.5 + 7 + 10 = 23.5% → MD=0.765 → mk=30.7%
--            ML Classic:  4 + 13 + 10 = 27% → MD=0.73 → mk=36.9%
--   Laser:   similar ao 3D mas MO menor
--            Varejo:      4 + 4 + 10 = 18% → MD=0.82 → mk=22%
--            E-com:       4 + 2.5 + 7 + 10 = 23.5% → MD=0.765 → mk=30.7%
--   Subli:   MO baixa, mas overhead menor — custo total menor
--            Varejo:      4 + 4 + 10 = 18% → MD=0.82 → mk=22%
--            E-com:       4 + 2.5 + 7 + 10 = 23.5% → md=0.765 → mk=30.7%
--   DTF:     MO média
--            Varejo:      4 + 4 + 10 = 18% → MD=0.82 → mk=22%
--            E-com:       4 + 2.5 + 7 + 10 = 23.5% → mk=30.7%
--   Produto: CMV já é alto, overhead baixo, lucro 8%
--            Varejo:      4 + 3 + 8 = 15% → MD=0.85 → mk=17.6%
--            E-com:       4 + 2.5 + 6 + 8 = 20.5% → MD=0.795 → mk=25.8%
--            ML Classic:  4 + 13 + 8 = 25% → MD=0.75 → mk=33.3%
--            Shopee:      4 + 20 + 8 = 32% → MD=0.68 → mk=47.1%
-- Nota: para produção própria (3D, Laser, Subli, DTF) o overhead já está
-- nos componentes ON_COST — o MD aqui cobre só despesas sobre o PREÇO.

WITH f AS (SELECT id, slug FROM frentes_negocio)
INSERT INTO pricing_policies (nome, tecnica, markup_pct, margem_pct, preco_minimo, arredondamento, frente_id)
SELECT nome, tecnica, markup_pct, margem_pct, preco_minimo, arredondamento, f.id
FROM (VALUES
  -- Impressão 3D
  ('3D — Varejo Físico (Simples I)',        'MARKUP', 22.00, NULL, NULL, 'psychological', 'impressao_3d'),
  ('3D — E-commerce Próprio (Simples I)',   'MARKUP', 30.70, NULL, NULL, 'psychological', 'impressao_3d'),
  ('3D — ML Classic (Simples I)',           'MARKUP', 36.90, NULL, NULL, 'psychological', 'impressao_3d'),
  ('3D — Shopee (Simples I)',               'MARKUP', 47.10, NULL, NULL, 'psychological', 'impressao_3d'),
  ('3D — Margem 50% (premium/artesanal)',   'MARGIN', NULL,  50.0, NULL, 'psychological', 'impressao_3d'),

  -- Gravação a Laser
  ('Laser — Varejo Físico (Simples I)',     'MARKUP', 22.00, NULL, NULL, 'psychological', 'laser'),
  ('Laser — E-commerce Próprio (Simples I)','MARKUP', 30.70, NULL, NULL, 'psychological', 'laser'),
  ('Laser — ML Classic (Simples I)',        'MARKUP', 36.90, NULL, NULL, 'psychological', 'laser'),
  ('Laser — Margem 45%',                   'MARGIN', NULL,  45.0, NULL, 'psychological', 'laser'),

  -- Sublimação
  ('Subli — Varejo Físico (Simples I)',     'MARKUP', 22.00, NULL, NULL, 'psychological', 'sublimacao'),
  ('Subli — E-commerce Próprio (Simples I)','MARKUP', 30.70, NULL, NULL, 'psychological', 'sublimacao'),
  ('Subli — ML Classic (Simples I)',        'MARKUP', 36.90, NULL, NULL, 'psychological', 'sublimacao'),
  ('Subli — Shopee (Simples I)',            'MARKUP', 47.10, NULL, NULL, 'psychological', 'sublimacao'),

  -- DTF Têxtil
  ('DTF — Varejo Físico (Simples I)',       'MARKUP', 22.00, NULL, NULL, 'psychological', 'dtf_textil'),
  ('DTF — E-commerce Próprio (Simples I)',  'MARKUP', 30.70, NULL, NULL, 'psychological', 'dtf_textil'),
  ('DTF — ML Classic (Simples I)',          'MARKUP', 36.90, NULL, NULL, 'psychological', 'dtf_textil'),
  ('DTF — Shopee (Simples I)',              'MARKUP', 47.10, NULL, NULL, 'psychological', 'dtf_textil'),

  -- Venda de Produto (revenda — CMV alto, overhead baixo)
  ('Produto — Varejo Físico (Simples I)',   'MARKUP', 17.60, NULL, NULL, 'psychological', 'venda_produto'),
  ('Produto — E-commerce (Simples I)',      'MARKUP', 25.80, NULL, NULL, 'psychological', 'venda_produto'),
  ('Produto — ML Classic (Simples I)',      'MARKUP', 33.30, NULL, NULL, 'psychological', 'venda_produto'),
  ('Produto — Shopee (Simples I)',          'MARKUP', 47.10, NULL, NULL, 'psychological', 'venda_produto'),
  ('Produto — Multi-canal Preço Único',     'MARKUP', 47.10, NULL, NULL, 'psychological', 'venda_produto')

) AS v(nome, tecnica, markup_pct, margem_pct, preco_minimo, arredondamento, slug)
JOIN f ON f.slug = v.slug;
