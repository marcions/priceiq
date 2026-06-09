import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

// O NEXT_PUBLIC_SUPABASE_URL aponta para o proxy da app (hairpin NAT no servidor).
// Para chamadas server-side, usamos Kong diretamente via IP + Host header.
// O storageKey é fixado para manter o mesmo nome de cookie que o browser usa.
const KONG_IP   = '20.51.158.208'
const KONG_HOST = 'supabasekong-m13buf3hxxtgq94jhatkirlk.20.51.158.208.sslip.io'
const KONG_URL  = `http://${KONG_IP}`
// Cookie name derivado de NEXT_PUBLIC_SUPABASE_URL = http://priceiq.52-188-22-235.sslip.io/api/supabase
// host → priceiq.52-188-22-235.sslip.io → ref = "priceiq" → cookie = "sb-priceiq-auth-token"
const SUPABASE_COOKIE_NAME = 'sb-priceiq-auth-token'

/**
 * Custom fetch que injeta o Host header correto para rotear via Kong.
 * Necessário porque chamamos o IP diretamente para evitar hairpin NAT.
 */
const kongFetch: typeof fetch = (input, init = {}) => {
  const headers = new Headers(init.headers)
  headers.set('host', KONG_HOST)
  return fetch(input, { ...init, headers })
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    KONG_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: kongFetch },
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
  return createServerClient<Database>(
    KONG_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: { fetch: kongFetch },
      auth: { storageKey: SUPABASE_COOKIE_NAME },
      cookies: { getAll: () => [], setAll: () => {} },
    }
  )
}
