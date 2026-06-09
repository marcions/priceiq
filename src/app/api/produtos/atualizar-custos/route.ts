import { NextResponse } from 'next/server'
import { pgquery, pgesc } from '@/lib/db/query'

/**
 * POST /api/produtos/atualizar-custos
 *
 * Calcula o custo médio ponderado (CMPC) de cada produto com base nos
 * itens de pedidos de compra importados do Bling e atualiza custo_vigente.
 *
 * Fórmula: custo = SUM(quantidade × preco_unitario) / SUM(quantidade)
 *
 * Somente atualiza produtos que têm ao menos 1 item de pedido com
 * quantidade > 0 e preco_unitario > 0.
 */
export async function POST() {
  try {
    // 1. Calcular custo médio ponderado por produto
    const custos = await pgquery<{
      product_id: string
      custo_medio: string
      total_quantidade: string
      total_pedidos: string
    }>(`
      SELECT
        poi.product_id,
        SUM(poi.quantidade::numeric * poi.preco_unitario::numeric)
          / SUM(poi.quantidade::numeric)                          AS custo_medio,
        SUM(poi.quantidade::numeric)                             AS total_quantidade,
        COUNT(DISTINCT poi.order_id)                             AS total_pedidos
      FROM purchase_order_items poi
      WHERE
        poi.product_id IS NOT NULL
        AND poi.quantidade::numeric > 0
        AND poi.preco_unitario::numeric > 0
      GROUP BY poi.product_id
    `)

    if (custos.length === 0) {
      return NextResponse.json({
        message: 'Nenhum pedido de compra com itens associados a produtos encontrados.',
        atualizados: 0,
      })
    }

    // 2. Atualizar custo_vigente de cada produto
    let atualizados = 0

    for (const row of custos) {
      const custoMedio = Number(row.custo_medio)
      if (isNaN(custoMedio) || custoMedio <= 0) continue

      await pgquery(`
        UPDATE products
        SET
          custo_vigente  = ${pgesc(custoMedio)},
          updated_at     = now()
        WHERE id = ${pgesc(row.product_id)}
      `)

      atualizados++
    }

    // 3. Retornar resumo
    const semDados = await pgquery<{ total: string }>(`
      SELECT COUNT(*) AS total
      FROM products p
      WHERE p.ativo = true
        AND NOT EXISTS (
          SELECT 1 FROM purchase_order_items poi
          WHERE poi.product_id = p.id
            AND poi.quantidade::numeric > 0
            AND poi.preco_unitario::numeric > 0
        )
    `)

    return NextResponse.json({
      message: `${atualizados} produto(s) com custo atualizado via média ponderada (CMPC).`,
      atualizados,
      sem_pedidos: Number(semDados[0]?.total ?? 0),
    })
  } catch (err) {
    console.error('[atualizar-custos]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao atualizar custos' },
      { status: 500 }
    )
  }
}
