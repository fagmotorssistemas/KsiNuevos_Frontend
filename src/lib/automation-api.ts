/**
 * API de automatizaciones (guiones, publicaciones, etc.).
 * Producción: https://auto.ksinuevos.com
 * No usar NEXT_PUBLIC_API_URL (backend de cartera/contabilidad).
 */
export function getAutomationApiUrl(): string {
  return (
    process.env.AUTOMATION_API_URL ??
    process.env.NEXT_PUBLIC_AUTOMATION_API_URL ??
    'https://auto.ksinuevos.com'
  ).replace(/\/$/, '')
}

/** Mismo origen: rutas proxy en `src/app/api/scripts/*` (evita CORS en el navegador). */
export const SCRIPTS_API_BASE = '/api/scripts'

/** URL pública de referencia (mensajes de error, docs). */
export const AUTOMATION_API_PUBLIC_URL = getAutomationApiUrl()

/**
 * Host del backend de automatización / métricas Meta.
 * Por defecto = `getAutomationApiUrl()` → https://auto.ksinuevos.com
 * Override opcional: `METRICS_INTERNAL_API_URL` en `.env`
 */
export function getMetricsInternalApiUrl(): string {
  const override = process.env.METRICS_INTERNAL_API_URL?.trim()
  if (override) return override.replace(/\/$/, '')
  return getAutomationApiUrl()
}

/**
 * Secret para rutas `/internal/metrics/*`.
 * En `.env`: `METRICS_INTERNAL_SECRET` o el mismo valor que `INTERNAL_API_SECRET`.
 */
export function getMetricsInternalSecret(): string | undefined {
  const v =
    process.env.METRICS_INTERNAL_SECRET ??
    process.env.INTERNAL_API_SECRET ??
    process.env.INTERNAL_SECRET ??
    process.env.AUTOMATION_INTERNAL_SECRET
  return v?.trim() || undefined
}
