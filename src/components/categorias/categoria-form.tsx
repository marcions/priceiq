'use client'

import { startTransition, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createCategoria, updateCategoria } from '@/app/(client)/categorias/actions'

interface CategoriaRow {
  id: string
  nome: string
  parent_id: string | null
  ordem: number
  bling_id: string | null
  created_at: string
}

interface CategoriaFormProps {
  categoria?: CategoriaRow
  categorias: CategoriaRow[]
  onSuccess: () => void
}

export function CategoriaForm({ categoria, categorias, onSuccess }: CategoriaFormProps) {
  const [loading, setLoading] = useState(false)
  const [nome, setNome] = useState(categoria?.nome ?? '')
  const [parentId, setParentId] = useState(categoria?.parent_id ?? '')
  const [ordem, setOrdem] = useState(String(categoria?.ordem ?? 0))

  const availableParents = categorias.filter((c) => c.id !== categoria?.id)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    setLoading(true)
    startTransition(async () => {
      try {
        const data = {
          nome: nome.trim(),
          parent_id: parentId || null,
          ordem: Number(ordem) || 0,
        }
        const result = categoria
          ? await updateCategoria(categoria.id, data)
          : await createCategoria(data)

        if ('error' in result) {
          toast.error(result.error)
        } else {
          toast.success(categoria ? 'Categoria atualizada!' : 'Categoria criada!')
          onSuccess()
        }
      } finally {
        setLoading(false)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome *</Label>
        <Input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome da categoria"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="parent_id">Categoria Pai</Label>
        <Select value={parentId} onValueChange={(v) => setParentId(v ?? '')}>
          <SelectTrigger id="parent_id">
            <SelectValue placeholder="Sem categoria pai" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Sem categoria pai</SelectItem>
            {availableParents.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ordem">Ordem</Label>
        <Input
          id="ordem"
          type="number"
          value={ordem}
          onChange={(e) => setOrdem(e.target.value)}
          placeholder="0"
          min={0}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : categoria ? 'Salvar alterações' : 'Criar categoria'}
        </Button>
      </div>
    </form>
  )
}
