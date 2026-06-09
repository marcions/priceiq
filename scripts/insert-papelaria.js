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
        catch(e) { resolve({ status: res.statusCode, body: data.slice(0, 600) }); }
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
  const err = !ok ? (r.body.error || r.body.message || JSON.stringify(r.body).slice(0, 300)) : null;
  console.log(ok ? `OK  ${label} (${r.body.length} rows)` : `ERR ${label}: ${err}`);
  return ok ? r.body : null;
}

async function main() {

  // ── 1. FRENTE ────────────────────────────────────────────────
  const frente = await run('frente', `
    INSERT INTO frentes_negocio (nome, slug, descricao, icone, ordem)
    VALUES (
      'Papelaria Personalizada',
      'papelaria',
      'Convites, planners, tags, envelopes e cadernos artesanais. DNA: papel especial + MO artesanal + corte/vinco.',
      'BookOpen',
      125
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id, nome, slug
  `);

  if (!frente || frente.length === 0) {
    // Já existe — apenas buscar
    console.log('  → frente já existia, buscando id...');
  }

  const id_row = await pgquery(`SELECT id FROM frentes_negocio WHERE slug = 'papelaria'`);
  const frente_id = id_row.body[0].id;
  console.log('  frente_id:', frente_id);

  // ── 2. COST POLICIES ─────────────────────────────────────────
  await run('cost_policies', `
    INSERT INTO cost_policies (nome, metodo, periodo_dias, periodo_qtd_pedidos, incluir_frete, frente_id)
    VALUES
      ('Papelaria — Ponderada 90d', 'WEIGHTED_AVG', 90,   NULL, false, '${frente_id}'),
      ('Papelaria — Simples 5 ped.','SIMPLE_AVG',   NULL, 5,    false, '${frente_id}'),
      ('Papelaria — Último Preço',  'LAST',          NULL, NULL, false, '${frente_id}')
    RETURNING nome
  `);

  // ── 3. COST COMPONENTS ───────────────────────────────────────
  // ON_COST: o que entra no CMV (% sobre custo do material)
  // ON_PRICE: o que entra no Markup Divisor (% sobre preço de venda)
  //
  // DNA de Papelaria Personalizada:
  //   Papel especial/Cardstock   — insumo principal, custo variável
  //   Consumíveis decorativos    — fita, laço, washi tape, adesivos
  //   Laminação/Acabamento       — laminação fria/quente, hot stamping, relevo
  //   Perdas de corte/vinco      — papel desperdiçado no processo
  //   MO artesanal               — montagem, dobra, colagem, carimbo
  //   Dep. Plotter de Corte      — Silhouette Cameo, Cricut, etc.
  //   Embalagem de presente      — celofane, caixa, tag pendente

  await run('cost_components', `
    INSERT INTO cost_components (nome, tipo, valor, base, obrigatorio, ordem, frente_id) VALUES
      -- ON_COST
      ('Papel — Papel Especial/Cardstock',  'PERCENT',  0,    'ON_COST', true,  10,  '${frente_id}'),
      ('Papel — Consumíveis Decorativos',   'PERCENT',  18,   'ON_COST', true,  15,  '${frente_id}'),
      ('Papel — Perdas de Corte/Vinco',     'PERCENT',  6,    'ON_COST', true,  20,  '${frente_id}'),
      ('Papel — MO Artesanal',              'PERCENT',  35,   'ON_COST', true,  30,  '${frente_id}'),
      ('Papel — Dep. Plotter de Corte',     'PERCENT',  8,    'ON_COST', true,  40,  '${frente_id}'),
      ('Papel — Laminação/Acabamento',      'PERCENT',  10,   'ON_COST', false, 50,  '${frente_id}'),
      ('Papel — Energia',                   'PERCENT',  2,    'ON_COST', true,  55,  '${frente_id}'),
      ('Papel — Embalagem de Presente',     'FIXED',    4.5,  'ON_COST', false, 70,  '${frente_id}'),
      -- ON_PRICE (entra no Markup Divisor)
      ('Papel — Simples Nacional Faixa 1',  'PERCENT',  4,    'ON_PRICE', true,  80,  '${frente_id}'),
      ('Papel — Simples Nacional Faixa 2',  'PERCENT',  6.5,  'ON_PRICE', false, 81,  '${frente_id}'),
      ('Papel — Comissão Vendedor',         'PERCENT',  4,    'ON_PRICE', false, 90,  '${frente_id}'),
      ('Papel — Taxa Gateway/Parcelamento', 'PERCENT',  2.5,  'ON_PRICE', false, 100, '${frente_id}'),
      ('Papel — Frete de Venda',            'PERCENT',  7,    'ON_PRICE', false, 110, '${frente_id}'),
      ('Papel — Taxa ML Classic',           'PERCENT',  13,   'ON_PRICE', false, 120, '${frente_id}'),
      ('Papel — Taxa Shopee',               'PERCENT',  20,   'ON_PRICE', false, 130, '${frente_id}'),
      ('Papel — Taxa Etsy/Elo7',            'PERCENT',  6.5,  'ON_PRICE', false, 135, '${frente_id}'),
      ('Papel — Lucro Pretendido',          'PERCENT',  12,   'ON_PRICE', true,  200, '${frente_id}')
    RETURNING nome
  `);

  // ── 4. PRICING POLICIES ──────────────────────────────────────
  // Markup Divisor = 1 - soma_on_price%
  // Varejo físico : 4(imp) + 4(com) + 12(luc)        = 20%  → MD 0.80  → mk +25.0%
  // E-commerce    : 4 + 2.5 + 7 + 12                 = 25.5% → MD 0.745 → mk +34.2%
  // ML Classic    : 4 + 13 + 12                       = 29%  → MD 0.71  → mk +40.8%
  // Shopee        : 4 + 20 + 12                       = 36%  → MD 0.64  → mk +56.3%
  // Etsy/Elo7     : 4 + 6.5 + 7 + 12                 = 29.5% → MD 0.705 → mk +41.8%
  // Margem 55%    : peças premium (convites casamento, etc.)

  await run('pricing_policies', `
    INSERT INTO pricing_policies (nome, tecnica, markup_pct, margem_pct, preco_minimo, arredondamento, frente_id) VALUES
      ('Papelaria — Varejo Físico',    'MARKUP', 25.0,  NULL,  NULL, 'psychological', '${frente_id}'),
      ('Papelaria — E-commerce',       'MARKUP', 34.2,  NULL,  NULL, 'psychological', '${frente_id}'),
      ('Papelaria — ML Classic',       'MARKUP', 40.8,  NULL,  NULL, 'psychological', '${frente_id}'),
      ('Papelaria — Shopee',           'MARKUP', 56.3,  NULL,  NULL, 'psychological', '${frente_id}'),
      ('Papelaria — Etsy/Elo7',        'MARKUP', 41.8,  NULL,  NULL, 'psychological', '${frente_id}'),
      ('Papelaria — Margem 55% Premium','MARGIN', NULL,  55.0,  NULL, 'psychological', '${frente_id}')
    RETURNING nome
  `);

  // ── TOTAIS FINAIS ─────────────────────────────────────────────
  const tots = await pgquery(`
    SELECT
      (SELECT COUNT(*) FROM frentes_negocio)   AS frentes,
      (SELECT COUNT(*) FROM cost_components)   AS componentes,
      (SELECT COUNT(*) FROM cost_policies)     AS cost_policies,
      (SELECT COUNT(*) FROM pricing_policies)  AS pricing_policies
  `);
  console.log('\nTOTAIS:', JSON.stringify(tots.body[0]));
}

main().catch(console.error);
