'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search, Printer } from 'lucide-react'

type Impressora = {
  id: string
  fabricante: string
  modelo: string
  codigo: string
  nivel_uso: string
  potencia_w: number
  concessionaria: string
  custo_energia_hora: number
  taxa_ocupacao: number
  valor_equipamento: number
  lucro_estimado_hora: number
  taxa_erros: number
  horas_dia: number
  dias_mes: number
  horas_mes: number
  custo_depreciacao_hora: number
  retorno_meses: number | null
  ativo: boolean
}

const NIVEL_COLORS: Record<string, string> = {
  'Profissional': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'Intenso': 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  'Medio': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'Hobby / Entrada': 'bg-gray-100 text-gray-700 dark:bg-dark-3 dark:text-dark-6',
}

function fmt(v: number, frações = 2) {
  return v?.toLocaleString('pt-BR', { minimumFractionDigits: frações, maximumFractionDigits: frações }) ?? '—'
}

export function ImpressorasClient({ impressoras }: { impressoras: Impressora[] }) {
  const [busca, setBusca] = useState('')
  const [fabricanteFiltro, setFabricanteFiltro] = useState('Todos')

  const fabricantes = ['Todos', ...Array.from(new Set(impressoras.map(i => i.fabricante))).sort()]

  const filtradas = impressoras.filter(imp => {
    const ok_fab = fabricanteFiltro === 'Todos' || imp.fabricante === fabricanteFiltro
    const ok_busca = busca === '' ||
      imp.modelo.toLowerCase().includes(busca.toLowerCase()) ||
      imp.fabricante.toLowerCase().includes(busca.toLowerCase())
    return ok_fab && ok_busca
  })

  // KPIs
  const custo_medio = filtradas.reduce((a, b) => a + (b.custo_depreciacao_hora + b.custo_energia_hora), 0) / (filtradas.length || 1)
  const valor_total = filtradas.reduce((a, b) => a + b.valor_equipamento, 0)
  const potencia_media = filtradas.reduce((a, b) => a + b.potencia_w, 0) / (filtradas.length || 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white flex items-center gap-2">
            <Printer className="h-6 w-6 text-primary" />
            Impressoras
          </h1>
          <p className="text-sm text-gray-6 mt-0.5">{impressoras.length} equipamentos cadastrados</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Custo médio por hora', value: 'R$ ' + fmt(custo_medio, 4), sub: 'Energia + Depreciação' },
          { label: 'Valor total do parque', value: 'R$ ' + fmt(valor_total, 0), sub: `${filtradas.length} impressoras` },
          { label: 'Potência média', value: fmt(potencia_media, 0) + ' W', sub: 'Por equipamento' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-gray-dark">
            <p className="text-xs font-medium text-gray-6 uppercase tracking-wide">{kpi.label}</p>
            <p className="mt-2 text-2xl font-bold text-dark dark:text-white">{kpi.value}</p>
            <p className="mt-0.5 text-xs text-gray-6">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-6" />
          <Input
            placeholder="Buscar impressora..."
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

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtradas.length === 0 && (
          <div className="col-span-full text-center py-10 text-gray-6">Nenhuma impressora encontrada</div>
        )}
        {filtradas.map(imp => (
          <div key={imp.id} className="rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-gray-dark hover:border-primary/50 transition-colors">
            {/* Header card */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-dark dark:text-white">{imp.modelo}</h3>
                <p className="text-xs text-gray-6">{imp.fabricante}</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${NIVEL_COLORS[imp.nivel_uso] ?? 'bg-gray-100 text-gray-700'}`}>
                {imp.nivel_uso}
              </span>
            </div>

            {/* Grid de métricas */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <span className="text-xs text-gray-6">Potência</span>
                <p className="font-medium text-dark dark:text-white">{imp.potencia_w} W</p>
              </div>
              <div>
                <span className="text-xs text-gray-6">Valor</span>
                <p className="font-medium text-dark dark:text-white">R$ {fmt(imp.valor_equipamento, 0)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-6">Energia/h</span>
                <p className="font-medium text-dark dark:text-white">R$ {fmt(imp.custo_energia_hora, 4)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-6">Deprec./h</span>
                <p className="font-medium text-dark dark:text-white">R$ {fmt(imp.custo_depreciacao_hora, 4)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-6">Custo total/h</span>
                <p className="font-semibold text-primary">R$ {fmt((imp.custo_energia_hora ?? 0) + (imp.custo_depreciacao_hora ?? 0), 4)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-6">Retorno</span>
                <p className="font-medium text-dark dark:text-white">{imp.retorno_meses ? fmt(imp.retorno_meses, 1) + ' meses' : '—'}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-stroke dark:border-dark-3 flex justify-between text-xs text-gray-6">
              <span>{imp.horas_dia}h/dia · {imp.dias_mes} dias/mês</span>
              <span>Erros: {((imp.taxa_erros ?? 0) * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
