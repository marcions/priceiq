'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ProdutoForm } from '@/components/produtos/produto-form'
import { deleteProduto } from './actions'
import type { Database } from '@/lib/supabase/types'
import { Plus, Pencil, Trash2, Package, Calculator, History } from 'lucide-react'
import { fmtMoeda, fmtMargem, fmtNum } from '@/lib/format'

type ProductRow = Database['public']['Tables']['products']['Row']
type CategoryRow = Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'nome'>
type SupplierRow = Pick<Database['public']['Tables']['suppliers']['Row'], 'id' | 'nome'>
type CostPolicyRow = Pick<Database['public']['Tables']['cost_policies']['Row'], 'id' | 'nome'>
type PricingPolicyRow = Pick<Database['public']['Tables']['pricing_policies']['Row'], 'id' | 'nome'>

export type ProductWithRelations = ProductRow & {
  categories: { nome: string } | null
  suppliers: { nome: string } | null
}

type FilterAtivo = 'todos' | 'ativos' | 'inativos'
type FilterFonte = 'todos' | 'bling' | 'local'

const BLING_STATUS_CONFIG = {
  synced: { label: 'Sincronizado', className: 'bg-green-100 text-green-800' },
  pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
  divergent: { label: 'Divergente', className: 'bg-orange-100 text-orange-800' },
  error: { label: 'Erro', className: 'bg-red-100 text-red-800' },
  not_connected: { label: 'Não conectado', className: 'bg-gray-100 text-gray-600' },
} as const

const formatCurrency = fmtMoeda
const calcMargem = fmtMargem

type MetodoCusto = 'WEIGHTED_AVG' | 'SIMPLE_AVG' | 'LAST'

interface Snapshot {
  id: string
  custo_base: string
  custo_total: string
  metodo_usado: string
  pedidos_count: string
  triggered_by: string
  calculado_em: string
}

const METODO_LABEL: Record<string, string> = {
  WEIGHTED_AVG: 'CMPC (pond.)',
  SIMPLE_AVG: 'Média simples',
  LAST: 'Último preço',
}

interface ProdutosClientProps {
  produtos: ProductWithRelations[]
  categorias: CategoryRow[]
  fornecedores: SupplierRow[]
  costPolicies: CostPolicyRow[]
  pricingPolicies: PricingPolicyRow[]
}

export function ProdutosClient({
  produtos,
  categorias,
  fornecedores,
  costPolicies,
  pricingPolicies,
}: ProdutosClientProps) {
  const [search, setSearch] = useState('')
  const [filterAtivo, setFilterAtivo] = useState<FilterAtivo>('ativos')
  const [filterFonte, setFilterFonte] = useState<FilterFonte>('todos')
  const [formOpen, setFormOpen] = useState(false)
  const [editProduto, setEditProduto] = useState<ProductWithRelations | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductWithRelations | null>(null)
  const [isPending, startTransition] = useTransition()

  // Motor de custo por produto
  const [calculando, setCalculando] = useState<string | null>(null)
  const [custoMetodo, setCustoMetodo] = useState<MetodoCusto>('WEIGHTED_AVG')
  const [historicoProduto, setHistoricoProduto] = useState<ProductWithRelations | null>(null)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loadingSnapshots, setLoadingSnapshots] = useState(false)

  async function handleCalcularCusto(p: ProductWithRelations) {
    if (calculando === p.id) return
    setCalculando(p.id)
    const loadingId = toast.loading(`Calculando custo de "${p.nome}"...`)
    try {
      const res = await fetch(`/api/produtos/${p.id}/calcular-custo`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ metodo: custoMetodo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      toast.success(data.message, { id: loadingId })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao calcular custo', { id: loadingId })
    } finally {
      setCalculando(null)
    }
  }

  async function openHistorico(p: ProductWithRelations) {
    setHistoricoProduto(p)
    setSnapshots([])
    setLoadingSnapshots(true)
    try {
      const res = await fetch(`/api/produtos/${p.id}/snapshots`)
      const data = await res.json()
      setSnapshots(data.snapshots ?? [])
    } catch {
      toast.error('Erro ao carregar histórico')
    } finally {
      setLoadingSnapshots(false)
    }
  }

  const filtered = produtos.filter((p) => {
    const matchSearch =
      !search ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.nome.toLowerCase().includes(search.toLowerCase())

    const matchAtivo =
      filterAtivo === 'todos' ||
      (filterAtivo === 'ativos' && p.ativo) ||
      (filterAtivo === 'inativos' && !p.ativo)

    const matchFonte =
      filterFonte === 'todos' ||
      (filterFonte === 'bling' && p.fonte === 'bling') ||
      (filterFonte === 'local' && p.fonte !== 'bling')

    return matchSearch && matchAtivo && matchFonte
  })

  function openNew() {
    setEditProduto(null)
    setFormOpen(true)
  }

  function openEdit(p: ProductWithRelations) {
    setEditProduto(p)
    setFormOpen(true)
  }

  function handleFormSuccess() {
    setFormOpen(false)
    setEditProduto(null)
  }

  function confirmDelete(p: ProductWithRelations) {
    setDeleteTarget(p)
  }

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteProduto(deleteTarget.id)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Produto excluído')
        setDeleteTarget(null)
      }
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-xl">Produtos</CardTitle>
            {filterFonte !== 'bling' && (
              <Button onClick={openNew} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            )}
          </div>

          {/* Seletor de método de custo */}
          <div className="flex items-center gap-2 mt-4">
            <Calculator className="h-4 w-4 text-gray-6 shrink-0" />
            <span className="text-xs text-gray-6">Método de custo:</span>
            {(['WEIGHTED_AVG', 'SIMPLE_AVG', 'LAST'] as MetodoCusto[]).map(m => (
              <Button
                key={m}
                variant={custoMetodo === m ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => setCustoMetodo(m)}
              >
                {METODO_LABEL[m]}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2">
            <Input
              placeholder="Buscar por SKU ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            {/* Filtro de Origem */}
            <div className="flex gap-1">
              {([
                { key: 'todos', label: 'Todos' },
                { key: 'local', label: 'Local' },
                { key: 'bling', label: 'Bling' },
              ] as { key: FilterFonte; label: string }[]).map(({ key, label }) => (
                <Button
                  key={key}
                  variant={filterFonte === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterFonte(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
            {/* Filtro de Status */}
            <div className="flex gap-1">
              {(['todos', 'ativos', 'inativos'] as FilterAtivo[]).map((f) => (
                <Button
                  key={f}
                  variant={filterAtivo === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterAtivo(f)}
                  className="capitalize"
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
              <Package className="h-12 w-12 opacity-30" />
              <p className="text-sm">
                {search || filterAtivo !== 'todos'
                  ? 'Nenhum produto encontrado para os filtros aplicados.'
                  : 'Nenhum produto cadastrado ainda.'}
              </p>
              {!search && filterAtivo === 'todos' && (
                <Button onClick={openNew} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar primeiro produto
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Un.</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Custo (R$)</TableHead>
                  <TableHead className="text-right">Preço Venda (R$)</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Status Bling</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const blingConfig = BLING_STATUS_CONFIG[p.sync_status_bling]
                  return (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => openEdit(p)}>
                      <TableCell className="font-mono text-xs font-medium">{p.sku}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{p.nome}</TableCell>
                      <TableCell>{p.unidade}</TableCell>
                      <TableCell>{p.categories?.nome ?? '—'}</TableCell>
                      <TableCell>{p.suppliers?.nome ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(p.custo_vigente)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(p.preco_venda_vigente)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {calcMargem(p.custo_vigente, p.preco_venda_vigente)}
                      </TableCell>
                      <TableCell>
                        <Badge className={p.fonte === 'bling'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-dark-3 dark:text-dark-5'
                        }>
                          {p.fonte === 'bling' ? 'Bling' : 'Local'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={blingConfig.className}>{blingConfig.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            p.ativo
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }
                        >
                          {p.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700"
                            title={`Calcular custo (${METODO_LABEL[custoMetodo]})`}
                            onClick={() => handleCalcularCusto(p)}
                            disabled={calculando === p.id}
                          >
                            <Calculator className={`h-4 w-4 ${calculando === p.id ? 'animate-pulse' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-500 hover:text-blue-600"
                            title="Histórico de snapshots de custo"
                            onClick={() => openHistorico(p)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className="flex justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => confirmDelete(p)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="w-[min(560px,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>{editProduto ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            <DialogDescription>
              {editProduto
                ? `Editando: ${editProduto.nome}`
                : 'Preencha os dados para cadastrar um novo produto.'}
            </DialogDescription>
          </DialogHeader>
          <ProdutoForm
            produto={editProduto ?? undefined}
            categorias={categorias}
            fornecedores={fornecedores}
            costPolicies={costPolicies}
            pricingPolicies={pricingPolicies}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Histórico de Snapshots de Custo */}
      <Dialog open={!!historicoProduto} onOpenChange={(open) => !open && setHistoricoProduto(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-500" />
              Histórico de Custo
            </DialogTitle>
            <DialogDescription>
              {historicoProduto?.nome} · {historicoProduto?.sku}
            </DialogDescription>
          </DialogHeader>

          {loadingSnapshots ? (
            <div className="py-8 text-center text-sm text-gray-6">Carregando...</div>
          ) : snapshots.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-6">
              Nenhum snapshot de custo encontrado para este produto.
              <br />
              <span className="text-xs">Use o botão <Calculator className="h-3 w-3 inline" /> para calcular o primeiro custo.</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-dark-3 text-left">
                  <th className="py-2 pr-4 font-semibold text-dark dark:text-white">Data</th>
                  <th className="py-2 pr-4 font-semibold text-dark dark:text-white">Método</th>
                  <th className="py-2 pr-4 font-semibold text-dark dark:text-white text-right">Custo Base</th>
                  <th className="py-2 pr-4 font-semibold text-dark dark:text-white text-right">Custo Total</th>
                  <th className="py-2 font-semibold text-dark dark:text-white text-right">Pedidos</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s, i) => (
                  <tr
                    key={s.id}
                    className={`border-b border-stroke dark:border-dark-3 ${i === 0 ? 'bg-green-50 dark:bg-green-900/10' : ''}`}
                  >
                    <td className="py-2 pr-4 text-gray-6 text-xs">
                      {new Date(s.calculado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      {i === 0 && <span className="ml-1 text-green-600 font-semibold">(atual)</span>}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        {METODO_LABEL[s.metodo_usado] ?? s.metodo_usado}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums font-medium text-dark dark:text-white">
                      R$ {fmtNum(s.custo_base, 4)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums font-semibold text-primary">
                      R$ {fmtNum(s.custo_total, 4)}
                    </td>
                    <td className="py-2 text-right text-gray-6 text-xs">
                      {s.pedidos_count} pedido{Number(s.pedidos_count) !== 1 ? 's' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Produto</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o produto{' '}
              <strong>{deleteTarget?.nome}</strong> ({deleteTarget?.sku})?
              <br />
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
