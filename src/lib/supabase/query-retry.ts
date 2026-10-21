/**
 * Reintentos para consultas de Supabase (navegador o servidor) ante fallas pasajeras: red caída
 * (status 0) o Supabase/Cloudflare respondiendo 5xx, a veces con una página HTML como "mensaje".
 * Un error de la consulta (4xx) o un "no encontrado" no se reintenta.
 */
type QueryResult = { error: { message?: string } | null; status: number }

export function isTransientQueryFailure(result: QueryResult): boolean {
  return Boolean(result.error) && (result.status === 0 || result.status >= 500)
}

/** `run` debe armar la consulta de nuevo en cada llamada. */
export async function withQueryRetry<T extends QueryResult>(
  run: () => PromiseLike<T>,
  { attempts = 3, baseDelayMs = 400 }: { attempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  let result = await run()
  for (let attempt = 1; attempt < attempts && isTransientQueryFailure(result); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** (attempt - 1)))
    result = await run()
  }
  return result
}

/** Mensaje corto para logs: evita volcar la página HTML de error de Cloudflare entera. */
export function shortQueryError(result: QueryResult): string {
  const message = result.error?.message ?? 'error desconocido'
  const prefix = result.status === 0 ? 'sin conexión' : `HTTP ${result.status}`
  if (/<html|<!doctype/i.test(message)) {
    const title = message.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim()
    return `${prefix}: página de error HTML${title ? ` (${title})` : ''}`
  }
  return `${prefix}: ${message.slice(0, 200)}`
}
