const http = require('http');
const SERVICE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4MDk1NDUwMCwiZXhwIjo0OTM2NjI4MTAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.22M_7BZal129TX_ZHhS5orvrHMwCzyYx_bBy0NZsNnE';
const KONG = 'supabasekong-m13buf3hxxtgq94jhatkirlk.20.51.158.208.sslip.io';
function pgquery(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const req = http.request({ hostname: KONG, port: 80, path: '/pg/query', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY, 'Content-Length': Buffer.byteLength(body) }
    }, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } }); });
    req.on('error', reject); req.write(body); req.end();
  });
}
async function cols(table) {
  const r = await pgquery(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='${table}' ORDER BY ordinal_position`);
  console.log(`\n${table}:`);
  if (Array.isArray(r)) r.forEach(c => console.log(`  ${c.column_name} (${c.data_type}) ${c.is_nullable==='NO'?'NOT NULL':''}`));
}
async function main() {
  await cols('pricing_reviews');
  await cols('cost_snapshots');
  await cols('cost_components');
}
main().catch(console.error);
