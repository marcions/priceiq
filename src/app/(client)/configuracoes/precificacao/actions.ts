'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/lib/supabase/types'

type PricingPolicyInsert = Database['public']['Tables']['pricing_policies']['Insert']
type PricingPolicyUpdate = Database['public']['Tables']['pricing_policies']['Update']

export async function createPricingPolicy(data: PricingPolicyInsert) {
  try {
    const supabase = await createServiceClient()
    const { error } = await supabase.from('pricing_policies').insert(data)
    if (error) return { error: error.message }
    revalidatePath('/configuracoes/precificacao')
    return { success: true }
  } catch (err) {
    return { error: 'Erro inesperado ao criar política de precificação.' }
  }
}

export async function updatePricingPolicy(id: string, data: PricingPolicyUpdate) {
  try {
    const supabase = await createServiceClient()
    const { error } = await supabase.from('pricing_policies').update(data).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/configuracoes/precificacao')
    return { success: true }
  } catch (err) {
    return { error: 'Erro inesperado ao atualizar política de precificação.' }
  }
}

export async function deletePricingPolicy(id: string) {
  try {
    const supabase = await createServiceClient()
    const { error } = await supabase.from('pricing_policies').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/configuracoes/precificacao')
    return { success: true }
  } catch (err) {
    return { error: 'Erro inesperado ao excluir política de precificação.' }
  }
}
