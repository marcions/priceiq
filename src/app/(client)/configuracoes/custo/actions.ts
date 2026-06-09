'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/lib/supabase/types'

type CostPolicyInsert = Database['public']['Tables']['cost_policies']['Insert']
type CostPolicyUpdate = Database['public']['Tables']['cost_policies']['Update']

export async function createCostPolicy(data: CostPolicyInsert) {
  try {
    const supabase = await createServiceClient()
    const { error } = await supabase.from('cost_policies').insert(data)
    if (error) return { error: error.message }
    revalidatePath('/configuracoes/custo')
    return { success: true }
  } catch (err) {
    return { error: 'Erro inesperado ao criar política de custo.' }
  }
}

export async function updateCostPolicy(id: string, data: CostPolicyUpdate) {
  try {
    const supabase = await createServiceClient()
    const { error } = await supabase.from('cost_policies').update(data).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/configuracoes/custo')
    return { success: true }
  } catch (err) {
    return { error: 'Erro inesperado ao atualizar política de custo.' }
  }
}

export async function deleteCostPolicy(id: string) {
  try {
    const supabase = await createServiceClient()
    const { error } = await supabase.from('cost_policies').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/configuracoes/custo')
    return { success: true }
  } catch (err) {
    return { error: 'Erro inesperado ao excluir política de custo.' }
  }
}
