/**
 * Motor de Custo — PriceIQ
 *
 * Métodos disponíveis:
 *   LAST         — último preço pago (mais recente por data do pedido)
 *   SIMPLE_AVG   — média simples de todos os preços unitários
 *   WEIGHTED_AVG — média ponderada pela quantidade (CMPC)
 *
 * Resultado: cria um `cost_snapshot` imutável e atualiza `products.custo_vigente`.
 */

import { pgquery, pgqueryone, pgesc } from '@/lib/db/query'

export type MetodoCusto = 'LAST' | 'SIMPLE_AVG' | 'WEIGHTED_AVG'

export interface CustoResult {
  product_id: string
  snapshot_id: string
  custo_base: number
  custo_total: number
  metodo: MetodoCusto
  pedidos_count: number
  pedidos_ids: string[]
}

export interface CustoError {
  product_id: string
  motivo: 'sem_pedidos' | 'erro'
  detalhe?: string
}

/**
 * Calcula o custo de um produto a partir dos pedidos de compra importados,
 * gera um cost_snapshot imutável e atualiza custo_vigente no produto.
 *
 * Retorna `null` se não houver pedidos com dados válidos.
 */
export async function calcularCustoProduto(
  productId: string,
  metodo: MetodoCusto = 'WEIGHTED_AVG',
  triggeredBy: 'manual' | 'scheduler' = 'manual'
): Promise<CustoResult | null> {

  // ── 1. Buscar itens de pedido associados ao produto ──────────────────
  const itens = await pgquery<{
    order_id: string
    quantidade: string
    preco_unitario: string
    data_pedido: string | null
  }>(`
    SELECT
      poi.order_id,
      poi.quantidade::text,
      poi.preco_unitario::text,
      po.data_pedido::text
    FROM purchase_order_items poi
    JOIN purchase_orders po ON po.id = poi.order_id
    WHERE
      poi.product_id = ${pgesc(productId)}
      AND poi.quantidade::numeric > 0
      AND poi.preco_unitario::numeric > 0
    ORDER BY po.data_pedido DESC NULLS LAST, po.created_at DESC
  `)

  if (itens.length === 0) return null

  // ── 2. Calcular custo_base pelo método escolhido ─────────────────────
  let custoBase: number

  if (metodo === 'LAST') {
    // Primeiro item já é o mais recente (ORDER BY data_pedido DESC)
    custoBase = Number(itens[0].preco_unitario)

  } else if (metodo === 'SIMPLE_AVG') {
    const soma = itens.reduce((acc, i) => acc + Number(i.preco_unitario), 0)
    custoBase = soma / itens.length

  } else {
    // WEIGHTED_AVG (CMPC) — padrão
    const somaValor = itens.reduce((acc, i) => acc + Number(i.quantidade) * Number(i.preco_unitario), 0)
    const somaQtd   = itens.reduce((acc, i) => acc + Number(i.quantidade), 0)
    custoBase = somaQtd > 0 ? somaValor / somaQtd : 0
  }

  if (!custoBase || custoBase <= 0) return null

  // IDs únicos de pedidos usados no cálculo
  const pedidosIds = [...new Set(itens.map(i => i.order_id))]
  const custoTotal = custoBase // cost_components aplicados na Semana 5

  // ── 3. Criar cost_snapshot imutável ──────────────────────────────────
  const breakdown = JSON.stringify({
    custo_pedidos: custoBase,
    componentes: [],  // expandido na Semana 5 com cost_components
  })

  const pedidosIdsArray = `ARRAY[${pedidosIds.map(id => pgesc(id)).join(',')}]::uuid[]`

  const snapshot = await pgqueryone<{ id: string }>(`
    INSERT INTO cost_snapshots (
      product_id,
      custo_base,
      custo_total,
      components_breakdown,
      metodo_usado,
      pedidos_count,
      pedidos_ids,
      triggered_by
    ) VALUES (
      ${pgesc(productId)},
      ${pgesc(custoBase)},
      ${pgesc(custoTotal)},
      ${pgesc(breakdown)}::jsonb,
      ${pgesc(metodo)},
      ${pgesc(pedidosIds.length)},
      ${pedidosIdsArray},
      ${pgesc(triggeredBy)}
    )
    RETURNING id
  `)

  if (!snapshot) throw new Error('Falha ao criar cost_snapshot')

  // ── 4. Atualizar custo_vigente no produto ────────────────────────────
  await pgquery(`
    UPDATE products
    SET custo_vigente = ${pgesc(custoTotal)},
        updated_at    = now()
    WHERE id = ${pgesc(productId)}
  `)

  return {
    product_id:   productId,
    snapshot_id:  snapshot.id,
    custo_base:   custoBase,
    custo_total:  custoTotal,
    metodo:       metodo,
    pedidos_count: pedidosIds.length,
    pedidos_ids:  pedidosIds,
  }
}
