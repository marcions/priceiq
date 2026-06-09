export const dynamic = 'force-dynamic'

import { pgquery } from '@/lib/db/query'
import { EquipamentosClient } from './equipamentos-client'

export default async function EquipamentosPage() {
  // Garante que a coluna existe (idempotente — IF NOT EXISTS)
  await pgquery(`
    ALTER TABLE impressoras
      ADD COLUMN IF NOT EXISTS quantidade_propria integer NOT NULL DEFAULT 0
  `).catch(() => {
    // Ignora erro se coluna já existe (alguns drivers retornam erro para IF NOT EXISTS)
  })

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
