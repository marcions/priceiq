/**
 * pgquery — raw SQL via pg-meta (Kong)
 * Usa a URL completa com hostname DNS para que o Kong roteie corretamente.
 * fetch() do Node.js (undici) ignora override de 'host' header — por isso
 * usamos o hostname completo na URL em vez de IP + Host header.
 * O hostname sslip.io resolve via DNS para 20.51.158.208 (sem hairpin NAT).
 */

const KONG_BASE = 'http://supabasekong-m13buf3hxxtgq94jhatkirlk.20.51.158.208.sslip.io'
const SERVICE_ROLE_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function pgquery<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const key = SERVICE_ROLE_KEY()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)

  try {
    const res = await fetch(`${KONG_BASE}/pg/query`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: key,
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ query: sql }),
      signal: controller.signal,
      cache: 'no-store',
    } as RequestInit)

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`pgquery failed (${res.status}): ${text}`)
    }
    return res.json() as Promise<T[]>
  } finally {
    clearTimeout(timer)
  }
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
