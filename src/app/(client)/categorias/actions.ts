'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface CategoriaData {
  nome: string
  parent_id?: string | null
  ordem?: number
}

export async function createCategoria(data: CategoriaData) {
  try {
    const supabase = await createServiceClient()
    const { error } = await supabase.from('categories').insert({
      nome: data.nome,
      parent_id: data.parent_id || null,
      ordem: data.ordem ?? 0,
    })
    if (error) throw error
    revalidatePath('/categorias')
    return { success: true }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar categoria' }
  }
}

export async function updateCategoria(id: string, data: CategoriaData) {
  try {
    const supabase = await createServiceClient()
    const { error } = await supabase
      .from('categories')
      .update({
        nome: data.nome,
        parent_id: data.parent_id || null,
        ordem: data.ordem ?? 0,
      })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/categorias')
    return { success: true }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar categoria' }
  }
}

export async function deleteCategoria(id: string) {
  try {
    const supabase = await createServiceClient()
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error
    revalidatePath('/categorias')
    return { success: true }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro ao excluir categoria' }
  }
}
