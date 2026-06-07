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
import { Switch } from '@/components/ui/switch'
import { Database } from '@/lib/supabase/types'
import { createCostPolicy, updateCostPolicy } from '@/app/(client)/configuracoes/custo/actions'

type CostPolicyRow = Database['public']['Tables']['cost_policies']['Row']

interface CustoFormProps {
  policy?: CostPolicyRow
  onSuccess: () => void
}

export function CustoForm({ policy, onSuccess }: CustoFormProps) {
  const [nome, setNome] = useState(policy?.nome ?? '')
  const [metodo, setMetodo] = useState<'LAST' | 'SIMPLE_AVG' | 'WEIGHTED_AVG'>(
    policy?.metodo ?? 'LAST'
  )
  const [periodoDias, setPeriodoDias] = useState<string>(
    policy?.periodo_dias?.toString() ?? ''
  )
  const [incluirFrete, setIncluirFrete] = useState(policy?.incluir_frete ?? false)
  const [incluirImpostos, setIncluirImpostos] = useState(policy?.incluir_impostos ?? false)
  const [scope, setScope] = useState<'global' | 'category' | 'product'>(
    policy?.scope ?? 'global'
  )
  const [ativo, setAtivo] = useState(policy?.ativo ?? true)
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) {
      toast.error('Nome é obrigatório.')
      return
    }

    const data = {
      nome: nome.trim(),
      metodo,
      periodo_dias: periodoDias ? parseInt(periodoDias) : null,
      periodo_qtd_pedidos: null,
      incluir_frete: incluirFrete,
      incluir_impostos: incluirImpostos,
      scope,
      scope_id: null,
      ativo,
    }

    setLoading(true)
    startTransition(async () => {
      const result = policy
        ? await updateCostPolicy(policy.id, data)
        : await createCostPolicy(data)

      setLoading(false)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success(policy ? 'Política atualizada!' : 'Política criada!')
        onSuccess()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="nome">Nome *</Label>
        <Input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Custo baseado no último pedido"
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="metodo">Método de Cálculo</Label>
        <Select value={metodo} onValueChange={(v) => setMetodo((v ?? '') as typeof metodo)}>
          <SelectTrigger id="metodo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LAST">Último Preço</SelectItem>
            <SelectItem value="SIMPLE_AVG">Média Simples</SelectItem>
            <SelectItem value="WEIGHTED_AVG">Média Ponderada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="periodo_dias">Período (dias)</Label>
        <Input
          id="periodo_dias"
          type="number"
          min={1}
          value={periodoDias}
          onChange={(e) => setPeriodoDias(e.target.value)}
          placeholder="Ex: 90 dias"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="scope">Escopo</Label>
        <Select value={scope} onValueChange={(v) => setScope((v ?? '') as typeof scope)}>
          <SelectTrigger id="scope">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Global</SelectItem>
            <SelectItem value="category">Por Categoria</SelectItem>
            <SelectItem value="product">Por Produto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <Switch
            id="incluir_frete"
            checked={incluirFrete}
            onCheckedChange={setIncluirFrete}
          />
          <Label htmlFor="incluir_frete">Incluir Frete</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="incluir_impostos"
            checked={incluirImpostos}
            onCheckedChange={setIncluirImpostos}
          />
          <Label htmlFor="incluir_impostos">Incluir Impostos</Label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch id="ativo" checked={ativo} onCheckedChange={setAtivo} />
        <Label htmlFor="ativo">Ativo</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : policy ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
