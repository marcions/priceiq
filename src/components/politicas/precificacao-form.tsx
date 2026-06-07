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
import {
  createPricingPolicy,
  updatePricingPolicy,
} from '@/app/(client)/configuracoes/precificacao/actions'

type PricingPolicyRow = Database['public']['Tables']['pricing_policies']['Row']

interface PrecificacaoFormProps {
  policy?: PricingPolicyRow
  onSuccess: () => void
}

export function PrecificacaoForm({ policy, onSuccess }: PrecificacaoFormProps) {
  const [nome, setNome] = useState(policy?.nome ?? '')
  const [tecnica, setTecnica] = useState<'MARKUP' | 'MARGIN'>(policy?.tecnica ?? 'MARKUP')
  const [markupPct, setMarkupPct] = useState<string>(policy?.markup_pct?.toString() ?? '')
  const [margemPct, setMargemPct] = useState<string>(policy?.margem_pct?.toString() ?? '')
  const [precoMinimo, setPrecoMinimo] = useState<string>(
    policy?.preco_minimo?.toString() ?? ''
  )
  const [precoMaximo, setPrecoMaximo] = useState<string>(
    policy?.preco_maximo?.toString() ?? ''
  )
  const [arredondamento, setArredondamento] = useState<'none' | 'psychological' | 'integer'>(
    policy?.arredondamento ?? 'none'
  )
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
      tecnica,
      markup_pct: tecnica === 'MARKUP' && markupPct ? parseFloat(markupPct) : null,
      margem_pct: tecnica === 'MARGIN' && margemPct ? parseFloat(margemPct) : null,
      preco_minimo: precoMinimo ? parseFloat(precoMinimo) : null,
      preco_maximo: precoMaximo ? parseFloat(precoMaximo) : null,
      arredondamento,
      scope,
      scope_id: null,
      ativo,
    }

    setLoading(true)
    startTransition(async () => {
      const result = policy
        ? await updatePricingPolicy(policy.id, data)
        : await createPricingPolicy(data)

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
          placeholder="Ex: Margem padrão eletrônicos"
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="tecnica">Técnica de Precificação</Label>
        <Select value={tecnica} onValueChange={(v) => setTecnica((v ?? '') as typeof tecnica)}>
          <SelectTrigger id="tecnica">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MARKUP">Markup</SelectItem>
            <SelectItem value="MARGIN">Margem</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tecnica === 'MARKUP' && (
        <div className="space-y-1">
          <Label htmlFor="markup_pct">Markup %</Label>
          <Input
            id="markup_pct"
            type="number"
            step="0.01"
            min={0}
            value={markupPct}
            onChange={(e) => setMarkupPct(e.target.value)}
            placeholder="Ex: 100 = dobro do custo"
          />
        </div>
      )}

      {tecnica === 'MARGIN' && (
        <div className="space-y-1">
          <Label htmlFor="margem_pct">Margem %</Label>
          <Input
            id="margem_pct"
            type="number"
            step="0.01"
            min={0}
            max={99.99}
            value={margemPct}
            onChange={(e) => setMargemPct(e.target.value)}
            placeholder="Ex: 50 = 50% de margem"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="preco_minimo">Preço Mínimo (R$)</Label>
          <Input
            id="preco_minimo"
            type="number"
            step="0.01"
            min={0}
            value={precoMinimo}
            onChange={(e) => setPrecoMinimo(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="preco_maximo">Preço Máximo (R$)</Label>
          <Input
            id="preco_maximo"
            type="number"
            step="0.01"
            min={0}
            value={precoMaximo}
            onChange={(e) => setPrecoMaximo(e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="arredondamento">Arredondamento</Label>
        <Select
          value={arredondamento}
          onValueChange={(v) => setArredondamento((v ?? '') as typeof arredondamento)}
        >
          <SelectTrigger id="arredondamento">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem arredondamento</SelectItem>
            <SelectItem value="psychological">Psicológico (,99)</SelectItem>
            <SelectItem value="integer">Inteiro</SelectItem>
          </SelectContent>
        </Select>
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
