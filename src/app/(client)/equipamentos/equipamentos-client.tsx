'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Search, Printer, CheckCircle2, Package } from 'lucide-react'
import { fmtNum, fmtMoeda } from '@/lib/format'
import { toast } from 'sonner'

type Equipamento = {
  id: string
  fabricante: string
  modelo: string
  codigo: string
  nivel_uso: string
  potencia_w: number | string
  concessionaria: string
  custo_energia_hora: number | string
  taxa_ocupacao: number | string
  valor_equipamento: number | string
  lucro_estimado_hora: number | string
  taxa_erros: number | string
  horas_dia: number | string
  dias_mes: number | string
  horas_mes: number | string
  custo_depreciacao_hora: number | string
  retorno_meses: number | string | null
  quantidade_propria: number | string
  ativo: boolean
}

const NIVEL_COLORS: Record<string, string> = {
  'Profissional': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'Intenso': 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  'Medio': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'Hobby / Entrada': 'bg-gray-100 text-gray-700 dark:bg-dark-3 dark:text-dark-6',
}

const fmt = fmtNum

export function EquipamentosClient({ equipamentos: initial }: { equipamentos: Equipamento[] }) {
  const [busca, setBusca] = useState('')
  const [fabricanteFiltro, setFabricanteFiltro] = useState('Todos')
  const [abaAtiva, setAbaAtiva] = useState<'meus' | 'catalogo'>('meus')
  const [quantidades, setQuantidades] = useState<Record<string, number>>(
    () => Object.fromEntries(initial.map(eq => [eq.id, Number(eq.quantidade_propria ?? 0)]))
  )
  const [salvando, setSalvando] = useState<string | null>(null)

  const fabricantes = ['Todos', ...Array.from(new Set(initial.map(i => i.fabricante))).sort()]

  // Equipamentos filtrados por busca/fabricante
  const filtrados = initial.filter(eq => {
    const ok_fab = fabricanteFiltro === 'Todos' || eq.fabricante === fabricanteFiltro
    const ok_busca = busca === '' ||
      eq.modelo.toLowerCase().includes(busca.toLowerCase()) ||
      eq.fabricante.toLowerCase().includes(busca.toLowerCase())
    return ok_fab && ok_busca
  })

  // "Meus" = quantidade_propria > 0 (usando estado local para resposta imediata)
  const meus = filtrados.filter(eq => (quantidades[eq.id] ?? 0) > 0)
  const catalogo = filtrados.filter(eq => (quantidades[eq.id] ?? 0) === 0)
  const lista = abaAtiva === 'meus' ? meus : catalogo

  // KPIs calculados apenas sobre "meus equipamentos"
  const meusTodos = initial.filter(eq => (quantidades[eq.id] ?? 0) > 0)
  const custo_medio = meusTodos.length > 0
    ? meusTodos.reduce((a, b) => a + (Number(b.custo_depreciacao_hora) + Number(b.custo_energia_hora)) * (quantidades[b.id] ?? 1), 0) /
      meusTodos.reduce((a, b) => a + (quantidades[b.id] ?? 1), 0)
    : 0
  const valor_total = meusTodos.reduce((a, b) => a + Number(b.valor_equipamento) * (quantidades[b.id] ?? 0), 0)
  const total_unidades = meusTodos.reduce((a, b) => a + (quantidades[b.id] ?? 0), 0)

  async function atualizarQuantidade(id: string, novaQtd: number) {
    if (novaQtd < 0) return
    setQuantidades(prev => ({ ...prev, [id]: novaQtd }))
    setSalvando(id)
    try {
      const res = await fetch(`/api/equipamentos/${id}/quantidade`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ quantidade: novaQtd }),
      })
      if (!res.ok) throw new Error('Falha ao salvar')
    } catch {
      toast.error('Erro ao salvar quantidade')
      // Reverter em caso de erro
      setQuantidades(prev => ({ ...prev, [id]: Number(initial.find(e => e.id === id)?.quantidade_propria ?? 0) }))
    } finally {
      setSalvando(null)
    }
  }

  function toggleEquipamento(eq: Equipamento) {
    const atual = quantidades[eq.id] ?? 0
    atualizarQuantidade(eq.id, atual > 0 ? 0 : 1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white flex items-center gap-2">
            <Printer className="h-6 w-6 text-primary" />
            Equipamentos
          </h1>
          <p className="text-sm text-gray-6 mt-0.5">
            {total_unidades} unidade{total_unidades !== 1 ? 's' : ''} em uso ·{' '}
            {meusTodos.length} modelo{meusTodos.length !== 1 ? 's' : ''} ·{' '}
            {initial.length} no catálogo
          </p>
        </div>
      </div>

      {/* KPI Cards — apenas meus equipamentos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Custo médio por hora',
            value: 'R$ ' + fmt(custo_medio, 4),
            sub: 'Energia + Depreciação (pond. por qtde)',
          },
          {
            label: 'Valor total do parque',
            value: 'R$ ' + fmtMoeda(valor_total),
            sub: `${total_unidades} unidade${total_unidades !== 1 ? 's' : ''} · ${meusTodos.length} modelo${meusTodos.length !== 1 ? 's' : ''}`,
          },
          {
            label: 'Equipamentos selecionados',
            value: String(meusTodos.length),
            sub: `de ${initial.length} no catálogo`,
          },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-gray-dark">
            <p className="text-xs font-medium text-gray-6 uppercase tracking-wide">{kpi.label}</p>
            <p className="mt-2 text-2xl font-bold text-dark dark:text-white">{kpi.value}</p>
            <p className="mt-0.5 text-xs text-gray-6">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-stroke dark:border-dark-3">
        {([
          { key: 'meus', label: `Meus Equipamentos (${meus.length})` },
          { key: 'catalogo', label: `Catálogo (${catalogo.length})` },
        ] as { key: 'meus' | 'catalogo'; label: string }[]).map(aba => (
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

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-6" />
          <Input
            placeholder="Buscar equipamento..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {fabricantes.map(fab => (
            <button
              key={fab}
              onClick={() => setFabricanteFiltro(fab)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                fabricanteFiltro === fab
                  ? 'bg-primary text-white'
                  : 'bg-gray-2 text-gray-7 hover:bg-gray-3 dark:bg-dark-2 dark:text-dark-6 dark:hover:bg-dark-3'
              }`}
            >
              {fab}
            </button>
          ))}
        </div>
      </div>

      {/* Estado vazio */}
      {lista.length === 0 && (
        <div className="rounded-xl border border-dashed border-stroke p-10 text-center dark:border-dark-3">
          <Package className="h-10 w-10 text-gray-6 mx-auto mb-3" />
          {abaAtiva === 'meus' ? (
            <>
              <p className="text-sm font-medium text-gray-7 dark:text-dark-6">Nenhum equipamento selecionado ainda</p>
              <p className="text-xs text-gray-6 mt-1">
                Vá para a aba <strong>Catálogo</strong> e clique em um equipamento para adicioná-lo.
              </p>
            </>
          ) : (
            <p className="text-sm font-medium text-gray-7 dark:text-dark-6">Nenhum equipamento encontrado</p>
          )}
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lista.map(eq => {
          const qtd = quantidades[eq.id] ?? 0
          const selecionado = qtd > 0
          const isSalvando = salvando === eq.id

          return (
            <div
              key={eq.id}
              className={`rounded-xl border p-5 transition-all ${
                selecionado
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark hover:border-primary/50'
              }`}
            >
              {/* Header card */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-dark dark:text-white truncate">{eq.modelo}</h3>
                  <p className="text-xs text-gray-6">{eq.fabricante}</p>
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${NIVEL_COLORS[eq.nivel_uso] ?? 'bg-gray-100 text-gray-700'}`}>
                    {eq.nivel_uso}
                  </span>
                </div>
              </div>

              {/* Grid de métricas */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                <div>
                  <span className="text-xs text-gray-6">Potência</span>
                  <p className="font-medium text-dark dark:text-white">{fmt(eq.potencia_w, 0)} W</p>
                </div>
                <div>
                  <span className="text-xs text-gray-6">Valor unit.</span>
                  <p className="font-medium text-dark dark:text-white">R$ {fmtMoeda(eq.valor_equipamento)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-6">Energia/h</span>
                  <p className="font-medium text-dark dark:text-white">R$ {fmt(eq.custo_energia_hora, 4)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-6">Deprec./h</span>
                  <p className="font-medium text-dark dark:text-white">R$ {fmt(eq.custo_depreciacao_hora, 4)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-6">Custo total/h</span>
                  <p className="font-semibold text-primary">R$ {fmt((Number(eq.custo_energia_hora) + Number(eq.custo_depreciacao_hora)), 4)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-6">Retorno</span>
                  <p className="font-medium text-dark dark:text-white">
                    {eq.retorno_meses ? fmt(eq.retorno_meses, 1) + ' meses' : '—'}
                  </p>
                </div>
              </div>

              {/* Footer — seleção e quantidade */}
              <div className="pt-3 border-t border-stroke dark:border-dark-3 flex items-center justify-between gap-3">
                {/* Checkbox / toggle */}
                <button
                  onClick={() => toggleEquipamento(eq)}
                  disabled={isSalvando}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    selecionado ? 'text-primary' : 'text-gray-6 hover:text-dark dark:hover:text-white'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    selecionado ? 'border-primary bg-primary' : 'border-gray-4 dark:border-dark-4'
                  }`}>
                    {selecionado && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                  </div>
                  {selecionado ? 'Tenho este' : 'Adicionar'}
                </button>

                {/* Quantidade — só aparece quando selecionado */}
                {selecionado && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-6">Qtde:</span>
                    <button
                      onClick={() => atualizarQuantidade(eq.id, Math.max(1, qtd - 1))}
                      disabled={isSalvando}
                      className="w-7 h-7 rounded border border-stroke dark:border-dark-3 text-sm font-bold text-dark dark:text-white hover:bg-gray-2 dark:hover:bg-dark-2 disabled:opacity-40 transition-colors"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-bold text-dark dark:text-white text-sm">
                      {isSalvando ? '…' : qtd}
                    </span>
                    <button
                      onClick={() => atualizarQuantidade(eq.id, qtd + 1)}
                      disabled={isSalvando}
                      className="w-7 h-7 rounded border border-stroke dark:border-dark-3 text-sm font-bold text-dark dark:text-white hover:bg-gray-2 dark:hover:bg-dark-2 disabled:opacity-40 transition-colors"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              {/* Valor total com quantidade */}
              {selecionado && qtd > 1 && (
                <div className="mt-2 text-xs text-gray-6 text-right">
                  Total parque: <span className="font-semibold text-dark dark:text-white">
                    R$ {fmtMoeda(Number(eq.valor_equipamento) * qtd)}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
