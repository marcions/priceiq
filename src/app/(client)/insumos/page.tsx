export const dynamic = 'force-dynamic'

import { pgquery } from '@/lib/db/query'
import { InsumosClient } from './insumos-client'

export default async function InsumosPage() {
  const insumos = await pgquery(`
    SELECT * FROM filamentos
    ORDER BY fabricante ASC, modelo ASC
  `)

  return (
    <div className="container py-8">
      <InsumosClient insumos={insumos} />
    </div>
  )
}
