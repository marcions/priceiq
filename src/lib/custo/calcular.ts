/**
 * Motor de Custo — PriceIQ
 *
 * Métodos de CMV:
 *   LAST         — último preço pago (mais recente por data do pedido)
 *   SIMPLE_AVG   — média simples de todos os preços unitários
 *   WEIGHTED_AVG — média ponderada pela quantidade (CMPC)
 *
 * Componentes de custo (cost_components por frente):
 *   ON_COST PERCENT — % sobre o custo_base → aumenta custo_total
 *   ON_COST FIXED   — valor fixo → aumenta custo_total
 *   ON_PRICE PERCENT— % sobre PV (entra no Markup Divisor, gravado no breakdown)
 *
 * Resultado: cria um cost_snapshot imutável e atualiza products.custo_vigente.
 */

import { pgquery, pgqueryone, pgesc } from '@/lib/db/query'

export type MetodoCusto = 'LAST' | 'SIMPLE_AVG' | 'WEIGHTED_AVG'

export interface ComponenteAplicado {
  nome: string
  tipo: 'PERCENT' | 'FIXED'
  base: 'ON_COST' | 'ON_PRICE'
  percentual_ou_valor: number
  valor_aplicado: number  // 0 para ON_PRICE (não entra no custo, só no MD)
}

export interface CustoResult {
  product_id:    string
  snapshot_id:   string
  custo_base:    number   // CMV puro dos pedidos
  custo_total:   number   // CMV + ON_COST aplicados
  on_price_sum:  number   // soma dos % ON_PRICE (para Markup Divisor externo)
  metodo:        MetodoCusto
  pedidos_count: number
  pedidos_ids:   string[]
  componentes:   ComponenteAplicado[]
}

export interface CustoError {
  product_id: string
  motivo: 'sem_pedidos' | 'erro'
  detalhe?: string
}

/**
 * Calcula o custo de um produto a partir dos pedidos de compra importados,
 * aplica os componentes ON_COST da frente do produto,
 * gera um cost_snapshot imutável e atualiza custo_vigente.
 *
 * Retorna `null` se não houver pedidos com dados válidos.
 */
export async function calcularCustoProduto(
  productId: string,
  metodo: MetodoCusto = 'WEIGHTED_AVG',
  triggeredBy: 'manual' | 'scheduler' = 'manual'
): Promise<CustoResult | null> {

  // ── 1. Buscar produto e sua frente ───────────────────────────────────
  const produto = await pgqueryone<{
    id: string
    nome: string
    frente_id: string | null
    cost_policy_id: string | null
  }>(`
    SELECT id, nome, frente_id, cost_policy_id
    FROM products
    WHERE id = ${pgesc(productId)}
  `)
  if (!produto) return null

  // ── 2. Buscar itens de pedido ────────────────────────────────────────
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
    ORDER BY po.data_pedido DESC NULLS LAST, po.importado_em DESC
  `)

  if (itens.length === 0) return null

  // ── 3. Calcular custo_base pelo método ───────────────────────────────
  let custoBase: number

  if (metodo === 'LAST') {
    custoBase = Number(itens[0].preco_unitario)
  } else if (metodo === 'SIMPLE_AVG') {
    const soma = itens.reduce((acc, i) => acc + Number(i.preco_unitario), 0)
    custoBase = soma / itens.length
  } else {
    // WEIGHTED_AVG (CMPC)
    const somaValor = itens.reduce((acc, i) => acc + Number(i.quantidade) * Number(i.preco_unitario), 0)
    const somaQtd   = itens.reduce((acc, i) => acc + Number(i.quantidade), 0)
    custoBase = somaQtd > 0 ? somaValor / somaQtd : 0
  }

  if (!custoBase || custoBase <= 0) return null

  // ── 4. Buscar componentes de custo da frente ─────────────────────────
  const componentes: ComponenteAplicado[] = []
  let custoTotal = custoBase
  let onPriceSum = 0

  if (produto.frente_id) {
    const rows = await pgquery<{
      nome: string
      tipo: string
      valor: string
      base: string
    }>(`
      SELECT nome, tipo, valor::text, base
      FROM cost_components
      WHERE frente_id = ${pgesc(produto.frente_id)}
        AND ativo = true
      ORDER BY ordem ASC
    `)

    for (const comp of rows) {
      const tipo = comp.tipo as 'PERCENT' | 'FIXED'
      const base = comp.base as 'ON_COST' | 'ON_PRICE'
      const valor = Number(comp.valor)

      if (base === 'ON_COST') {
        let valorAplicado = 0
        if (tipo === 'PERCENT') {
          valorAplicado = custoBase * (valor / 100)
        } else if (tipo === 'FIXED') {
          valorAplicado = valor
        }
        custoTotal += valorAplicado
        componentes.push({
          nome: comp.nome,
          tipo,
          base,
          percentual_ou_valor: valor,
          valor_aplicado: valorAplicado,
        })
      } else if (base === 'ON_PRICE') {
        // ON_PRICE não entra no custo — fica registrado para uso no Markup Divisor
        if (tipo === 'PERCENT') {
          onPriceSum += valor
        }
        componentes.push({
          nome: comp.nome,
          tipo,
          base,
          percentual_ou_valor: valor,
          valor_aplicado: 0,
        })
      }
    }
  }

  // ── 5. Criar cost_snapshot imutável ──────────────────────────────────
  const pedidosIds = [...new Set(itens.map(i => i.order_id))]

  const breakdown = JSON.stringify({
    metodo,
    custo_base:      custoBase,
    custo_total:     custoTotal,
    on_price_sum_pct: onPriceSum,
    markup_divisor:  onPriceSum > 0 ? parseFloat((1 - onPriceSum / 100).toFixed(6)) : null,
    componentes,
  })

  const pedidosIdsArray = `ARRAY[${pedidosIds.map(id => pgesc(id)).join(',')}]::uuid[]`

  const snapshot = await pgqueryone<{ id: string }>(`
    INSERT INTO cost_snapshots (
      product_id,
      cost_policy_id,
      custo_base,
      custo_total,
      components_breakdown,
      metodo_usado,
      pedidos_count,
      pedidos_ids,
      triggered_by
    ) VALUES (
      ${pgesc(productId)},
      ${produto.cost_policy_id ? pgesc(produto.cost_policy_id) : 'NULL'},
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

  // ── 6. Atualizar custo_vigente no produto ────────────────────────────
  await pgquery(`
    UPDATE products
    SET custo_vigente = ${pgesc(custoTotal)},
        updated_at    = now()
    WHERE id = ${pgesc(productId)}
  `)

  return {
    product_id:    productId,
    snapshot_id:   snapshot.id,
    custo_base:    custoBase,
    custo_total:   custoTotal,
    on_price_sum:  onPriceSum,
    metodo,
    pedidos_count: pedidosIds.length,
    pedidos_ids:   pedidosIds,
    componentes,
  }
}
