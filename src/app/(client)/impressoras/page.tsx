export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { ImpressorasClient } from './impressoras-client'

export default async function ImpressorasPage() {
  const supabase = await createClient()

  const { data: impressoras } = await (supabase as any)
    .from('impressoras')
    .select('*')
    .order('fabricante', { ascending: true })
    .order('modelo', { ascending: true })

  return (
    <div className="container py-8">
      <ImpressorasClient impressoras={impressoras ?? []} />
    </div>
  )
}
