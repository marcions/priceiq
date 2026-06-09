export const dynamic = 'force-dynamic'

import { pgquery } from '@/lib/db/query'
import { PrecificacaoClient } from './precificacao-client'
import type { Database } from '@/lib/supabase/types'

type PricingPolicyRow = Database['public']['Tables']['pricing_policies']['Row']

export default async function PrecificacaoPoliciesPage() {
  let policies: PricingPolicyRow[] = []
  try {
    policies = await pgquery<PricingPolicyRow>(
      'SELECT * FROM pricing_policies ORDER BY created_at DESC'
    )
  } catch (err) {
    console.error('Erro ao carregar políticas de precificação:', err)
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Políticas de Precificação</h1>
        <p className="text-muted-foreground">
          Configure as regras de markup e margem para calcular os preços de venda.
        </p>
      </div>
      <PrecificacaoClient policies={policies} />
    </div>
  )
}
