'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Layers } from 'lucide-react'

type Insumo = {
  id: string
  fabricante: string
  modelo: string
  codigo: string
  tipo: string
  peso_kg: number
  comprimento_m: number
  taxa_falha: number
  custo_carretel: number
  custo_por_grama: number
  ativo: boolean
}

const TIPO_COLORS: Record<string, string> = {
  PLA: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  PETG: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  ABS: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  TPU: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
}

function fmt(v: number | string | null | undefined, frações = 2) {
  const n = Number(v)
  if (v == null || isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: frações, maximumFractionDigits: frações })
}

export function InsumosClient({ insumos }: { insumos: Insumo[] }) {
  const [busca, setBusca] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<string>('Todos')

  const tipos = ['Todos', ...Array.from(new Set(insumos.map(f => f.tipo))).sort()]

  const filtrados = insumos.filter(f => {
    const ok_tipo = tipoFiltro === 'Todos' || f.tipo === tipoFiltro
    const ok_busca = busca === '' ||
      f.modelo.toLowerCase().includes(busca.toLowerCase()) ||
      f.fabricante.toLowerCase().includes(busca.toLowerCase()) ||
      f.codigo.toLowerCase().includes(busca.toLowerCase())
    return ok_tipo && ok_busca
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Insumos
          </h1>
          <p className="text-sm text-gray-6 mt-0.5">{insumos.length} materiais cadastrados</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-6" />
          <Input
            placeholder="Buscar insumo..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {tipos.map(t => (
            <button
              key={t}
              onClick={() => setTipoFiltro(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tipoFiltro === t
                  ? 'bg-primary text-white'
                  : 'bg-gray-2 text-gray-7 hover:bg-gray-3 dark:bg-dark-2 dark:text-dark-6 dark:hover:bg-dark-3'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stroke dark:border-dark-3 bg-gray-1 dark:bg-dark-2">
                <th className="px-4 py-3 text-left font-semibold text-dark dark:text-white">Código</th>
                <th className="px-4 py-3 text-left font-semibold text-dark dark:text-white">Fabricante / Modelo</th>
                <th className="px-4 py-3 text-left font-semibold text-dark dark:text-white">Tipo</th>
                <th className="px-4 py-3 text-right font-semibold text-dark dark:text-white">Peso (kg)</th>
                <th className="px-4 py-3 text-right font-semibold text-dark dark:text-white">Custo Carretel</th>
                <th className="px-4 py-3 text-right font-semibold text-dark dark:text-white">Custo / g</th>
                <th className="px-4 py-3 text-right font-semibold text-dark dark:text-white">Taxa Falha</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-6">
                    Nenhum insumo encontrado
                  </td>
                </tr>
              )}
              {filtrados.map((f, i) => (
                <tr
                  key={f.id}
                  className={`border-b border-stroke dark:border-dark-3 hover:bg-gray-1 dark:hover:bg-dark-2 transition-colors ${
                    i % 2 === 0 ? '' : 'bg-gray-1/50 dark:bg-dark-2/30'
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-6">{f.codigo}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-dark dark:text-white">{f.modelo}</div>
                    <div className="text-xs text-gray-6">{f.fabricante}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIPO_COLORS[f.tipo] ?? 'bg-gray-100 text-gray-700'}`}>
                      {f.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-7 dark:text-dark-6">{fmt(f.peso_kg, 1)}</td>
                  <td className="px-4 py-3 text-right font-medium text-dark dark:text-white">
                    R$ {fmt(f.custo_carretel)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-primary">
                    R$ {fmt(f.custo_por_grama, 3)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-6">
                    {(f.taxa_falha * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtrados.length > 0 && (
          <div className="px-4 py-3 text-xs text-gray-6 border-t border-stroke dark:border-dark-3">
            {filtrados.length} de {insumos.length} insumos
          </div>
        )}
      </div>
    </div>
  )
}
