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

// ── REGRAS DE CLASSIFICAÇÃO ───────────────────────────────────
// Ordem importa: primeira regra que bater vence.
// Keywords em lowercase. Produto testado em lowercase também.

const RULES = [
  // ── IMPRESSÃO 3D ─────────────────────────────────────
  { slug: 'impressao_3d', keywords: [
    ' 3d', '3d ', 'filamento', 'pla', 'petg', 'abs ', 'resina uv',
    'bumerangue', 'boneco', 'miniatura', 'suporte impresso',
    'abridor monster', 'angel grande', 'stitch', 'brinquedo sensorial',
    'almochaveiro', 'banguela', 'avião', 'lupinho', 'lupulo',
  ]},

  // ── CORTE LASER / GRAVAÇÃO ────────────────────────────
  { slug: 'laser', keywords: [
    'gravação laser', 'gravado laser', 'laser', 'mdf gravado',
  ]},

  // ── CORTE CNC / MDF ───────────────────────────────────
  { slug: 'corte_cnc', keywords: [
    'caixa mdf', 'mdf', 'caixa com gaveta', 'caixa com tampa',
    'caixa figurinha', 'caixa munição', 'bandeja', 'porta',
  ]},

  // ── VESTUÁRIO ─────────────────────────────────────────
  { slug: 'vestuario', keywords: [
    'baby look', 'blusa', 'camiseta', 'moleton', 'moletom',
    'camisa ', 'regata', 'shorts', 'calça', 'vestido', 'saia',
    'jaqueta', 'casaco', 'cropped', 'polo ', 'meia ',
  ]},

  // ── SUBLIMAÇÃO ────────────────────────────────────────
  { slug: 'sublimacao', keywords: [
    'sublimado', 'sublimação', 'caneca sublimada', 'copo sublimado',
    'mousepad', 'mouse pad', 'almofada sublimada', 'azulejo',
  ]},

  // ── DTF TÊXTIL ────────────────────────────────────────
  { slug: 'dtf_textil', keywords: [
    'dtf', 'transfer têxtil', 'transfer textil',
  ]},

  // ── PAPELARIA PERSONALIZADA ───────────────────────────
  { slug: 'papelaria', keywords: [
    'caderneta', 'bloco de anotações', 'agenda', 'caderno',
    'sketchbook', 'planner', 'moleskine', 'porta caneta',
  ]},

  // ── GRÁFICA ───────────────────────────────────────────
  { slug: 'grafica', keywords: [
    'adesivo', 'banner', 'lona', 'placa ', 'cartão', 'card ',
    'flyer', 'folder', 'calendário', 'etiqueta', 'rótulo',
  ]},

  // ── BRINDES (personalizado genérico) ─────────────────
  { slug: 'brindes', keywords: [
    'personalizado', 'personalizada', 'personaliz',
    'bolsa ', 'mochila', 'boné', 'bone ', 'garrafa', 'squeeze',
    'caneta ', 'chaveiro', 'nécessaire', 'necessaire', 'estojo',
    'ecobag', 'sacola', 'guarda-chuva', 'guarda chuva',
    'porta crachá', 'porta cracha', 'balde de pipoca',
    'bolinha acrilica', 'bolinha acrílica',
    'caixa bateria',
  ]},

  // ── VENDA DE PRODUTO (revenda sem personalização) ─────
  { slug: 'venda_produto', keywords: [
    'caixa kraft', 'embalagem', 'sachet', 'saco ',
  ]},
];

function classifyProduct(nome) {
  const lower = nome.toLowerCase();
  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return { slug: rule.slug, matched: kw };
      }
    }
  }
  return { slug: null, matched: null };
}

async function main() {
  // Buscar todos os produtos sem frente
  const produtos = await pgquery(`SELECT id, nome FROM products WHERE frente_id IS NULL ORDER BY nome`);
  if (!Array.isArray(produtos)) { console.error('Erro:', JSON.stringify(produtos)); return; }

  // Classificar localmente
  const resultado = {};
  const naoClassificados = [];

  for (const p of produtos) {
    const { slug, matched } = classifyProduct(p.nome);
    if (slug) {
      if (!resultado[slug]) resultado[slug] = [];
      resultado[slug].push({ id: p.id, nome: p.nome, matched });
    } else {
      naoClassificados.push(p.nome);
    }
  }

  // Resumo
  console.log('\n=== RESULTADO DA CLASSIFICAÇÃO ===');
  let total_classificados = 0;
  for (const [slug, lista] of Object.entries(resultado)) {
    console.log(`\n${slug.toUpperCase()} (${lista.length}):`);
    lista.slice(0, 10).forEach(p => console.log(`  [${p.matched}] ${p.nome}`));
    if (lista.length > 10) console.log(`  ... e mais ${lista.length - 10}`);
    total_classificados += lista.length;
  }

  console.log(`\n=== NÃO CLASSIFICADOS (${naoClassificados.length}) ===`);
  naoClassificados.forEach(n => console.log(`  ${n}`));

  console.log(`\n=== TOTAIS ===`);
  console.log(`Total produtos: ${produtos.length}`);
  console.log(`Classificados: ${total_classificados} (${Math.round(total_classificados/produtos.length*100)}%)`);
  console.log(`Sem classificação: ${naoClassificados.length}`);

  // Buscar IDs das frentes
  const frentes = await pgquery(`SELECT id, slug FROM frentes_negocio`);
  if (!Array.isArray(frentes)) { console.error('Erro frentes:', frentes); return; }
  const frMap = {};
  frentes.forEach(f => frMap[f.slug] = f.id);

  // Gerar UPDATEs em batch por frente
  console.log('\n=== EXECUTANDO UPDATEs ===');
  let totalAtualizado = 0;

  for (const [slug, lista] of Object.entries(resultado)) {
    const frente_id = frMap[slug];
    if (!frente_id) { console.log(`SKIP ${slug} — frente não encontrada`); continue; }

    // Batch em grupos de 100 IDs
    const ids = lista.map(p => `'${p.id}'`);
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const r = await pgquery(`
        UPDATE products
        SET frente_id = '${frente_id}', updated_at = NOW()
        WHERE id IN (${batch.join(',')})
      `);
      const ok = Array.isArray(r);
      const updated = ok ? r.length : '?';
      console.log(ok ? `  OK ${slug} batch ${i/100+1}: ${batch.length} produtos` : `  ERR ${slug}: ${JSON.stringify(r).slice(0,200)}`);
      totalAtualizado += batch.length;
    }
  }

  // Verificação final
  const check = await pgquery(`
    SELECT
      fn.nome AS frente,
      COUNT(p.id) AS produtos
    FROM products p
    JOIN frentes_negocio fn ON fn.id = p.frente_id
    GROUP BY fn.nome
    ORDER BY produtos DESC
  `);
  console.log('\n=== DISTRIBUIÇÃO FINAL ===');
  if (Array.isArray(check)) check.forEach(r => console.log(`  ${String(r.produtos).padStart(4)}  ${r.frente}`));

  const semFrente = await pgquery(`SELECT COUNT(*) AS total FROM products WHERE frente_id IS NULL`);
  console.log(`\nSem frente: ${Array.isArray(semFrente) ? semFrente[0].total : '?'}`);
  console.log(`Atualizados nesta execução: ${totalAtualizado}`);
}

main().catch(console.error);
