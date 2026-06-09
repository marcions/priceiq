export const dynamic = 'force-dynamic'

import { pgquery } from '@/lib/db/query'
import { FilamentosClient } from './filamentos-client'

export default async function FilamentosPage() {
  const filamentos = await pgquery(`
    SELECT * FROM filamentos
    ORDER BY fabricante ASC, modelo ASC
  `)

  return (
    <div className="container py-8">
      <FilamentosClient filamentos={filamentos} />
    </div>
  )
}
