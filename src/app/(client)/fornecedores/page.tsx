export const dynamic = 'force-dynamic'

import { pgquery } from '@/lib/db/query'
import { FornecedoresClient } from './fornecedores-client'

interface FornecedorRow {
  id: string
  nome: string
  cnpj: string | null
  bling_id: string | null
  ativo: boolean
  created_at: string
}

export default async function FornecedoresPage() {
  let fornecedores: FornecedorRow[] = []
  try {
    fornecedores = await pgquery<FornecedorRow>(
      'SELECT id, nome, cnpj, bling_id, ativo, created_at FROM suppliers ORDER BY nome ASC'
    )
  } catch (err) {
    console.error('Erro ao carregar fornecedores:', err)
  }

  return (
    <div className="container py-8">
      <FornecedoresClient fornecedores={fornecedores} />
    </div>
  )
}
