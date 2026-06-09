import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const tokenCookie = cookieStore.get('sb-priceiq-auth-token')

  let sessionResult = null
  let sessionError = null
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getSession()
    sessionResult = {
      hasSession: !!data.session,
      expiresAt: data.session?.expires_at,
      userEmail: data.session?.user?.email,
    }
    sessionError = error?.message
  } catch (e) {
    sessionError = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({
    cookiePresent: !!tokenCookie,
    cookieLength: tokenCookie?.value?.length,
    cookieValueStart: tokenCookie?.value?.substring(0, 30),
    session: sessionResult,
    error: sessionError,
  })
}
