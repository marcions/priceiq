'use server'

import { pgquery, pgesc } from '@/lib/db/query'
import { revalidatePath } from 'next/cache'
import { Database } from '@/lib/supabase/types'

type PricingPolicyInsert = Database['public']['Tables']['pricing_policies']['Insert']
type PricingPolicyUpdate = Database['public']['Tables']['pricing_policies']['Update']

export async function createPricingPolicy(data: PricingPolicyInsert) {
  try {
    await pgquery(`
      INSERT INTO pricing_policies (nome, tecnica, markup_pct, margem_pct, preco_minimo, preco_maximo, arredondamento, scope, scope_id, frente_id, ativo)
      VALUES (
        ${pgesc(data.nome)},
        ${pgesc(data.tecnica ?? 'MARKUP')},
        ${pgesc(data.markup_pct ?? null)},
        ${pgesc(data.margem_pct ?? null)},
        ${pgesc(data.preco_minimo ?? null)},
        ${pgesc(data.preco_maximo ?? null)},
        ${pgesc(data.arredondamento ?? 'none')},
        ${pgesc(data.scope ?? 'global')},
        ${pgesc(data.scope_id ?? null)},
        ${pgesc((data as Record<string, unknown>).frente_id ?? null)},
        ${data.ativo !== false ? 'TRUE' : 'FALSE'}
      )
    `)
    revalidatePath('/configuracoes/precificacao')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar política de precificação.' }
  }
}

export async function updatePricingPolicy(id: string, data: PricingPolicyUpdate) {
  try {
    const sets: string[] = []
    if (data.nome !== undefined) sets.push(`nome = ${pgesc(data.nome)}`)
    if (data.tecnica !== undefined) sets.push(`tecnica = ${pgesc(data.tecnica)}`)
    if (data.markup_pct !== undefined) sets.push(`markup_pct = ${pgesc(data.markup_pct)}`)
    if (data.margem_pct !== undefined) sets.push(`margem_pct = ${pgesc(data.margem_pct)}`)
    if (data.preco_minimo !== undefined) sets.push(`preco_minimo = ${pgesc(data.preco_minimo)}`)
    if (data.preco_maximo !== undefined) sets.push(`preco_maximo = ${pgesc(data.preco_maximo)}`)
    if (data.arredondamento !== undefined) sets.push(`arredondamento = ${pgesc(data.arredondamento)}`)
    if (data.scope !== undefined) sets.push(`scope = ${pgesc(data.scope)}`)
    if (data.scope_id !== undefined) sets.push(`scope_id = ${pgesc(data.scope_id)}`)
    if (data.ativo !== undefined) sets.push(`ativo = ${data.ativo ? 'TRUE' : 'FALSE'}`)
    if (sets.length === 0) return { success: true }

    await pgquery(`UPDATE pricing_policies SET ${sets.join(', ')} WHERE id = ${pgesc(id)}`)
    revalidatePath('/configuracoes/precificacao')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar política de precificação.' }
  }
}

export async function deletePricingPolicy(id: string) {
  try {
    await pgquery(`DELETE FROM pricing_policies WHERE id = ${pgesc(id)}`)
    revalidatePath('/configuracoes/precificacao')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao excluir política de precificação.' }
  }
}
