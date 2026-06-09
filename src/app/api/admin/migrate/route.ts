import { NextResponse } from 'next/server'
import { pgquery } from '@/lib/db/query'

/**
 * POST /api/admin/migrate
 * Aplica migrações pendentes idempotentes.
 * Chamar uma vez após deploy — seguro rodar múltiplas vezes (IF NOT EXISTS).
 */
export async function POST() {
  const migrations = [
    {
      name: '003_equipamentos_quantidade',
      sql: `
        ALTER TABLE impressoras
          ADD COLUMN IF NOT EXISTS quantidade_propria integer NOT NULL DEFAULT 0;
        CREATE INDEX IF NOT EXISTS idx_impressoras_proprios
          ON impressoras(quantidade_propria)
          WHERE quantidade_propria > 0;
      `,
    },
  ]

  const results: { name: string; status: string }[] = []

  for (const m of migrations) {
    try {
      await pgquery(m.sql)
      results.push({ name: m.name, status: 'ok' })
    } catch (err) {
      results.push({ name: m.name, status: `erro: ${err instanceof Error ? err.message : err}` })
    }
  }

  return NextResponse.json({ results })
}
