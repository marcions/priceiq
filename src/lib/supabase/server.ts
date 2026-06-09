import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

// IMPORTANTE: usa NEXT_PUBLIC_SUPABASE_URL (não SUPABASE_DIRECT_URL)
// O nome do cookie de sessão é derivado da URL base — deve ser a mesma
// usada pelo client-side para que o servidor encontre o cookie correto.
// Dados são buscados via pgquery/pg-meta, não pelo PostgREST.
const SUPABASE_SERVER_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

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
