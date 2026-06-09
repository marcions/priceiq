import { NextResponse } from 'next/server'
import { calcularCustoProduto, type MetodoCusto } from '@/lib/custo/calcular'
import { pgqueryone, pgesc } from '@/lib/db/query'

const METODOS_VALIDOS: MetodoCusto[] = ['LAST', 'SIMPLE_AVG', 'WEIGHTED_AVG']

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const metodo: MetodoCusto = METODOS_VALIDOS.includes(body.metodo) ? body.metodo : 'WEIGHTED_AVG'

  // Confirmar que o produto existe
  const produto = await pgqueryone<{ id: string; nome: string; sku: string }>(
    `SELECT id, nome, sku FROM products WHERE id = ${pgesc(id)}`
  )
  if (!produto) {
    return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
  }

  try {
    const result = await calcularCustoProduto(id, metodo)

    if (!result) {
      return NextResponse.json({
        message: `Nenhum pedido de compra encontrado para "${produto.nome}".`,
        atualizado: false,
      })
    }

    const nComp = result.componentes.filter(c => c.base === 'ON_COST').length
    return NextResponse.json({
      message: `Custo atualizado: R$ ${result.custo_total.toFixed(4)} (${metodo}, ${result.pedidos_count} pedido(s), ${nComp} componentes aplicados)`,
      atualizado: true,
      snapshot_id:   result.snapshot_id,
      custo_base:    result.custo_base,
      custo_total:   result.custo_total,
      on_price_sum:  result.on_price_sum,
      metodo,
      pedidos_count: result.pedidos_count,
      componentes:   result.componentes,
    })
  } catch (err) {
    console.error('[calcular-custo]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao calcular custo' },
      { status: 500 }
    )
  }
}
