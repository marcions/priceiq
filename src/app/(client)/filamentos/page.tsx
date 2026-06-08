export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { FilamentosClient } from './filamentos-client'

export default async function FilamentosPage() {
  const supabase = await createClient()

  // filamentos é tabela customizada — sem tipos gerados, usa cast
  const { data: filamentos } = await (supabase as any)
    .from('filamentos')
    .select('*')
    .order('fabricante', { ascending: true })
    .order('modelo', { ascending: true })

  return (
    <div className="container py-8">
      <FilamentosClient filamentos={filamentos ?? []} />
    </div>
  )
}
