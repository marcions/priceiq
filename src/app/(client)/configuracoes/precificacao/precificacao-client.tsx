'use client'

import { useState, startTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Database } from '@/lib/supabase/types'
import { PrecificacaoForm } from '@/components/politicas/precificacao-form'
import { deletePricingPolicy } from './actions'
import { Pencil, Trash2, Plus } from 'lucide-react'

type PricingPolicyRow = Database['public']['Tables']['pricing_policies']['Row']

const TECNICA_LABELS: Record<PricingPolicyRow['tecnica'], string> = {
  MARKUP: 'Markup',
  MARGIN: 'Margem',
}

const SCOPE_LABELS: Record<PricingPolicyRow['scope'], string> = {
  global: 'Global',
  category: 'Por Categoria',
  product: 'Por Produto',
}

const ARREDONDAMENTO_LABELS: Record<PricingPolicyRow['arredondamento'], string> = {
  none: 'Nenhum',
  psychological: 'Psicológico (,99)',
  integer: 'Inteiro',
}

function formatPct(value: number | null) {
  if (value === null) return '—'
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%`
}

interface PrecificacaoClientProps {
  policies: PricingPolicyRow[]
}

export function PrecificacaoClient({ policies }: PrecificacaoClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<PricingPolicyRow | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<PricingPolicyRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openCreate() {
    setEditingPolicy(undefined)
    setFormOpen(true)
  }

  function openEdit(policy: PricingPolicyRow) {
    setEditingPolicy(policy)
    setFormOpen(true)
  }

  function handleFormSuccess() {
    setFormOpen(false)
    setEditingPolicy(undefined)
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleting(true)
    startTransition(async () => {
      const result = await deletePricingPolicy(deleteTarget.id)
      setDeleting(false)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Política excluída.')
        setDeleteTarget(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Políticas de Precificação</h2>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nova Política
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Técnica</TableHead>
              <TableHead>Markup / Margem %</TableHead>
              <TableHead>Escopo</TableHead>
              <TableHead>Arredondamento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhuma política cadastrada.
                </TableCell>
              </TableRow>
            )}
            {policies.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell>{TECNICA_LABELS[p.tecnica]}</TableCell>
                <TableCell>
                  {p.tecnica === 'MARKUP' ? formatPct(p.markup_pct) : formatPct(p.margem_pct)}
                </TableCell>
                <TableCell>{SCOPE_LABELS[p.scope]}</TableCell>
                <TableCell>{ARREDONDAMENTO_LABELS[p.arredondamento]}</TableCell>
                <TableCell>
                  {p.ativo ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(p)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(p)}
                      title="Excluir"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {editingPolicy ? 'Editar Política de Precificação' : 'Nova Política de Precificação'}
            </DialogTitle>
          </DialogHeader>
          <PrecificacaoForm policy={editingPolicy} onSuccess={handleFormSuccess} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Política</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a política{' '}
              <strong>{deleteTarget?.nome}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
