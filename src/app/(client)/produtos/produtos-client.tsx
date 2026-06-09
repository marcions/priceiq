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
import { Plus, Pencil, Trash2, Package } from 'lucide-react'
import { fmtMoeda, fmtMargem } from '@/lib/format'

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

          <div className="flex flex-wrap items-center gap-3 mt-4">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
