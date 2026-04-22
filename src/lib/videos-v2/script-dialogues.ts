/**
 * Extrae líneas de diálogo del texto del guion (p. ej. PDF) tomando lo que va entre comillas "…" o «…».
 * Orden de aparición = orden del guion de grabación.
 */
export function extractQuotedDialoguesFromScript(raw: string): string[] {
  if (!raw || !raw.trim()) return []
  const out: string[] = []
  const seen = new Set<string>()

  const pushNorm = (s: string) => {
    const t = s.replace(/\s+/g, ' ').trim()
    if (t.length < 2) return
    const k = t.toLowerCase()
    if (seen.has(k)) return
    seen.add(k)
    out.push(t)
  }

  // "..." o "..." tipográficas
  const reAscii = /"([^"]{2,800})"/g
  let m: RegExpExecArray | null
  while ((m = reAscii.exec(raw)) !== null) {
    pushNorm(m[1])
  }

  const reCurly = /\u201c([^\u201d]{2,800})\u201d/g
  while ((m = reCurly.exec(raw)) !== null) {
    pushNorm(m[1])
  }

  const reGuillemet = /«([^»]{2,800})»/g
  while ((m = reGuillemet.exec(raw)) !== null) {
    pushNorm(m[1])
  }

  return out
}
