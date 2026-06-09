'use server'

import { pgquery, pgesc } from '@/lib/db/query'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/lib/supabase/types'

type ProductInsert = Database['public']['Tables']['products']['Insert']
type ProductUpdate = Database['public']['Tables']['products']['Update']

export async function createProduto(data: ProductInsert) {
  try {
    const cols = Object.keys(data).join(', ')
    const vals = Object.values(data).map(pgesc).join(', ')
    await pgquery(`INSERT INTO products (${cols}) VALUES (${vals})`)
    revalidatePath('/produtos')
    return { success: true as const }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar produto' }
  }
}

export async function updateProduto(id: string, data: ProductUpdate) {
  try {
    const set = Object.entries(data)
      .map(([k, v]) => `${k} = ${pgesc(v)}`)
      .join(', ')
    await pgquery(`UPDATE products SET ${set}, updated_at = now() WHERE id = ${pgesc(id)}`)
    revalidatePath('/produtos')
    return { success: true as const }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar produto' }
  }
}

export async function deleteProduto(id: string) {
  try {
    await pgquery(`DELETE FROM products WHERE id = ${pgesc(id)}`)
    revalidatePath('/produtos')
    return { success: true as const }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro ao excluir produto' }
  }
}

export async function toggleProduto(id: string, ativo: boolean) {
  try {
    await pgquery(`UPDATE products SET ativo = ${pgesc(ativo)}, updated_at = now() WHERE id = ${pgesc(id)}`)
    revalidatePath('/produtos')
    return { success: true as const }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar status do produto' }
  }
}
