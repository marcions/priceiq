import { NextResponse } from 'next/server'
import { pgquery } from '@/lib/db/query'

export async function GET() {
  try {
    const rows = await pgquery('SELECT COUNT(*) as total FROM products')
    return NextResponse.json({ ok: true, rows })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
