// Bling V3 OAuth2 — client helpers

export const BLING_BASE = 'https://www.bling.com.br/Api/v3'
export const BLING_AUTH_URL = 'https://www.bling.com.br/Api/v3/oauth/authorize'
export const BLING_TOKEN_URL = 'https://www.bling.com.br/Api/v3/oauth/token'

export function blingAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.BLING_CLIENT_ID!,
    state,
  })
  return `${BLING_AUTH_URL}?${params}`
}

export async function exchangeCode(code: string): Promise<BlingTokenResponse> {
  const credentials = Buffer.from(
    `${process.env.BLING_CLIENT_ID}:${process.env.BLING_CLIENT_SECRET}`
  ).toString('base64')

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.BLING_REDIRECT_URI!,
  })

  const res = await fetch(BLING_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Bling token exchange failed: ${res.status} — ${err}`)
  }

  return res.json()
}

export async function refreshAccessToken(refreshToken: string): Promise<BlingTokenResponse> {
  const credentials = Buffer.from(
    `${process.env.BLING_CLIENT_ID}:${process.env.BLING_CLIENT_SECRET}`
  ).toString('base64')

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  const res = await fetch(BLING_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Bling token refresh failed: ${res.status} — ${err}`)
  }

  return res.json()
}

export interface BlingTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
  scope: string
  refresh_token: string
}

/** Bling API call com token automaticamente renovado */
export async function blingFetch(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${BLING_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
}
