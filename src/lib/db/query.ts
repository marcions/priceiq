/**
 * pgquery — raw SQL via pg-meta endpoint
 * Bypasses PostgREST entirely; uses service_role (RLS bypassed).
 * Server-side only.
 */

const BASE_URL = (
  process.env.SUPABASE_DIRECT_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
).replace(/\/$/, '')

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function pgquery<T = Record<string, unknown>>(
  sql: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  // pg-meta doesn't support parameterized queries — caller must sanitize inputs
  const res = await fetch(`${BASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
    // No cache — always fresh data
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`pgquery failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<T[]>
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
