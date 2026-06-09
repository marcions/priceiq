export const dynamic = 'force-dynamic'

import { pgquery } from '@/lib/db/query'
import { CategoriasClient } from './categorias-client'

interface CategoriaRow {
  id: string
  nome: string
  parent_id: string | null
  ordem: number
  bling_id: string | null
  created_at: string
  parent_nome?: string | null
}

export default async function CategoriasPage() {
  let rows: CategoriaRow[] = []
  try {
    const categorias = await pgquery<CategoriaRow>(
      'SELECT id, nome, parent_id, ordem, bling_id, created_at FROM categories ORDER BY ordem ASC, nome ASC'
    )
    rows = categorias.map((cat) => ({
      ...cat,
      parent_nome: cat.parent_id
        ? (categorias.find((c) => c.id === cat.parent_id)?.nome ?? null)
        : null,
    }))
  } catch (err) {
    console.error('Erro ao carregar categorias:', err)
  }

  return (
    <div className="container py-8">
      <CategoriasClient categorias={rows} />
    </div>
  )
}
