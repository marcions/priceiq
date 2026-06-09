export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { CategoriasClient } from './categorias-client'

export default async function CategoriasPage() {
  const supabase = await createServiceClient()

  const { data: categorias } = await supabase
    .from('categories')
    .select('id, nome, parent_id, ordem, bling_id, created_at')
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })

  const rows = (categorias ?? []).map((cat) => ({
    ...cat,
    parent_nome: cat.parent_id
      ? (categorias ?? []).find((c) => c.id === cat.parent_id)?.nome ?? null
      : null,
  }))

  return (
    <div className="container py-8">
      <CategoriasClient categorias={rows} />
    </div>
  )
}
