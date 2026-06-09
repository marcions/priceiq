'use server'

import { pgquery, pgesc } from '@/lib/db/query'
import { revalidatePath } from 'next/cache'

interface CategoriaData {
  nome: string
  parent_id?: string | null
  ordem?: number
}

export async function createCategoria(data: CategoriaData) {
  try {
    await pgquery(`
      INSERT INTO categories (nome, parent_id, ordem)
      VALUES (${pgesc(data.nome)}, ${pgesc(data.parent_id ?? null)}, ${pgesc(data.ordem ?? 0)})
    `)
    revalidatePath('/categorias')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar categoria' }
  }
}

export async function updateCategoria(id: string, data: CategoriaData) {
  try {
    await pgquery(`
      UPDATE categories
      SET nome = ${pgesc(data.nome)},
          parent_id = ${pgesc(data.parent_id ?? null)},
          ordem = ${pgesc(data.ordem ?? 0)}
      WHERE id = ${pgesc(id)}
    `)
    revalidatePath('/categorias')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar categoria' }
  }
}

export async function deleteCategoria(id: string) {
  try {
    await pgquery(`DELETE FROM categories WHERE id = ${pgesc(id)}`)
    revalidatePath('/categorias')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao excluir categoria' }
  }
}
