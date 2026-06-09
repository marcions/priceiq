export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { FornecedoresClient } from './fornecedores-client'

export default async function FornecedoresPage() {
  const supabase = await createServiceClient()

  const { data: fornecedores } = await supabase
    .from('suppliers')
    .select('id, nome, cnpj, bling_id, ativo, created_at')
    .order('nome', { ascending: true })

  return (
    <div className="container py-8">
      <FornecedoresClient fornecedores={fornecedores ?? []} />
    </div>
  )
}
