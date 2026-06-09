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
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch(e) { resolve({ status: res.statusCode, body: data.slice(0,600) }); } });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}
async function run(label, sql) {
  const r = await pgquery(sql);
  const ok = Array.isArray(r.body);
  console.log(ok ? `OK  ${label} (${r.body.length})` : `ERR ${label}: ${r.body.error || r.body.message || JSON.stringify(r.body).slice(0,200)}`);
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
      ('Sabonetes Artesanais', 'sabonetes',   'Sabonetes cold/hot process, glicerina e líquidos. Tempo de cura = capital parado. Insumos saponificáveis compõem ~50% do CMV.', 'Droplets',   190),
      ('Bijuterias e Joias',   'bijuterias',  'Peças em metal, fio, cristal e pedras naturais. MO artesanal alta. Ticket médio elevado, frete leve.', 'Gem',        200),
      ('Cerâmica e Argila',    'ceramica',    'Modelagem manual ou torno, biscoito + vidragem + queima. Perdas por trincas são custo real de processo.',  'Circle',     210),
      ('Fotografia',           'fotografia',  'Sessões de fotos (família, produto, evento, moda). CMV = custo-hora + depreciação equipamento. Entrega digital.',  'Camera',     220),
      ('Cursos e Treinamentos','cursos',      'Infoprodutos e aulas presenciais. CMV = criação do conteúdo. Escalável — sem perdas físicas. Plataformas cobram alto.',  'GraduationCap', 230),
      ('Eventos e Decoração',  'eventos',     'Decoração de festas, casamentos, corporativos. MO de montagem/desmontagem + material consumível + deslocamento.', 'PartyPopper', 240)
    ON CONFLICT (slug) DO NOTHING
    RETURNING nome, slug
  `);

  const slugs = ['sabonetes','bijuterias','ceramica','fotografia','cursos','eventos'];
  const ids = {};
  for (const s of slugs) ids[s] = await getId(s);
  console.log('IDs:', ids);

  // ── 2. COST POLICIES ─────────────────────────────────────────
  await run('cost_policies', `
    INSERT INTO cost_policies (nome, metodo, periodo_dias, periodo_qtd_pedidos, incluir_frete, frente_id) VALUES
      ('Sabonetes — Ponderada 90d',    'WEIGHTED_AVG', 90,   NULL, false, '${ids.sabonetes}'),
      ('Sabonetes — Simples 5 ped.',   'SIMPLE_AVG',   NULL, 5,    false, '${ids.sabonetes}'),
      ('Bijuterias — Ponderada 90d',   'WEIGHTED_AVG', 90,   NULL, false, '${ids.bijuterias}'),
      ('Bijuterias — Último Preço',    'LAST',         NULL, NULL, false, '${ids.bijuterias}'),
      ('Cerâmica — Ponderada 60d',     'WEIGHTED_AVG', 60,   NULL, false, '${ids.ceramica}'),
      ('Cerâmica — Simples 5 ped.',    'SIMPLE_AVG',   NULL, 5,    false, '${ids.ceramica}'),
      ('Fotografia — Último Preço',    'LAST',         NULL, NULL, false, '${ids.fotografia}'),
      ('Fotografia — Ponderada 90d',   'WEIGHTED_AVG', 90,   NULL, false, '${ids.fotografia}'),
      ('Cursos — Último Preço',        'LAST',         NULL, NULL, false, '${ids.cursos}'),
      ('Eventos — Último Preço',       'LAST',         NULL, NULL, false, '${ids.eventos}'),
      ('Eventos — Ponderada 60d',      'WEIGHTED_AVG', 60,   NULL, false, '${ids.eventos}')
    RETURNING nome
  `);

  // ── 3. COST COMPONENTS ───────────────────────────────────────

  // SABONETES
  // Markup Divisor:
  //   Varejo/Feiras : 4+4+12 = 20%  → MD 0.80 → mk +25.0%
  //   E-commerce    : 4+2.5+7+12 = 25.5% → MD 0.745 → mk +34.2%
  //   ML Classic    : 4+13+12 = 29% → MD 0.71 → mk +40.8%
  //   Shopee        : 4+20+12 = 36% → MD 0.64 → mk +56.3%
  //   Etsy/Elo7     : 4+6.5+7+12 = 29.5% → MD 0.705 → mk +41.8%
  await run('components — sabonetes', `
    INSERT INTO cost_components (nome, tipo, valor, base, obrigatorio, ordem, frente_id) VALUES
      ('Sab — Fragrância/Óleo Essencial',   'PERCENT',  15,   'ON_COST', true,  10, '${ids.sabonetes}'),
      ('Sab — Corante, Argila e Aditivos',  'PERCENT',  6,    'ON_COST', false, 12, '${ids.sabonetes}'),
      ('Sab — Perdas de Processo',          'PERCENT',  5,    'ON_COST', true,  20, '${ids.sabonetes}'),
      ('Sab — MO Preparo e Moldagem',       'PERCENT',  22,   'ON_COST', true,  30, '${ids.sabonetes}'),
      ('Sab — Custo de Cura (capital)',     'PERCENT',  4,    'ON_COST', true,  35, '${ids.sabonetes}'),
      ('Sab — Dep. Moldes e Equipamentos',  'PERCENT',  5,    'ON_COST', true,  40, '${ids.sabonetes}'),
      ('Sab — Energia',                     'PERCENT',  3,    'ON_COST', true,  50, '${ids.sabonetes}'),
      ('Sab — Embalagem e Rótulo',          'PERCENT',  12,   'ON_COST', true,  60, '${ids.sabonetes}'),
      ('Sab — Simples Nacional Faixa 1',    'PERCENT',  4,    'ON_PRICE', true,  80, '${ids.sabonetes}'),
      ('Sab — Simples Nacional Faixa 2',    'PERCENT',  6.5,  'ON_PRICE', false, 81, '${ids.sabonetes}'),
      ('Sab — Comissão Vendedor',           'PERCENT',  4,    'ON_PRICE', false, 90, '${ids.sabonetes}'),
      ('Sab — Taxa Gateway',                'PERCENT',  2.5,  'ON_PRICE', false,100, '${ids.sabonetes}'),
      ('Sab — Frete de Venda',              'PERCENT',  7,    'ON_PRICE', false,110, '${ids.sabonetes}'),
      ('Sab — Taxa ML Classic',             'PERCENT',  13,   'ON_PRICE', false,120, '${ids.sabonetes}'),
      ('Sab — Taxa Shopee',                 'PERCENT',  20,   'ON_PRICE', false,130, '${ids.sabonetes}'),
      ('Sab — Taxa Etsy/Elo7',              'PERCENT',  6.5,  'ON_PRICE', false,135, '${ids.sabonetes}'),
      ('Sab — Lucro Pretendido',            'PERCENT',  12,   'ON_PRICE', true, 200, '${ids.sabonetes}')
    RETURNING nome
  `);

  // BIJUTERIAS
  // Frete leve (caixa pequena) → 5%. Lucro maior (15%) porque é produto de valor percebido alto.
  // Markup Divisor:
  //   Varejo/Feiras : 4+4+15 = 23%  → MD 0.77 → mk +29.9%
  //   E-commerce    : 4+2.5+5+15 = 26.5% → MD 0.735 → mk +36.1%
  //   ML Classic    : 4+13+15 = 32% → MD 0.68 → mk +47.1%
  //   Shopee        : 4+20+15 = 39% → MD 0.61 → mk +63.9%
  //   Etsy/Elo7     : 4+6.5+5+15 = 30.5% → MD 0.695 → mk +43.9%
  await run('components — bijuterias', `
    INSERT INTO cost_components (nome, tipo, valor, base, obrigatorio, ordem, frente_id) VALUES
      ('Bij — Metais, Arames e Fios',       'PERCENT',  0,    'ON_COST', true,  10, '${ids.bijuterias}'),
      ('Bij — Pedras, Cristais e Missangas','PERCENT',  0,    'ON_COST', true,  12, '${ids.bijuterias}'),
      ('Bij — Ferragens (fechos, argolas)', 'PERCENT',  8,    'ON_COST', true,  14, '${ids.bijuterias}'),
      ('Bij — Banho/Galvanoplastia',        'PERCENT',  6,    'ON_COST', false, 16, '${ids.bijuterias}'),
      ('Bij — Perdas (pedras quebradas)',   'PERCENT',  4,    'ON_COST', true,  20, '${ids.bijuterias}'),
      ('Bij — MO Artesanal',               'PERCENT',  35,   'ON_COST', true,  30, '${ids.bijuterias}'),
      ('Bij — Dep. Ferramentas/Alicates',  'PERCENT',  4,    'ON_COST', true,  40, '${ids.bijuterias}'),
      ('Bij — Embalagem Premium',          'FIXED',    3.5,  'ON_COST', true,  70, '${ids.bijuterias}'),
      ('Bij — Simples Nacional Faixa 1',   'PERCENT',  4,    'ON_PRICE', true,  80, '${ids.bijuterias}'),
      ('Bij — Simples Nacional Faixa 2',   'PERCENT',  6.5,  'ON_PRICE', false, 81, '${ids.bijuterias}'),
      ('Bij — Comissão Vendedor',          'PERCENT',  4,    'ON_PRICE', false, 90, '${ids.bijuterias}'),
      ('Bij — Taxa Gateway',               'PERCENT',  2.5,  'ON_PRICE', false,100, '${ids.bijuterias}'),
      ('Bij — Frete de Venda (leve)',      'PERCENT',  5,    'ON_PRICE', false,110, '${ids.bijuterias}'),
      ('Bij — Taxa ML Classic',            'PERCENT',  13,   'ON_PRICE', false,120, '${ids.bijuterias}'),
      ('Bij — Taxa Shopee',                'PERCENT',  20,   'ON_PRICE', false,130, '${ids.bijuterias}'),
      ('Bij — Taxa Etsy/Elo7',             'PERCENT',  6.5,  'ON_PRICE', false,135, '${ids.bijuterias}'),
      ('Bij — Lucro Pretendido',           'PERCENT',  15,   'ON_PRICE', true, 200, '${ids.bijuterias}')
    RETURNING nome
  `);

  // CERÂMICA
  // Perdas por trincas/quebras na queima: 12-18% do lote. Frete frágil (caro + seguro).
  // Markup Divisor:
  //   Varejo/Feiras : 4+4+12 = 20%  → MD 0.80 → mk +25.0%
  //   E-commerce    : 4+2.5+8+12 = 26.5% → MD 0.735 → mk +36.1%
  //   ML Classic    : 4+13+12 = 29% → MD 0.71 → mk +40.8%
  //   Margem 55%    : peças assinadas / decoração premium
  await run('components — ceramica', `
    INSERT INTO cost_components (nome, tipo, valor, base, obrigatorio, ordem, frente_id) VALUES
      ('Cer — Esmalte e Óxidos',            'PERCENT',  10,   'ON_COST', true,  10, '${ids.ceramica}'),
      ('Cer — Pigmentos e Engobes',         'PERCENT',  5,    'ON_COST', false, 12, '${ids.ceramica}'),
      ('Cer — Perdas por Trincas (queima)', 'PERCENT',  15,   'ON_COST', true,  20, '${ids.ceramica}'),
      ('Cer — MO Modelagem/Torno',         'PERCENT',  30,   'ON_COST', true,  30, '${ids.ceramica}'),
      ('Cer — MO Pintura/Vidragem',        'PERCENT',  12,   'ON_COST', true,  35, '${ids.ceramica}'),
      ('Cer — Custo de Queima (forno)',     'PERCENT',  10,   'ON_COST', true,  40, '${ids.ceramica}'),
      ('Cer — Dep. Forno e Torno',         'PERCENT',  8,    'ON_COST', true,  45, '${ids.ceramica}'),
      ('Cer — Embalagem p/ Frágil',        'FIXED',    6,    'ON_COST', true,  70, '${ids.ceramica}'),
      ('Cer — Simples Nacional Faixa 1',   'PERCENT',  4,    'ON_PRICE', true,  80, '${ids.ceramica}'),
      ('Cer — Simples Nacional Faixa 2',   'PERCENT',  6.5,  'ON_PRICE', false, 81, '${ids.ceramica}'),
      ('Cer — Comissão Vendedor',          'PERCENT',  4,    'ON_PRICE', false, 90, '${ids.ceramica}'),
      ('Cer — Taxa Gateway',               'PERCENT',  2.5,  'ON_PRICE', false,100, '${ids.ceramica}'),
      ('Cer — Frete Frágil (seguro)',      'PERCENT',  8,    'ON_PRICE', false,110, '${ids.ceramica}'),
      ('Cer — Taxa ML Classic',            'PERCENT',  13,   'ON_PRICE', false,120, '${ids.ceramica}'),
      ('Cer — Lucro Pretendido',           'PERCENT',  12,   'ON_PRICE', true, 200, '${ids.ceramica}')
    RETURNING nome
  `);

  // FOTOGRAFIA
  // CMV = custo-hora do fotógrafo + depreciação equipamento. Simples Anexo III (serviços).
  // Sem frete físico — entrega via link/pen drive.
  // Markup Divisor:
  //   Sessão presencial : 6+2+15 = 23% → MD 0.77 → mk +29.9%
  //   Digital/online    : 6+2+15 = 23% → MD 0.77 → mk +29.9%
  //   Margem 60%        : casamento / ensaio premium / cobertura de evento
  await run('components — fotografia', `
    INSERT INTO cost_components (nome, tipo, valor, base, obrigatorio, ordem, frente_id) VALUES
      ('Foto — Dep. Câmera e Lentes',      'PERCENT',  12,   'ON_COST', true,  10, '${ids.fotografia}'),
      ('Foto — Dep. Iluminação e Flash',   'PERCENT',  5,    'ON_COST', false, 12, '${ids.fotografia}'),
      ('Foto — MO Edição/Pós-Produção',    'PERCENT',  30,   'ON_COST', true,  20, '${ids.fotografia}'),
      ('Foto — Software (Lightroom/PS)',   'PERCENT',  5,    'ON_COST', true,  25, '${ids.fotografia}'),
      ('Foto — Armazenamento e Backup',    'PERCENT',  3,    'ON_COST', true,  30, '${ids.fotografia}'),
      ('Foto — Deslocamento/Combustível',  'PERCENT',  8,    'ON_COST', false, 35, '${ids.fotografia}'),
      ('Foto — Entrega (pen drive/link)',  'FIXED',    5,    'ON_COST', false, 70, '${ids.fotografia}'),
      ('Foto — Simples Faixa 1 (ISS)',     'PERCENT',  6,    'ON_PRICE', true,  80, '${ids.fotografia}'),
      ('Foto — Simples Faixa 2 (ISS)',     'PERCENT',  9,    'ON_PRICE', false, 81, '${ids.fotografia}'),
      ('Foto — Gateway/Adm Financeira',    'PERCENT',  2,    'ON_PRICE', true, 100, '${ids.fotografia}'),
      ('Foto — Lucro Pretendido',          'PERCENT',  15,   'ON_PRICE', true, 200, '${ids.fotografia}')
    RETURNING nome
  `);

  // CURSOS E TREINAMENTOS
  // CMV = tempo de criação do conteúdo + plataforma. Produto escalável — sem custo marginal.
  // Plataformas EAD cobram caro: Hotmart/Kiwify ~5.99%, Eduzz ~4.99%.
  // Markup Divisor:
  //   Hotmart/Kiwify : 6+5.99+30 = 41.99% → MD 0.58 → mk +72.4%
  //   Venda direta   : 6+2+30 = 38% → MD 0.62 → mk +61.3%
  //   Margem 70%     : cursos premium / mentoria
  await run('components — cursos', `
    INSERT INTO cost_components (nome, tipo, valor, base, obrigatorio, ordem, frente_id) VALUES
      ('Cur — Plataforma EAD (hosting)',   'PERCENT',  8,    'ON_COST', true,  10, '${ids.cursos}'),
      ('Cur — Gravação e Edição de Vídeo', 'PERCENT',  20,   'ON_COST', true,  20, '${ids.cursos}'),
      ('Cur — Material Didático/PDF',      'PERCENT',  5,    'ON_COST', false, 25, '${ids.cursos}'),
      ('Cur — Dep. Câmera e Microfone',    'PERCENT',  5,    'ON_COST', false, 30, '${ids.cursos}'),
      ('Cur — Suporte ao Aluno (MO)',      'PERCENT',  10,   'ON_COST', true,  40, '${ids.cursos}'),
      ('Cur — Simples Faixa 1 (ISS)',      'PERCENT',  6,    'ON_PRICE', true,  80, '${ids.cursos}'),
      ('Cur — Simples Faixa 2 (ISS)',      'PERCENT',  9,    'ON_PRICE', false, 81, '${ids.cursos}'),
      ('Cur — Taxa Hotmart/Kiwify',        'PERCENT',  5.99, 'ON_PRICE', false, 90, '${ids.cursos}'),
      ('Cur — Gateway/Adm Financeira',     'PERCENT',  2,    'ON_PRICE', false,100, '${ids.cursos}'),
      ('Cur — Lucro Pretendido',           'PERCENT',  30,   'ON_PRICE', true, 200, '${ids.cursos}')
    RETURNING nome
  `);

  // EVENTOS E DECORAÇÃO
  // CMV = material consumível + aluguel de peças (amortização). MO de montagem/desmontagem.
  // Deslocamento é custo real e vai ON_PRICE para compensar variação por distância.
  // Markup Divisor:
  //   Evento direto (local)     : 4+4+2.5+15 = 25.5% → MD 0.745 → mk +34.2%
  //   Com deslocamento          : 4+4+2.5+10+15 = 35.5% → MD 0.645 → mk +55.0%
  //   Margem 50%                : casamentos / corporativo premium
  await run('components — eventos', `
    INSERT INTO cost_components (nome, tipo, valor, base, obrigatorio, ordem, frente_id) VALUES
      ('Evt — Material Consumível',         'PERCENT',  15,   'ON_COST', true,  10, '${ids.eventos}'),
      ('Evt — Amortização Peças/Aluguel',   'PERCENT',  12,   'ON_COST', true,  15, '${ids.eventos}'),
      ('Evt — Perdas e Avarias',            'PERCENT',  4,    'ON_COST', true,  20, '${ids.eventos}'),
      ('Evt — MO Montagem',                 'PERCENT',  20,   'ON_COST', true,  30, '${ids.eventos}'),
      ('Evt — MO Desmontagem',              'PERCENT',  10,   'ON_COST', true,  35, '${ids.eventos}'),
      ('Evt — Dep. Equipamentos de Festa',  'PERCENT',  6,    'ON_COST', true,  40, '${ids.eventos}'),
      ('Evt — Simples Nacional Faixa 1',    'PERCENT',  4,    'ON_PRICE', true,  80, '${ids.eventos}'),
      ('Evt — Simples Nacional Faixa 2',    'PERCENT',  6.5,  'ON_PRICE', false, 81, '${ids.eventos}'),
      ('Evt — Comissão Vendedor',           'PERCENT',  4,    'ON_PRICE', false, 90, '${ids.eventos}'),
      ('Evt — Gateway/Adm Financeira',      'PERCENT',  2.5,  'ON_PRICE', false,100, '${ids.eventos}'),
      ('Evt — Deslocamento/Frete',          'PERCENT',  10,   'ON_PRICE', false,110, '${ids.eventos}'),
      ('Evt — Lucro Pretendido',            'PERCENT',  15,   'ON_PRICE', true, 200, '${ids.eventos}')
    RETURNING nome
  `);

  // ── 4. PRICING POLICIES ──────────────────────────────────────
  await run('pricing_policies', `
    INSERT INTO pricing_policies (nome, tecnica, markup_pct, margem_pct, preco_minimo, arredondamento, frente_id) VALUES
      -- Sabonetes
      ('Sabonetes — Varejo/Feiras',         'MARKUP', 25.0, NULL, NULL, 'psychological', '${ids.sabonetes}'),
      ('Sabonetes — E-commerce',            'MARKUP', 34.2, NULL, NULL, 'psychological', '${ids.sabonetes}'),
      ('Sabonetes — ML Classic',            'MARKUP', 40.8, NULL, NULL, 'psychological', '${ids.sabonetes}'),
      ('Sabonetes — Shopee',                'MARKUP', 56.3, NULL, NULL, 'psychological', '${ids.sabonetes}'),
      ('Sabonetes — Etsy/Elo7',             'MARKUP', 41.8, NULL, NULL, 'psychological', '${ids.sabonetes}'),
      -- Bijuterias
      ('Bijuterias — Varejo/Feiras',        'MARKUP', 29.9, NULL, NULL, 'psychological', '${ids.bijuterias}'),
      ('Bijuterias — E-commerce',           'MARKUP', 36.1, NULL, NULL, 'psychological', '${ids.bijuterias}'),
      ('Bijuterias — ML Classic',           'MARKUP', 47.1, NULL, NULL, 'psychological', '${ids.bijuterias}'),
      ('Bijuterias — Shopee',               'MARKUP', 63.9, NULL, NULL, 'psychological', '${ids.bijuterias}'),
      ('Bijuterias — Etsy/Elo7',            'MARKUP', 43.9, NULL, NULL, 'psychological', '${ids.bijuterias}'),
      ('Bijuterias — Margem 60% Premium',   'MARGIN', NULL, 60.0, NULL, 'psychological', '${ids.bijuterias}'),
      -- Cerâmica
      ('Cerâmica — Varejo/Feiras',          'MARKUP', 25.0, NULL, NULL, 'psychological', '${ids.ceramica}'),
      ('Cerâmica — E-commerce',             'MARKUP', 36.1, NULL, NULL, 'psychological', '${ids.ceramica}'),
      ('Cerâmica — ML Classic',             'MARKUP', 40.8, NULL, NULL, 'psychological', '${ids.ceramica}'),
      ('Cerâmica — Margem 55% Premium',     'MARGIN', NULL, 55.0, NULL, 'psychological', '${ids.ceramica}'),
      -- Fotografia
      ('Fotografia — Sessão Presencial',    'MARKUP', 29.9, NULL, NULL, 'none', '${ids.fotografia}'),
      ('Fotografia — Entrega Digital',      'MARKUP', 29.9, NULL, NULL, 'none', '${ids.fotografia}'),
      ('Fotografia — Margem 60% Premium',   'MARGIN', NULL, 60.0, NULL, 'none', '${ids.fotografia}'),
      -- Cursos
      ('Cursos — Hotmart/Kiwify',           'MARKUP', 72.4, NULL, NULL, 'none', '${ids.cursos}'),
      ('Cursos — Venda Direta',             'MARKUP', 61.3, NULL, NULL, 'none', '${ids.cursos}'),
      ('Cursos — Margem 70% Mentoria',      'MARGIN', NULL, 70.0, NULL, 'none', '${ids.cursos}'),
      -- Eventos
      ('Eventos — Local/Direto',            'MARKUP', 34.2, NULL, NULL, 'none', '${ids.eventos}'),
      ('Eventos — Com Deslocamento',        'MARKUP', 55.0, NULL, NULL, 'none', '${ids.eventos}'),
      ('Eventos — Margem 50% Premium',      'MARGIN', NULL, 50.0, NULL, 'none', '${ids.eventos}')
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
