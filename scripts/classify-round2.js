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
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({ raw: data.slice(0,400) }); } });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

// Regras específicas para os 164 restantes
const RULES2 = [
  // SUBLIMAÇÃO — copos, canecas, taças (substrato para sublimação)
  { slug: 'sublimacao', keywords: [
    'caneca', 'copo ', 'taça', 'taca ', 'copo long drink', 'copo eco',
    'copo de chopp', 'copo chopp', 'tampa e canudo', 'copo vidro',
    'jogo de taças', 'copo cuia', 'copo tulipa', 'copo monster',
  ]},

  // IMPRESSÃO 3D — gabáritos, suportes, decorações, acessórios impressos
  { slug: 'impressao_3d', keywords: [
    'gabarito', 'suporte ', 'luminaria', 'luminária', 'lightbox',
    'globo terrestre', 'nossa senhora', 'coração infinito', 'decoração ',
    'decoracao ', 'descanso mesa', 'estrela 10 sensorial',
    'flor girador', 'fidget', 'silenciador cinto', 'tampa monster',
    'tampa para silicone', 'palheta guitarra', 'troféu', 'trofeu',
    'medidor de curvas', 'coletor de pó', 'coletor de po',
    'guia esquadro', 'gaveteiro', 'suporte fundo infinito',
    'suporte de faca', 'recipiente em formato',
    'jogo pés sculpfun', 'jogo pes sculpfun',
    'case peptideos', 'mercedez', 'corrente de bolinha com canoa',
    'amostra ', 'globo',
  ]},

  // CORTE CNC — caixas de embalagem/presente em MDF
  { slug: 'corte_cnc', keywords: [
    'caixa para caneca', 'caixa para copo', 'caixa para pilhas',
    'caixa presente', 'caixa bateria', 'caixa ',
  ]},

  // SERVIÇOS — criação de arte, ajustes, logotipo
  { slug: 'servicos', keywords: [
    'serviço de ajuste', 'serviço de criação', 'serviço de arte',
    'serviço criação', 'criação de arte', 'criação de logotipo',
    'ajuste de arte', 'cartao agradecimento', 'cartão agradecimento',
  ]},

  // BRINDES — itens de presente/brinde sem categoria clara
  { slug: 'brindes', keywords: [
    'canivete', 'faca tática', 'faca tatica', 'kit executivo',
    'kit para anotações', 'kit preto executivo', 'kit ferramentas',
    'laço', 'laco ', 'pingente', 'toalha', 'corrente de bolinha',
    'óculos ', 'oculos ', 'sapato ', 'flex filme',
  ]},

  // VENDA DE PRODUTO — itens de revenda pura sem personalização
  { slug: 'venda_produto', keywords: [
    'caixa bateria lr', 'caixa munição', 'caixa municao',
  ]},
];

function classify(nome) {
  const lower = nome.toLowerCase();
  for (const rule of RULES2) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return { slug: rule.slug, matched: kw };
      }
    }
  }
  return { slug: null, matched: null };
}

async function main() {
  const produtos = await pgquery(`SELECT id, nome FROM products WHERE frente_id IS NULL ORDER BY nome`);
  if (!Array.isArray(produtos)) { console.error(produtos); return; }
  console.log(`Produtos sem frente: ${produtos.length}`);

  const resultado = {};
  const ainda_nao = [];

  for (const p of produtos) {
    const { slug, matched } = classify(p.nome);
    if (slug) {
      if (!resultado[slug]) resultado[slug] = [];
      resultado[slug].push({ id: p.id, nome: p.nome, matched });
    } else {
      ainda_nao.push(p.nome);
    }
  }

  // Preview
  let total = 0;
  for (const [slug, lista] of Object.entries(resultado)) {
    console.log(`\n${slug.toUpperCase()} (${lista.length}):`);
    lista.forEach(p => console.log(`  [${p.matched}] ${p.nome}`));
    total += lista.length;
  }
  console.log(`\nAINDA SEM FRENTE (${ainda_nao.length}):`);
  ainda_nao.forEach(n => console.log(`  ${n}`));
  console.log(`\nClassificados nesta rodada: ${total}`);

  // Buscar IDs das frentes
  const frentes = await pgquery(`SELECT id, slug FROM frentes_negocio`);
  const frMap = {};
  if (Array.isArray(frentes)) frentes.forEach(f => frMap[f.slug] = f.id);

  // UPDATE
  console.log('\n=== EXECUTANDO UPDATEs ===');
  for (const [slug, lista] of Object.entries(resultado)) {
    const frente_id = frMap[slug];
    if (!frente_id) { console.log(`SKIP ${slug}`); continue; }
    const ids = lista.map(p => `'${p.id}'`).join(',');
    const r = await pgquery(`UPDATE products SET frente_id = '${frente_id}', updated_at = NOW() WHERE id IN (${ids})`);
    console.log(`  ${Array.isArray(r) ? 'OK' : 'ERR'} ${slug}: ${lista.length} produtos`);
  }

  // Classificar os restantes como "venda_produto" (fallback seguro)
  const restantes = await pgquery(`SELECT id FROM products WHERE frente_id IS NULL`);
  if (Array.isArray(restantes) && restantes.length > 0) {
    const frente_id = frMap['venda_produto'];
    const ids = restantes.map(p => `'${p.id}'`).join(',');
    const r = await pgquery(`UPDATE products SET frente_id = '${frente_id}', updated_at = NOW() WHERE id IN (${ids})`);
    console.log(`\n  FALLBACK venda_produto: ${restantes.length} produtos restantes → ${Array.isArray(r) ? 'OK' : 'ERR'}`);
  }

  // Distribuição final
  const dist = await pgquery(`
    SELECT fn.nome AS frente, COUNT(p.id) AS produtos
    FROM products p
    JOIN frentes_negocio fn ON fn.id = p.frente_id
    GROUP BY fn.nome ORDER BY produtos DESC
  `);
  console.log('\n=== DISTRIBUIÇÃO FINAL ===');
  if (Array.isArray(dist)) dist.forEach(r => console.log(`  ${String(r.produtos).padStart(4)}  ${r.frente}`));

  const semFrente = await pgquery(`SELECT COUNT(*) AS n FROM products WHERE frente_id IS NULL`);
  console.log(`\nSem frente: ${Array.isArray(semFrente) ? semFrente[0].n : '?'} (deve ser 0)`);
}

main().catch(console.error);
