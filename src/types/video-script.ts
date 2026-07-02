export type GuionEscena = {
  esc: number
  tiempo?: string
  plano?: string
  movimiento?: string
  accion?: string
  dialogo?: string
  texto_pantalla?: string
  musica_sonido?: string
  postproduccion?: string
  notas?: string
}

export type ScriptVehicleMeta = {
  brand?: string | null
  model?: string | null
  year?: number | null
  color?: string | null
  img_main_url?: string | null
}

export type VideoScriptStructuredFields = {
  guion_titulo?: string | null
  guion_objetivo?: string | null
  texto_hablado?: string | null
  guion_escenas?: unknown
  texto_guion?: string | null
  guion_tipo?: string | null
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined
  const s = String(v).trim()
  return s || undefined
}

export function serializeGuionEscenas(escenas: GuionEscena[]): Record<string, unknown>[] {
  return escenas.map((e) => {
    const row: Record<string, unknown> = { esc: e.esc }
    if (e.tiempo) row.tiempo = e.tiempo
    if (e.plano) row.plano = e.plano
    if (e.movimiento) row.movimiento = e.movimiento
    if (e.accion) row.accion = e.accion
    if (e.dialogo?.trim()) row.dialogo = e.dialogo.trim()
    if (e.texto_pantalla) row.texto_pantalla = e.texto_pantalla
    if (e.musica_sonido) row.musica_sonido = e.musica_sonido
    if (e.postproduccion) row.postproduccion = e.postproduccion
    if (e.notas) row.notas = e.notas
    return row
  })
}

export function parseGuionEscenas(raw: unknown): GuionEscena[] {
  if (raw == null) return []
  let data: unknown = raw
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(data)) return []

  const rows: GuionEscena[] = []
  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const escNum = Number(o.esc ?? i + 1)
    rows.push({
      esc: Number.isFinite(escNum) ? escNum : i + 1,
      tiempo: str(o.tiempo),
      plano: str(o.plano ?? o.plano_angulo),
      movimiento: str(o.movimiento ?? o.movimiento_camara),
      accion: str(o.accion ?? o.accion_visual),
      dialogo: str(o.dialogo ?? o.voz_off),
      texto_pantalla: str(o.texto_pantalla),
      musica_sonido: str(o.musica_sonido ?? o.musica ?? o.sonido ?? o.audio),
      postproduccion: str(
        o.postproduccion ?? o.indicaciones_postproduccion ?? o.post_produccion
      ),
      notas: str(o.notas ?? o.nota),
    })
  }
  return rows.sort((a, b) => a.esc - b.esc)
}

/** Líneas de diálogo en orden de escena (para alinear Assembly / secuencia Gemini). */
export function dialogueLinesFromGuionEscenas(escenas: GuionEscena[]): string[] {
  return escenas
    .map((e) => e.dialogo?.trim())
    .filter((d): d is string => Boolean(d && d.length > 0))
}

export function hasStructuredGuion(script: VideoScriptStructuredFields): boolean {
  const escenas = parseGuionEscenas(script.guion_escenas)
  if (escenas.length > 0) return true
  return Boolean(script.guion_titulo?.trim() || script.texto_hablado?.trim())
}

export function getScriptVehicleLabel(
  vehicleId: string,
  car?: ScriptVehicleMeta | null
): string {
  if (!car) return vehicleId
  const label = `${car.brand ?? ''} ${car.model ?? ''} ${car.year ?? ''}`.trim()
  return label || vehicleId
}

export function getGuionDisplayTitle(script: VideoScriptStructuredFields): string {
  const t = script.guion_titulo?.trim()
  if (t) return t
  const tipo = script.guion_tipo?.trim()
  if (tipo) return `Guión ${tipo}`
  return 'Guión de video'
}
