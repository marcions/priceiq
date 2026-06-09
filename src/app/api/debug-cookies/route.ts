import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const all = cookieStore.getAll()
  return NextResponse.json({
    count: all.length,
    names: all.map(c => c.name),
  })
}
