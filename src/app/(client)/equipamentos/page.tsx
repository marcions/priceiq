export const dynamic = 'force-dynamic'

import { pgquery } from '@/lib/db/query'
import { EquipamentosClient } from './equipamentos-client'

export default async function EquipamentosPage() {
  // SELECT * já inclui quantidade_propria (NOT NULL DEFAULT 0)
  // Não usar COALESCE alias aqui — duplicaria o nome da coluna (400 do pg-meta)
  const equipamentos = await pgquery(`
    SELECT *
    FROM impressoras
    ORDER BY fabricante ASC, modelo ASC
  `)

  return (
    <div className="container py-8">
      <EquipamentosClient equipamentos={equipamentos as Parameters<typeof EquipamentosClient>[0]['equipamentos']} />
    </div>
  )
}
