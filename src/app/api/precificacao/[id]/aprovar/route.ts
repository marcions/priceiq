import { NextResponse } from 'next/server'
import { aprovarReview } from '@/lib/precificacao/calcular'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const result = await aprovarReview(id, body.nota)
  if (!result) {
    return NextResponse.json(
      { error: 'Review não encontrada ou já processada' },
      { status: 404 }
    )
  }

  return NextResponse.json(result)
}
