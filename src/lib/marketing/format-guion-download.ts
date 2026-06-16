import {
  getGuionDisplayTitle,
  parseGuionEscenas,
  type GuionEscena,
  type VideoScriptStructuredFields,
} from '@/types/video-script'

const LINE = '─'.repeat(62)
const DOUBLE = '═'.repeat(62)

function sanitizeFilenamePart(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 60) || 'guion'
  )
}

function labelTipo(tipo: string | null | undefined): string {
  const t = (tipo ?? '').trim()
  if (!t) return 'Guión'
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function fieldOrDash(value: string | undefined): string {
  const v = value?.trim()
  return v || '—'
}

function indentBlock(text: string, prefix = '  '): string {
  return text
    .split('\n')
    .map((line) => (line ? `${prefix}${line}` : ''))
    .join('\n')
}

function formatEscenaBlock(e: GuionEscena): string {
  const header = `ESCENA ${e.esc}${e.tiempo ? `  ·  ${e.tiempo}` : ''}`
  const lines = [
    `┌─ ${header}`,
    '│',
    '│  ACCIÓN VISUAL',
    indentBlock(fieldOrDash(e.accion), '│  '),
    '│',
    '│  DIÁLOGO / VOZ EN OFF',
    indentBlock(fieldOrDash(e.dialogo), '│  '),
    '└' + LINE.slice(0, 61),
  ]
  return lines.join('\n')
}

function formatEscenasTable(escenas: GuionEscena[]): string {
  const rows = escenas.map((e) => ({
    esc: String(e.esc).padStart(2, ' '),
    tiempo: (e.tiempo ?? '—').padEnd(10, ' ').slice(0, 10),
    accion: fieldOrDash(e.accion),
    dialogo: fieldOrDash(e.dialogo),
  }))

  const blocks = rows.map(
    (r) =>
      [
        `${r.esc} | ${r.tiempo}`,
        `Acción: ${r.accion}`,
        `Diálogo: ${r.dialogo}`,
        LINE,
      ].join('\n')
  )

  return ['RESUMEN POR ESCENA', DOUBLE, '', ...blocks].join('\n')
}

export function formatGuionDownloadText(script: VideoScriptStructuredFields): string {
  const titulo = getGuionDisplayTitle(script)
  const tipo = labelTipo(script.guion_tipo)
  const objetivo = script.guion_objetivo?.trim()
  const hablado = script.texto_hablado?.trim()
  const escenas = parseGuionEscenas(script.guion_escenas)
  const fecha = new Date().toLocaleString('es-EC', {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  const header = [
    DOUBLE,
    `  GUION DE VIDEO — ${tipo.toUpperCase()}`,
    `  ${titulo}`,
    DOUBLE,
    '',
    `Generado: ${fecha}`,
  ]

  if (objetivo) {
    header.push('', 'OBJETIVO', LINE, objetivo)
  }

  if (hablado) {
    header.push('', 'VOZ DEL VENDEDOR', LINE, hablado)
  }

  if (escenas.length === 0) {
    const plain = script.texto_guion?.trim()
    if (plain) {
      header.push('', 'TEXTO DEL GUION', LINE, plain)
    }
    return header.join('\n')
  }

  const body = [
    '',
    'ESCENAS — DIRECCIÓN Y DIÁLOGO',
    DOUBLE,
    '',
    ...escenas.map((e) => formatEscenaBlock(e)),
    '',
    formatEscenasTable(escenas),
  ]

  return [...header, ...body].join('\n')
}

export function buildGuionDownloadFilename(script: VideoScriptStructuredFields): string {
  const titulo = sanitizeFilenamePart(getGuionDisplayTitle(script))
  const tipo = sanitizeFilenamePart(labelTipo(script.guion_tipo))
  return `${titulo}_${tipo}.txt`
}

export function downloadGuionDocument(script: VideoScriptStructuredFields): void {
  const text = formatGuionDownloadText(script)
  const blob = new Blob([`\uFEFF${text}`], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = buildGuionDownloadFilename(script)
  anchor.click()
  URL.revokeObjectURL(url)
}
