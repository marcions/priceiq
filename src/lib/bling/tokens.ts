// Gerenciamento de tokens Bling via pg-meta (bypassa PostgREST)

import { pgquery, pgqueryone, pgesc } from '@/lib/db/query'
import { refreshAccessToken } from './client'

interface BlingTokenRow {
  id: string
  access_token: string
  refresh_token: string
  expires_at: string
  scope: string | null
  token_type: string | null
  created_at: string
  updated_at: string
}

export async function getValidToken(): Promise<string | null> {
  const token = await pgqueryone<BlingTokenRow>(`
    SELECT * FROM bling_tokens ORDER BY created_at DESC LIMIT 1
  `)

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

    await pgquery(`
      UPDATE bling_tokens SET
        access_token  = ${pgesc(refreshed.access_token)},
        refresh_token = ${pgesc(refreshed.refresh_token)},
        expires_at    = ${pgesc(newExpiresAt.toISOString())},
        updated_at    = now()
      WHERE id = ${pgesc(token.id)}
    `)

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
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

  const existing = await pgqueryone<{ id: string }>(`
    SELECT id FROM bling_tokens LIMIT 1
  `)

  if (existing) {
    await pgquery(`
      UPDATE bling_tokens SET
        access_token  = ${pgesc(tokenData.access_token)},
        refresh_token = ${pgesc(tokenData.refresh_token)},
        expires_at    = ${pgesc(expiresAt.toISOString())},
        scope         = ${pgesc(tokenData.scope ?? null)},
        token_type    = ${pgesc(tokenData.token_type ?? 'Bearer')},
        updated_at    = now()
      WHERE id = ${pgesc(existing.id)}
    `)
  } else {
    await pgquery(`
      INSERT INTO bling_tokens (access_token, refresh_token, expires_at, scope, token_type)
      VALUES (
        ${pgesc(tokenData.access_token)},
        ${pgesc(tokenData.refresh_token)},
        ${pgesc(expiresAt.toISOString())},
        ${pgesc(tokenData.scope ?? null)},
        ${pgesc(tokenData.token_type ?? 'Bearer')}
      )
    `)
  }
}

export async function isBlingConnected(): Promise<boolean> {
  const token = await getValidToken()
  return token !== null
}
