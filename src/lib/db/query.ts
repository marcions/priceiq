/**
 * pgquery — raw SQL via pg-meta endpoint
 * Chama Kong diretamente via node:http (mesmo mecanismo do proxy /api/supabase).
 * Funciona dentro do Docker sem hairpin NAT — IP hardcoded, sem DNS externo.
 */
import * as http from 'node:http'

// Mesmo IP/host do proxy /api/supabase/[...path]/route.ts
const SUPABASE_IP   = '20.51.158.208'
const SUPABASE_HOST = 'supabasekong-m13buf3hxxtgq94jhatkirlk.20.51.158.208.sslip.io'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const agent = new http.Agent({ keepAlive: true, keepAliveMsecs: 30000, maxSockets: 10 })

function httpPost(path: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const bodyBuf = Buffer.from(body, 'utf8')
    const req = http.request(
      {
        hostname: SUPABASE_IP,
        port: 80,
        path,
        method: 'POST',
        agent,
        headers: {
          host: SUPABASE_HOST,
          'content-type': 'application/json',
          'content-length': bodyBuf.length,
          apikey: SERVICE_ROLE_KEY,
          authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          if ((res.statusCode ?? 200) >= 400) {
            reject(new Error(`pgquery failed (${res.statusCode}): ${text}`))
          } else {
            resolve(text)
          }
        })
      }
    )
    req.on('error', reject)
    req.setTimeout(30000, () => req.destroy(new Error('pgquery timeout')))
    req.write(bodyBuf)
    req.end()
  })
}

export async function pgquery<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const text = await httpPost('/pg/query', JSON.stringify({ query: sql }))
  return JSON.parse(text) as T[]
}

/** Convenience: return first row or null */
export async function pgqueryone<T = Record<string, unknown>>(
  sql: string
): Promise<T | null> {
  const rows = await pgquery<T>(sql)
  return rows[0] ?? null
}

/**
 * Escape a value for safe SQL interpolation (basic — avoid user-facing raw input)
 * For UUIDs, numbers, and booleans this is safe.
 */
export function pgesc(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (typeof value === 'number') return String(value)
  // String — escape single quotes
  return `'${String(value).replace(/'/g, "''")}'`
}
