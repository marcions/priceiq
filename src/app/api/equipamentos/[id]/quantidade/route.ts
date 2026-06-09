import { NextResponse } from 'next/server'
import { pgquery, pgqueryone, pgesc } from '@/lib/db/query'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { quantidade } = await req.json()

  if (typeof quantidade !== 'number' || quantidade < 0 || !Number.isInteger(quantidade)) {
    return NextResponse.json({ error: 'quantidade deve ser um inteiro >= 0' }, { status: 400 })
  }

  await pgquery(`
    UPDATE impressoras
    SET quantidade_propria = ${pgesc(quantidade)}
    WHERE id = ${pgesc(id)}
  `)

  const updated = await pgqueryone<{ quantidade_propria: string }>(`
    SELECT quantidade_propria FROM impressoras WHERE id = ${pgesc(id)}
  `)

  return NextResponse.json({ quantidade_propria: Number(updated?.quantidade_propria ?? 0) })
}
