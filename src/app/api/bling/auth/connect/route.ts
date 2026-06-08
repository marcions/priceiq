import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { blingAuthUrl } from '@/lib/bling/client'
import { randomBytes } from 'crypto'

export async function GET() {
  const state = randomBytes(16).toString('hex')
  const supabase = await createServiceClient()

  await (supabase as any).from('bling_oauth_state').insert({ state })

  // Limpa states antigos (> 15 min)
  await (supabase as any)
    .from('bling_oauth_state')
    .delete()
    .lt('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())

  return NextResponse.redirect(blingAuthUrl(state))
}
