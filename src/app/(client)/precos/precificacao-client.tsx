'use client'

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import {
  Search, Tag, CheckCircle2, XCircle, Zap, ChevronUp, ChevronDown,
  ListChecks, Package, TrendingUp, Clock
} from 'lucide-react'
import { fmtMoeda, fmtNum } from '@/lib/format'
import { toast } from 'sonner'

type FilaItem = {
  id: string
  product_id: string
  sku: string
  nome: string
  categoria: string | null
  custo_base: string
  metodo: string
  parametro: string
  preco_sugerido: string
  preco_atual: string | null
  status: string
  criado_em: string
}

type Produto = {
  id: string
  sku: string
  nome: string
  categoria: string | null
  custo_vigente: string | null
  preco_venda_vigente: string | null
}

type MetodoPrecificacao = 'MARKUP' | 'MARGEM'

function variacaoPct(sugerido: string, atual: string | null): number | null {
  if (!atual) return null
  const s = Number(sugerido), a = Number(atual)
  if (!a) return null
  return ((s - a) / a) * 100
}

function margemResultante(custo: string, preco: string): number {
  const c = Number(custo), p = Number(preco)
  if (!p) return 0
  return ((p - c) / p) * 100
}

function VariacaoBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-gray-6">—</span>
  const positivo = pct >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${positivo ? 'text-green-600' : 'text-red-500'}`}>
      {positivo ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      {fmtNum(Math.abs(pct), 1)}%
    </span>
  )
}

function MargemBadge({ pct }: { pct: number }) {
  const cor = pct >= 50 ? 'text-green-600' : pct >= 30 ? 'text-yellow-600' : 'text-red-500'
  return <span className={`text-xs font-semibold ${cor}`}>{fmtNum(pct, 1)}%</span>
}

export function PrecificacaoClient({
  filaInicial,
  produtos,
}: {
  filaInicial: FilaItem[]
  produtos: Produto[]
}) {
  // ── Fila de aprovação ──────────────────────────────────────
  const [fila, setFila] = useState<FilaItem[]>(filaInicial)
  const [aprovando, setAprovando] = useState<Set<string>>(new Set())
  const [buscaFila, setBuscaFila] = useState('')

  // ── Gerador de preços ──────────────────────────────────────
  const [abaAtiva, setAbaAtiva] = useState<'fila' | 'gerar'>('fila')
  const [metodo, setMetodo] = useState<MetodoPrecificacao>('MARKUP')
  const [parametro, setParametro] = useState('150')   // 150% markup padrão
  const [gerando, setGerando] = useState(false)
  const [buscaProduto, setBuscaProduto] = useState('')

  // ── Helpers ────────────────────────────────────────────────
  const filtraFila = fila.filter(item =>
    buscaFila === '' ||
    item.nome.toLowerCase().includes(buscaFila.toLowerCase()) ||
    item.sku.toLowerCase().includes(buscaFila.toLowerCase())
  )

  const filtraProdutos = produtos.filter(p =>
    buscaProduto === '' ||
    p.nome.toLowerCase().includes(buscaProduto.toLowerCase()) ||
    p.sku.toLowerCase().includes(buscaProduto.toLowerCase())
  )

  // ── KPIs fila ──────────────────────────────────────────────
  const totalFila = fila.length
  const somaFilaPrecos = fila.reduce((a, b) => a + Number(b.preco_sugerido), 0)

  // ── Ações ──────────────────────────────────────────────────
  const aprovar = useCallback(async (id: string, nota?: string) => {
    setAprovando(prev => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/precificacao/${id}/aprovar`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nota }),
      })
      if (!res.ok) throw new Error()
      setFila(prev => prev.filter(i => i.id !== id))
      toast.success('Preço aprovado e aplicado ao produto')
    } catch {
      toast.error('Erro ao aprovar')
    } finally {
      setAprovando(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }, [])

  const rejeitar = useCallback(async (id: string) => {
    setAprovando(prev => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/precificacao/${id}/rejeitar`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error()
      setFila(prev => prev.filter(i => i.id !== id))
      toast.success('Review rejeitada')
    } catch {
      toast.error('Erro ao rejeitar')
    } finally {
      setAprovando(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }, [])

  const aprovarTodos = async () => {
    if (!filtraFila.length) return
    const confirmou = window.confirm(`Aprovar ${filtraFila.length} preços e aplicar ao catálogo?`)
    if (!confirmou) return

    for (const item of filtraFila) {
      await aprovar(item.id)
    }
    toast.success('Todos os preços aprovados!')
  }

  const gerarParaProduto = async (productId: string, nome: string) => {
    const param = Number(parametro)
    if (!param || param <= 0) { toast.error('Parâmetro inválido'); return }

    setAprovando(prev => new Set(prev).add(productId))
    try {
      const res = await fetch(`/api/produtos/${productId}/precificar`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ metodo, parametro: param }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      toast.success(`Preço sugerido para ${nome}: R$ ${fmtMoeda(data.preco_sugerido)}`)

      // Adiciona à fila local
      setFila(prev => [{
        id: data.review_id,
        product_id: productId,
        sku: data.sku,
        nome: data.nome,
        categoria: null,
        custo_base: String(data.custo_base),
        metodo: data.metodo,
        parametro: String(data.parametro),
        preco_sugerido: String(data.preco_sugerido),
        preco_atual: data.preco_atual ? String(data.preco_atual) : null,
        status: 'pending',
        criado_em: new Date().toISOString(),
      }, ...prev.filter(i => i.product_id !== productId)])

      setAbaAtiva('fila')
    } catch {
      toast.error('Erro ao gerar preço')
    } finally {
      setAprovando(prev => { const s = new Set(prev); s.delete(productId); return s })
    }
  }

  const gerarLote = async () => {
    const param = Number(parametro)
    if (!param || param <= 0) { toast.error('Parâmetro inválido'); return }

    setGerando(true)
    try {
      const res = await fetch('/api/produtos/precificar-lote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ metodo, parametro: param }),
      })
      const data = await res.json()
      toast.success(`Lote: ${data.criadas} preços gerados (${data.erros} erros)`)

      // Recarrega fila do servidor
      const filaRes = await fetch('/api/precificacao/fila?status=pending')
      if (filaRes.ok) {
        const novaFila = await filaRes.json()
        setFila(novaFila)
      }
      setAbaAtiva('fila')
    } catch {
      toast.error('Erro ao gerar lote')
    } finally {
      setGerando(false)
    }
  }

  const labelMetodo = metodo === 'MARKUP' ? `Markup ${parametro}%` : `Margem ${parametro}%`
  const exemploPreco = (custo: string) => {
    const c = Number(custo)
    if (!c) return '—'
    const param = Number(parametro)
    if (!param) return '—'
    if (metodo === 'MARKUP') return fmtMoeda(c * (1 + param / 100))
    const div = 1 - param / 100
    if (div <= 0) return '∞'
    return fmtMoeda(c / div)
  }

  return (
    <div className="space-y-6 p-2">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white flex items-center gap-2">
            <Tag className="h-6 w-6 text-primary" />
            Precificação
          </h1>
          <p className="text-sm text-gray-6 mt-0.5">
            Motor de preços — MARKUP e Margem — com fila de aprovação
          </p>
        </div>
        {abaAtiva === 'fila' && fila.length > 0 && (
          <button
            onClick={aprovarTodos}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" />
            Aprovar todos ({fila.length})
          </button>
        )}
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Aguardando aprovação', value: String(totalFila), icon: Clock, cor: 'text-yellow-500' },
          { label: 'Produtos com custo', value: String(produtos.length), icon: Package, cor: 'text-blue-500' },
          { label: 'Valor total sugerido', value: 'R$ ' + fmtMoeda(somaFilaPrecos), icon: TrendingUp, cor: 'text-green-500' },
          { label: 'Parâmetro ativo', value: labelMetodo, icon: Zap, cor: 'text-purple-500' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-6">{kpi.label}</p>
              <kpi.icon className={`h-4 w-4 ${kpi.cor}`} />
            </div>
            <p className="mt-2 text-xl font-bold text-dark dark:text-white truncate">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-stroke dark:border-dark-3">
        {([
          { key: 'fila', label: `Fila de Aprovação (${fila.length})` },
          { key: 'gerar', label: `Gerar Preços (${produtos.length} produtos)` },
        ] as { key: 'fila' | 'gerar'; label: string }[]).map(aba => (
          <button
            key={aba.key}
            onClick={() => setAbaAtiva(aba.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              abaAtiva === aba.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-6 hover:text-dark dark:hover:text-white'
            }`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {/* ── ABA: FILA DE APROVAÇÃO ── */}
      {abaAtiva === 'fila' && (
        <div className="space-y-4">
          {/* Busca */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-6" />
            <Input
              placeholder="Filtrar fila..."
              value={buscaFila}
              onChange={e => setBuscaFila(e.target.value)}
              className="pl-9"
            />
          </div>

          {fila.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stroke p-12 text-center dark:border-dark-3">
              <ListChecks className="h-10 w-10 text-gray-6 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-7 dark:text-dark-6">Fila vazia</p>
              <p className="text-xs text-gray-6 mt-1">
                Vá para a aba <strong>Gerar Preços</strong> para criar sugestões.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-1 dark:bg-dark-2 border-b border-stroke dark:border-dark-3">
                      <th className="px-4 py-3 text-left font-semibold text-dark dark:text-white">Produto</th>
                      <th className="px-4 py-3 text-right font-semibold text-dark dark:text-white">Custo</th>
                      <th className="px-4 py-3 text-right font-semibold text-dark dark:text-white">Preço atual</th>
                      <th className="px-4 py-3 text-right font-semibold text-dark dark:text-white">Sugerido</th>
                      <th className="px-4 py-3 text-center font-semibold text-dark dark:text-white">Δ%</th>
                      <th className="px-4 py-3 text-center font-semibold text-dark dark:text-white">Margem</th>
                      <th className="px-4 py-3 text-center font-semibold text-dark dark:text-white">Método</th>
                      <th className="px-4 py-3 text-right font-semibold text-dark dark:text-white">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtraFila.map(item => {
                      const busy = aprovando.has(item.id)
                      const delta = variacaoPct(item.preco_sugerido, item.preco_atual)
                      const margem = margemResultante(item.custo_base, item.preco_sugerido)
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-stroke dark:border-dark-3 hover:bg-gray-1 dark:hover:bg-dark-2 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-dark dark:text-white max-w-[200px] truncate">{item.nome}</p>
                            <p className="text-xs text-gray-6 font-mono">{item.sku}</p>
                            {item.categoria && (
                              <p className="text-xs text-gray-5">{item.categoria}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-6 tabular-nums">
                            R$ {fmtMoeda(item.custo_base)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {item.preco_atual
                              ? <span className="text-gray-7 dark:text-dark-5">R$ {fmtMoeda(item.preco_atual)}</span>
                              : <span className="text-gray-5">—</span>
                            }
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-primary tabular-nums">
                            R$ {fmtMoeda(item.preco_sugerido)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <VariacaoBadge pct={delta} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <MargemBadge pct={margem} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex rounded-full bg-gray-2 dark:bg-dark-3 px-2 py-0.5 text-xs font-mono">
                              {item.metodo} {fmtNum(item.parametro, 1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => aprovar(item.id)}
                                disabled={busy}
                                title="Aprovar e aplicar"
                                className="flex items-center gap-1 rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-1.5 text-xs font-semibold text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 disabled:opacity-40 transition-colors"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {busy ? '…' : 'Aprovar'}
                              </button>
                              <button
                                onClick={() => rejeitar(item.id)}
                                disabled={busy}
                                title="Rejeitar"
                                className="flex items-center gap-1 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-40 transition-colors"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                {busy ? '…' : 'Rejeitar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ABA: GERAR PREÇOS ── */}
      {abaAtiva === 'gerar' && (
        <div className="space-y-5">
          {/* Configuração do método */}
          <div className="rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-gray-dark">
            <h2 className="text-sm font-semibold text-dark dark:text-white mb-4">Configuração do Motor</h2>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {/* Método */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-6 uppercase tracking-wide">Método</label>
                <div className="flex rounded-lg border border-stroke dark:border-dark-3 overflow-hidden">
                  {(['MARKUP', 'MARGEM'] as MetodoPrecificacao[]).map(m => (
                    <button
                      key={m}
                      onClick={() => setMetodo(m)}
                      className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors ${
                        metodo === m
                          ? 'bg-primary text-white'
                          : 'bg-white dark:bg-gray-dark text-gray-7 dark:text-dark-6 hover:bg-gray-1 dark:hover:bg-dark-2'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parâmetro */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-6 uppercase tracking-wide">
                  {metodo === 'MARKUP' ? 'Markup %' : 'Margem %'}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={metodo === 'MARGEM' ? 99 : 10000}
                    value={parametro}
                    onChange={e => setParametro(e.target.value)}
                    className="w-28"
                  />
                  <span className="text-sm text-gray-6">%</span>
                </div>
                <p className="text-xs text-gray-6">
                  {metodo === 'MARKUP'
                    ? `Preço = Custo × ${(1 + Number(parametro) / 100).toFixed(2)}×`
                    : `Preço = Custo ÷ ${(1 - Number(parametro) / 100).toFixed(2)}`
                  }
                </p>
              </div>

              {/* Botão lote */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-6 uppercase tracking-wide invisible">Ação</label>
                <button
                  onClick={gerarLote}
                  disabled={gerando}
                  className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <Zap className="h-4 w-4" />
                  {gerando ? 'Gerando…' : `Gerar para todos (${produtos.length})`}
                </button>
              </div>
            </div>
          </div>

          {/* Busca de produtos */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-6" />
            <Input
              placeholder="Buscar produto..."
              value={buscaProduto}
              onChange={e => setBuscaProduto(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tabela de produtos */}
          <div className="rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-1 dark:bg-dark-2 border-b border-stroke dark:border-dark-3">
                    <th className="px-4 py-3 text-left font-semibold text-dark dark:text-white">Produto</th>
                    <th className="px-4 py-3 text-right font-semibold text-dark dark:text-white">Custo vigente</th>
                    <th className="px-4 py-3 text-right font-semibold text-dark dark:text-white">Preço atual</th>
                    <th className="px-4 py-3 text-right font-semibold text-dark dark:text-white">Preview ({labelMetodo})</th>
                    <th className="px-4 py-3 text-right font-semibold text-dark dark:text-white">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filtraProdutos.map(p => {
                    const busy = aprovando.has(p.id)
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-stroke dark:border-dark-3 hover:bg-gray-1 dark:hover:bg-dark-2 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-dark dark:text-white max-w-[200px] truncate">{p.nome}</p>
                          <p className="text-xs text-gray-6 font-mono">{p.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-7 dark:text-dark-5">
                          R$ {fmtMoeda(p.custo_vigente)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {p.preco_venda_vigente
                            ? <span>R$ {fmtMoeda(p.preco_venda_vigente)}</span>
                            : <span className="text-gray-5">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-primary tabular-nums">
                          R$ {exemploPreco(p.custo_vigente ?? '0')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => gerarParaProduto(p.id, p.nome)}
                            disabled={busy}
                            className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-40 transition-colors"
                          >
                            {busy ? '…' : 'Gerar'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
