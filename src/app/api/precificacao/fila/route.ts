import { NextResponse } from 'next/server'
import { pgquery } from '@/lib/db/query'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'pending'

  const rows = await pgquery<{
    id: string
    product_id: string
    sku: string
    nome: string
    categoria: string | null
    custo_base: string
    metodo: string
    parametro: string
    preco_sugerido: string
    preco_atual: string | null
    status: string
    nota: string | null
    criado_em: string
    revisado_em: string | null
  }>(`
    SELECT
      pr.id,
      pr.product_id,
      p.sku,
      p.nome,
      c.nome AS categoria,
      pr.custo_base,
      pr.metodo,
      pr.parametro,
      pr.preco_sugerido,
      pr.preco_atual,
      pr.status,
      pr.nota,
      pr.criado_em,
      pr.revisado_em
    FROM pricing_reviews pr
    JOIN products p ON p.id = pr.product_id
    LEFT JOIN categories c ON c.id = p.categoria_id
    WHERE pr.status = '${status}'
    ORDER BY pr.criado_em DESC
    LIMIT 200
  `)

  return NextResponse.json(rows)
}
