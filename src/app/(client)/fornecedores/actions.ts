'use server'

import { pgquery, pgesc } from '@/lib/db/query'
import { revalidatePath } from 'next/cache'

interface FornecedorData {
  nome: string
  cnpj?: string | null
  ativo?: boolean
}

export async function createFornecedor(data: FornecedorData) {
  try {
    await pgquery(`
      INSERT INTO suppliers (nome, cnpj, ativo)
      VALUES (${pgesc(data.nome)}, ${pgesc(data.cnpj ?? null)}, ${data.ativo !== false ? 'TRUE' : 'FALSE'})
    `)
    revalidatePath('/fornecedores')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar fornecedor' }
  }
}

export async function updateFornecedor(id: string, data: FornecedorData) {
  try {
    await pgquery(`
      UPDATE suppliers
      SET nome = ${pgesc(data.nome)},
          cnpj = ${pgesc(data.cnpj ?? null)},
          ativo = ${data.ativo !== false ? 'TRUE' : 'FALSE'}
      WHERE id = ${pgesc(id)}
    `)
    revalidatePath('/fornecedores')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar fornecedor' }
  }
}

export async function deleteFornecedor(id: string) {
  try {
    await pgquery(`DELETE FROM suppliers WHERE id = ${pgesc(id)}`)
    revalidatePath('/fornecedores')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao excluir fornecedor' }
  }
}
