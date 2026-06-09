export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { PrecificacaoClient } from './precificacao-client'

export default async function PrecificacaoPoliciesPage() {
  const supabase = await createServiceClient()
  const { data: policies, error } = await supabase
    .from('pricing_policies')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao carregar políticas de precificação:', error)
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Políticas de Precificação</h1>
        <p className="text-muted-foreground">
          Configure as regras de markup e margem para calcular os preços de venda.
        </p>
      </div>
      <PrecificacaoClient policies={policies ?? []} />
    </div>
  )
}
