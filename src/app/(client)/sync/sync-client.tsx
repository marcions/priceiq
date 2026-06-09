'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { RefreshCw, CheckCircle2, XCircle, Plug, Zap, Calculator } from 'lucide-react'

function BlingLogo() {
  return (
    <svg width={28} height={28} viewBox="0 0 40 40" fill="none">
      <rect width={40} height={40} rx={8} fill="#0057FF" />
      <text x={5} y={28} fontSize={20} fontWeight="bold" fill="white" fontFamily="sans-serif">B</text>
    </svg>
  )
}

export function SyncClient({ connected }: { connected: boolean }) {
  const params = useSearchParams()
  // Estado separado por tipo para não bloquear um ao sincronizar o outro
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (params.get('bling_connected') === 'true') {
      toast.success('Bling conectado com sucesso!')
    }
    const err = params.get('bling_error')
    if (err) {
      toast.error('Erro ao conectar Bling: ' + decodeURIComponent(err))
    }
  }, [params])

  async function handleSync(tipo: string) {
    if (syncing[tipo]) return // previne duplo clique
    setSyncing(prev => ({ ...prev, [tipo]: true }))
    const loadingId = toast.loading(`Sincronizando ${tipo === 'products' ? 'produtos' : 'pedidos'}...`)
    try {
      const res = await fetch(`/api/bling/sync/${tipo}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      toast.success(data.message ?? 'Sincronização concluída', { id: loadingId })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro na sincronização', { id: loadingId })
    } finally {
      setSyncing(prev => ({ ...prev, [tipo]: false }))
    }
  }

  async function handleAtualizarCustos() {
    if (syncing['custos']) return
    setSyncing(prev => ({ ...prev, custos: true }))
    const loadingId = toast.loading('Calculando custo médio ponderado (CMPC)...')
    try {
      const res = await fetch('/api/produtos/atualizar-custos', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      const semMsg = data.sem_pedidos > 0 ? ` (${data.sem_pedidos} sem dados de pedido)` : ''
      toast.success(data.message + semMsg, { id: loadingId })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar custos', { id: loadingId })
    } finally {
      setSyncing(prev => ({ ...prev, custos: false }))
    }
  }

  return (
    <div className="space-y-6 p-2 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">Sync Bling</h1>
        <p className="text-sm text-gray-6 mt-0.5">Integração com o ERP Bling V3</p>
      </div>

      {/* Status card */}
      <div className={`rounded-xl border p-5 ${
        connected
          ? 'border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-green-900/10'
          : 'border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark'
      }`}>
        <div className="flex items-center gap-4">
          <BlingLogo />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-dark dark:text-white">Bling ERP</h2>
              {connected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" /> Conectado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-dark-3 dark:text-dark-6">
                  <XCircle className="h-3 w-3" /> Não conectado
                </span>
              )}
            </div>
            <p className="text-sm text-gray-6 mt-0.5">
              {connected
                ? 'Token ativo. Você pode sincronizar produtos e pedidos.'
                : 'Conecte sua conta Bling para sincronizar dados.'}
            </p>
          </div>
          {!connected && (
            <a
              href="/api/bling/auth/connect"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              <Plug className="h-4 w-4" />
              Conectar
            </a>
          )}
          {connected && (
            <a
              href="/api/bling/auth/connect"
              className="inline-flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-gray-7 hover:bg-gray-2 transition-colors dark:border-dark-3 dark:text-dark-6 dark:hover:bg-dark-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reconectar
            </a>
          )}
        </div>
      </div>

      {/* Ações de sync — só disponíveis se conectado */}
      {connected && (
        <div className="space-y-3">
          <h3 className="font-semibold text-dark dark:text-white">Sincronizações disponíveis</h3>

          {[
            {
              id: 'products',
              title: 'Importar Produtos do Bling',
              desc: 'Traz todos os produtos cadastrados no Bling para o PriceIQ',
              icon: RefreshCw,
            },
            {
              id: 'orders',
              title: 'Importar Pedidos de Compra',
              desc: 'Importa pedidos para calcular custo médio de aquisição',
              icon: RefreshCw,
            },
          ].map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark"
            >
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-dark dark:text-white">{item.title}</p>
                  <p className="text-sm text-gray-6">{item.desc}</p>
                </div>
              </div>
              <button
                onClick={() => handleSync(item.id)}
                disabled={!!syncing[item.id]}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-4 shrink-0"
              >
                <RefreshCw className={`h-4 w-4 ${syncing[item.id] ? 'animate-spin' : ''}`} />
                {syncing[item.id] ? 'Sincronizando...' : 'Sincronizar'}
              </button>
            </div>
          ))}
        </div>
      )}

      {!connected && (
        <div className="rounded-xl border border-dashed border-stroke p-8 text-center dark:border-dark-3">
          <Plug className="h-10 w-10 text-gray-6 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-7 dark:text-dark-6">Conecte o Bling para usar as sincronizações</p>
          <p className="text-xs text-gray-6 mt-1">Você será redirecionado para autorizar o acesso na sua conta Bling</p>
        </div>
      )}

      {/* Atualização de custos — disponível sempre, independente do Bling */}
      <div className="space-y-3">
        <h3 className="font-semibold text-dark dark:text-white">Precificação</h3>
        <div className="flex items-center justify-between rounded-xl border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
          <div className="flex items-start gap-3">
            <Calculator className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-dark dark:text-white">Atualizar Custo de Produtos</p>
              <p className="text-sm text-gray-6">
                Recalcula <strong>custo_vigente</strong> de cada produto usando média ponderada (CMPC)
                dos pedidos de compra importados.
              </p>
            </div>
          </div>
          <button
            onClick={handleAtualizarCustos}
            disabled={!!syncing['custos']}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-4 shrink-0"
          >
            <Calculator className={`h-4 w-4 ${syncing['custos'] ? 'animate-pulse' : ''}`} />
            {syncing['custos'] ? 'Calculando...' : 'Atualizar Custos'}
          </button>
        </div>
      </div>
    </div>
  )
}
