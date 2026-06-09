import { NextResponse } from 'next/server'
import { precificarProduto, precificarPorFrente, MetodoPrecificacao } from '@/lib/precificacao/calcular'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  // Se body vazio ou body.auto=true → usa política da frente automaticamente
  if (!body.metodo || body.auto) {
    const result = await precificarPorFrente(id)
    if (!result) {
      return NextResponse.json(
        { error: 'Produto sem custo vigente, sem snapshot ou sem política de preço na frente' },
        { status: 404 }
      )
    }
    return NextResponse.json(result)
  }

  // Override manual: metodo + parametro
  const metodo: MetodoPrecificacao = body.metodo === 'MARGEM' ? 'MARGEM' : 'MARKUP'
  const parametro = Number(body.parametro)

  if (!parametro || parametro <= 0 || (metodo === 'MARGEM' && parametro >= 100)) {
    return NextResponse.json(
      { error: 'parametro inválido (MARKUP: >0; MARGEM: 1-99)' },
      { status: 400 }
    )
  }

  const result = await precificarProduto(id, metodo, parametro)
  if (!result) {
    return NextResponse.json(
      { error: 'Produto não encontrado, sem custo vigente ou sem snapshot' },
      { status: 404 }
    )
  }

  return NextResponse.json(result)
}
