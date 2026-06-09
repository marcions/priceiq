const http = require('http');
const SERVICE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4MDk1NDUwMCwiZXhwIjo0OTM2NjI4MTAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.22M_7BZal129TX_ZHhS5orvrHMwCzyYx_bBy0NZsNnE';
const KONG = 'supabasekong-m13buf3hxxtgq94jhatkirlk.20.51.158.208.sslip.io';

function pgquery(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const req = http.request({
      hostname: KONG, port: 80, path: '/pg/query', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data.slice(0,600) }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run(label, sql) {
  const r = await pgquery(sql);
  const ok = Array.isArray(r.body);
  const err = !ok ? (r.body.error || r.body.message || JSON.stringify(r.body).slice(0,300)) : null;
  console.log(ok ? `OK  ${label} (${r.body.length})` : `ERR ${label}: ${err}`);
  return ok ? r.body : null;
}

async function getId(slug) {
  const r = await pgquery(`SELECT id FROM frentes_negocio WHERE slug = '${slug}'`);
  return r.body[0].id;
}

async function main() {

  // ── 1. FRENTES ───────────────────────────────────────────────
  await run('frentes', `
    INSERT INTO frentes_negocio (nome, slug, descricao, icone, ordem) VALUES
      ('Confeitaria',     'confeitaria',    'Bolos, doces e sobremesas personalizadas. Alta MO de decoração, validade curta = custo de perda alto.', 'Cake',         160),
      ('Velas Artesanais','velas_artesanais','Velas em cera de soja, parafina ou abelha. Insumos aromáticos + recipiente decorativo compõem o CMV.', 'Flame',        170),
      ('Marcenaria',      'marcenaria',     'Móveis e peças em madeira maciça, MDF ou compensado. Alta depreciação + frete de entrega pesado.',       'Hammer',       180)
    ON CONFLICT (slug) DO NOTHING
    RETURNING nome, slug
  `);

  const [id_conf, id_velas, id_marc] = await Promise.all([
    getId('confeitaria'),
    getId('velas_artesanais'),
    getId('marcenaria'),
  ]);
  console.log('IDs:', { confeitaria: id_conf, velas: id_velas, marcenaria: id_marc });

  // ── 2. COST POLICIES ─────────────────────────────────────────
  await run('cost_policies', `
    INSERT INTO cost_policies (nome, metodo, periodo_dias, periodo_qtd_pedidos, incluir_frete, frente_id) VALUES
      -- Confeitaria: matéria-prima com preço sazonal → ponderada curta
      ('Confeitaria — Ponderada 30d',  'WEIGHTED_AVG', 30,   NULL, false, '${id_conf}'),
      ('Confeitaria — Último Preço',   'LAST',         NULL, NULL, false, '${id_conf}'),
      -- Velas: insumos relativamente estáveis
      ('Velas — Ponderada 90d',        'WEIGHTED_AVG', 90,   NULL, false, '${id_velas}'),
      ('Velas — Simples 5 ped.',       'SIMPLE_AVG',   NULL, 5,    false, '${id_velas}'),
      -- Marcenaria: madeira com oscilação → ponderada média
      ('Marcenaria — Ponderada 60d',   'WEIGHTED_AVG', 60,   NULL, true,  '${id_marc}'),
      ('Marcenaria — Último Preço',    'LAST',         NULL, NULL, true,  '${id_marc}')
    RETURNING nome
  `);

  // ── 3. COST COMPONENTS ───────────────────────────────────────
  // ── CONFEITARIA ──────────────────────────────────────────────
  // DNA: ingredientes já são o CMV base. Os % abaixo são overhead sobre esse CMV.
  // Validade curta: perda real se não vender. Entrega = custo operacional crítico.
  // iFood cobra ~27-30% — absurdo; precisa de markup muito alto para cobrir.
  //
  // Markup Divisor por canal:
  //   Encomenda direta : Simples 4% + comissão 4% + lucro 15% = 23% → MD 0.77 → mk +29.9%
  //   Delivery próprio : Simples 4% + gateway 2.5% + delivery 8% + lucro 15% = 29.5% → MD 0.705 → mk +41.8%
  //   iFood            : Simples 4% + iFood 28% + lucro 15% = 47% → MD 0.53 → mk +88.7%
  //   Margem 60%       : bolos de casamento / eventos premium

  await run('cost_components — confeitaria', `
    INSERT INTO cost_components (nome, tipo, valor, base, obrigatorio, ordem, frente_id) VALUES
      ('Conf — Embalagem (caixa+fita)',     'PERCENT',  12,   'ON_COST', true,  10, '${id_conf}'),
      ('Conf — Perdas e Testes',           'PERCENT',  8,    'ON_COST', true,  20, '${id_conf}'),
      ('Conf — MO Preparo/Assamento',      'PERCENT',  25,   'ON_COST', true,  30, '${id_conf}'),
      ('Conf — MO Decoração/Acabamento',   'PERCENT',  30,   'ON_COST', true,  35, '${id_conf}'),
      ('Conf — Depreciação Equip.',        'PERCENT',  5,    'ON_COST', true,  40, '${id_conf}'),
      ('Conf — Energia (forno/geladeira)', 'PERCENT',  6,    'ON_COST', true,  50, '${id_conf}'),
      ('Conf — Simples Nacional Faixa 1',  'PERCENT',  4,    'ON_PRICE', true,  80, '${id_conf}'),
      ('Conf — Simples Nacional Faixa 2',  'PERCENT',  7.3,  'ON_PRICE', false, 81, '${id_conf}'),
      ('Conf — Comissão Vendedor',         'PERCENT',  4,    'ON_PRICE', false, 90, '${id_conf}'),
      ('Conf — Taxa Gateway',              'PERCENT',  2.5,  'ON_PRICE', false,100, '${id_conf}'),
      ('Conf — Delivery Próprio',          'PERCENT',  8,    'ON_PRICE', false,110, '${id_conf}'),
      ('Conf — Taxa iFood',                'PERCENT',  28,   'ON_PRICE', false,120, '${id_conf}'),
      ('Conf — Lucro Pretendido',          'PERCENT',  15,   'ON_PRICE', true, 200, '${id_conf}')
    RETURNING nome
  `);

  // ── VELAS ARTESANAIS ─────────────────────────────────────────
  // DNA: cera + fragrância + recipiente compõem ~60-70% do CMV.
  // MO de moldagem e cura é relativamente baixa vs. produção em série.
  // Etsy/Elo7 são canais principais (produto artesanal/presente).
  //
  // Markup Divisor:
  //   Varejo/Feiras : 4% + 4% + 12% = 20% → MD 0.80 → mk +25.0%
  //   E-commerce    : 4% + 2.5% + 7% + 12% = 25.5% → MD 0.745 → mk +34.2%
  //   ML Classic    : 4% + 13% + 12% = 29% → MD 0.71 → mk +40.8%
  //   Shopee        : 4% + 20% + 12% = 36% → MD 0.64 → mk +56.3%
  //   Etsy/Elo7     : 4% + 6.5% + 7% + 12% = 29.5% → MD 0.705 → mk +41.8%

  await run('cost_components — velas', `
    INSERT INTO cost_components (nome, tipo, valor, base, obrigatorio, ordem, frente_id) VALUES
      ('Vela — Fragrância/Essência',        'PERCENT',  18,   'ON_COST', true,  10, '${id_velas}'),
      ('Vela — Corante',                    'PERCENT',  3,    'ON_COST', false, 12, '${id_velas}'),
      ('Vela — Pavio e Suporte',            'PERCENT',  4,    'ON_COST', true,  14, '${id_velas}'),
      ('Vela — Perdas por Bolhas/Defeitos', 'PERCENT',  5,    'ON_COST', true,  20, '${id_velas}'),
      ('Vela — MO Moldagem e Cura',         'PERCENT',  20,   'ON_COST', true,  30, '${id_velas}'),
      ('Vela — Dep. Equipamentos',          'PERCENT',  4,    'ON_COST', true,  40, '${id_velas}'),
      ('Vela — Energia (derretedeira)',     'PERCENT',  3,    'ON_COST', true,  50, '${id_velas}'),
      ('Vela — Recipiente/Embalagem',       'PERCENT',  15,   'ON_COST', true,  60, '${id_velas}'),
      ('Vela — Simples Nacional Faixa 1',   'PERCENT',  4,    'ON_PRICE', true,  80, '${id_velas}'),
      ('Vela — Simples Nacional Faixa 2',   'PERCENT',  6.5,  'ON_PRICE', false, 81, '${id_velas}'),
      ('Vela — Comissão Vendedor',          'PERCENT',  4,    'ON_PRICE', false, 90, '${id_velas}'),
      ('Vela — Taxa Gateway',               'PERCENT',  2.5,  'ON_PRICE', false,100, '${id_velas}'),
      ('Vela — Frete de Venda',             'PERCENT',  7,    'ON_PRICE', false,110, '${id_velas}'),
      ('Vela — Taxa ML Classic',            'PERCENT',  13,   'ON_PRICE', false,120, '${id_velas}'),
      ('Vela — Taxa Shopee',                'PERCENT',  20,   'ON_PRICE', false,130, '${id_velas}'),
      ('Vela — Taxa Etsy/Elo7',             'PERCENT',  6.5,  'ON_PRICE', false,135, '${id_velas}'),
      ('Vela — Lucro Pretendido',           'PERCENT',  12,   'ON_PRICE', true, 200, '${id_velas}')
    RETURNING nome
  `);

  // ── MARCENARIA ───────────────────────────────────────────────
  // DNA: madeira maciça tem alta variação de preço (câmbio + sazonalidade).
  // Perdas de corte são altas (~15-20% do material). Frete de entrega é custo real alto.
  // Duas sub-modalidades: MDF (mais industrial) e Madeira Maciça (mais artesanal/premium).
  //
  // Markup Divisor:
  //   Sob encomenda/direto : 4% + 4% + 12% = 20% → MD 0.80 → mk +25.0%
  //   E-commerce (frete ++) : 4% + 2.5% + 12% + 12% = 30.5% → MD 0.695 → mk +43.9%
  //   ML Classic            : 4% + 13% + 12% = 29% → MD 0.71 → mk +40.8%
  //   Margem 50%            : peças exclusivas / madeira nobre

  await run('cost_components — marcenaria', `
    INSERT INTO cost_components (nome, tipo, valor, base, obrigatorio, ordem, frente_id) VALUES
      ('Marc — Ferragens (dobradiças/pux.)', 'PERCENT', 8,    'ON_COST', true,  10, '${id_marc}'),
      ('Marc — Cola, Massa e Selador',       'PERCENT', 4,    'ON_COST', true,  12, '${id_marc}'),
      ('Marc — Perdas de Corte',             'PERCENT', 16,   'ON_COST', true,  20, '${id_marc}'),
      ('Marc — MO Corte e Usinagem',         'PERCENT', 20,   'ON_COST', true,  30, '${id_marc}'),
      ('Marc — MO Montagem e Acabamento',    'PERCENT', 18,   'ON_COST', true,  35, '${id_marc}'),
      ('Marc — Lixamento e Limpeza',         'PERCENT', 5,    'ON_COST', true,  38, '${id_marc}'),
      ('Marc — Tinta/Verniz/Stain',          'PERCENT', 8,    'ON_COST', false, 45, '${id_marc}'),
      ('Marc — Dep. Serra/Tupia/Lixadeira',  'PERCENT', 10,   'ON_COST', true,  40, '${id_marc}'),
      ('Marc — Energia (alto consumo)',      'PERCENT', 6,    'ON_COST', true,  50, '${id_marc}'),
      ('Marc — Embalagem e Proteção',        'FIXED',   15,   'ON_COST', false, 70, '${id_marc}'),
      ('Marc — Simples Nacional Faixa 1',    'PERCENT', 4,    'ON_PRICE', true,  80, '${id_marc}'),
      ('Marc — Simples Nacional Faixa 2',    'PERCENT', 6.5,  'ON_PRICE', false, 81, '${id_marc}'),
      ('Marc — Comissão Vendedor',           'PERCENT', 4,    'ON_PRICE', false, 90, '${id_marc}'),
      ('Marc — Taxa Gateway',                'PERCENT', 2.5,  'ON_PRICE', false,100, '${id_marc}'),
      ('Marc — Frete de Entrega (pesado)',   'PERCENT', 12,   'ON_PRICE', false,110, '${id_marc}'),
      ('Marc — Taxa ML Classic',             'PERCENT', 13,   'ON_PRICE', false,120, '${id_marc}'),
      ('Marc — Lucro Pretendido',            'PERCENT', 12,   'ON_PRICE', true, 200, '${id_marc}')
    RETURNING nome
  `);

  // ── 4. PRICING POLICIES ──────────────────────────────────────
  await run('pricing_policies', `
    INSERT INTO pricing_policies (nome, tecnica, markup_pct, margem_pct, preco_minimo, arredondamento, frente_id) VALUES
      -- Confeitaria
      ('Confeitaria — Encomenda Direta',  'MARKUP', 29.9, NULL, NULL, 'psychological', '${id_conf}'),
      ('Confeitaria — Delivery Próprio',  'MARKUP', 41.8, NULL, NULL, 'psychological', '${id_conf}'),
      ('Confeitaria — iFood',             'MARKUP', 88.7, NULL, NULL, 'none',          '${id_conf}'),
      ('Confeitaria — Margem 60% Premium','MARGIN', NULL, 60.0, NULL, 'psychological', '${id_conf}'),
      -- Velas Artesanais
      ('Velas — Varejo/Feiras',           'MARKUP', 25.0, NULL, NULL, 'psychological', '${id_velas}'),
      ('Velas — E-commerce',              'MARKUP', 34.2, NULL, NULL, 'psychological', '${id_velas}'),
      ('Velas — ML Classic',              'MARKUP', 40.8, NULL, NULL, 'psychological', '${id_velas}'),
      ('Velas — Shopee',                  'MARKUP', 56.3, NULL, NULL, 'psychological', '${id_velas}'),
      ('Velas — Etsy/Elo7',              'MARKUP', 41.8, NULL, NULL, 'psychological', '${id_velas}'),
      ('Velas — Margem 55% Kit Premium',  'MARGIN', NULL, 55.0, NULL, 'psychological', '${id_velas}'),
      -- Marcenaria
      ('Marcenaria — Sob Encomenda',      'MARKUP', 25.0, NULL, NULL, 'none',          '${id_marc}'),
      ('Marcenaria — E-commerce',         'MARKUP', 43.9, NULL, NULL, 'none',          '${id_marc}'),
      ('Marcenaria — ML Classic',         'MARKUP', 40.8, NULL, NULL, 'none',          '${id_marc}'),
      ('Marcenaria — Margem 50% Nobre',   'MARGIN', NULL, 50.0, NULL, 'none',          '${id_marc}')
    RETURNING nome
  `);

  // ── TOTAIS FINAIS ─────────────────────────────────────────────
  const tots = await pgquery(`
    SELECT
      (SELECT COUNT(*) FROM frentes_negocio)  AS frentes,
      (SELECT COUNT(*) FROM cost_components)  AS componentes,
      (SELECT COUNT(*) FROM cost_policies)    AS cost_policies,
      (SELECT COUNT(*) FROM pricing_policies) AS pricing_policies
  `);
  console.log('\nTOTAIS FINAIS:', JSON.stringify(tots.body[0]));
}

main().catch(console.error);
