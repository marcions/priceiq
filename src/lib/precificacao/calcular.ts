/**
 * Motor de Precificação — PriceIQ
 *
 * Métodos suportados:
 *   MARKUP  → preço = custo_total × (1 + markup_pct/100)
 *             markup_pct já incorpora o Markup Divisor calculado por canal.
 *   MARGEM  → preço = custo_total / (1 − margem_pct/100)  [Markup Divisor puro]
 *
 * Fluxo principal:
 *   1. `precificarPorFrente`  — usa a pricing_policy da frente do produto automaticamente
 *   2. `precificarProduto`    — override manual (metodo + parametro)
 *
 * Cria pricing_review com status 'pending'.
 * Preço só é aplicado ao produto após aprovação explícita.
 */

import { pgquery, pgqueryone, pgesc } from '@/lib/db/query'

export type MetodoPrecificacao = 'MARKUP' | 'MARGEM'

export type PrecificacaoResult = {
  review_id:          string
  product_id:         string
  snapshot_id:        string
  sku:                string
  nome:               string
  frente:             string | null
  custo_base:         number  // CMV puro
  custo_calculado:    number  // CMV + ON_COST (base do preço)
  on_price_sum:       number  // % ON_PRICE (para informação)
  markup_divisor:     number | null
  metodo:             MetodoPrecificacao
  parametro:          number
  policy_nome:        string | null
  preco_sugerido:     number
  preco_anterior:     number | null
  variacao_pct:       number | null
  margem_resultante:  number
}

type ProductRow = {
  id: string
  sku: string
  nome: string
  frente_id: string | null
  frente_nome: string | null
  pricing_policy_id: string | null
  custo_vigente: string | null
  preco_venda_vigente: string | null
}

type SnapshotRow = {
  id: string
  custo_base: string
  custo_total: string
  components_breakdown: string
}

type PolicyRow = {
  id: string
  nome: string
  tecnica: string
  markup_pct: string | null
  margem_pct: string | null
}

/** Calcula preço sugerido (sem gravar) */
export function calcularPrecoSugerido(
  custo: number,
  metodo: MetodoPrecificacao,
  parametro: number
): number {
  if (metodo === 'MARKUP') {
    return custo * (1 + parametro / 100)
  }
  // MARGEM — Markup Divisor puro: PV = CMV / (1 - margem%)
  const divisor = 1 - parametro / 100
  if (divisor <= 0) throw new Error('Margem deve ser < 100%')
  return custo / divisor
}

/** Calcula margem percentual dado custo e preço */
export function calcularMargem(custo: number, preco: number): number {
  if (preco === 0) return 0
  return ((preco - custo) / preco) * 100
}

/** Busca o último cost_snapshot de um produto */
async function getLastSnapshot(productId: string): Promise<SnapshotRow | null> {
  return pgqueryone<SnapshotRow>(`
    SELECT id, custo_base::text, custo_total::text, components_breakdown::text
    FROM cost_snapshots
    WHERE product_id = ${pgesc(productId)}
    ORDER BY calculado_em DESC
    LIMIT 1
  `)
}

/** Cria a pricing_review e retorna o resultado */
async function criarReview(
  product: ProductRow,
  snapshot: SnapshotRow,
  policy: PolicyRow | null,
  metodo: MetodoPrecificacao,
  parametro: number,
): Promise<PrecificacaoResult | null> {
  const custoCalculado = Number(snapshot.custo_total)
  const precoAnterior = product.preco_venda_vigente ? Number(product.preco_venda_vigente) : null

  let breakdown: { on_price_sum_pct?: number; markup_divisor?: number } = {}
  try { breakdown = JSON.parse(snapshot.components_breakdown) } catch { /* ok */ }

  const onPriceSum = breakdown.on_price_sum_pct ?? 0
  const markupDivisor = breakdown.markup_divisor ?? null

  let preco: number
  try {
    preco = calcularPrecoSugerido(custoCalculado, metodo, parametro)
  } catch {
    return null
  }

  // Supersede reviews pendentes anteriores
  await pgquery(`
    UPDATE pricing_reviews
    SET status = 'superseded'
    WHERE product_id = ${pgesc(product.id)} AND status = 'pending'
  `)

  // Inserir nova review com schema correto
  const row = await pgqueryone<{ id: string }>(`
    INSERT INTO pricing_reviews (
      product_id,
      snapshot_id,
      pricing_policy_id,
      custo_calculado,
      preco_sugerido,
      preco_anterior,
      variacao_pct
    ) VALUES (
      ${pgesc(product.id)},
      ${pgesc(snapshot.id)},
      ${policy ? pgesc(policy.id) : 'NULL'},
      ${pgesc(custoCalculado)},
      ${pgesc(preco)},
      ${precoAnterior !== null ? pgesc(precoAnterior) : 'NULL'},
      ${precoAnterior !== null ? pgesc(((preco - precoAnterior) / precoAnterior) * 100) : 'NULL'}
    )
    RETURNING id
  `)

  if (!row) return null

  return {
    review_id:         row.id,
    product_id:        product.id,
    snapshot_id:       snapshot.id,
    sku:               product.sku,
    nome:              product.nome,
    frente:            product.frente_nome,
    custo_base:        Number(snapshot.custo_base),
    custo_calculado:   custoCalculado,
    on_price_sum:      onPriceSum,
    markup_divisor:    markupDivisor,
    metodo,
    parametro,
    policy_nome:       policy?.nome ?? null,
    preco_sugerido:    preco,
    preco_anterior:    precoAnterior,
    variacao_pct:      precoAnterior !== null ? ((preco - precoAnterior) / precoAnterior) * 100 : null,
    margem_resultante: calcularMargem(custoCalculado, preco),
  }
}

/**
 * Precifica usando a pricing_policy da frente do produto.
 * Usa a primeira política ativa da frente (menor ordem).
 * Se o produto tiver pricing_policy_id definido, usa essa diretamente.
 */
export async function precificarPorFrente(
  productId: string
): Promise<PrecificacaoResult | null> {
  const product = await pgqueryone<ProductRow>(`
    SELECT
      p.id, p.sku, p.nome, p.frente_id, p.pricing_policy_id,
      p.custo_vigente, p.preco_venda_vigente,
      fn.nome AS frente_nome
    FROM products p
    LEFT JOIN frentes_negocio fn ON fn.id = p.frente_id
    WHERE p.id = ${pgesc(productId)} AND p.ativo = true
  `)

  if (!product || !product.custo_vigente) return null

  // Busca o último snapshot (necessário para snapshot_id)
  const snapshot = await getLastSnapshot(productId)
  if (!snapshot) return null

  // Determina qual pricing_policy usar
  let policy: PolicyRow | null = null

  if (product.pricing_policy_id) {
    // Política explícita no produto
    policy = await pgqueryone<PolicyRow>(`
      SELECT id, nome, tecnica, markup_pct::text, margem_pct::text
      FROM pricing_policies
      WHERE id = ${pgesc(product.pricing_policy_id)}
    `)
  } else if (product.frente_id) {
    // Primeira política ativa da frente (obrigatória = padrão)
    policy = await pgqueryone<PolicyRow>(`
      SELECT id, nome, tecnica, markup_pct::text, margem_pct::text
      FROM pricing_policies
      WHERE frente_id = ${pgesc(product.frente_id)}
      ORDER BY nome ASC
      LIMIT 1
    `)
  }

  if (!policy) return null

  const metodo: MetodoPrecificacao = policy.tecnica === 'MARGIN' ? 'MARGEM' : 'MARKUP'
  const parametro = metodo === 'MARKUP'
    ? Number(policy.markup_pct)
    : Number(policy.margem_pct)

  if (!parametro || parametro <= 0) return null

  return criarReview(product, snapshot, policy, metodo, parametro)
}

/**
 * Precifica com metodo+parametro manuais (override).
 * Ainda vincula ao último snapshot para manter integridade.
 */
export async function precificarProduto(
  productId: string,
  metodo: MetodoPrecificacao,
  parametro: number
): Promise<PrecificacaoResult | null> {
  const product = await pgqueryone<ProductRow>(`
    SELECT
      p.id, p.sku, p.nome, p.frente_id, p.pricing_policy_id,
      p.custo_vigente, p.preco_venda_vigente,
      fn.nome AS frente_nome
    FROM products p
    LEFT JOIN frentes_negocio fn ON fn.id = p.frente_id
    WHERE p.id = ${pgesc(productId)} AND p.ativo = true
  `)

  if (!product || !product.custo_vigente) return null

  const snapshot = await getLastSnapshot(productId)
  if (!snapshot) return null

  return criarReview(product, snapshot, null, metodo, parametro)
}

/**
 * Aprova uma pricing_review: aplica preco_aprovado ao produto.
 */
export async function aprovarReview(
  reviewId: string,
): Promise<{ product_id: string; preco_aplicado: number } | null> {
  const review = await pgqueryone<{
    id: string
    product_id: string
    preco_sugerido: string
    status: string
  }>(`
    SELECT id, product_id, preco_sugerido, status
    FROM pricing_reviews
    WHERE id = ${pgesc(reviewId)}
  `)

  if (!review || review.status !== 'pending') return null

  const preco = Number(review.preco_sugerido)

  await pgquery(`
    UPDATE products
    SET
      preco_venda_vigente       = ${pgesc(preco)},
      sync_status_bling         = 'pending',
      ultima_revisao_preco_id   = ${pgesc(reviewId)},
      updated_at                = now()
    WHERE id = ${pgesc(review.product_id)}
  `)

  await pgquery(`
    UPDATE pricing_reviews
    SET
      status        = 'approved',
      preco_aprovado = ${pgesc(preco)},
      aprovado_em   = now()
    WHERE id = ${pgesc(reviewId)}
  `)

  return { product_id: review.product_id, preco_aplicado: preco }
}

/**
 * Rejeita uma pricing_review.
 */
export async function rejeitarReview(
  reviewId: string,
  motivo?: string
): Promise<boolean> {
  await pgquery(`
    UPDATE pricing_reviews
    SET
      status          = 'rejected',
      motivo_rejeicao = ${motivo ? pgesc(motivo) : 'NULL'}
    WHERE id = ${pgesc(reviewId)} AND status = 'pending'
  `)
  return true
}

/**
 * Precifica em lote todos os produtos com custo_vigente e frente definidos.
 * Usa precificarPorFrente para cada um.
 */
export async function precificarLote(): Promise<{
  total: number
  criadas: number
  sem_snapshot: number
  sem_policy: number
  erros: number
}> {
  const produtos = await pgquery<{ id: string }>(`
    SELECT id FROM products
    WHERE ativo = true
      AND custo_vigente IS NOT NULL
      AND custo_vigente > 0
      AND frente_id IS NOT NULL
    ORDER BY nome ASC
  `)

  let criadas = 0, sem_snapshot = 0, sem_policy = 0, erros = 0

  for (const p of produtos) {
    try {
      const r = await precificarPorFrente(p.id)
      if (r)      criadas++
      else        sem_policy++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('snapshot')) sem_snapshot++
      else erros++
    }
  }

  return { total: produtos.length, criadas, sem_snapshot, sem_policy, erros }
}
