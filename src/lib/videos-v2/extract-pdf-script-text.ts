import { PDFParse } from 'pdf-parse'

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
