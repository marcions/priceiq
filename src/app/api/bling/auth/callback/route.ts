import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { exchangeCode } from '@/lib/bling/client'
import { saveToken } from '@/lib/bling/tokens'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${APP_URL}/sync?bling_error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/sync?bling_error=missing_params`)
  }

  const supabase = await createServiceClient()

  const { data: stateRow } = await (supabase as any)
    .from('bling_oauth_state')
    .select('state')
    .eq('state', state)
    .single()

  if (!stateRow) {
    return NextResponse.redirect(`${APP_URL}/sync?bling_error=invalid_state`)
  }

  await (supabase as any).from('bling_oauth_state').delete().eq('state', state)

  try {
    const tokenData = await exchangeCode(code)
    await saveToken(tokenData)
    return NextResponse.redirect(`${APP_URL}/sync?bling_connected=true`)
  } catch (err) {
    console.error('Bling callback error:', err)
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.redirect(`${APP_URL}/sync?bling_error=${encodeURIComponent(msg)}`)
  }
}
