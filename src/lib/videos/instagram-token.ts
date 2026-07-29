import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const SECRET_TOKEN_KEY = 'instagram_access_token'
const SECRET_EXPIRES_KEY = 'instagram_access_token_expires_at'
const SECRET_ISSUED_KEY = 'instagram_access_token_issued_at'

const IG_GRAPH = 'https://graph.instagram.com'

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function readSecret(key: string): Promise<string | null> {
  const supabase = getServiceClient()
  const { data, error } = await supabase.from('app_runtime_secrets').select('value').eq('key', key).maybeSingle()
  if (error) {
    console.error('[instagram-token] readSecret', key, error.message)
    return null
  }
  const v = data?.value?.trim()
  return v || null
}

async function writeSecret(key: string, value: string): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase.from('app_runtime_secrets').upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )
  if (error) throw new Error(`No se pudo guardar secreto ${key}: ${error.message}`)
}

export type InstagramTokenSource = 'db' | 'env' | 'missing'

export type InstagramTokenStatus = {
  hasToken: boolean
  source: InstagramTokenSource
  expiresAt: string | null
  issuedAt: string | null
  expired: boolean
  expiringSoon: boolean
  msLeft: number | null
}

function parseDate(raw: string | null | undefined): Date | null {
  if (!raw?.trim()) return null
  const d = new Date(raw.trim())
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Token efectivo: prioriza DB (renovable por cron) y cae a env.
 */
export async function getInstagramAccessToken(): Promise<{
  token: string | null
  source: InstagramTokenSource
}> {
  const fromDb = await readSecret(SECRET_TOKEN_KEY)
  if (fromDb) return { token: fromDb, source: 'db' }
  const fromEnv = process.env.INSTAGRAM_ACCESS_TOKEN?.trim()
  if (fromEnv) return { token: fromEnv, source: 'env' }
  return { token: null, source: 'missing' }
}

export async function getInstagramTokenExpiresAt(): Promise<string | null> {
  const fromDb = await readSecret(SECRET_EXPIRES_KEY)
  if (fromDb) return fromDb
  return process.env.INSTAGRAM_ACCESS_TOKEN_EXPIRES_AT?.trim() || null
}

export async function getInstagramTokenStatus(daysSoon = 15): Promise<InstagramTokenStatus> {
  const { token, source } = await getInstagramAccessToken()
  const expiresAt = await getInstagramTokenExpiresAt()
  const issuedAt = (await readSecret(SECRET_ISSUED_KEY)) ?? null
  const exp = parseDate(expiresAt)
  const msLeft = exp ? exp.getTime() - Date.now() : null
  const expired = msLeft != null ? msLeft <= 0 : false
  const soonWindow = daysSoon * 24 * 60 * 60 * 1000
  const expiringSoon = msLeft != null && msLeft > 0 && msLeft < soonWindow

  return {
    hasToken: !!token,
    source,
    expiresAt,
    issuedAt,
    expired,
    expiringSoon,
    msLeft,
  }
}

export async function persistInstagramToken(params: {
  accessToken: string
  expiresInSeconds?: number
  expiresAtIso?: string
}): Promise<{ expiresAt: string; issuedAt: string }> {
  const token = params.accessToken.trim()
  if (!token) throw new Error('accessToken vacío')

  const issuedAt = new Date()
  let expiresAt: Date
  if (params.expiresAtIso) {
    const d = parseDate(params.expiresAtIso)
    if (!d) throw new Error('expiresAtIso inválido')
    expiresAt = d
  } else if (params.expiresInSeconds && params.expiresInSeconds > 0) {
    expiresAt = new Date(issuedAt.getTime() + params.expiresInSeconds * 1000)
  } else {
    // Long-lived típico: 60 días
    expiresAt = new Date(issuedAt.getTime() + 60 * 24 * 60 * 60 * 1000)
  }

  await writeSecret(SECRET_TOKEN_KEY, token)
  await writeSecret(SECRET_EXPIRES_KEY, expiresAt.toISOString())
  await writeSecret(SECRET_ISSUED_KEY, issuedAt.toISOString())

  return { expiresAt: expiresAt.toISOString(), issuedAt: issuedAt.toISOString() }
}

function resolveInstagramAppSecret(): string | null {
  return (
    process.env.INSTAGRAM_APP_SECRET?.trim() ||
    process.env.FACEBOOK_APP_SECRET?.trim() ||
    null
  )
}

async function readIgJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new Error(`Instagram token API no JSON (${res.status}): ${text.slice(0, 400)}`)
  }
}

/**
 * Intercambia token corto (~1h) por long-lived (~60 días).
 * Requiere INSTAGRAM_APP_SECRET (o FACEBOOK_APP_SECRET de la misma app Meta).
 */
export async function exchangeInstagramTokenForLongLived(shortLivedToken: string): Promise<{
  accessToken: string
  expiresIn: number
}> {
  const clientSecret = resolveInstagramAppSecret()
  if (!clientSecret) {
    throw new Error(
      'Falta INSTAGRAM_APP_SECRET (o FACEBOOK_APP_SECRET) para canjear a token de 60 días'
    )
  }

  const url = new URL(`${IG_GRAPH}/access_token`)
  url.searchParams.set('grant_type', 'ig_exchange_token')
  url.searchParams.set('client_secret', clientSecret)
  url.searchParams.set('access_token', shortLivedToken.trim())

  const res = await fetch(url.toString(), { method: 'GET' })
  const json = await readIgJson(res)
  if (!res.ok) {
    console.error('[instagram-token] exchange failed', json)
    throw new Error(JSON.stringify(json))
  }

  const accessToken = String(json.access_token ?? '')
  const expiresIn = Number(json.expires_in ?? 0)
  if (!accessToken) throw new Error('Exchange sin access_token')
  return { accessToken, expiresIn: expiresIn > 0 ? expiresIn : 60 * 24 * 60 * 60 }
}

/**
 * Refresca un long-lived aún válido (Meta: ≥24h de edad y no expirado).
 * Extiende ~60 días desde el refresh.
 */
export async function refreshInstagramLongLivedToken(currentToken?: string): Promise<{
  accessToken: string
  expiresIn: number
  expiresAt: string
  source: InstagramTokenSource
}> {
  const resolved = currentToken?.trim()
    ? { token: currentToken.trim(), source: 'env' as InstagramTokenSource }
    : await getInstagramAccessToken()

  if (!resolved.token) {
    throw new Error('No hay INSTAGRAM_ACCESS_TOKEN configurado (env ni DB)')
  }

  const status = await getInstagramTokenStatus()
  if (status.expired) {
    throw new Error(
      'El token de Instagram ya expiró. Meta no permite refrescarlo: genera uno nuevo en Meta Developers y pégalo en Publicación → renovar token.'
    )
  }

  const issued = parseDate(status.issuedAt)
  if (issued) {
    const ageMs = Date.now() - issued.getTime()
    if (ageMs < 24 * 60 * 60 * 1000) {
      throw new Error('Meta solo permite refrescar el token si tiene al menos 24 horas de antigüedad')
    }
  }

  const url = new URL(`${IG_GRAPH}/refresh_access_token`)
  url.searchParams.set('grant_type', 'ig_refresh_token')
  url.searchParams.set('access_token', resolved.token)

  const res = await fetch(url.toString(), { method: 'GET' })
  const json = await readIgJson(res)
  if (!res.ok) {
    console.error('[instagram-token] refresh failed', json)
    const msg = JSON.stringify(json)
    if (msg.includes('"code":190') || msg.includes('Session has expired')) {
      throw new Error(
        'Token inválido o expirado (OAuth 190). Hay que generar uno nuevo en Meta; no se puede refrescar.'
      )
    }
    throw new Error(msg)
  }

  const accessToken = String(json.access_token ?? '')
  const expiresIn = Number(json.expires_in ?? 0)
  if (!accessToken) throw new Error('Refresh sin access_token')

  const saved = await persistInstagramToken({
    accessToken,
    expiresInSeconds: expiresIn > 0 ? expiresIn : 60 * 24 * 60 * 60,
  })

  return {
    accessToken,
    expiresIn: expiresIn > 0 ? expiresIn : 60 * 24 * 60 * 60,
    expiresAt: saved.expiresAt,
    source: resolved.source,
  }
}

/**
 * Guarda un token nuevo (corto o largo). Si hay app secret, intenta canje a 60 días.
 */
export async function ingestInstagramToken(rawToken: string): Promise<{
  expiresAt: string
  exchanged: boolean
}> {
  const token = rawToken.trim()
  if (!token) throw new Error('Token vacío')

  const secret = resolveInstagramAppSecret()
  if (secret) {
    try {
      const exchanged = await exchangeInstagramTokenForLongLived(token)
      const saved = await persistInstagramToken({
        accessToken: exchanged.accessToken,
        expiresInSeconds: exchanged.expiresIn,
      })
      return { expiresAt: saved.expiresAt, exchanged: true }
    } catch (e) {
      // Si ya era long-lived, el exchange puede fallar; persistimos el token tal cual.
      console.warn('[instagram-token] exchange omitido/falló, guardando token recibido:', e)
    }
  }

  const saved = await persistInstagramToken({ accessToken: token })
  return { expiresAt: saved.expiresAt, exchanged: false }
}

/**
 * Cron: refresca solo si el token no está vencido y queda ≤20 días (o sin fecha conocida).
 */
export async function maybeRefreshInstagramTokenForCron(): Promise<{
  action: 'refreshed' | 'skipped' | 'needs_reauth' | 'missing'
  expiresAt?: string
  reason?: string
}> {
  const status = await getInstagramTokenStatus(20)
  if (!status.hasToken) return { action: 'missing', reason: 'Sin token' }
  if (status.expired) {
    return {
      action: 'needs_reauth',
      reason: 'Token expirado: requiere login nuevo en Meta',
      expiresAt: status.expiresAt ?? undefined,
    }
  }
  if (status.msLeft != null && status.msLeft > 20 * 24 * 60 * 60 * 1000) {
    return {
      action: 'skipped',
      reason: 'Aún quedan más de 20 días',
      expiresAt: status.expiresAt ?? undefined,
    }
  }

  try {
    const r = await refreshInstagramLongLivedToken()
    return { action: 'refreshed', expiresAt: r.expiresAt }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('24 horas')) {
      return { action: 'skipped', reason: msg, expiresAt: status.expiresAt ?? undefined }
    }
    if (msg.includes('expiró') || msg.includes('OAuth 190')) {
      return { action: 'needs_reauth', reason: msg, expiresAt: status.expiresAt ?? undefined }
    }
    throw e
  }
}
