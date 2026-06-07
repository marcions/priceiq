'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/lib/supabase/types'

type ProductInsert = Database['public']['Tables']['products']['Insert']
type ProductUpdate = Database['public']['Tables']['products']['Update']

export async function createProduto(data: ProductInsert) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('products').insert(data)
    if (error) throw error
    revalidatePath('/produtos')
    return { success: true as const }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar produto' }
  }
}

export async function updateProduto(id: string, data: ProductUpdate) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('products').update(data).eq('id', id)
    if (error) throw error
    revalidatePath('/produtos')
    return { success: true as const }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar produto' }
  }
}

export async function deleteProduto(id: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
    revalidatePath('/produtos')
    return { success: true as const }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro ao excluir produto' }
  }
}

export async function toggleProduto(id: string, ativo: boolean) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('products').update({ ativo }).eq('id', id)
    if (error) throw error
    revalidatePath('/produtos')
    return { success: true as const }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar status do produto' }
  }
}
