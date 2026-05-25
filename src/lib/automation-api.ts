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
