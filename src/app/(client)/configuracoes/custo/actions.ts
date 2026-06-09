'use server'

import { pgquery, pgesc } from '@/lib/db/query'
import { revalidatePath } from 'next/cache'
import { Database } from '@/lib/supabase/types'

type CostPolicyInsert = Database['public']['Tables']['cost_policies']['Insert']
type CostPolicyUpdate = Database['public']['Tables']['cost_policies']['Update']

export async function createCostPolicy(data: CostPolicyInsert) {
  try {
    await pgquery(`
      INSERT INTO cost_policies (nome, metodo, periodo_dias, periodo_qtd_pedidos, incluir_frete, incluir_impostos, scope, scope_id, frente_id, ativo)
      VALUES (
        ${pgesc(data.nome)},
        ${pgesc(data.metodo ?? 'LAST')},
        ${pgesc(data.periodo_dias ?? null)},
        ${pgesc(data.periodo_qtd_pedidos ?? null)},
        ${data.incluir_frete ? 'TRUE' : 'FALSE'},
        ${data.incluir_impostos ? 'TRUE' : 'FALSE'},
        ${pgesc(data.scope ?? 'global')},
        ${pgesc(data.scope_id ?? null)},
        ${pgesc((data as Record<string, unknown>).frente_id ?? null)},
        ${data.ativo !== false ? 'TRUE' : 'FALSE'}
      )
    `)
    revalidatePath('/configuracoes/custo')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar política de custo.' }
  }
}

export async function updateCostPolicy(id: string, data: CostPolicyUpdate) {
  try {
    const sets: string[] = []
    if (data.nome !== undefined) sets.push(`nome = ${pgesc(data.nome)}`)
    if (data.metodo !== undefined) sets.push(`metodo = ${pgesc(data.metodo)}`)
    if (data.periodo_dias !== undefined) sets.push(`periodo_dias = ${pgesc(data.periodo_dias)}`)
    if (data.periodo_qtd_pedidos !== undefined) sets.push(`periodo_qtd_pedidos = ${pgesc(data.periodo_qtd_pedidos)}`)
    if (data.incluir_frete !== undefined) sets.push(`incluir_frete = ${data.incluir_frete ? 'TRUE' : 'FALSE'}`)
    if (data.incluir_impostos !== undefined) sets.push(`incluir_impostos = ${data.incluir_impostos ? 'TRUE' : 'FALSE'}`)
    if (data.scope !== undefined) sets.push(`scope = ${pgesc(data.scope)}`)
    if (data.scope_id !== undefined) sets.push(`scope_id = ${pgesc(data.scope_id)}`)
    if (data.ativo !== undefined) sets.push(`ativo = ${data.ativo ? 'TRUE' : 'FALSE'}`)
    if (sets.length === 0) return { success: true }

    await pgquery(`UPDATE cost_policies SET ${sets.join(', ')} WHERE id = ${pgesc(id)}`)
    revalidatePath('/configuracoes/custo')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar política de custo.' }
  }
}

export async function deleteCostPolicy(id: string) {
  try {
    await pgquery(`DELETE FROM cost_policies WHERE id = ${pgesc(id)}`)
    revalidatePath('/configuracoes/custo')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao excluir política de custo.' }
  }
}
