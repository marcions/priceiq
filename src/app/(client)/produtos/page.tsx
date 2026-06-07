export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { ProdutosClient } from './produtos-client'

export default async function ProdutosPage() {
  const supabase = await createClient()

  const [
    { data: produtos },
    { data: categorias },
    { data: fornecedores },
    { data: costPolicies },
    { data: pricingPolicies },
  ] = await Promise.all([
    supabase
      .from('products')
      .select('*, categories(nome), suppliers(nome)')
      .order('nome'),
    supabase.from('categories').select('id, nome').order('nome'),
    supabase.from('suppliers').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('cost_policies').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('pricing_policies').select('id, nome').eq('ativo', true).order('nome'),
  ])

  return (
    <div className="container py-8">
      <ProdutosClient
        produtos={produtos ?? []}
        categorias={categorias ?? []}
        fornecedores={fornecedores ?? []}
        costPolicies={costPolicies ?? []}
        pricingPolicies={pricingPolicies ?? []}
      />
    </div>
  )
}
