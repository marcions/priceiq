import { NextResponse } from 'next/server'
import { pgquery, pgesc } from '@/lib/db/query'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const snapshots = await pgquery<{
    id: string
    custo_base: string
    custo_total: string
    metodo_usado: string
    pedidos_count: string
    triggered_by: string
    calculado_em: string
  }>(`
    SELECT
      id,
      custo_base::text,
      custo_total::text,
      metodo_usado,
      pedidos_count::text,
      triggered_by,
      calculado_em
    FROM cost_snapshots
    WHERE product_id = ${pgesc(id)}
    ORDER BY calculado_em DESC
    LIMIT 20
  `)

  return NextResponse.json({ snapshots })
}
