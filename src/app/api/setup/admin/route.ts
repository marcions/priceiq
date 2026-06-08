import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Rota temporária de setup — remover após criar o admin
export async function GET() {
  const secret = process.env.SETUP_SECRET
  if (!secret || secret !== 'priceiq-setup-2026') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return NextResponse.json({ error: 'missing env vars', url: !!url, key: !!key })
  }

  try {
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Tentar listar usuários
    const listResult = await supabase.auth.admin.listUsers()

    if (listResult.error) {
      return NextResponse.json({
        step: 'listUsers',
        error: listResult.error.message,
        status: listResult.error.status
      })
    }

    const found = listResult.data?.users?.find(u => u.email === 'marcions27@gmail.com')

    if (found) {
      const { data, error } = await supabase.auth.admin.updateUserById(found.id, {
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
      user_metadata: { role: 'admin', name: 'Admin' },
    })

    if (error) return NextResponse.json({ step: 'create', error: error.message })
    return NextResponse.json({ ok: true, action: 'created', id: data.user.id })

  } catch (e: unknown) {
    return NextResponse.json({
      error: 'exception',
      message: e instanceof Error ? e.message : String(e),
      url
    })
  }
}
