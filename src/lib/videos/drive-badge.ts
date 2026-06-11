import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { parseInventoryModelCodes } from '@/lib/noticiero/vehicle-script-facts'
import { isPipelineInputMeta } from './clip-config'

export type DriveBadge = '4X4' | '4X2'

/** Badge de tracción para pantalla a partir del inventario. */
export function driveBadgeFromInventory(
  model: string,
  driveTypeField?: string | null
): DriveBadge | null {
  const modelLower = model.toLowerCase()
  const driveLower = String(driveTypeField ?? '').toLowerCase()
  const haystack = `${modelLower} ${driveLower}`

  if (/\b4\s*x\s*4\b|\b4x4\b/.test(haystack)) return '4X4'
  if (/\b4\s*x\s*2\b|\b4x2\b/.test(haystack)) return '4X2'

  const parsed = parseInventoryModelCodes(model)
  if (parsed.driveType?.includes('cuatro por cuatro')) return '4X4'
  if (parsed.driveType?.includes('cuatro por dos')) return '4X2'

  return null
}

function cleanToken(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function compactText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, '')
}

/** Texto en pantalla ya es el badge canónico (4X4 / 4X2). */
export function isDriveBadgeText(text: string): boolean {
  return /^4X[24]$/i.test(text.trim())
}

/**
 * Assembly suele transcribir "4x4" como "x 4 a" (tres tokens).
 * Solo reemplazamos si el inventario confirma el badge correspondiente.
 */
export function isGarbledDriveSubtitleText(text: string, badge: DriveBadge): boolean {
  const raw = text.trim()
  if (!raw) return false

  const upperCompact = raw.replace(/\s+/g, '').toUpperCase()
  if (upperCompact === badge) return true

  const c = compactText(raw)

  if (badge === '4X4') {
    if (/^x4a$/i.test(c) || /^x\s*4\s*a$/i.test(raw)) return true
    if (/\b4\s*x\s*4\b/i.test(raw)) return true
    if (/\bx\s+4\s+a\b/i.test(raw)) return true
    if (/\bcuatro\s+por\s+cuatro\b/i.test(raw)) return true
  }

  if (badge === '4X2') {
    if (/^x42$/i.test(c) || /^x\s*4\s*2$/i.test(raw)) return true
    if (/\b4\s*x\s*2\b/i.test(raw)) return true
    if (/\bx\s+4\s+2\b/i.test(raw)) return true
    if (/\bcuatro\s+por\s+dos\b/i.test(raw)) return true
  }

  return false
}

/** Assembly transcribe "tracción 4x4" como "Tracción X" (X suelta tras tracción). */
export function isTraccionXLoneDriveText(text: string): boolean {
  const raw = text.trim()
  if (!raw) return false
  return /\btracci[oó]n\s+x\b/i.test(raw)
}

/** Sustituye la X suelta tras "tracción" por el badge del inventario (in-place). */
export function fixTraccionXDriveText(text: string, badge: DriveBadge): string | null {
  if (!isTraccionXLoneDriveText(text)) return null
  return text.replace(/\b(tracci[oó]n)(\s+)(x)\b([.,!?]?)/i, (_, traccion, space, _x, punct) =>
    `${traccion}${space}${badge}${punct}`
  )
}

function wordsMatchGarbledDrive(
  words: { text: string }[] | undefined,
  badge: DriveBadge
): boolean {
  if (!words?.length) return false
  const tokens = words.map((w) => cleanToken(w.text)).filter(Boolean)
  if (tokens.length < 2) return false

  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i]!
    const b = tokens[i + 1]!
    const c = tokens[i + 2]

    if (badge === '4X4') {
      if (a === 'x' && b === '4' && (c === 'a' || c === 'cuatro')) return true
      if (a === '4' && b === 'x' && c === '4') return true
    }
    if (badge === '4X2') {
      if (a === 'x' && b === '4' && (c === '2' || c === 'dos')) return true
      if (a === '4' && b === 'x' && c === '2') return true
    }
  }

  return false
}

export async function fetchDriveBadgeForJob(
  supabase: SupabaseClient<Database>,
  jobId: string
): Promise<DriveBadge | null> {
  const { data: jobRow } = await supabase
    .from('video_jobs_v2')
    .select('selected_clips, video_script_id, vehicle_line_2')
    .eq('id', jobId)
    .single()

  if (!jobRow) return null

  let vehicleId: string | null = null
  const sc = jobRow.selected_clips
  if (isPipelineInputMeta(sc) && sc.vehicleId?.trim()) {
    vehicleId = sc.vehicleId.trim()
  }

  if (!vehicleId && jobRow.video_script_id) {
    const { data: scriptRow } = await supabase
      .from('video_scripts')
      .select('vehicle_id')
      .eq('id', jobRow.video_script_id)
      .maybeSingle()
    vehicleId = scriptRow?.vehicle_id?.trim() || null
  }

  if (vehicleId) {
    const { data: inv } = await supabase
      .from('inventoryoracle')
      .select('model, drive_type')
      .eq('id', vehicleId)
      .maybeSingle()
    if (inv?.model) {
      const badge = driveBadgeFromInventory(inv.model, inv.drive_type)
      if (badge) return badge
    }
  }

  const modelLine = jobRow.vehicle_line_2?.trim()
  if (modelLine) {
    return driveBadgeFromInventory(modelLine, null)
  }

  return null
}
