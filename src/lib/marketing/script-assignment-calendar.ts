import type { MonthOverviewItem } from '@/types/script-assignment'

const ASSIGNMENT_SELECT = `
  id,
  vehicle_id,
  fecha_asignacion,
  fecha_programada,
  reprogramaciones_count,
  status,
  inventoryoracle:inventoryoracle (brand, model, year),
  video_scripts (id)
`

const ARCHIVE_SELECT = `
  id,
  vehicle_id,
  fecha_asignacion,
  status
`

export type RawAssignmentRow = {
  id: string
  vehicle_id: string
  fecha_asignacion: string
  fecha_programada?: string | null
  reprogramaciones_count?: number | null
  status: string | null
  inventoryoracle:
    | { brand?: string | null; model?: string | null; year?: number | null }
    | null
  video_scripts?: { id: string }[] | null
}

export type RawArchiveRow = {
  id: string
  vehicle_id: string
  fecha_asignacion: string
  status: string | null
  inventoryoracle:
    | { brand?: string | null; model?: string | null; year?: number | null }
    | null
}

function vehicleLabel(inv: RawAssignmentRow['inventoryoracle']): string {
  if (!inv) return 'Vehículo'
  const label = `${inv.brand ?? ''} ${inv.model ?? ''} ${inv.year ?? ''}`.trim()
  return label || 'Vehículo'
}

function ymd(v: string): string {
  return String(v).slice(0, 10)
}

function reelKey(vehicleId: string, fecha: string): string {
  return `${vehicleId}|${fecha}`
}

/** Reels subidos (video_jobs_v2 completados) indexados por vehículo + fecha local Ecuador. */
export function buildReelCompletionIndex(
  jobs: { inventory_vehicle_id: string | null; created_at: string | null }[]
): Set<string> {
  const set = new Set<string>()
  for (const job of jobs) {
    const vid = job.inventory_vehicle_id?.trim()
    const created = job.created_at
    if (!vid || !created) continue
    const d = new Date(created)
    const fecha = d.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
    set.add(reelKey(vid, fecha))
  }
  return set
}

function guionGenerado(row: RawAssignmentRow, archiveScriptIds: Set<string>): boolean {
  const scripts = row.video_scripts
  const scriptCount = Array.isArray(scripts) ? scripts.length : 0
  const status = String(row.status ?? '')
  if (scriptCount > 0 || status === 'guion_generado') return true
  return archiveScriptIds.has(row.id)
}

function pushSlot(
  items: MonthOverviewItem[],
  opts: {
    fecha: string
    row: RawAssignmentRow
    isArchived: boolean
    slotTipo: MonthOverviewItem['slot_tipo']
    fechaAsignacionOriginal: string
    fechaProgramada: string
    reprogramacionesCount: number
    reelCompletado: boolean
    guionGenerado: boolean
  }
) {
  const sombreado =
    opts.slotTipo === 'original' &&
    !opts.reelCompletado &&
    (opts.reprogramacionesCount > 0 || opts.fechaProgramada !== opts.fechaAsignacionOriginal)

  items.push({
    fecha: opts.fecha,
    assignment_id: opts.row.id,
    vehicle_id: opts.row.vehicle_id,
    vehicle_label: vehicleLabel(opts.row.inventoryoracle),
    guion_generado: opts.guionGenerado,
    status: String(opts.row.status ?? ''),
    is_archived: opts.isArchived,
    slot_tipo: opts.slotTipo,
    fecha_asignacion_original: opts.fechaAsignacionOriginal,
    fecha_programada: opts.fechaProgramada,
    reel_cumplido: opts.reelCompletado,
    reprogramaciones_count: opts.reprogramacionesCount,
    sombreado,
    readonly: opts.isArchived,
  })
}

export function buildMonthOverviewItems(
  activeRows: RawAssignmentRow[],
  archiveRows: RawArchiveRow[],
  archiveScriptIds: Set<string>,
  reelIndex: Set<string>,
  range: { start: string; end: string }
): MonthOverviewItem[] {
  const items: MonthOverviewItem[] = []
  const inRange = (fecha: string) => fecha >= range.start && fecha <= range.end

  for (const row of activeRows) {
    const fechaOriginal = ymd(row.fecha_asignacion)
    const fechaProgramada = ymd(row.fecha_programada ?? row.fecha_asignacion)
    const reprogramaciones = row.reprogramaciones_count ?? 0
    const generated = guionGenerado(row, archiveScriptIds)

    if (inRange(fechaOriginal)) {
      pushSlot(items, {
        fecha: fechaOriginal,
        row,
        isArchived: false,
        slotTipo: fechaProgramada !== fechaOriginal ? 'original' : 'programado',
        fechaAsignacionOriginal: fechaOriginal,
        fechaProgramada,
        reprogramacionesCount: reprogramaciones,
        reelCompletado: reelIndex.has(reelKey(row.vehicle_id, fechaOriginal)),
        guionGenerado: generated,
      })
    }

    if (fechaProgramada !== fechaOriginal && inRange(fechaProgramada)) {
      pushSlot(items, {
        fecha: fechaProgramada,
        row,
        isArchived: false,
        slotTipo: 'reprogramado',
        fechaAsignacionOriginal: fechaOriginal,
        fechaProgramada,
        reprogramacionesCount: reprogramaciones,
        reelCompletado: reelIndex.has(reelKey(row.vehicle_id, fechaProgramada)),
        guionGenerado: generated,
      })
    }
  }

  for (const row of archiveRows) {
    const fecha = ymd(row.fecha_asignacion)
    if (!inRange(fecha)) continue
    const generated =
      archiveScriptIds.has(row.id) || String(row.status ?? '') === 'guion_generado'

    pushSlot(items, {
      fecha,
      row: {
        ...row,
        fecha_programada: fecha,
        reprogramaciones_count: 0,
        video_scripts: null,
      },
      isArchived: true,
      slotTipo: 'programado',
      fechaAsignacionOriginal: fecha,
      fechaProgramada: fecha,
      reprogramacionesCount: 0,
      reelCompletado: reelIndex.has(reelKey(row.vehicle_id, fecha)),
      guionGenerado: generated,
    })
  }

  items.sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha)
    return a.vehicle_label.localeCompare(b.vehicle_label)
  })

  return items
}

export const SCRIPT_ASSIGNMENT_ACTIVE_SELECT = ASSIGNMENT_SELECT
export const SCRIPT_ASSIGNMENT_ARCHIVE_SELECT = ARCHIVE_SELECT

type InventoryMeta = { brand?: string | null; model?: string | null; year?: number | null }

/** La tabla archive no tiene FK a inventoryoracle; enriquecer por vehicle_id. */
export async function enrichArchiveRowsWithInventory<T extends { vehicle_id: string }>(
  supabase: unknown,
  rows: T[]
): Promise<(T & { inventoryoracle: InventoryMeta | null })[]> {
  if (rows.length === 0) return []

  const vehicleIds = [...new Set(rows.map((r) => r.vehicle_id).filter(Boolean))]
  const invMap = new Map<string, InventoryMeta>()

  if (vehicleIds.length > 0) {
    const client = supabase as {
      from(table: 'inventoryoracle'): {
        select(cols: string): {
          in(column: 'id', values: string[]): Promise<{ data: unknown[] | null }>
        }
      }
    }

    const { data: vehicles } = await client
      .from('inventoryoracle')
      .select('id, brand, model, year')
      .in('id', vehicleIds)

    for (const v of (vehicles ?? []) as {
      id: string
      brand?: string | null
      model?: string | null
      year?: number | null
    }[]) {
      invMap.set(v.id, { brand: v.brand, model: v.model, year: v.year })
    }
  }

  return rows.map((row) => ({
    ...row,
    inventoryoracle: invMap.get(row.vehicle_id) ?? null,
  }))
}
