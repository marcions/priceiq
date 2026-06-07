'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { FornecedorForm } from '@/components/fornecedores/fornecedor-form'
import { deleteFornecedor } from './actions'
import { PlusIcon, PencilIcon, TrashIcon } from 'lucide-react'

interface FornecedorRow {
  id: string
  nome: string
  cnpj: string | null
  bling_id: string | null
  ativo: boolean
  created_at: string
}

interface FornecedoresClientProps {
  fornecedores: FornecedorRow[]
}

export function FornecedoresClient({ fornecedores }: FornecedoresClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<FornecedorRow | null>(null)

  function openCreate() {
    setSelected(null)
    setFormOpen(true)
  }

  function openEdit(f: FornecedorRow) {
    setSelected(f)
    setFormOpen(true)
  }

  function openDelete(f: FornecedorRow) {
    setSelected(f)
    setDeleteOpen(true)
  }

  async function handleDelete() {
    if (!selected) return
    const result = await deleteFornecedor(selected.id)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Fornecedor excluído!')
      setDeleteOpen(false)
      setSelected(null)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Fornecedores</h1>
          <p className="text-muted-foreground text-sm">Gerencie os fornecedores cadastrados</p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      {fornecedores.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">Nenhum fornecedor encontrado</p>
          <p className="text-sm">Crie o primeiro fornecedor clicando no botão acima.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fornecedores.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.nome}</TableCell>
                  <TableCell>{f.cnpj ?? '—'}</TableCell>
                  <TableCell>
                    {f.ativo ? (
                      <Badge variant="outline">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(f.created_at), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(f)}>
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => openDelete(f)}
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
            <DialogTitle>{selected ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
          </DialogHeader>
          <FornecedorForm
            fornecedor={selected ?? undefined}
            onSuccess={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Excluir fornecedor"
        description={`Tem certeza que deseja excluir "${selected?.nome}"? Esta ação não pode ser desfeita.`}
      />
    </>
  )
}
