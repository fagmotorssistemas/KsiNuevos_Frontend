import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { GuionData, GuionTomaPdf } from '@/types/guion-pdf'
import {
  getReelAssigneeLabel,
  getReelFormatoLabel,
  getReelVehicleLabel,
  resolveHablanteLabel,
  type ReelScript,
} from '@/types/reel'

function sanitizeFilenamePart(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 50) || 'reel'
  )
}

export function buildReelPdfFilename(script: ReelScript): string {
  const veh = sanitizeFilenamePart(getReelVehicleLabel(script.vehicle) || 'reel')
  const formato = sanitizeFilenamePart(getReelFormatoLabel(script.formato))
  return `reel_${veh}_${formato}.pdf`
}

function tomasFromReelScript(script: ReelScript): GuionTomaPdf[] {
  return (script.guion_escenas ?? []).map((e) => {
    const hablante = resolveHablanteLabel(e.hablante, script) ?? undefined
    const dialogo = e.dialogo?.trim()
    return {
      numero: e.esc,
      tiempo: e.tiempo,
      descripcionToma: e.accion?.trim() || e.movimiento?.trim() || '—',
      guion: dialogo || (hablante ? '' : '—'),
      descripcionGuion: e.texto_pantalla?.trim() || undefined,
      hablante,
    }
  })
}

/** Adapta un `ReelScript` (formato/variante, doble vendedor, hablante) a la plantilla PDF compartida con Guiones. */
export function mapReelScriptToGuionData(
  script: ReelScript,
  opts?: { logoUrl?: string }
): GuionData {
  const vehiculoPrincipal = getReelVehicleLabel(script.vehicle)
  const vehiculoSecundario = getReelVehicleLabel(script.vehicle_2)
  const vehiculo =
    vehiculoSecundario && vehiculoSecundario !== vehiculoPrincipal
      ? `${vehiculoPrincipal}  vs  ${vehiculoSecundario}`
      : vehiculoPrincipal || script.titulo || 'Reel'

  const vendedor = getReelAssigneeLabel(script) || undefined

  return {
    vehiculo,
    vendedor,
    fecha: format(new Date(), "d 'de' MMMM yyyy", { locale: es }),
    tipoGuion: `${getReelFormatoLabel(script.formato)}${script.variante ? ` · ${script.variante}` : ''}`,
    titulo: script.titulo ?? undefined,
    objetivo: script.objetivo ?? undefined,
    logoUrl: opts?.logoUrl,
    tomas: tomasFromReelScript(script),
  }
}
