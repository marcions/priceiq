import { NextResponse } from 'next/server'
import { pgquery } from '@/lib/db/query'
import { blingAuthUrl } from '@/lib/bling/client'
import { randomBytes } from 'node:crypto'

export async function GET() {
  const state = randomBytes(16).toString('hex')

  await pgquery(`INSERT INTO bling_oauth_state (state) VALUES ('${state}')`)

  // Limpa states antigos (> 15 min)
  await pgquery(`
    DELETE FROM bling_oauth_state
    WHERE created_at < '${new Date(Date.now() - 15 * 60 * 1000).toISOString()}'
  `)

  return NextResponse.redirect(blingAuthUrl(state))
}
