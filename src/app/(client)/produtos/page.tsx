export const dynamic = 'force-dynamic'

import { pgquery } from '@/lib/db/query'
import { ProdutosClient } from './produtos-client'
import type { Database } from '@/lib/supabase/types'

type ProductRow = Database['public']['Tables']['products']['Row']
type ProductWithRelations = ProductRow & {
  categories: { nome: string } | null
  suppliers: { nome: string } | null
}

export default async function ProdutosPage() {
  const [produtos, categorias, fornecedores, costPolicies, pricingPolicies] =
    await Promise.all([
      pgquery<ProductWithRelations & { category_nome: string | null; supplier_nome: string | null }>(`
        SELECT p.*,
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
      pgquery<{ id: string; nome: string }>(`
        SELECT id, nome FROM categories ORDER BY nome
      `),
      pgquery<{ id: string; nome: string }>(`
        SELECT id, nome FROM suppliers WHERE ativo = true ORDER BY nome
      `),
      pgquery<{ id: string; nome: string }>(`
        SELECT id, nome FROM cost_policies WHERE ativo = true ORDER BY nome
      `),
      pgquery<{ id: string; nome: string }>(`
        SELECT id, nome FROM pricing_policies WHERE ativo = true ORDER BY nome
      `),
    ])

  return (
    <div className="container py-8">
      <ProdutosClient
        produtos={produtos}
        categorias={categorias}
        fornecedores={fornecedores}
        costPolicies={costPolicies}
        pricingPolicies={pricingPolicies}
      />
    </div>
  )
}
