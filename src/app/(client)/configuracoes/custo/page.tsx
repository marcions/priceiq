export const dynamic = 'force-dynamic'

import { pgquery } from '@/lib/db/query'
import { CustoClient } from './custo-client'
import type { Database } from '@/lib/supabase/types'

type CostPolicyRow = Database['public']['Tables']['cost_policies']['Row']

export default async function CustoPoliciesPage() {
  let policies: CostPolicyRow[] = []
  try {
    policies = await pgquery<CostPolicyRow>(
      'SELECT * FROM cost_policies ORDER BY created_at DESC'
    )
  } catch (err) {
    console.error('Erro ao carregar políticas de custo:', err)
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Políticas de Custo</h1>
        <p className="text-muted-foreground">
          Configure como o custo dos produtos é calculado para precificação.
        </p>
      </div>
      <CustoClient policies={policies} />
    </div>
  )
}
