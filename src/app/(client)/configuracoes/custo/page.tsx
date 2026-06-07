export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { CustoClient } from './custo-client'

export default async function CustoPoliciesPage() {
  const supabase = await createClient()
  const { data: policies, error } = await supabase
    .from('cost_policies')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao carregar políticas de custo:', error)
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Políticas de Custo</h1>
        <p className="text-muted-foreground">
          Configure como o custo dos produtos é calculado para precificação.
        </p>
      </div>
      <CustoClient policies={policies ?? []} />
    </div>
  )
}
