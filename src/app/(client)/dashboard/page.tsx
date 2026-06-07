export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, ClipboardList, AlertTriangle, RefreshCw } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Queries paralelas
  const [
    { count: totalProdutos },
    { count: revisoesPendentes },
    { count: syncErros },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('pricing_reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('sync_status_bling', 'error'),
  ])

  const kpis = [
    {
      title: 'Produtos ativos',
      value: totalProdutos ?? 0,
      icon: Package,
      description: 'No catálogo',
      color: 'text-blue-600',
    },
    {
      title: 'Aprovações pendentes',
      value: revisoesPendentes ?? 0,
      icon: ClipboardList,
      description: 'Aguardando revisão',
      color: revisoesPendentes ? 'text-yellow-600' : 'text-green-600',
    },
    {
      title: 'Erros de sync',
      value: syncErros ?? 0,
      icon: AlertTriangle,
      description: 'Falha na sincronização Bling',
      color: syncErros ? 'text-red-600' : 'text-green-600',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu negócio</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(revisoesPendentes ?? 0) > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">
                  {revisoesPendentes} {revisoesPendentes === 1 ? 'produto aguarda' : 'produtos aguardam'} aprovação de preço
                </p>
                <p className="text-sm text-yellow-600">
                  <a href="/precos" className="underline">Ir para a fila de aprovação →</a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
