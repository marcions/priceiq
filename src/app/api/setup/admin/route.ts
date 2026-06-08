import { NextResponse } from 'next/server'

// Rota de diagnóstico temporária
export async function GET() {
  const secret = process.env.SETUP_SECRET
  if (!secret || secret !== 'priceiq-setup-2026') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'
  const results: Record<string, string> = { SUPABASE_URL }

  const testUrls = [
    `${SUPABASE_URL}/auth/v1/health`,
    'http://supabase-kong:8000/auth/v1/health',
    'http://srv05.eastus.cloudapp.azure.com:8000/auth/v1/health',
    'http://10.0.0.1:8000/auth/v1/health',
  ]

  for (const url of testUrls) {
    try {
      const r = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' }
      })
      results[url] = `${r.status}`
    } catch (e: unknown) {
      results[url] = `ERR: ${e instanceof Error ? e.message.slice(0,60) : String(e).slice(0,60)}`
    }
  }

  return NextResponse.json(results)
}
