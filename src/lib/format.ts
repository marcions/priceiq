/**
 * Utilitários de formatação numérica para o PriceIQ.
 *
 * NÃO usa toLocaleString/Intl — o Node.js no Alpine Linux não tem dados
 * ICU completos, causando fallback silencioso para en-US (vírgula como
 * separador de milhar em vez de ponto).
 *
 * pgquery retorna TODOS os valores numéricos como strings — todas as
 * funções aceitam `number | string | null | undefined`.
 */

type Num = number | string | null | undefined

/**
 * Formata um número no padrão pt-BR sem depender de Intl/ICU.
 * Ex: 177800.5 → "177.800,50"
 */
function formatBR(n: number, casas: number): string {
  const fixed = Math.abs(n).toFixed(casas)
  const [intPart, decPart] = fixed.split('.')
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const sign = n < 0 ? '-' : ''
  return decPart !== undefined && casas > 0
    ? `${sign}${intFormatted},${decPart}`
    : `${sign}${intFormatted}`
}

/** Formata valor monetário em BRL com 2 casas decimais. Ex: 1234.5 → "1.234,50" */
export function fmtMoeda(v: Num): string {
  const n = Number(v)
  if (v == null || isNaN(n)) return '—'
  return formatBR(n, 2)
}

/** Formata número genérico com N casas decimais. Ex: 177800 → "177.800" */
export function fmtNum(v: Num, casas = 2): string {
  const n = Number(v)
  if (v == null || isNaN(n)) return '—'
  return formatBR(n, casas)
}

/** Formata percentual. Ex: 78.25 → "78,25%" */
export function fmtPct(v: Num, casas = 2): string {
  const n = Number(v)
  if (v == null || isNaN(n)) return '—'
  return `${formatBR(n, casas)}%`
}

/** Calcula margem e retorna string formatada. */
export function fmtMargem(custo: Num, preco: Num, casas = 1): string {
  const c = Number(custo), p = Number(preco)
  if (!custo || !preco || isNaN(c) || isNaN(p) || p === 0) return '—'
  return fmtPct(((p - c) / p) * 100, casas)
}
