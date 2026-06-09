/**
 * Utilitários de formatação numérica para o PriceIQ.
 *
 * pgquery retorna TODOS os valores numéricos como strings — por isso
 * todas as funções aceitam `number | string | null | undefined` e
 * fazem o cast para Number() antes de formatar.
 */

type Num = number | string | null | undefined

/** Formata valor monetário em BRL com 2 casas decimais. Ex: 1234.5 → "1.234,50" */
export function fmtMoeda(v: Num): string {
  const n = Number(v)
  if (v == null || isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Formata número genérico com N casas decimais. */
export function fmtNum(v: Num, casas = 2): string {
  const n = Number(v)
  if (v == null || isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

/** Formata percentual. Ex: 78.25 → "78,25%" */
export function fmtPct(v: Num, casas = 2): string {
  const n = Number(v)
  if (v == null || isNaN(n)) return '—'
  return `${n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`
}

/** Calcula margem e retorna string formatada. */
export function fmtMargem(custo: Num, preco: Num, casas = 1): string {
  const c = Number(custo), p = Number(preco)
  if (!custo || !preco || isNaN(c) || isNaN(p) || p === 0) return '—'
  return fmtPct(((p - c) / p) * 100, casas)
}
