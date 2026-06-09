'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search, ShoppingCart, Package, TrendingUp, Calendar } from 'lucide-react'
import { fmtMoeda, fmtNum } from '@/lib/format'

type Pedido = {
  id: string
  bling_pedido_id: string
  numero: string | null
  supplier_nome: string | null
  data_pedido: string
  status: string
  total: string | null
  importado_em: string
  itens: string
}

type Totais = {
  total_pedidos: string
  total_itens: string
  total_valor: string
} | undefined

const STATUS_COLORS: Record<string, string> = {
  'aprovado': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'finalizado': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'cancelado': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  'pendente': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
}

function fmtData(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function PedidosClient({ pedidos, totais }: { pedidos: Pedido[]; totais: Totais }) {
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('Todos')

  const statuses = ['Todos', ...Array.from(new Set(pedidos.map(p => p.status))).sort()]

  const filtrados = pedidos.filter(p => {
    const ok_status = statusFiltro === 'Todos' || p.status === statusFiltro
    const ok_busca = busca === '' ||
      p.numero?.toLowerCase().includes(busca.toLowerCase()) ||
      p.supplier_nome?.toLowerCase().includes(busca.toLowerCase()) ||
      p.bling_pedido_id.includes(busca)
    return ok_status && ok_busca
  })

  return (
    <div className="space-y-6 p-2">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-primary" />
          Pedidos de Compra
        </h1>
        <p className="text-sm text-gray-6 mt-0.5">
          Pedidos importados do Bling — base para o Motor de Custo
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Total de pedidos', value: fmtNum(totais?.total_pedidos ?? 0, 0), icon: ShoppingCart, cor: 'text-blue-500' },
          { label: 'Total de itens', value: fmtNum(totais?.total_itens ?? 0, 0), icon: Package, cor: 'text-green-500' },
          { label: 'Valor total comprado', value: 'R$ ' + fmtMoeda(totais?.total_valor ?? 0), icon: TrendingUp, cor: 'text-purple-500' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-gray-dark">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-6 uppercase tracking-wide">{kpi.label}</p>
              <kpi.icon className={`h-4 w-4 ${kpi.cor}`} />
            </div>
            <p className="mt-2 text-2xl font-bold text-dark dark:text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-6" />
          <Input
            placeholder="Buscar pedido, fornecedor..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFiltro(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFiltro === s
                  ? 'bg-primary text-white'
                  : 'bg-gray-2 text-gray-7 hover:bg-gray-3 dark:bg-dark-2 dark:text-dark-6 dark:hover:bg-dark-3'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      {pedidos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stroke p-12 text-center dark:border-dark-3">
          <ShoppingCart className="h-10 w-10 text-gray-6 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-7 dark:text-dark-6">Nenhum pedido importado</p>
          <p className="text-xs text-gray-6 mt-1">
            Conecte o Bling em <strong>Sync Bling</strong> para importar pedidos de compra.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-1 dark:bg-dark-2 border-b border-stroke dark:border-dark-3">
                  <th className="px-4 py-3 text-left font-semibold text-dark dark:text-white">Pedido</th>
                  <th className="px-4 py-3 text-left font-semibold text-dark dark:text-white">Fornecedor</th>
                  <th className="px-4 py-3 text-center font-semibold text-dark dark:text-white">Data</th>
                  <th className="px-4 py-3 text-center font-semibold text-dark dark:text-white">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-dark dark:text-white">Itens</th>
                  <th className="px-4 py-3 text-right font-semibold text-dark dark:text-white">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => (
                  <tr key={p.id} className="border-b border-stroke dark:border-dark-3 hover:bg-gray-1 dark:hover:bg-dark-2 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-dark dark:text-white font-mono text-xs">
                        {p.numero ?? p.bling_pedido_id}
                      </p>
                      <p className="text-xs text-gray-5 font-mono">{p.bling_pedido_id}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-7 dark:text-dark-5">
                      {p.supplier_nome ?? <span className="text-gray-5 italic">Não vinculado</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-6">
                        <Calendar className="h-3 w-3" />
                        {fmtData(p.data_pedido)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[p.status.toLowerCase()] ?? 'bg-gray-100 text-gray-700 dark:bg-dark-3 dark:text-dark-6'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-dark dark:text-white font-medium">
                      {p.itens}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-dark dark:text-white">
                      {p.total ? `R$ ${fmtMoeda(p.total)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-stroke dark:border-dark-3">
            <p className="text-xs text-gray-6">{filtrados.length} de {pedidos.length} pedidos</p>
          </div>
        </div>
      )}
    </div>
  )
}
