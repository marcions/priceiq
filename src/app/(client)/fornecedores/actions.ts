'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface FornecedorData {
  nome: string
  cnpj?: string | null
  ativo?: boolean
}

export async function createFornecedor(data: FornecedorData) {
  try {
    const supabase = await createServiceClient()
    const { error } = await supabase.from('suppliers').insert({
      nome: data.nome,
      cnpj: data.cnpj || null,
      ativo: data.ativo ?? true,
    })
    if (error) throw error
    revalidatePath('/fornecedores')
    return { success: true }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar fornecedor' }
  }
}

export async function updateFornecedor(id: string, data: FornecedorData) {
  try {
    const supabase = await createServiceClient()
    const { error } = await supabase
      .from('suppliers')
      .update({
        nome: data.nome,
        cnpj: data.cnpj || null,
        ativo: data.ativo ?? true,
      })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/fornecedores')
    return { success: true }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar fornecedor' }
  }
}

export async function deleteFornecedor(id: string) {
  try {
    const supabase = await createServiceClient()
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (error) throw error
    revalidatePath('/fornecedores')
    return { success: true }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro ao excluir fornecedor' }
  }
}
