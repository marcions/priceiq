import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  if (url.searchParams.get('secret') !== 'priceiq-setup-2026') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    // Ver se usuário já existe
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers()
    if (listErr) return NextResponse.json({ step: 'list', error: listErr.message })

    const existing = list.users.find(u => u.email === 'marcions27@gmail.com')

    if (existing) {
      const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
        password: 'PriceIQ@2026',
        email_confirm: true,
      })
      if (error) return NextResponse.json({ step: 'update', error: error.message })
      return NextResponse.json({ ok: true, action: 'password_reset', id: data.user.id })
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: 'marcions27@gmail.com',
      password: 'PriceIQ@2026',
      email_confirm: true,
      user_metadata: { name: 'Admin', role: 'admin' },
    })
    if (error) return NextResponse.json({ step: 'create', error: error.message })
    return NextResponse.json({ ok: true, action: 'created', id: data.user.id })

  } catch (e: unknown) {
    return NextResponse.json({
      error: 'exception',
      message: e instanceof Error ? e.message : String(e),
    })
  }
}
