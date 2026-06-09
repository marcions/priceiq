import { NextResponse } from 'next/server'
import { rejeitarReview } from '@/lib/precificacao/calcular'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  await rejeitarReview(id, body.nota)
  return NextResponse.json({ ok: true })
}
