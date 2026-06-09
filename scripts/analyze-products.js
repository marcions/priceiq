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

async function main() {
  // Ver se existe tabela de categorias
  const tables = await pgquery(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name ILIKE '%categ%'
  `);
  console.log('Tabelas com categ:', JSON.stringify(tables));

  // Amostra de 100 nomes de produtos
  const sample = await pgquery(`SELECT id, sku, nome FROM products WHERE frente_id IS NULL ORDER BY nome LIMIT 100`);
  if (Array.isArray(sample)) {
    console.log(`\nAMOSTRA (${sample.length} produtos):`);
    sample.forEach(p => console.log(`  ${p.nome}`));
  } else {
    console.log('sample error:', JSON.stringify(sample));
  }

  // Contagem total
  const total = await pgquery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE frente_id IS NULL) AS sem_frente FROM products`);
  console.log('\nTOTAL:', JSON.stringify(Array.isArray(total) ? total[0] : total));
}

main().catch(console.error);
