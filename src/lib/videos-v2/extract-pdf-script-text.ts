/** Límite de caracteres guardados en DB / enviados a Gemini (evita prompts enormes). */
export const SCRIPT_TEXT_MAX_CHARS = 32000

/**
 * Carga pdf-parse solo al ejecutar (evita que /api/videos-v2/jobs/start falle al importar
 * la ruta en entornos donde pdfjs/canvas no inicializa bien en frío).
 */
export async function extractScriptTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse')
  const Parser = PDFParse as new (opts: { data: Uint8Array }) => {
    getText: () => Promise<{ text?: string }>
    destroy: () => Promise<void>
  }
  const parser = new Parser({ data: new Uint8Array(buffer) })
  try {
    const result = await parser.getText()
    const raw = (result.text ?? '').replace(/\u0000/g, '')
    const normalized = raw.replace(/\s+/g, ' ').trim()
    if (normalized.length <= SCRIPT_TEXT_MAX_CHARS) return normalized
    return `${normalized.slice(0, SCRIPT_TEXT_MAX_CHARS)}\n\n[… texto truncado por tamaño máximo]`
  } finally {
    await parser.destroy()
  }
}
