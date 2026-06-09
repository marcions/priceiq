export const dynamic = 'force-dynamic'

import { pgquery } from '@/lib/db/query'
import { EquipamentosClient } from './equipamentos-client'

export default async function EquipamentosPage() {
  const equipamentos = await pgquery(`
    SELECT *, COALESCE(quantidade_propria, 0) AS quantidade_propria
    FROM impressoras
    ORDER BY quantidade_propria DESC, fabricante ASC, modelo ASC
  `)

  return (
    <div className="container py-8">
      <EquipamentosClient equipamentos={equipamentos} />
    </div>
  )
}
