import { NextResponse } from 'next/server'
import { precificarLote, MetodoPrecificacao } from '@/lib/precificacao/calcular'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  const metodo: MetodoPrecificacao = body.metodo === 'MARGEM' ? 'MARGEM' : 'MARKUP'
  const parametro = Number(body.parametro)

  if (!parametro || parametro <= 0) {
    return NextResponse.json({ error: 'parametro deve ser > 0' }, { status: 400 })
  }

  if (metodo === 'MARGEM' && parametro >= 100) {
    return NextResponse.json({ error: 'margem deve ser < 100%' }, { status: 400 })
  }

  const result = await precificarLote(metodo, parametro)
  return NextResponse.json(result)
}
