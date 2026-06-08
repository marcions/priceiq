import * as http from 'node:http'
import * as https from 'node:https'
import { NextResponse } from 'next/server'

function testPort(host: string, port: number, path: string, useHttps = false, customHost?: string): Promise<string> {
  return new Promise((resolve) => {
    const headers: Record<string, string> = { 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' }
    if (customHost) headers['host'] = customHost

    const opts = { hostname: host, port, path, method: 'GET', headers, timeout: 5000 }
    const mod = useHttps ? https : http

    const req = (mod as typeof http).request(opts, (res) => {
      let body = ''
      res.on('data', d => { body += d.toString().slice(0, 100) })
      res.on('end', () => resolve(`${res.statusCode} body:${body.slice(0, 80)}`))
    })
    req.on('error', (e) => resolve(`ERR:${e.message.slice(0, 60)}`))
    req.on('timeout', () => { req.destroy(); resolve('TIMEOUT') })
    req.end()
  })
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  if (url.searchParams.get('secret') !== 'priceiq-setup-2026') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const HOST = 'supabasekong-l11r8297ciakbsefhwt06l9v.srv05.eastus.cloudapp.azure.com.sslip.io'

  const tests = await Promise.all([
    testPort('20.115.53.142', 80, '/auth/v1/health').then(r => ({ key: '20.115.53.142:80', r })),
    testPort('20.115.53.142', 80, '/auth/v1/health', false, HOST).then(r => ({ key: '20.115.53.142:80+Host', r })),
    testPort('20.115.53.142', 8000, '/auth/v1/health').then(r => ({ key: '20.115.53.142:8000', r })),
    testPort('20.115.53.142', 443, '/auth/v1/health', true).then(r => ({ key: '20.115.53.142:443', r })),
    testPort('srv05.eastus.cloudapp.azure.com', 8000, '/auth/v1/health').then(r => ({ key: 'srv05:8000', r })),
    testPort('srv05.eastus.cloudapp.azure.com', 80, '/auth/v1/health', false, HOST).then(r => ({ key: 'srv05:80+Host', r })),
  ])

  return NextResponse.json(Object.fromEntries(tests.map(t => [t.key, t.r])))
}
