import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Rota temporária de setup — remover após criar o admin
export async function GET() {
  const secret = process.env.SETUP_SECRET
  if (!secret || secret !== 'priceiq-setup-2026') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verificar se usuário já existe
  const { data: existing } = await supabase.auth.admin.listUsers()
  const found = existing?.users?.find(u => u.email === 'marcions27@gmail.com')

  if (found) {
    // Resetar senha
    const { data, error } = await supabase.auth.admin.updateUserById(found.id, {
      password: 'PriceIQ@2026',
      email_confirm: true,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, action: 'password_reset', id: data.user.id })
  }

  // Criar usuário novo
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'marcions27@gmail.com',
    password: 'PriceIQ@2026',
    email_confirm: true,
    user_metadata: { role: 'admin', name: 'Admin' },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, action: 'created', id: data.user.id })
}
