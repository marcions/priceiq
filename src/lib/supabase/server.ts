import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

// Server-side usa URL direta ao Kong (sem passar pelo proxy Next.js)
// No Docker o container não consegue se chamar via URL pública
const SUPABASE_SERVER_URL =
  process.env.SUPABASE_DIRECT_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    SUPABASE_SERVER_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    SUPABASE_SERVER_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}
