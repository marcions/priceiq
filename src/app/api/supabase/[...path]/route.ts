import { NextRequest, NextResponse } from 'next/server'
import * as http from 'node:http'

// Proxy para o Supabase — contorna o firewall do Srv05 porta 8000
// Traefik no Srv05 responde na porta 80 com o Host header correto
const SUPABASE_HOST_IP = '20.115.53.142'
const SUPABASE_HOST_HEADER = 'supabasekong-l11r8297ciakbsefhwt06l9v.srv05.eastus.cloudapp.azure.com.sslip.io'

const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'transfer-encoding', 'te',
  'trailer', 'upgrade', 'proxy-authorization', 'proxy-authenticate', 'host',
])

function httpRequest(options: http.RequestOptions, body?: Buffer): Promise<{ status: number; headers: Record<string, string | string[]>; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        resolve({
          status: res.statusCode ?? 200,
          headers: res.headers as Record<string, string | string[]>,
          body: Buffer.concat(chunks),
        })
      })
    })
    req.on('error', reject)
    req.setTimeout(30000, () => { req.destroy(new Error('timeout')) })
    if (body) req.write(body)
    req.end()
  })
}

async function proxyRequest(req: NextRequest, params: { path: string[] }) {
  const path = params.path.join('/')
  const search = req.nextUrl.search

  // Copiar headers relevantes (exceto hop-by-hop e host)
  const headers: http.OutgoingHttpHeaders = {
    host: SUPABASE_HOST_HEADER,
  }
  for (const [key, value] of req.headers) {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      headers[key] = value
    }
  }

  // Body
  const hasBody = !['GET', 'HEAD', 'DELETE'].includes(req.method)
  const bodyBuf = hasBody ? Buffer.from(await req.arrayBuffer()) : undefined

  try {
    const result = await httpRequest(
      {
        hostname: SUPABASE_HOST_IP,
        port: 80,
        path: `/${path}${search}`,
        method: req.method,
        headers,
      },
      bodyBuf
    )

    const resHeaders = new Headers()
    for (const [key, value] of Object.entries(result.headers)) {
      if (!HOP_BY_HOP.has(key.toLowerCase())) {
        if (Array.isArray(value)) {
          value.forEach(v => resHeaders.append(key, v))
        } else if (value) {
          resHeaders.set(key, value)
        }
      }
    }
    resHeaders.set('Access-Control-Allow-Origin', '*')
    resHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    resHeaders.set('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info, prefer')
    resHeaders.set('Access-Control-Expose-Headers', 'content-range, x-total-count')

    return new NextResponse(result.body, {
      status: result.status,
      headers: resHeaders,
    })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: 'proxy_error', message: e instanceof Error ? e.message : String(e) },
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
