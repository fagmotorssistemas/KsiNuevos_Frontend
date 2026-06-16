import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ScriptRow } from '@/components/marketing/ScriptCard'
import type { GuionData, GuionTomaPdf } from '@/types/guion-pdf'
import {
  getGuionDisplayTitle,
  getScriptVehicleLabel,
  parseGuionEscenas,
  type VideoScriptStructuredFields,
} from '@/types/video-script'

function sanitizeFilenamePart(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 50) || 'guion'
  )
}

export function buildGuionPdfFilename(data: GuionData): string {
  const veh = sanitizeFilenamePart(data.vehiculo)
  const tipo = sanitizeFilenamePart(data.tipoGuion ?? 'guion')
  return `guion_${veh}_${tipo}.pdf`
}

function formatGuionFecha(iso: string | null | undefined): string {
  if (iso) {
    try {
      return format(new Date(iso), "d 'de' MMMM yyyy", { locale: es })
    } catch {
      /* fall through */
    }
  }
  return format(new Date(), "d 'de' MMMM yyyy", { locale: es })
}

function labelTipo(tipo: string | null | undefined): string | undefined {
  const t = (tipo ?? '').trim()
  if (!t) return undefined
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function tomasFromScript(script: VideoScriptStructuredFields): GuionTomaPdf[] {
  const escenas = parseGuionEscenas(script.guion_escenas)
  if (escenas.length > 0) {
    return escenas.map((e) => ({
      numero: e.esc,
      tiempo: e.tiempo,
      descripcionToma: e.accion?.trim() || '—',
      guion: e.dialogo?.trim() || '—',
      descripcionGuion: e.texto_pantalla?.trim() || undefined,
    }))
  }

  const plain = script.texto_hablado?.trim() || script.texto_guion?.trim()
  if (plain) {
    return [{ numero: 1, descripcionToma: '—', guion: plain }]
  }

  return []
}

export function mapScriptToGuionData(
  script: VideoScriptStructuredFields &
    Partial<Pick<ScriptRow, 'vendedor_nombre' | 'vehicle_id' | 'inventoryoracle' | 'fecha_generacion'>>,
  opts?: { vehiculoLabel?: string; logoUrl?: string }
): GuionData {
  const car = script.inventoryoracle
  const vehicleId = script.vehicle_id ?? ''
  const vehiculo =
    opts?.vehiculoLabel ??
    (car ? getScriptVehicleLabel(vehicleId, car) : getGuionDisplayTitle(script))

  return {
    vehiculo,
    vendedor: script.vendedor_nombre?.trim() || undefined,
    fecha: formatGuionFecha(script.fecha_generacion),
    tipoGuion: labelTipo(script.guion_tipo),
    titulo: getGuionDisplayTitle(script),
    objetivo: script.guion_objetivo?.trim() || undefined,
    logoUrl: opts?.logoUrl,
    tomas: tomasFromScript(script),
  }
}
