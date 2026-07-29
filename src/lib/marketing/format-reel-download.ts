import {
  getReelAssigneeLabel,
  getReelFormatoLabel,
  resolveHablanteLabel,
  type ReelGuionEscena,
  type ReelScript,
} from '@/types/reel'

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
      .slice(0, 60) || 'reel'
  )
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

function formatEscenaBlock(e: ReelGuionEscena, script: ReelScript): string {
  const hablante = resolveHablanteLabel(e.hablante, script)
  const header = `ESCENA ${e.esc}${e.tiempo ? `  ·  ${e.tiempo}` : ''}${hablante ? `  ·  ${hablante}` : ''}`
  const lines = [
    `┌─ ${header}`,
    '│',
    '│  MOVIMIENTO / ACCIÓN',
    indentBlock(fieldOrDash(e.movimiento || e.accion), '│  '),
    '│',
    '│  DIÁLOGO',
    indentBlock(fieldOrDash(e.dialogo), '│  '),
  ]
  if (e.texto_pantalla?.trim()) {
    lines.push('│', '│  TEXTO EN PANTALLA', indentBlock(e.texto_pantalla.trim(), '│  '))
  }
  lines.push('└' + LINE.slice(0, 61))
  return lines.join('\n')
}

export function formatReelDownloadText(script: ReelScript): string {
  const titulo = script.titulo?.trim() || getReelFormatoLabel(script.formato)
  const tipo = getReelFormatoLabel(script.formato)
  const objetivo = script.objetivo?.trim()
  const hablado = script.texto_hablado?.trim()
  const escenas = script.guion_escenas ?? []
  const fecha = new Date().toLocaleString('es-EC', {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  const header = [
    DOUBLE,
    `  REEL — ${tipo.toUpperCase()}${script.variante ? ` (${script.variante})` : ''}`,
    `  ${titulo}`,
    DOUBLE,
    '',
    `Generado: ${fecha}`,
  ]

  const assignee = getReelAssigneeLabel(script)
  if (assignee) header.push(`Asignado: ${assignee}`)
  if (objetivo) header.push('', 'OBJETIVO', LINE, objetivo)
  if (hablado) header.push('', 'TEXTO HABLADO', LINE, hablado)

  if (escenas.length === 0) {
    const plain = script.texto_guion?.trim()
    if (plain) header.push('', 'TEXTO DEL GUION', LINE, plain)
    return header.join('\n')
  }

  const body = [
    '',
    'ESCENAS — DIRECCIÓN Y DIÁLOGO',
    DOUBLE,
    '',
    ...escenas.map((e) => formatEscenaBlock(e, script)),
  ]

  return [...header, ...body].join('\n')
}

export function buildReelDownloadFilename(script: ReelScript): string {
  const titulo = sanitizeFilenamePart(script.titulo?.trim() || getReelFormatoLabel(script.formato))
  const tipo = sanitizeFilenamePart(getReelFormatoLabel(script.formato))
  return `${titulo}_${tipo}.txt`
}

export function downloadReelDocument(script: ReelScript): void {
  const text = formatReelDownloadText(script)
  const blob = new Blob([`\uFEFF${text}`], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = buildReelDownloadFilename(script)
  anchor.click()
  URL.revokeObjectURL(url)
}
