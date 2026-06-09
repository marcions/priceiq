import { NextResponse } from 'next/server'
import { precificarProduto, MetodoPrecificacao } from '@/lib/precificacao/calcular'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const metodo: MetodoPrecificacao = body.metodo === 'MARGEM' ? 'MARGEM' : 'MARKUP'
  const parametro = Number(body.parametro)

  if (!parametro || parametro <= 0 || parametro >= 100 && metodo === 'MARGEM') {
    return NextResponse.json(
      { error: 'parametro inválido (MARKUP: qualquer >0; MARGEM: entre 1 e 99)' },
      { status: 400 }
    )
  }

  const result = await precificarProduto(id, metodo, parametro)
  if (!result) {
    return NextResponse.json(
      { error: 'Produto não encontrado ou sem custo vigente' },
      { status: 404 }
    )
  }

  return NextResponse.json(result)
}
