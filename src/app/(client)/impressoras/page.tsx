export const dynamic = 'force-dynamic'

import { pgquery } from '@/lib/db/query'
import { ImpressorasClient } from './impressoras-client'

export default async function ImpressorasPage() {
  const impressoras = await pgquery(`
    SELECT * FROM impressoras
    ORDER BY fabricante ASC, modelo ASC
  `)

  return (
    <div className="container py-8">
      <ImpressorasClient impressoras={impressoras} />
    </div>
  )
}
