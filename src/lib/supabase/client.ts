import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

// storageKey fixo para garantir consistência com o servidor
// mesmo que NEXT_PUBLIC_SUPABASE_URL mude no futuro
const SUPABASE_COOKIE_NAME = 'sb-priceiq-auth-token'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { storageKey: SUPABASE_COOKIE_NAME } }
  )
}
