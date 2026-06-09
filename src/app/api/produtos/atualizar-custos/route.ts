import { NextResponse } from 'next/server'
import { pgquery } from '@/lib/db/query'
import { calcularCustoProduto, type MetodoCusto } from '@/lib/custo/calcular'

const METODOS_VALIDOS: MetodoCusto[] = ['LAST', 'SIMPLE_AVG', 'WEIGHTED_AVG']

/**
 * POST /api/produtos/atualizar-custos
 *
 * Recalcula o custo de TODOS os produtos ativos que possuem pedidos de
 * compra importados, gerando cost_snapshots imutáveis.
 *
 * Body (opcional): { "metodo": "WEIGHTED_AVG" | "SIMPLE_AVG" | "LAST" }
 * Default: WEIGHTED_AVG (média ponderada por quantidade — CMPC)
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const metodo: MetodoCusto = METODOS_VALIDOS.includes(body.metodo) ? body.metodo : 'WEIGHTED_AVG'

  try {
    // Produtos ativos que têm ao menos 1 item de pedido com dados válidos
    const candidatos = await pgquery<{ id: string; nome: string }>(`
      SELECT DISTINCT p.id, p.nome
      FROM products p
      JOIN purchase_order_items poi ON poi.product_id = p.id
      WHERE p.ativo = true
        AND poi.quantidade::numeric > 0
        AND poi.preco_unitario::numeric > 0
      ORDER BY p.nome
    `)

    if (candidatos.length === 0) {
      return NextResponse.json({
        message: 'Nenhum produto com pedidos de compra encontrado.',
        atualizados: 0,
        sem_dados: 0,
        metodo,
      })
    }

    let atualizados = 0
    let semDados = 0
    const erros: string[] = []

    for (const p of candidatos) {
      try {
        const result = await calcularCustoProduto(p.id, metodo, 'manual')
        if (result) {
          atualizados++
        } else {
          semDados++
        }
      } catch (err) {
        erros.push(`${p.nome}: ${err instanceof Error ? err.message : 'erro'}`)
      }
    }

    const metodoLabel = {
      WEIGHTED_AVG: 'Média ponderada (CMPC)',
      SIMPLE_AVG: 'Média simples',
      LAST: 'Último preço pago',
    }[metodo]

    return NextResponse.json({
      message: `${atualizados} produto(s) atualizados via ${metodoLabel}.`,
      atualizados,
      sem_dados: semDados,
      erros: erros.length > 0 ? erros : undefined,
      metodo,
    })
  } catch (err) {
    console.error('[atualizar-custos]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao atualizar custos' },
      { status: 500 }
    )
  }
}
