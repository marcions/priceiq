'use client'

import { useState, startTransition } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
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
import { DeleteDialog } from '@/components/shared/delete-dialog'
import { CategoriaForm } from '@/components/categorias/categoria-form'
import { deleteCategoria } from './actions'
import { PlusIcon, PencilIcon, TrashIcon } from 'lucide-react'

interface CategoriaRow {
  id: string
  nome: string
  parent_id: string | null
  ordem: number
  bling_id: string | null
  created_at: string
  parent_nome?: string | null
}

interface CategoriasClientProps {
  categorias: CategoriaRow[]
}

export function CategoriasClient({ categorias }: CategoriasClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<CategoriaRow | null>(null)

  function openCreate() {
    setSelected(null)
    setFormOpen(true)
  }

  function openEdit(cat: CategoriaRow) {
    setSelected(cat)
    setFormOpen(true)
  }

  function openDelete(cat: CategoriaRow) {
    setSelected(cat)
    setDeleteOpen(true)
  }

  async function handleDelete() {
    if (!selected) return
    const result = await deleteCategoria(selected.id)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Categoria excluída!')
      setDeleteOpen(false)
      setSelected(null)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Categorias</h1>
          <p className="text-muted-foreground text-sm">Gerencie as categorias de produtos</p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      {categorias.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">Nenhuma categoria encontrada</p>
          <p className="text-sm">Crie a primeira categoria clicando no botão acima.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria Pai</TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead>Data criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorias.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.nome}</TableCell>
                  <TableCell>{cat.parent_nome ?? '—'}</TableCell>
                  <TableCell>{cat.ordem}</TableCell>
                  <TableCell>
                    {format(new Date(cat.created_at), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => openDelete(cat)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <CategoriaForm
            categoria={selected ?? undefined}
            categorias={categorias}
            onSuccess={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Excluir categoria"
        description={`Tem certeza que deseja excluir "${selected?.nome}"? Esta ação não pode ser desfeita.`}
      />
    </>
  )
}
