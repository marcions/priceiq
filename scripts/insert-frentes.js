const http = require('http');
const SERVICE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4MDk1NDUwMCwiZXhwIjo0OTM2NjI4MTAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.22M_7BZal129TX_ZHhS5orvrHMwCzyYx_bBy0NZsNnE';
const KONG = 'supabasekong-m13buf3hxxtgq94jhatkirlk.20.51.158.208.sslip.io';

function pgquery(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const req = http.request({
      hostname: KONG, port: 80, path: '/pg/query', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY, 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch(e) { resolve({ status: res.statusCode, body: data.slice(0, 600) }); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run(label, sql) {
  const r = await pgquery(sql);
  const ok = Array.isArray(r.body);
  const count = ok ? r.body.length : '—';
  const err = !ok ? (r.body.error || r.body.message || JSON.stringify(r.body).slice(0, 200)) : null;
  console.log(ok ? `OK  ${label} (${count})` : `ERR ${label}: ${err}`);
  return ok ? r.body : null;
}

async function main() {

  // ── 1. FRENTES ─────────────────────────────────────────────
  await run('frentes', `
    INSERT INTO frentes_negocio (nome, slug, descricao, icone, ordem) VALUES
      ('Corte CNC',      'corte_cnc',      'Usinagem CNC em MDF, madeira, acrílico. Alta depreciação de equipamento.', 'Cog', 60),
      ('Corte Laser',    'corte_laser',    'Corte a laser (full cut) em MDF, acrílico, couro, papel.', 'Scissors', 70),
      ('Resina e Epóxi', 'resina_epoxi',   'Peças em resina de poliéster, epóxi ou UV. Alto custo de MO e perdas.', 'Droplet', 80),
      ('Serigrafia',     'serigrafia',     'Impressão serigráfica em tecidos e superfícies. Alta MO de preparação.', 'Layers', 90),
      ('Bordado',        'bordado',        'Bordado computadorizado em vestuário e acessórios.', 'Star', 100),
      ('Transfer Laser', 'transfer_laser', 'Transfer via papel especial com impressora laser/toner.', 'Printer', 110),
      ('Gráfica',        'grafica',        'Impressão gráfica: adesivos, banners, lona, placas.', 'FileImage', 120),
      ('Vestuário',      'vestuario',      'Confecção de peças: corte, costura, aviamentos.', 'Shirt', 130),
      ('Brindes',        'brindes',        'Brindes corporativos com personalização simples.', 'Gift', 140),
      ('Serviços',       'servicos',       'Serviços criativos: arte, design, consultoria. CMV = custo-hora.', 'Briefcase', 150)
    ON CONFLICT (slug) DO NOTHING
    RETURNING nome, slug
  `);

  // ── 2. COST POLICIES ────────────────────────────────────────
  await run('cost_policies', `
    WITH f AS (SELECT id, slug FROM frentes_negocio WHERE slug IN (
      'corte_cnc','corte_laser','resina_epoxi','serigrafia','bordado',
      'transfer_laser','grafica','vestuario','brindes','servicos'))
    INSERT INTO cost_policies (nome, metodo, periodo_dias, periodo_qtd_pedidos, incluir_frete, frente_id)
    SELECT nome, metodo, periodo_dias, periodo_qtd_pedidos, incluir_frete::boolean, f.id
    FROM (VALUES
      ('CNC — Ponderada 60d',        'WEIGHTED_AVG', 60,   NULL, 'true',  'corte_cnc'),
      ('CNC — Último Preço',         'LAST',         NULL, NULL, 'true',  'corte_cnc'),
      ('Laser Corte — Ponderada 90d','WEIGHTED_AVG', 90,   NULL, 'true',  'corte_laser'),
      ('Laser Corte — Último Preço', 'LAST',         NULL, NULL, 'true',  'corte_laser'),
      ('Resina — Ponderada 90d',     'WEIGHTED_AVG', 90,   NULL, 'false', 'resina_epoxi'),
      ('Resina — Simples 5 ped.',    'SIMPLE_AVG',   NULL, 5,    'false', 'resina_epoxi'),
      ('Serigrafia — Ponderada 60d', 'WEIGHTED_AVG', 60,   NULL, 'false', 'serigrafia'),
      ('Serigrafia — Último Preço',  'LAST',         NULL, NULL, 'false', 'serigrafia'),
      ('Bordado — Ponderada 90d',    'WEIGHTED_AVG', 90,   NULL, 'false', 'bordado'),
      ('Bordado — Simples 5 ped.',   'SIMPLE_AVG',   NULL, 5,    'false', 'bordado'),
      ('Transfer — Último Preço',    'LAST',         NULL, NULL, 'false', 'transfer_laser'),
      ('Transfer — Simples 5 ped.',  'SIMPLE_AVG',   NULL, 5,    'false', 'transfer_laser'),
      ('Gráfica — Ponderada 30d',    'WEIGHTED_AVG', 30,   NULL, 'true',  'grafica'),
      ('Gráfica — Último Preço',     'LAST',         NULL, NULL, 'true',  'grafica'),
      ('Vestuário — Ponderada 90d',  'WEIGHTED_AVG', 90,   NULL, 'true',  'vestuario'),
      ('Vestuário — Simples 5 ped.', 'SIMPLE_AVG',   NULL, 5,    'true',  'vestuario'),
      ('Brindes — Último Preço',     'LAST',         NULL, NULL, 'true',  'brindes'),
      ('Brindes — Ponderada 90d',    'WEIGHTED_AVG', 90,   NULL, 'true',  'brindes'),
      ('Serviços — Último Preço',    'LAST',         NULL, NULL, 'false', 'servicos'),
      ('Serviços — Ponderada 60d',   'WEIGHTED_AVG', 60,   NULL, 'false', 'servicos')
    ) AS v(nome, metodo, periodo_dias, periodo_qtd_pedidos, incluir_frete, slug)
    JOIN f ON f.slug = v.slug
    RETURNING nome
  `);

  // ── 3. COST COMPONENTS ──────────────────────────────────────
  // Build rows per frente
  const componentRows = [
    // CORTE CNC
    ['CNC — Frete de Material',       'PERCENT',  4,   'ON_COST',  false, 10,  'corte_cnc'],
    ['CNC — Perdas e Refugos',        'PERCENT',  4,   'ON_COST',  true,  20,  'corte_cnc'],
    ['CNC — Mão de Obra Direta',      'PERCENT',  28,  'ON_COST',  true,  30,  'corte_cnc'],
    ['CNC — Depreciação Máquina',     'PERCENT',  18,  'ON_COST',  true,  40,  'corte_cnc'],
    ['CNC — Energia Elétrica',        'PERCENT',  5,   'ON_COST',  true,  50,  'corte_cnc'],
    ['CNC — Acabamento/Lixamento',    'PERCENT',  8,   'ON_COST',  false, 60,  'corte_cnc'],
    ['CNC — Embalagem',               'FIXED',    4,   'ON_COST',  false, 70,  'corte_cnc'],
    ['CNC — Simples Faixa 1',         'PERCENT',  4,   'ON_PRICE', true,  80,  'corte_cnc'],
    ['CNC — Simples Faixa 2',         'PERCENT',  6.5, 'ON_PRICE', false, 81,  'corte_cnc'],
    ['CNC — Comissão Vendedor',       'PERCENT',  4,   'ON_PRICE', false, 90,  'corte_cnc'],
    ['CNC — Taxa Gateway',            'PERCENT',  2.5, 'ON_PRICE', false, 100, 'corte_cnc'],
    ['CNC — Frete de Venda',          'PERCENT',  7,   'ON_PRICE', false, 110, 'corte_cnc'],
    ['CNC — Taxa ML Classic',         'PERCENT',  13,  'ON_PRICE', false, 120, 'corte_cnc'],
    ['CNC — Lucro Pretendido',        'PERCENT',  10,  'ON_PRICE', true,  200, 'corte_cnc'],
    // CORTE LASER
    ['Laser Corte — Frete Material',  'PERCENT',  3,   'ON_COST',  false, 10,  'corte_laser'],
    ['Laser Corte — Perdas/Refugos',  'PERCENT',  3,   'ON_COST',  true,  20,  'corte_laser'],
    ['Laser Corte — MO Direta',       'PERCENT',  20,  'ON_COST',  true,  30,  'corte_laser'],
    ['Laser Corte — Dep. Laser',      'PERCENT',  13,  'ON_COST',  true,  40,  'corte_laser'],
    ['Laser Corte — Energia',         'PERCENT',  4,   'ON_COST',  true,  50,  'corte_laser'],
    ['Laser Corte — Embalagem',       'FIXED',    3,   'ON_COST',  false, 70,  'corte_laser'],
    ['Laser Corte — Simples Faixa 1', 'PERCENT',  4,   'ON_PRICE', true,  80,  'corte_laser'],
    ['Laser Corte — Simples Faixa 2', 'PERCENT',  6.5, 'ON_PRICE', false, 81,  'corte_laser'],
    ['Laser Corte — Comissão',        'PERCENT',  4,   'ON_PRICE', false, 90,  'corte_laser'],
    ['Laser Corte — Taxa Gateway',    'PERCENT',  2.5, 'ON_PRICE', false, 100, 'corte_laser'],
    ['Laser Corte — Frete Venda',     'PERCENT',  7,   'ON_PRICE', false, 110, 'corte_laser'],
    ['Laser Corte — Taxa ML',         'PERCENT',  13,  'ON_PRICE', false, 120, 'corte_laser'],
    ['Laser Corte — Lucro',           'PERCENT',  10,  'ON_PRICE', true,  200, 'corte_laser'],
    // RESINA/EPÓXI
    ['Resina — Materiais Aux.',       'PERCENT',  15,  'ON_COST',  true,  15,  'resina_epoxi'],
    ['Resina — Perdas por Cura',      'PERCENT',  8,   'ON_COST',  true,  20,  'resina_epoxi'],
    ['Resina — MO Direta',            'PERCENT',  35,  'ON_COST',  true,  30,  'resina_epoxi'],
    ['Resina — Dep. Moldes/UV',       'PERCENT',  10,  'ON_COST',  true,  40,  'resina_epoxi'],
    ['Resina — Polimento/Acabam.',    'PERCENT',  8,   'ON_COST',  true,  60,  'resina_epoxi'],
    ['Resina — Embalagem',            'FIXED',    5,   'ON_COST',  false, 70,  'resina_epoxi'],
    ['Resina — Simples Faixa 1',      'PERCENT',  4,   'ON_PRICE', true,  80,  'resina_epoxi'],
    ['Resina — Simples Faixa 2',      'PERCENT',  6.5, 'ON_PRICE', false, 81,  'resina_epoxi'],
    ['Resina — Comissão Vendedor',    'PERCENT',  4,   'ON_PRICE', false, 90,  'resina_epoxi'],
    ['Resina — Taxa Gateway',         'PERCENT',  2.5, 'ON_PRICE', false, 100, 'resina_epoxi'],
    ['Resina — Frete de Venda',       'PERCENT',  7,   'ON_PRICE', false, 110, 'resina_epoxi'],
    ['Resina — Taxa ML Classic',      'PERCENT',  13,  'ON_PRICE', false, 120, 'resina_epoxi'],
    ['Resina — Lucro Pretendido',     'PERCENT',  10,  'ON_PRICE', true,  200, 'resina_epoxi'],
    // SERIGRAFIA
    ['Serig — Tinta e Emulsão',       'PERCENT',  12,  'ON_COST',  true,  15,  'serigrafia'],
    ['Serig — Perdas e Refugos',      'PERCENT',  4,   'ON_COST',  true,  20,  'serigrafia'],
    ['Serig — MO Prep. Tela',         'PERCENT',  30,  'ON_COST',  true,  30,  'serigrafia'],
    ['Serig — MO Impressão',          'PERCENT',  10,  'ON_COST',  true,  35,  'serigrafia'],
    ['Serig — Dep. Equipamento',      'PERCENT',  8,   'ON_COST',  true,  40,  'serigrafia'],
    ['Serig — Energia/Estufa',        'PERCENT',  3,   'ON_COST',  true,  50,  'serigrafia'],
    ['Serig — Embalagem',             'FIXED',    2,   'ON_COST',  false, 70,  'serigrafia'],
    ['Serig — Simples Faixa 1',       'PERCENT',  4,   'ON_PRICE', true,  80,  'serigrafia'],
    ['Serig — Simples Faixa 2',       'PERCENT',  6.5, 'ON_PRICE', false, 81,  'serigrafia'],
    ['Serig — Comissão Vendedor',     'PERCENT',  4,   'ON_PRICE', false, 90,  'serigrafia'],
    ['Serig — Taxa Gateway',          'PERCENT',  2.5, 'ON_PRICE', false, 100, 'serigrafia'],
    ['Serig — Frete de Venda',        'PERCENT',  7,   'ON_PRICE', false, 110, 'serigrafia'],
    ['Serig — Lucro Pretendido',      'PERCENT',  10,  'ON_PRICE', true,  200, 'serigrafia'],
    // BORDADO
    ['Bordado — Linha e Entretela',   'PERCENT',  10,  'ON_COST',  true,  15,  'bordado'],
    ['Bordado — Perdas',              'PERCENT',  2,   'ON_COST',  true,  20,  'bordado'],
    ['Bordado — MO Digitalização',    'PERCENT',  15,  'ON_COST',  true,  25,  'bordado'],
    ['Bordado — MO Operação',         'PERCENT',  25,  'ON_COST',  true,  30,  'bordado'],
    ['Bordado — Dep. Bordadeira',     'PERCENT',  15,  'ON_COST',  true,  40,  'bordado'],
    ['Bordado — Energia',             'PERCENT',  3,   'ON_COST',  true,  50,  'bordado'],
    ['Bordado — Embalagem',           'FIXED',    2,   'ON_COST',  false, 70,  'bordado'],
    ['Bordado — Simples Faixa 1',     'PERCENT',  4,   'ON_PRICE', true,  80,  'bordado'],
    ['Bordado — Simples Faixa 2',     'PERCENT',  6.5, 'ON_PRICE', false, 81,  'bordado'],
    ['Bordado — Comissão Vendedor',   'PERCENT',  4,   'ON_PRICE', false, 90,  'bordado'],
    ['Bordado — Taxa Gateway',        'PERCENT',  2.5, 'ON_PRICE', false, 100, 'bordado'],
    ['Bordado — Frete de Venda',      'PERCENT',  7,   'ON_PRICE', false, 110, 'bordado'],
    ['Bordado — Taxa ML Classic',     'PERCENT',  13,  'ON_PRICE', false, 120, 'bordado'],
    ['Bordado — Lucro Pretendido',    'PERCENT',  10,  'ON_PRICE', true,  200, 'bordado'],
    // TRANSFER LASER
    ['Transfer — Papel e Toner',      'PERCENT',  12,  'ON_COST',  true,  15,  'transfer_laser'],
    ['Transfer — Perdas Impressão',   'PERCENT',  5,   'ON_COST',  true,  20,  'transfer_laser'],
    ['Transfer — MO Direta',          'PERCENT',  15,  'ON_COST',  true,  30,  'transfer_laser'],
    ['Transfer — Dep. Impressora',    'PERCENT',  8,   'ON_COST',  true,  40,  'transfer_laser'],
    ['Transfer — Dep. Prensa',        'PERCENT',  4,   'ON_COST',  true,  45,  'transfer_laser'],
    ['Transfer — Energia',            'PERCENT',  3,   'ON_COST',  true,  50,  'transfer_laser'],
    ['Transfer — Embalagem',          'FIXED',    2.5, 'ON_COST',  false, 70,  'transfer_laser'],
    ['Transfer — Simples Faixa 1',    'PERCENT',  4,   'ON_PRICE', true,  80,  'transfer_laser'],
    ['Transfer — Simples Faixa 2',    'PERCENT',  6.5, 'ON_PRICE', false, 81,  'transfer_laser'],
    ['Transfer — Comissão',           'PERCENT',  4,   'ON_PRICE', false, 90,  'transfer_laser'],
    ['Transfer — Taxa Gateway',       'PERCENT',  2.5, 'ON_PRICE', false, 100, 'transfer_laser'],
    ['Transfer — Frete de Venda',     'PERCENT',  7,   'ON_PRICE', false, 110, 'transfer_laser'],
    ['Transfer — Taxa ML Classic',    'PERCENT',  13,  'ON_PRICE', false, 120, 'transfer_laser'],
    ['Transfer — Lucro Pretendido',   'PERCENT',  10,  'ON_PRICE', true,  200, 'transfer_laser'],
    // GRÁFICA
    ['Gráfica — Mídia (vinil/lona)',  'PERCENT',  5,   'ON_COST',  false, 10,  'grafica'],
    ['Gráfica — Tinta e Toner',       'PERCENT',  10,  'ON_COST',  true,  15,  'grafica'],
    ['Gráfica — Perdas Impressão',    'PERCENT',  3,   'ON_COST',  true,  20,  'grafica'],
    ['Gráfica — MO Direta',           'PERCENT',  20,  'ON_COST',  true,  30,  'grafica'],
    ['Gráfica — Dep. Impressora GF',  'PERCENT',  12,  'ON_COST',  true,  40,  'grafica'],
    ['Gráfica — Energia',             'PERCENT',  4,   'ON_COST',  true,  50,  'grafica'],
    ['Gráfica — Acabamento/Laminação','PERCENT',  8,   'ON_COST',  false, 55,  'grafica'],
    ['Gráfica — Embalagem/Tubo',      'FIXED',    3,   'ON_COST',  false, 70,  'grafica'],
    ['Gráfica — Simples Faixa 1',     'PERCENT',  4,   'ON_PRICE', true,  80,  'grafica'],
    ['Gráfica — Simples Faixa 2',     'PERCENT',  6.5, 'ON_PRICE', false, 81,  'grafica'],
    ['Gráfica — Comissão Vendedor',   'PERCENT',  4,   'ON_PRICE', false, 90,  'grafica'],
    ['Gráfica — Taxa Gateway',        'PERCENT',  2.5, 'ON_PRICE', false, 100, 'grafica'],
    ['Gráfica — Entrega/Frete',       'PERCENT',  6,   'ON_PRICE', false, 110, 'grafica'],
    ['Gráfica — Lucro Pretendido',    'PERCENT',  10,  'ON_PRICE', true,  200, 'grafica'],
    // VESTUÁRIO
    ['Vest — Frete de Tecido',        'PERCENT',  4,   'ON_COST',  false, 10,  'vestuario'],
    ['Vest — Aviamentos',             'PERCENT',  12,  'ON_COST',  true,  15,  'vestuario'],
    ['Vest — Perdas de Corte',        'PERCENT',  5,   'ON_COST',  true,  20,  'vestuario'],
    ['Vest — MO Corte',               'PERCENT',  15,  'ON_COST',  true,  30,  'vestuario'],
    ['Vest — MO Costura',             'PERCENT',  30,  'ON_COST',  true,  35,  'vestuario'],
    ['Vest — Dep. Máq. Costura',      'PERCENT',  8,   'ON_COST',  true,  40,  'vestuario'],
    ['Vest — Energia/Passadoria',     'PERCENT',  3,   'ON_COST',  true,  50,  'vestuario'],
    ['Vest — Etiqueta e Embalagem',   'FIXED',    3,   'ON_COST',  false, 70,  'vestuario'],
    ['Vest — Simples Faixa 1',        'PERCENT',  4,   'ON_PRICE', true,  80,  'vestuario'],
    ['Vest — Simples Faixa 2',        'PERCENT',  6.5, 'ON_PRICE', false, 81,  'vestuario'],
    ['Vest — Comissão Vendedor',      'PERCENT',  4,   'ON_PRICE', false, 90,  'vestuario'],
    ['Vest — Taxa Gateway',           'PERCENT',  2.5, 'ON_PRICE', false, 100, 'vestuario'],
    ['Vest — Frete de Venda',         'PERCENT',  7,   'ON_PRICE', false, 110, 'vestuario'],
    ['Vest — Taxa ML Classic',        'PERCENT',  13,  'ON_PRICE', false, 120, 'vestuario'],
    ['Vest — Taxa Shopee',            'PERCENT',  20,  'ON_PRICE', false, 130, 'vestuario'],
    ['Vest — Lucro Pretendido',       'PERCENT',  10,  'ON_PRICE', true,  200, 'vestuario'],
    // BRINDES
    ['Brinde — Frete de Entrada',     'PERCENT',  4,   'ON_COST',  true,  10,  'brindes'],
    ['Brinde — Perdas e Avarias',     'PERCENT',  1.5, 'ON_COST',  true,  20,  'brindes'],
    ['Brinde — MO Personalização',    'PERCENT',  10,  'ON_COST',  false, 30,  'brindes'],
    ['Brinde — Insumo Personaliz.',   'PERCENT',  5,   'ON_COST',  false, 35,  'brindes'],
    ['Brinde — Overhead Armazenagem', 'PERCENT',  5,   'ON_COST',  true,  40,  'brindes'],
    ['Brinde — Embalagem Presente',   'FIXED',    3,   'ON_COST',  false, 70,  'brindes'],
    ['Brinde — Simples Faixa 1',      'PERCENT',  4,   'ON_PRICE', true,  80,  'brindes'],
    ['Brinde — Simples Faixa 2',      'PERCENT',  6.5, 'ON_PRICE', false, 81,  'brindes'],
    ['Brinde — Comissão Vendedor',    'PERCENT',  3,   'ON_PRICE', false, 90,  'brindes'],
    ['Brinde — Taxa Gateway',         'PERCENT',  2.5, 'ON_PRICE', false, 100, 'brindes'],
    ['Brinde — Frete de Venda',       'PERCENT',  6,   'ON_PRICE', false, 110, 'brindes'],
    ['Brinde — Taxa ML Classic',      'PERCENT',  13,  'ON_PRICE', false, 120, 'brindes'],
    ['Brinde — Taxa Shopee',          'PERCENT',  20,  'ON_PRICE', false, 130, 'brindes'],
    ['Brinde — Lucro Pretendido',     'PERCENT',  8,   'ON_PRICE', true,  200, 'brindes'],
    // SERVIÇOS (CMV = custo-hora × horas estimadas)
    ['Serv — Overhead Operacional',   'PERCENT',  20,  'ON_COST',  true,  20,  'servicos'],
    ['Serv — Ferramentas/Licenças',   'PERCENT',  8,   'ON_COST',  true,  30,  'servicos'],
    ['Serv — Revisões/Retrabalho',    'PERCENT',  10,  'ON_COST',  true,  40,  'servicos'],
    ['Serv — Simples Faixa 1 (ISS)', 'PERCENT',  6,   'ON_PRICE', true,  80,  'servicos'],
    ['Serv — Simples Faixa 2 (ISS)', 'PERCENT',  9,   'ON_PRICE', false, 81,  'servicos'],
    ['Serv — Gateway/Adm Financeira', 'PERCENT',  2,   'ON_PRICE', true,  100, 'servicos'],
    ['Serv — Lucro Pretendido',       'PERCENT',  15,  'ON_PRICE', true,  200, 'servicos'],
  ];

  const slugs = [...new Set(componentRows.map(r => r[6]))];
  const frentes = await pgquery(`SELECT id, slug FROM frentes_negocio WHERE slug IN (${slugs.map(s => `'${s}'`).join(',')})`);
  const frMap = {};
  frentes.body.forEach(f => frMap[f.slug] = f.id);

  const vals = componentRows.map(r => {
    const [nome, tipo, valor, base, obrigatorio, ordem, slug] = r;
    return `('${nome.replace(/'/g,"''")}','${tipo}',${valor},'${base}',${obrigatorio},${ordem},'${frMap[slug]}')`;
  }).join(',\n    ');

  await run('cost_components', `
    INSERT INTO cost_components (nome, tipo, valor, base, obrigatorio, ordem, frente_id)
    VALUES ${vals}
    RETURNING nome
  `);

  // ── 4. PRICING POLICIES ─────────────────────────────────────
  // Markup Divisor por frente × canal
  // Produção própria: overhead já está no ON_COST, portanto MD cobre só ON_PRICE (impostos + comercialização + lucro)
  // Varejo:   4(imp) + 4(com) + 10(luc) = 18%  → MD=0.82 → mk=22.0%
  // Ecom:     4 + 2.5 + 7 + 10 = 23.5%          → MD=0.765 → mk=30.7%
  // ML:       4 + 13 + 10 = 27%                  → MD=0.73 → mk=36.9%
  // Shopee:   4 + 20 + 10 = 34%                  → MD=0.66 → mk=51.5%
  // Brindes varejo: 4 + 3 + 8 = 15% → MD=0.85 → mk=17.6%
  // Brindes ecom:   4 + 2.5 + 6 + 8 = 20.5% → MD=0.795 → mk=25.8%
  // Brindes ML:     4 + 13 + 8 = 25% → MD=0.75 → mk=33.3%
  // Serviços varejo: 6(iss) + 2 + 15(luc) = 23% → MD=0.77 → mk=29.9%
  // Serviços ecom:   6 + 2 + 2(gw) + 15 = 25% → MD=0.75 → mk=33.3%

  const ppRows = [
    // Corte CNC
    ['CNC — Varejo Físico',        'MARKUP', 22.0,  null, 'psychological', 'corte_cnc'],
    ['CNC — E-commerce',           'MARKUP', 30.7,  null, 'psychological', 'corte_cnc'],
    ['CNC — ML Classic',           'MARKUP', 36.9,  null, 'psychological', 'corte_cnc'],
    ['CNC — Margem 45%',           'MARGIN', null,  45.0, 'psychological', 'corte_cnc'],
    // Corte Laser
    ['Laser Corte — Varejo',       'MARKUP', 22.0,  null, 'psychological', 'corte_laser'],
    ['Laser Corte — E-commerce',   'MARKUP', 30.7,  null, 'psychological', 'corte_laser'],
    ['Laser Corte — ML Classic',   'MARKUP', 36.9,  null, 'psychological', 'corte_laser'],
    // Resina/Epóxi
    ['Resina — Varejo Físico',     'MARKUP', 22.0,  null, 'psychological', 'resina_epoxi'],
    ['Resina — E-commerce',        'MARKUP', 30.7,  null, 'psychological', 'resina_epoxi'],
    ['Resina — ML Classic',        'MARKUP', 36.9,  null, 'psychological', 'resina_epoxi'],
    ['Resina — Margem 50% Premium','MARGIN', null,  50.0, 'psychological', 'resina_epoxi'],
    // Serigrafia
    ['Serigrafia — Varejo',        'MARKUP', 22.0,  null, 'psychological', 'serigrafia'],
    ['Serigrafia — E-commerce',    'MARKUP', 30.7,  null, 'psychological', 'serigrafia'],
    ['Serigrafia — ML Classic',    'MARKUP', 36.9,  null, 'psychological', 'serigrafia'],
    // Bordado
    ['Bordado — Varejo Físico',    'MARKUP', 22.0,  null, 'psychological', 'bordado'],
    ['Bordado — E-commerce',       'MARKUP', 30.7,  null, 'psychological', 'bordado'],
    ['Bordado — ML Classic',       'MARKUP', 36.9,  null, 'psychological', 'bordado'],
    ['Bordado — Shopee',           'MARKUP', 51.5,  null, 'psychological', 'bordado'],
    // Transfer Laser
    ['Transfer — Varejo Físico',   'MARKUP', 22.0,  null, 'psychological', 'transfer_laser'],
    ['Transfer — E-commerce',      'MARKUP', 30.7,  null, 'psychological', 'transfer_laser'],
    ['Transfer — ML Classic',      'MARKUP', 36.9,  null, 'psychological', 'transfer_laser'],
    ['Transfer — Shopee',          'MARKUP', 51.5,  null, 'psychological', 'transfer_laser'],
    // Gráfica
    ['Gráfica — Varejo/Balcão',    'MARKUP', 22.0,  null, 'none',          'grafica'],
    ['Gráfica — E-commerce',       'MARKUP', 30.7,  null, 'none',          'grafica'],
    ['Gráfica — Pedido Corporativo','MARKUP', 22.0, null, 'none',          'grafica'],
    // Vestuário
    ['Vestuário — Varejo Físico',  'MARKUP', 22.0,  null, 'psychological', 'vestuario'],
    ['Vestuário — E-commerce',     'MARKUP', 30.7,  null, 'psychological', 'vestuario'],
    ['Vestuário — ML Classic',     'MARKUP', 36.9,  null, 'psychological', 'vestuario'],
    ['Vestuário — Shopee',         'MARKUP', 51.5,  null, 'psychological', 'vestuario'],
    ['Vestuário — Margem 50%',     'MARGIN', null,  50.0, 'psychological', 'vestuario'],
    // Brindes (CMV alto, overhead baixo, lucro 8%)
    ['Brindes — Varejo/Pedido',    'MARKUP', 17.6,  null, 'psychological', 'brindes'],
    ['Brindes — E-commerce',       'MARKUP', 25.8,  null, 'psychological', 'brindes'],
    ['Brindes — ML Classic',       'MARKUP', 33.3,  null, 'psychological', 'brindes'],
    ['Brindes — Shopee',           'MARKUP', 47.1,  null, 'psychological', 'brindes'],
    ['Brindes — Multi-canal',      'MARKUP', 47.1,  null, 'psychological', 'brindes'],
    // Serviços (ISS 6%, sem comissão, lucro 15%)
    ['Serviços — Presencial',      'MARKUP', 29.9,  null, 'none',          'servicos'],
    ['Serviços — Digital/Remoto',  'MARKUP', 33.3,  null, 'none',          'servicos'],
    ['Serviços — Margem 60%',      'MARGIN', null,  60.0, 'none',          'servicos'],
  ];

  const ppVals = ppRows.map(r => {
    const [nome, tecnica, markup_pct, margem_pct, arredondamento, slug] = r;
    return `('${nome.replace(/'/g,"''")}','${tecnica}',${markup_pct !== null ? markup_pct : 'NULL'},${margem_pct !== null ? margem_pct : 'NULL'},NULL,'${arredondamento}','${frMap[slug]}')`;
  }).join(',\n    ');

  await run('pricing_policies', `
    INSERT INTO pricing_policies (nome, tecnica, markup_pct, margem_pct, preco_minimo, arredondamento, frente_id)
    VALUES ${ppVals}
    RETURNING nome
  `);

  // ── TOTAIS FINAIS ────────────────────────────────────────────
  const tots = await pgquery(`
    SELECT
      (SELECT COUNT(*) FROM frentes_negocio)   AS frentes,
      (SELECT COUNT(*) FROM cost_components)   AS componentes,
      (SELECT COUNT(*) FROM cost_policies)     AS cost_policies,
      (SELECT COUNT(*) FROM pricing_policies)  AS pricing_policies
  `);
  console.log('\nTOTAIS FINAIS:', JSON.stringify(tots.body[0]));
}

main().catch(console.error);
