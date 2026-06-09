export const dynamic = 'force-dynamic'

import { pgquery } from '@/lib/db/query'
import { unstable_cache } from 'next/cache'
import { ProdutosClient } from './produtos-client'

// Dados estáticos cacheados por 60s — categorias/fornecedores/políticas mudam raramente
const getCachedMeta = unstable_cache(
  async () => {
    const [categorias, fornecedores, costPolicies, pricingPolicies] = await Promise.all([
      pgquery<{ id: string; nome: string }>(`SELECT id, nome FROM categories ORDER BY nome`),
      pgquery<{ id: string; nome: string }>(`SELECT id, nome FROM suppliers WHERE ativo = true ORDER BY nome`),
      pgquery<{ id: string; nome: string }>(`SELECT id, nome FROM cost_policies WHERE ativo = true ORDER BY nome`),
      pgquery<{ id: string; nome: string }>(`SELECT id, nome FROM pricing_policies WHERE ativo = true ORDER BY nome`),
    ])
    return { categorias, fornecedores, costPolicies, pricingPolicies }
  },
  ['produtos-meta'],
  { revalidate: 60 }
)

export default async function ProdutosPage() {
  // Produtos (dinâmico) + metadados (cacheados) em paralelo — 1 round-trip em vez de 5
  const [produtos, meta] = await Promise.all([
    pgquery<{
      id: string; sku: string; nome: string; unidade: string | null
      categoria_id: string | null; fornecedor_principal_id: string | null
      cost_policy_id: string | null; pricing_policy_id: string | null
      bling_id: string | null; fonte: string | null
      custo_vigente: number | null; preco_venda_vigente: number | null
      preco_minimo: number | null; preco_bling: number | null
      sync_status_bling: string | null; ativo: boolean
      ultima_revisao_id: string | null; created_at: string; updated_at: string
      category_nome: string | null; supplier_nome: string | null
    }>(`
      SELECT
        p.id, p.sku, p.nome, p.unidade, p.categoria_id, p.fornecedor_principal_id,
        p.cost_policy_id, p.pricing_policy_id, p.bling_id, p.fonte,
        p.custo_vigente, p.preco_venda_vigente, p.preco_minimo, p.preco_bling,
        p.sync_status_bling, p.ativo, p.ultima_revisao_id, p.created_at, p.updated_at,
        c.nome AS category_nome,
        s.nome AS supplier_nome
      FROM products p
      LEFT JOIN categories c ON c.id = p.categoria_id
      LEFT JOIN suppliers  s ON s.id = p.fornecedor_principal_id
      ORDER BY p.nome
    `).then((rows) =>
      rows.map((r) => ({
        ...r,
        categories: r.category_nome ? { nome: r.category_nome } : null,
        suppliers: r.supplier_nome ? { nome: r.supplier_nome } : null,
      }))
    ),
    getCachedMeta(),
  ])

  return (
    <div className="container py-8">
      <ProdutosClient
        produtos={produtos}
        categorias={meta.categorias}
        fornecedores={meta.fornecedores}
        costPolicies={meta.costPolicies}
        pricingPolicies={meta.pricingPolicies}
      />
    </div>
  )
}
