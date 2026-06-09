export const dynamic = 'force-dynamic'

import { pgquery } from '@/lib/db/query'
import { PrecificacaoClient } from './precificacao-client'

// Aplica migration se ainda não foi
async function ensureTable() {
  await pgquery(`
    CREATE TABLE IF NOT EXISTS pricing_reviews (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id      uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      custo_base      numeric(15,4) NOT NULL,
      metodo          text NOT NULL CHECK (metodo IN ('MARKUP', 'MARGEM')),
      parametro       numeric(8,4)  NOT NULL,
      preco_sugerido  numeric(15,4) NOT NULL,
      preco_atual     numeric(15,4),
      status          text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
      nota            text,
      criado_em       timestamptz NOT NULL DEFAULT now(),
      revisado_em     timestamptz
    )
  `).catch(() => {})

  await pgquery(`
    CREATE INDEX IF NOT EXISTS idx_pricing_reviews_status
      ON pricing_reviews(status, criado_em DESC)
  `).catch(() => {})

  await pgquery(`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS ultima_revisao_preco_id uuid
  `).catch(() => {})
}

export default async function PrecificacaoPage() {
  await ensureTable()

  const [fila, produtos] = await Promise.all([
    pgquery<{
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
      criado_em: string
    }>(`
      SELECT
        pr.id, pr.product_id,
        p.sku, p.nome,
        c.nome AS categoria,
        pr.custo_base, pr.metodo, pr.parametro,
        pr.preco_sugerido, pr.preco_atual, pr.status, pr.criado_em
      FROM pricing_reviews pr
      JOIN products p ON p.id = pr.product_id
      LEFT JOIN categories c ON c.id = p.categoria_id
      WHERE pr.status = 'pending'
      ORDER BY pr.criado_em DESC
    `),
    pgquery<{
      id: string
      sku: string
      nome: string
      categoria: string | null
      custo_vigente: string | null
      preco_venda_vigente: string | null
    }>(`
      SELECT p.id, p.sku, p.nome,
        c.nome AS categoria,
        p.custo_vigente, p.preco_venda_vigente
      FROM products p
      LEFT JOIN categories c ON c.id = p.categoria_id
      WHERE p.ativo = true AND p.custo_vigente IS NOT NULL AND p.custo_vigente > 0
      ORDER BY p.nome ASC
    `),
  ])

  return <PrecificacaoClient filaInicial={fila} produtos={produtos} />
}
