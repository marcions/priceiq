'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createProduto, updateProduto } from '@/app/(client)/produtos/actions'
import type { Database } from '@/lib/supabase/types'

type ProductRow = Database['public']['Tables']['products']['Row']
type CategoryRow = Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'nome'>
type SupplierRow = Pick<Database['public']['Tables']['suppliers']['Row'], 'id' | 'nome'>
type CostPolicyRow = Pick<Database['public']['Tables']['cost_policies']['Row'], 'id' | 'nome'>
type PricingPolicyRow = Pick<Database['public']['Tables']['pricing_policies']['Row'], 'id' | 'nome'>

const UNIDADES = ['UN', 'CX', 'KG', 'L', 'M', 'M2', 'M3', 'PC', 'PAR']

function formatNcm(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 4) return digits
  if (digits.length <= 6) return `${digits.slice(0, 4)}.${digits.slice(4)}`
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`
}

interface ProdutoFormProps {
  produto?: ProductRow
  categorias: CategoryRow[]
  fornecedores: SupplierRow[]
  costPolicies: CostPolicyRow[]
  pricingPolicies: PricingPolicyRow[]
  onSuccess: () => void
}

export function ProdutoForm({
  produto,
  categorias,
  fornecedores,
  costPolicies,
  pricingPolicies,
  onSuccess,
}: ProdutoFormProps) {
  const isEdit = !!produto
  const [isPending, startTransition] = useTransition()

  const [sku, setSku] = useState(produto?.sku ?? '')
  const [nome, setNome] = useState(produto?.nome ?? '')
  const [unidade, setUnidade] = useState(produto?.unidade ?? 'UN')
  const [ncm, setNcm] = useState(produto?.ncm ?? '')
  const [ativo, setAtivo] = useState(produto?.ativo ?? true)
  const [categoriaId, setCategoriaId] = useState(produto?.categoria_id ?? '')
  const [fornecedorId, setFornecedorId] = useState(produto?.fornecedor_principal_id ?? '')
  const [costPolicyId, setCostPolicyId] = useState(produto?.cost_policy_id ?? '')
  const [pricingPolicyId, setPricingPolicyId] = useState(produto?.pricing_policy_id ?? '')
  const [custoVigente, setCustoVigente] = useState(produto?.custo_vigente?.toString() ?? '')
  const [precoVenda, setPrecoVenda] = useState(produto?.preco_venda_vigente?.toString() ?? '')
  const [precoMinimo, setPrecoMinimo] = useState(produto?.preco_minimo?.toString() ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!sku.trim()) {
      toast.error('SKU é obrigatório')
      return
    }
    if (!nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    const data = {
      sku: sku.trim(),
      nome: nome.trim(),
      unidade,
      ncm: ncm.trim() || null,
      ativo,
      categoria_id: categoriaId || null,
      fornecedor_principal_id: fornecedorId || null,
      cost_policy_id: costPolicyId || null,
      pricing_policy_id: pricingPolicyId || null,
      custo_vigente: custoVigente ? parseFloat(custoVigente) : null,
      preco_venda_vigente: precoVenda ? parseFloat(precoVenda) : null,
      preco_minimo: precoMinimo ? parseFloat(precoMinimo) : null,
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateProduto(produto.id, data)
        : await createProduto(data)

      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success(isEdit ? 'Produto atualizado!' : 'Produto criado!')
        onSuccess()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Identificação */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Identificação
        </h3>

        {/* SKU + Unidade */}
        <div className="grid grid-cols-[1fr_100px] gap-3">
          <div className="space-y-1.5 min-w-0">
            <Label htmlFor="sku">
              SKU <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sku"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="PROD-001"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="unidade">Unidade</Label>
            <Select value={unidade} onValueChange={(v) => setUnidade(v ?? 'UN')}>
              <SelectTrigger id="unidade" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIDADES.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Nome */}
        <div className="space-y-1.5">
          <Label htmlFor="nome">
            Nome <span className="text-destructive">*</span>
          </Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do produto"
            required
          />
        </div>

        {/* NCM + Ativo */}
        <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
          <div className="space-y-1.5 min-w-0">
            <Label htmlFor="ncm">NCM</Label>
            <Input
              id="ncm"
              value={ncm}
              onChange={(e) => setNcm(formatNcm(e.target.value))}
              placeholder="0000.00.00"
              maxLength={10}
            />
          </div>

          <div className="flex items-center gap-2 pb-0.5">
            <Switch id="ativo" checked={ativo} onCheckedChange={setAtivo} />
            <Label htmlFor="ativo" className="cursor-pointer whitespace-nowrap">
              {ativo ? 'Ativo' : 'Inativo'}
            </Label>
          </div>
        </div>
      </div>

      <Separator />

      {/* Vínculos */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Vínculos
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 min-w-0">
            <Label>Categoria</Label>
            <Select value={categoriaId || 'none'} onValueChange={(v) => setCategoriaId(v === 'none' || !v ? '' : v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sem categoria" className="truncate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 min-w-0">
            <Label>Fornecedor</Label>
            <Select value={fornecedorId || 'none'} onValueChange={(v) => setFornecedorId(v === 'none' || !v ? '' : v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sem fornecedor" className="truncate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem fornecedor</SelectItem>
                {fornecedores.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 min-w-0">
            <Label>Política de Custo</Label>
            <Select value={costPolicyId || 'none'} onValueChange={(v) => setCostPolicyId(v === 'none' || !v ? '' : v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Padrão da frente" className="truncate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Padrão da frente</SelectItem>
                {costPolicies.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 min-w-0">
            <Label>Política de Preço</Label>
            <Select value={pricingPolicyId || 'none'} onValueChange={(v) => setPricingPolicyId(v === 'none' || !v ? '' : v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Padrão da frente" className="truncate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Padrão da frente</SelectItem>
                {pricingPolicies.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Preços manuais */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Preços Manuais <span className="normal-case font-normal">(opcional)</span>
        </h3>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5 min-w-0">
            <Label htmlFor="custo_vigente" className="text-xs">Custo Vigente (R$)</Label>
            <Input
              id="custo_vigente"
              type="number"
              step="0.0001"
              min="0"
              value={custoVigente}
              onChange={(e) => setCustoVigente(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <Label htmlFor="preco_venda" className="text-xs">Preço de Venda (R$)</Label>
            <Input
              id="preco_venda"
              type="number"
              step="0.01"
              min="0"
              value={precoVenda}
              onChange={(e) => setPrecoVenda(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <Label htmlFor="preco_minimo" className="text-xs">Preço Mínimo (R$)</Label>
            <Input
              id="preco_minimo"
              type="number"
              step="0.01"
              min="0"
              value={precoMinimo}
              onChange={(e) => setPrecoMinimo(e.target.value)}
              placeholder="0,00"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Produto'}
        </Button>
      </div>
    </form>
  )
}
