import { NextRequest, NextResponse } from 'next/server'

// Proxy para o Supabase — contorna o firewall do Srv05 porta 8000
// O servidor (Srv03) alcança o Supabase via IP + Host header correto
const SUPABASE_INTERNAL_IP = 'http://20.115.53.142'
const SUPABASE_HOST = 'supabasekong-l11r8297ciakbsefhwt06l9v.srv05.eastus.cloudapp.azure.com.sslip.io'

// Headers que não devem ser repassados
const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'transfer-encoding', 'te',
  'trailer', 'upgrade', 'proxy-authorization', 'proxy-authenticate',
])

async function proxyRequest(req: NextRequest, params: { path: string[] }) {
  const path = params.path.join('/')
  const search = req.nextUrl.search
  const targetUrl = `${SUPABASE_INTERNAL_IP}/${path}${search}`

  // Copiar headers relevantes
  const headers = new Headers()
  headers.set('Host', SUPABASE_HOST)

  for (const [key, value] of req.headers) {
    if (!HOP_BY_HOP.has(key.toLowerCase()) && key.toLowerCase() !== 'host') {
      headers.set(key, value)
    }
  }

  // Ler body para métodos que o têm
  const hasBody = !['GET', 'HEAD', 'DELETE'].includes(req.method)
  const body = hasBody ? await req.arrayBuffer() : undefined

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: body ? body : undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(30000),
    })

    // Construir response
    const resHeaders = new Headers()
    for (const [key, value] of upstream.headers) {
      if (!HOP_BY_HOP.has(key.toLowerCase())) {
        resHeaders.set(key, value)
      }
    }

    // Permitir CORS para o browser
    resHeaders.set('Access-Control-Allow-Origin', '*')
    resHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    resHeaders.set('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info, prefer')
    resHeaders.set('Access-Control-Expose-Headers', 'content-range, x-total-count')

    const resBody = await upstream.arrayBuffer()

    return new NextResponse(resBody, {
      status: upstream.status,
      headers: resHeaders,
    })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: 'Supabase proxy error', message: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    )
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params)
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params)
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params)
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params)
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params)
}
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, prefer',
    },
  })
}
