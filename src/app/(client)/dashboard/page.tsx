export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Package, Layers, Printer, Tag, TrendingUp, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

function fmt(v: number | null, frações = 2) {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: frações, maximumFractionDigits: frações })
}

function calcMargem(custo: number | null, preco: number | null) {
  if (!custo || !preco || preco === 0) return null
  return ((preco - custo) / preco) * 100
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: totalProdutos },
    { data: produtos },
    { data: filamentosRaw },
    { data: impressorasRaw },
    { count: totalCategorias },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase
      .from('products')
      .select('sku, nome, custo_vigente, preco_venda_vigente, categories(nome)')
      .eq('ativo', true)
      .not('preco_venda_vigente', 'is', null)
      .order('preco_venda_vigente', { ascending: false })
      .limit(8),
    (supabase as any).from('filamentos').select('id, tipo', { count: 'exact' }),
    (supabase as any).from('impressoras').select('id, fabricante, valor_equipamento'),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
  ])

  const totalFilamentos = filamentosRaw?.length ?? 0
  const totalImpressoras = impressorasRaw?.length ?? 0
  const valorParque = (impressorasRaw ?? []).reduce((a: number, b: any) => a + (b.valor_equipamento ?? 0), 0)

  // Margem média dos produtos com preço
  const produtosComPreco = (produtos ?? []).filter((p: any) => p.custo_vigente && p.preco_venda_vigente)
  const margemMedia = produtosComPreco.length > 0
    ? produtosComPreco.reduce((a: number, p: any) => a + (calcMargem(p.custo_vigente, p.preco_venda_vigente) ?? 0), 0) / produtosComPreco.length
    : null

  const kpis = [
    { title: 'Produtos', value: totalProdutos ?? 0, icon: Package, color: 'text-blue-500', href: '/produtos', sub: 'no catálogo' },
    { title: 'Filamentos', value: totalFilamentos, icon: Layers, color: 'text-green-500', href: '/filamentos', sub: 'materiais cadastrados' },
    { title: 'Impressoras', value: totalImpressoras, icon: Printer, color: 'text-purple-500', href: '/impressoras', sub: `R$ ${fmt(valorParque, 0)} em parque` },
    { title: 'Categorias', value: totalCategorias ?? 0, icon: Tag, color: 'text-orange-500', href: '/categorias', sub: 'de produto' },
  ]

  return (
    <div className="space-y-6 p-2">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-6 mt-0.5">Visão geral do seu negócio de impressão 3D</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(kpi => (
          <Link key={kpi.title} href={kpi.href} className="group rounded-xl border border-stroke bg-white p-5 shadow-sm hover:border-primary/50 transition-colors dark:border-dark-3 dark:bg-gray-dark">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-6">{kpi.title}</p>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </div>
            <p className="mt-3 text-3xl font-bold text-dark dark:text-white">{kpi.value}</p>
            <p className="mt-1 text-xs text-gray-6">{kpi.sub}</p>
          </Link>
        ))}
      </div>

      {/* Margem média banner */}
      {margemMedia !== null && (
        <div className="flex items-center gap-3 rounded-xl border border-stroke bg-white px-5 py-4 dark:border-dark-3 dark:bg-gray-dark">
          <TrendingUp className="h-5 w-5 text-green-500 shrink-0" />
          <div>
            <span className="text-sm font-medium text-dark dark:text-white">Margem média do catálogo: </span>
            <span className={`text-sm font-bold ${margemMedia >= 50 ? 'text-green-500' : margemMedia >= 30 ? 'text-yellow-500' : 'text-red-500'}`}>
              {fmt(margemMedia, 1)}%
            </span>
            <span className="ml-3 text-xs text-gray-6">sobre os {produtosComPreco.length} produtos com preço definido</span>
          </div>
        </div>
      )}

      {/* Top produtos por preço */}
      <div className="rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stroke dark:border-dark-3">
          <h2 className="font-semibold text-dark dark:text-white">Produtos — maiores preços de venda</h2>
          <Link href="/produtos" className="text-xs text-primary hover:underline">Ver todos →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-1 dark:bg-dark-2 border-b border-stroke dark:border-dark-3">
                <th className="px-4 py-3 text-left font-semibold text-dark dark:text-white">SKU</th>
                <th className="px-4 py-3 text-left font-semibold text-dark dark:text-white">Produto</th>
                <th className="px-4 py-3 text-left font-semibold text-dark dark:text-white">Categoria</th>
                <th className="px-4 py-3 text-right font-semibold text-dark dark:text-white">Custo</th>
                <th className="px-4 py-3 text-right font-semibold text-dark dark:text-white">Preço Venda</th>
                <th className="px-4 py-3 text-right font-semibold text-dark dark:text-white">Margem</th>
              </tr>
            </thead>
            <tbody>
              {(produtos ?? []).map((p: any, i: number) => {
                const margem = calcMargem(p.custo_vigente, p.preco_venda_vigente)
                return (
                  <tr key={p.sku} className={`border-b border-stroke dark:border-dark-3 hover:bg-gray-1 dark:hover:bg-dark-2 transition-colors`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-6">{p.sku}</td>
                    <td className="px-4 py-3 font-medium text-dark dark:text-white max-w-[200px] truncate">{p.nome}</td>
                    <td className="px-4 py-3 text-gray-6">{p.categories?.nome ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-7 dark:text-dark-6">R$ {fmt(p.custo_vigente)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-dark dark:text-white">R$ {fmt(p.preco_venda_vigente)}</td>
                    <td className="px-4 py-3 text-right">
                      {margem !== null ? (
                        <span className={`font-semibold ${margem >= 60 ? 'text-green-500' : margem >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {fmt(margem, 1)}%
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
