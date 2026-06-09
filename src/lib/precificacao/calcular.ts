/**
 * Motor de Precificação — Semana 5
 *
 * Métodos suportados:
 *   MARKUP  → preço = custo × (1 + markup/100)
 *   MARGEM  → preço = custo / (1 − margem/100)
 *
 * Cria um registro em pricing_reviews com status 'pending'.
 * O preço só é aplicado ao produto após aprovação explícita.
 */

import { pgquery, pgqueryone, pgesc } from '@/lib/db/query'

export type MetodoPrecificacao = 'MARKUP' | 'MARGEM'

export type PrecificacaoResult = {
  review_id: string
  product_id: string
  sku: string
  nome: string
  custo_base: number
  metodo: MetodoPrecificacao
  parametro: number
  preco_sugerido: number
  preco_atual: number | null
  variacao_pct: number | null  // % de variação em relação ao preço atual
  margem_resultante: number    // margem calculada do preço sugerido
}

type ProductRow = {
  id: string
  sku: string
  nome: string
  custo_vigente: string | null
  preco_venda_vigente: string | null
}

/** Calcula preço sugerido sem gravar */
export function calcularPrecoSugerido(
  custo: number,
  metodo: MetodoPrecificacao,
  parametro: number
): number {
  if (metodo === 'MARKUP') {
    return custo * (1 + parametro / 100)
  }
  // MARGEM: preço = custo / (1 - margem/100)
  const divisor = 1 - parametro / 100
  if (divisor <= 0) throw new Error('Margem deve ser < 100%')
  return custo / divisor
}

/** Calcula a margem percentual de um preço dado o custo */
export function calcularMargem(custo: number, preco: number): number {
  if (preco === 0) return 0
  return ((preco - custo) / preco) * 100
}

/**
 * Precifica um produto e cria uma pricing_review pendente.
 * Qualquer review anterior para o mesmo produto é marcada como 'superseded'.
 */
export async function precificarProduto(
  productId: string,
  metodo: MetodoPrecificacao,
  parametro: number
): Promise<PrecificacaoResult | null> {
  const product = await pgqueryone<ProductRow>(`
    SELECT id, sku, nome, custo_vigente, preco_venda_vigente
    FROM products
    WHERE id = ${pgesc(productId)} AND ativo = true
  `)

  if (!product || !product.custo_vigente) return null

  const custo = Number(product.custo_vigente)
  const precoAtual = product.preco_venda_vigente ? Number(product.preco_venda_vigente) : null

  let preco: number
  try {
    preco = calcularPrecoSugerido(custo, metodo, parametro)
  } catch {
    return null
  }

  // Marca reviews pendentes anteriores como superseded
  await pgquery(`
    UPDATE pricing_reviews
    SET status = 'superseded', revisado_em = now()
    WHERE product_id = ${pgesc(productId)} AND status = 'pending'
  `)

  // Cria nova review
  const row = await pgqueryone<{ id: string }>(`
    INSERT INTO pricing_reviews (
      product_id, custo_base, metodo, parametro,
      preco_sugerido, preco_atual
    ) VALUES (
      ${pgesc(productId)},
      ${pgesc(custo)},
      ${pgesc(metodo)},
      ${pgesc(parametro)},
      ${pgesc(preco)},
      ${precoAtual !== null ? pgesc(precoAtual) : 'NULL'}
    )
    RETURNING id
  `)

  if (!row) return null

  const variacaoPct = precoAtual ? ((preco - precoAtual) / precoAtual) * 100 : null
  const margemResultante = calcularMargem(custo, preco)

  return {
    review_id: row.id,
    product_id: product.id,
    sku: product.sku,
    nome: product.nome,
    custo_base: custo,
    metodo,
    parametro,
    preco_sugerido: preco,
    preco_atual: precoAtual,
    variacao_pct: variacaoPct,
    margem_resultante: margemResultante,
  }
}

/**
 * Aprova uma pricing_review: aplica preco_sugerido ao produto.
 */
export async function aprovarReview(
  reviewId: string,
  nota?: string
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

  // Aplica ao produto
  await pgquery(`
    UPDATE products
    SET
      preco_venda_vigente = ${pgesc(preco)},
      sync_status_bling = 'pending',
      ultima_revisao_preco_id = ${pgesc(reviewId)},
      updated_at = now()
    WHERE id = ${pgesc(review.product_id)}
  `)

  // Marca review como approved
  await pgquery(`
    UPDATE pricing_reviews
    SET
      status = 'approved',
      revisado_em = now()
      ${nota ? `, nota = ${pgesc(nota)}` : ''}
    WHERE id = ${pgesc(reviewId)}
  `)

  return { product_id: review.product_id, preco_aplicado: preco }
}

/**
 * Rejeita uma pricing_review.
 */
export async function rejeitarReview(
  reviewId: string,
  nota?: string
): Promise<boolean> {
  await pgquery(`
    UPDATE pricing_reviews
    SET
      status = 'rejected',
      revisado_em = now()
      ${nota ? `, nota = ${pgesc(nota)}` : ''}
    WHERE id = ${pgesc(reviewId)} AND status = 'pending'
  `)
  return true
}

/**
 * Precifica em lote todos os produtos com custo_vigente definido.
 */
export async function precificarLote(
  metodo: MetodoPrecificacao,
  parametro: number
): Promise<{ total: number; criadas: number; erros: number }> {
  const produtos = await pgquery<ProductRow>(`
    SELECT id, sku, nome, custo_vigente, preco_venda_vigente
    FROM products
    WHERE ativo = true AND custo_vigente IS NOT NULL AND custo_vigente > 0
    ORDER BY nome ASC
  `)

  let criadas = 0
  let erros = 0

  for (const p of produtos) {
    try {
      const r = await precificarProduto(p.id, metodo, parametro)
      if (r) criadas++
      else erros++
    } catch {
      erros++
    }
  }

  return { total: produtos.length, criadas, erros }
}
