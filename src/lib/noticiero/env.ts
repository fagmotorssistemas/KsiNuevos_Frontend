const NOTICIERO_ENV_KEYS = [
  'GEMINI_API_KEY',
  'HEYGEN_API_KEY',
  'HEYGEN_AVATAR_ID',
  'HEYGEN_VOICE_ID',
  'CREATOMATE_API_KEY',
  'CREATOMATE_TEMPLATE_ID',
] as const

export type NoticieroEnvKey = (typeof NOTICIERO_ENV_KEYS)[number]

export function requireNoticieroEnv(extra: string[] = []): void {
  const keys = [...NOTICIERO_ENV_KEYS, ...extra]
  const missing = keys.filter((k) => !process.env[k]?.trim())
  if (missing.length > 0) {
    throw new Error(
      `Variables de entorno faltantes para el noticiero: ${missing.join(', ')}. Revise el archivo .env.`
    )
  }
}

export function getNoticieroEnv(key: NoticieroEnvKey): string {
  const value = process.env[key]?.trim()
  if (!value) {
    throw new Error(`Variable de entorno faltante: ${key}`)
  }
  return value
}
