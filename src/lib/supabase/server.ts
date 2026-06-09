import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

// Para chamadas server-side, usamos Kong diretamente via hostname DNS.
// fetch() do Node.js (undici) ignora override do 'host' header — usar URL completa.
// O hostname sslip.io resolve para 20.51.158.208 sem hairpin NAT (VM diferente da app).
// storageKey fixo para manter o mesmo cookie que o browser usa (sb-priceiq-auth-token),
// independente da URL usada no servidor.
const KONG_URL = 'http://supabasekong-m13buf3hxxtgq94jhatkirlk.20.51.158.208.sslip.io'
const SUPABASE_COOKIE_NAME = 'sb-priceiq-auth-token'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    KONG_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { storageKey: SUPABASE_COOKIE_NAME },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignorado em Server Components — middleware lida com isso
          }
        },
      },
    }
  )
}

export async function createServiceClient() {
  return createServerClient(
    KONG_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { storageKey: SUPABASE_COOKIE_NAME },
      cookies: { getAll: () => [], setAll: () => {} },
    }
  )
}
