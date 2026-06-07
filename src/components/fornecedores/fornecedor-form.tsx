'use client'

import { startTransition, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { createFornecedor, updateFornecedor } from '@/app/(client)/fornecedores/actions'

interface FornecedorRow {
  id: string
  nome: string
  cnpj: string | null
  bling_id: string | null
  ativo: boolean
  created_at: string
}

interface FornecedorFormProps {
  fornecedor?: FornecedorRow
  onSuccess: () => void
}

export function FornecedorForm({ fornecedor, onSuccess }: FornecedorFormProps) {
  const [loading, setLoading] = useState(false)
  const [nome, setNome] = useState(fornecedor?.nome ?? '')
  const [cnpj, setCnpj] = useState(fornecedor?.cnpj ?? '')
  const [ativo, setAtivo] = useState(fornecedor?.ativo ?? true)

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
          cnpj: cnpj.trim() || null,
          ativo,
        }
        const result = fornecedor
          ? await updateFornecedor(fornecedor.id, data)
          : await createFornecedor(data)

        if ('error' in result) {
          toast.error(result.error)
        } else {
          toast.success(fornecedor ? 'Fornecedor atualizado!' : 'Fornecedor criado!')
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
          placeholder="Nome do fornecedor"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cnpj">CNPJ</Label>
        <Input
          id="cnpj"
          value={cnpj}
          onChange={(e) => setCnpj(e.target.value)}
          placeholder="00.000.000/0000-00"
        />
      </div>

      <div className="flex items-center gap-3">
        <Switch id="ativo" checked={ativo} onCheckedChange={setAtivo} />
        <Label htmlFor="ativo">Fornecedor ativo</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : fornecedor ? 'Salvar alterações' : 'Criar fornecedor'}
        </Button>
      </div>
    </form>
  )
}
