/**
 * Lee el cuerpo de un Response como JSON sin usar `res.json()` directamente.
 * En Safari/WebKit, `res.json()` ante HTML o cuerpo vacío puede lanzar
 * "The string did not match the expected pattern".
 */
export async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text.trim()) {
    throw new Error(`Respuesta vacía del servidor (HTTP ${res.status}).`)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(
      `El servidor devolvió un formato inesperado (HTTP ${res.status}). Recarga la página o inténtalo de nuevo.`
    )
  }
}
