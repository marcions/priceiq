import { NextRequest, NextResponse } from 'next/server'
import * as http from 'node:http'

// Proxy Supabase — Traefik no Srv05 porta 80 com Host header correto
const SUPABASE_IP = '20.51.158.208'
const SUPABASE_HOST = 'supabasekong-m13buf3hxxtgq94jhatkirlk.20.51.158.208.sslip.io'

// Connection pool: reutiliza sockets TCP entre requests (reduz latência ~50-80ms por call)
const agent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 20,
})

// Headers que o proxy NÃO deve copiar do request original
const SKIP_HEADERS = new Set([
  'connection', 'keep-alive', 'transfer-encoding', 'te',
  'trailer', 'upgrade', 'proxy-authorization', 'proxy-authenticate',
  'host', // substituído pelo SUPABASE_HOST
])

function httpRequest(
  method: string,
  path: string,
  forwardHeaders: Record<string, string>,
  body?: Buffer
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const options: http.RequestOptions = {
      hostname: SUPABASE_IP,
      port: 80,
      path,
      method,
      agent, // reutiliza conexões TCP (keep-alive)
      headers: {
        host: SUPABASE_HOST, // OBRIGATÓRIO — Traefik roteia por este header
        ...forwardHeaders,
      },
    }

    const req = http.request(options, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve({
        status: res.statusCode ?? 200,
        headers: res.headers,
        body: Buffer.concat(chunks),
      }))
    })

    req.on('error', reject)
    req.setTimeout(30000, () => { req.destroy(new Error('timeout')) })

    if (body && body.length > 0) req.write(body)
    req.end()
  })
}

async function proxyRequest(req: NextRequest, params: { path: string[] }) {
  const supabasePath = `/${params.path.join('/')}${req.nextUrl.search}`

  // Copiar apenas headers seguros do request original (sem hop-by-hop e sem host)
  const forwardHeaders: Record<string, string> = {}
  for (const [key, value] of req.headers) {
    if (!SKIP_HEADERS.has(key.toLowerCase())) {
      forwardHeaders[key] = value
    }
  }

  // Body para métodos que o têm
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  const bodyBuf = hasBody ? Buffer.from(await req.arrayBuffer()) : undefined

  try {
    const result = await httpRequest(req.method, supabasePath, forwardHeaders, bodyBuf)

    // Montar headers da resposta
    const resHeaders = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, prefer',
      'Access-Control-Expose-Headers': 'content-range, x-total-count',
    })

    const SKIP_RES = new Set(['connection', 'keep-alive', 'transfer-encoding', 'access-control-allow-origin'])
    for (const [key, value] of Object.entries(result.headers)) {
      if (!SKIP_RES.has(key.toLowerCase()) && value) {
        if (Array.isArray(value)) {
          value.forEach(v => resHeaders.append(key, v))
        } else {
          resHeaders.set(key, value)
        }
      }
    }

    return new NextResponse(result.body.buffer.slice(
      result.body.byteOffset,
      result.body.byteOffset + result.body.byteLength
    ) as ArrayBuffer, {
      status: result.status,
      headers: resHeaders,
    })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: 'proxy_error', detail: e instanceof Error ? e.message : String(e) },
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
