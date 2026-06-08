// Gerenciamento de tokens Bling no Supabase

import { createServiceClient } from '@/lib/supabase/server'
import { refreshAccessToken } from './client'

export async function getValidToken(): Promise<string | null> {
  const supabase = await createServiceClient()

  const { data: token } = await (supabase as any)
    .from('bling_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!token) return null

  // Ainda válido (com 5min de margem)
  const expiresAt = new Date(token.expires_at)
  if (expiresAt.getTime() - Date.now() > 5 * 60 * 1000) {
    return token.access_token
  }

  // Expirado — renova
  try {
    const refreshed = await refreshAccessToken(token.refresh_token)
    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000)

    await (supabase as any)
      .from('bling_tokens')
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', token.id)

    return refreshed.access_token
  } catch (err) {
    console.error('Bling token refresh failed:', err)
    return null
  }
}

export async function saveToken(tokenData: {
  access_token: string
  refresh_token: string
  expires_in: number
  scope?: string
  token_type?: string
}) {
  const supabase = await createServiceClient()
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

  // Upsert: sempre mantém apenas 1 token (última conexão)
  const { data: existing } = await (supabase as any)
    .from('bling_tokens')
    .select('id')
    .limit(1)
    .single()

  if (existing) {
    await (supabase as any)
      .from('bling_tokens')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt.toISOString(),
        scope: tokenData.scope,
        token_type: tokenData.token_type ?? 'Bearer',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await (supabase as any).from('bling_tokens').insert({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt.toISOString(),
      scope: tokenData.scope,
      token_type: tokenData.token_type ?? 'Bearer',
    })
  }
}

export async function isBlingConnected(): Promise<boolean> {
  const token = await getValidToken()
  return token !== null
}
