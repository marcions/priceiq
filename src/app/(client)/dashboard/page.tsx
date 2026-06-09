export const dynamic = 'force-dynamic'

import { pgquery, pgqueryone } from '@/lib/db/query'
import { Package, Layers, Printer, Tag, TrendingUp } from 'lucide-react'
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
  const [
    totalProdutosRow,
    produtos,
    filamentos,
    impressoras,
    totalCategoriasRow,
  ] = await Promise.all([
    pgqueryone<{ total: string }>(`SELECT COUNT(*) AS total FROM products WHERE ativo = true`),
    pgquery<{ sku: string; nome: string; custo_vigente: number | null; preco_venda_vigente: number | null; category_nome: string | null }>(`
      SELECT p.sku, p.nome, p.custo_vigente, p.preco_venda_vigente, c.nome AS category_nome
      FROM products p
      LEFT JOIN categories c ON c.id = p.categoria_id
      WHERE p.ativo = true AND p.preco_venda_vigente IS NOT NULL
      ORDER BY p.preco_venda_vigente DESC
      LIMIT 8
    `),
    pgquery<{ id: string }>(`SELECT id FROM filamentos`),
    pgquery<{ id: string; valor_equipamento: number | null }>(`SELECT id, valor_equipamento FROM impressoras`),
    pgqueryone<{ total: string }>(`SELECT COUNT(*) AS total FROM categories`),
  ])

  const totalProdutos = parseInt(totalProdutosRow?.total ?? '0')
  const totalFilamentos = filamentos.length
  const totalImpressoras = impressoras.length
  const totalCategorias = parseInt(totalCategoriasRow?.total ?? '0')
  const valorParque = impressoras.reduce((a, b) => a + (b.valor_equipamento ?? 0), 0)

  const produtosComPreco = produtos.filter((p) => p.custo_vigente && p.preco_venda_vigente)
  const margemMedia =
    produtosComPreco.length > 0
      ? produtosComPreco.reduce((a, p) => a + (calcMargem(p.custo_vigente, p.preco_venda_vigente) ?? 0), 0) /
        produtosComPreco.length
      : null

  const kpis = [
    { title: 'Produtos', value: totalProdutos, icon: Package, color: 'text-blue-500', href: '/produtos', sub: 'no catálogo' },
    { title: 'Filamentos', value: totalFilamentos, icon: Layers, color: 'text-green-500', href: '/filamentos', sub: 'materiais cadastrados' },
    { title: 'Impressoras', value: totalImpressoras, icon: Printer, color: 'text-purple-500', href: '/impressoras', sub: `R$ ${fmt(valorParque, 0)} em parque` },
    { title: 'Categorias', value: totalCategorias, icon: Tag, color: 'text-orange-500', href: '/categorias', sub: 'de produto' },
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
        {kpis.map((kpi) => (
          <Link
            key={kpi.title}
            href={kpi.href}
            className="group rounded-xl border border-stroke bg-white p-5 shadow-sm hover:border-primary/50 transition-colors dark:border-dark-3 dark:bg-gray-dark"
          >
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
            <span
              className={`text-sm font-bold ${
                margemMedia >= 50 ? 'text-green-500' : margemMedia >= 30 ? 'text-yellow-500' : 'text-red-500'
              }`}
            >
              {fmt(margemMedia, 1)}%
            </span>
            <span className="ml-3 text-xs text-gray-6">
              sobre os {produtosComPreco.length} produtos com preço definido
            </span>
          </div>
        </div>
      )}

      {/* Top produtos por preço */}
      <div className="rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stroke dark:border-dark-3">
          <h2 className="font-semibold text-dark dark:text-white">Produtos — maiores preços de venda</h2>
          <Link href="/produtos" className="text-xs text-primary hover:underline">
            Ver todos →
          </Link>
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
              {produtos.map((p) => {
                const margem = calcMargem(p.custo_vigente, p.preco_venda_vigente)
                return (
                  <tr
                    key={p.sku}
                    className="border-b border-stroke dark:border-dark-3 hover:bg-gray-1 dark:hover:bg-dark-2 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-6">{p.sku}</td>
                    <td className="px-4 py-3 font-medium text-dark dark:text-white max-w-[200px] truncate">{p.nome}</td>
                    <td className="px-4 py-3 text-gray-6">{p.category_nome ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-7 dark:text-dark-6">R$ {fmt(p.custo_vigente)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-dark dark:text-white">R$ {fmt(p.preco_venda_vigente)}</td>
                    <td className="px-4 py-3 text-right">
                      {margem !== null ? (
                        <span
                          className={`font-semibold ${
                            margem >= 60 ? 'text-green-500' : margem >= 40 ? 'text-yellow-500' : 'text-red-500'
                          }`}
                        >
                          {fmt(margem, 1)}%
                        </span>
                      ) : (
                        '—'
                      )}
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
