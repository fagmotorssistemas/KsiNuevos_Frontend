// pdf-parse v2 no incluye declaraciones de tipos (@types no existe).
// Usamos require con cast para evitar el error de módulo en TypeScript/Next.js.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse') as { PDFParse: new (opts: { data: Uint8Array }) => { getText(): Promise<{ text: string }>; destroy(): Promise<void> } }

/** Límite de caracteres guardados en DB / enviados a Gemini (evita prompts enormes). */
export const SCRIPT_TEXT_MAX_CHARS = 32000

export async function extractScriptTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
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
