import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { NOTICIERO_AVATARS } from '@/app/marketing/noticiero/config/avatars'
import { renderNoticieroTemplate } from './creatomate-template'
import { requireNoticieroEnv } from './env'
import {
  createNoticieroHistoryRow,
  getNoticieroConfig,
  getNoticieroHistory,
  updateNoticieroConfig,
  updateNoticieroHistory,
} from './config-service'
import {
  computeNextRunAt,
  getEcuadorDayKey,
  isWithinPublishWindow,
} from './auto-publish-schedule'
import { generateNoticieroScript } from './gemini'
import { startHeyGenGeneration, pollHeyGenVideo, tryGetHeyGenVideoUrl, isHeyGenTimeoutError } from './heygen'
import { resolveHeyGenAvatarAndVoice } from './resolve-avatar'
import { publishFacebookPageReel } from '@/lib/videos/facebook'
import { publishInstagramReel } from '@/lib/videos/instagram'
import type {
  AutoPublishResult,
  NoticieroConfig,
  NoticieroCreativeMode,
  NoticieroDayContentType,
  NoticieroVehicle,
  NoticieroVehicleOrder,
} from './types'

const INVENTORY_SELECT =
  'id, brand, model, year, color, version, price, transmission, fuel_type, engine_displacement, drive_type, passenger_capacity, type_body, horse_power, mileage, img_main_url'

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

/**
 * Rotación de avatares: toma el último avatar usado en historial y devuelve el siguiente
 * en avatar_rotation configurado. Si no hay historial, usa el primero de la lista.
 */
export function pickNextAvatar(rotation: string[], historyAvatarIds: string[]): string {
  const active = rotation.filter(Boolean)
  if (active.length === 0) {
    return NOTICIERO_AVATARS[0].id
  }
  const lastUsed = historyAvatarIds.find((id) => active.includes(id))
  if (!lastUsed) return active[0]
  const idx = active.indexOf(lastUsed)
  return active[(idx + 1) % active.length]
}

/**
 * Rotación de vehículos: recorre inventario ordenado sin repetir IDs ya publicados.
 * Si todos fueron publicados, reinicia el ciclo desde el primero.
 */
export function pickNextVehicle(
  vehicles: NoticieroVehicle[],
  publishedVehicleIds: Set<string>
): NoticieroVehicle | null {
  if (vehicles.length === 0) return null
  const next = vehicles.find((v) => !publishedVehicleIds.has(v.id))
  return next ?? vehicles[0]
}

function pickNextPredefinedTopic(topics: string[], usedTopics: string[]): string {
  const available = topics.filter((t) => t.trim())
  if (available.length === 0) throw new Error('No hay temas creativos configurados')
  const next = available.find((t) => !usedTopics.includes(t))
  return next ?? available[0]
}

/**
 * Modo "both": alterna entre tema predefinido y Gemini automático según el último
 * clip creativo publicado (creative_topic null = último fue Gemini).
 */
export function resolveCreativeSubMode(
  mode: NoticieroCreativeMode,
  lastCreativeHadTopic: boolean | null
): 'predefined' | 'gemini_auto' {
  if (mode === 'predefined') return 'predefined'
  if (mode === 'gemini_auto') return 'gemini_auto'
  if (lastCreativeHadTopic === null) return 'predefined'
  return lastCreativeHadTopic ? 'gemini_auto' : 'predefined'
}

async function fetchAvailableVehicles(order: NoticieroVehicleOrder): Promise<NoticieroVehicle[]> {
  const supabase = getServiceClient()
  const base = supabase.from('inventoryoracle').select(INVENTORY_SELECT).eq('status', 'disponible')

  let ordered = base
  switch (order) {
    case 'price_asc':
      ordered = base.order('price', { ascending: true, nullsFirst: false })
      break
    case 'newest':
      ordered = base.order('updated_at', { ascending: false })
      break
    case 'is_featured':
      ordered = base
        .order('is_featured', { ascending: false, nullsFirst: false })
        .order('price', { ascending: false, nullsFirst: false })
      break
    case 'mileage_desc':
      ordered = base.order('mileage', { ascending: false, nullsFirst: false })
      break
    case 'mileage_asc':
      ordered = base.order('mileage', { ascending: true, nullsFirst: false })
      break
    case 'price_desc':
    default:
      ordered = base.order('price', { ascending: false, nullsFirst: false })
      break
  }

  const { data, error } = await ordered.limit(500)
  if (error) throw new Error(error.message)
  return (data ?? []) as NoticieroVehicle[]
}

function buildCaption(script: string, contentType: string, vehicle?: NoticieroVehicle | null): string {
  const base = script.trim().slice(0, 2200)
  if (contentType === 'vehicle' && vehicle) {
    return `${base}\n\n${vehicle.brand} ${vehicle.model} — Visítanos en Avenida España y Sevilla, Cuenca.`
  }
  return `${base}\n\nVisítanos en Avenida España y Sevilla, Cuenca.`
}

export interface AutoPublishPlan {
  config: NoticieroConfig
  historyId: string
  contentType: NoticieroDayContentType
  avatarId: string
  heygenAvatarId: string
  voiceId: string
  vehicle: NoticieroVehicle | null
  creativeTopic: string | null
  scriptMode: 'vehicle' | 'custom' | 'creative_auto'
}

export async function planNoticieroAutoPublish(opts: {
  manual?: boolean
  force?: boolean
}): Promise<AutoPublishResult & { plan?: AutoPublishPlan }> {
  requireNoticieroEnv()

  const config = await getNoticieroConfig()
  if (!config) {
    return { skipped: true, reason: 'No existe configuración de noticiero' }
  }

  if (!config.is_active && !opts.manual && !opts.force) {
    return { skipped: true, reason: 'Publicación automática pausada' }
  }

  const today = getEcuadorDayKey()
  if (!opts.manual && !opts.force) {
    if (!config.publish_days.includes(today)) {
      return { skipped: true, reason: `Hoy (${today}) no es día de publicación` }
    }
    if (!isWithinPublishWindow(config.publish_time)) {
      return { skipped: true, reason: 'Fuera de la ventana horaria de publicación' }
    }
  }

  const dayTypeConfig = config.day_type_config as Record<string, NoticieroDayContentType>
  const contentType: NoticieroDayContentType = dayTypeConfig[today] ?? 'vehicle'

  const history = await getNoticieroHistory(50)
  const historyAvatarIds = history.map((h) => h.avatar_id)
  const avatarId = pickNextAvatar(config.avatar_rotation, historyAvatarIds)
  const { avatarId: heygenAvatarId, voiceId } = resolveHeyGenAvatarAndVoice(avatarId, undefined)

  let vehicle: NoticieroVehicle | null = null
  let creativeTopic: string | null = null
  let scriptMode: 'vehicle' | 'custom' | 'creative_auto' = 'vehicle'

  if (contentType === 'vehicle') {
    const publishedIds = new Set(
      history.filter((h) => h.content_type === 'vehicle' && h.vehicle_id).map((h) => h.vehicle_id!)
    )
    const vehicles = await fetchAvailableVehicles(config.vehicle_order)
    vehicle = pickNextVehicle(vehicles, publishedIds)
    if (!vehicle) {
      return { skipped: true, reason: 'No hay vehículos disponibles en inventario' }
    }
    scriptMode = 'vehicle'
  } else {
    const creativeHistory = history.filter((h) => h.content_type === 'creative')
    const lastCreative = creativeHistory[0]
    const lastHadTopic = lastCreative ? Boolean(lastCreative.creative_topic?.trim()) : null
    const subMode = resolveCreativeSubMode(config.creative_mode, lastHadTopic)

    if (subMode === 'predefined') {
      const usedTopics = creativeHistory
        .map((h) => h.creative_topic?.trim())
        .filter((t): t is string => Boolean(t))
      creativeTopic = pickNextPredefinedTopic(config.creative_topics, usedTopics)
      scriptMode = 'custom'
    } else {
      scriptMode = 'creative_auto'
      creativeTopic = null
    }
  }

  const historyId = await createNoticieroHistoryRow({
    day_of_week: today,
    content_type: contentType,
    avatar_id: avatarId,
    vehicle_id: vehicle?.id ?? null,
    creative_topic: creativeTopic,
    generated_script: '',
    status: 'pending',
    error_message: null,
    heygen_video_url: null,
    final_video_url: null,
    instagram_post_id: null,
    facebook_post_id: null,
  })

  return {
    historyId,
    contentType,
    avatarId,
    status: 'pending',
    plan: {
      config,
      historyId,
      contentType,
      avatarId,
      heygenAvatarId,
      voiceId,
      vehicle,
      creativeTopic,
      scriptMode,
    },
  }
}

export async function executeNoticieroAutoPublishPlan(plan: AutoPublishPlan): Promise<AutoPublishResult> {
  const {
    config,
    historyId,
    contentType,
    avatarId,
    heygenAvatarId,
    voiceId,
    vehicle,
    creativeTopic,
    scriptMode,
  } = plan

  try {
    const { script, bannerTitle } = await generateNoticieroScript(
      scriptMode,
      vehicle ?? undefined,
      creativeTopic ?? undefined
    )

    await updateNoticieroHistory(historyId, { generated_script: script })

    const videoId = await startHeyGenGeneration(script, null, {
      avatarId: heygenAvatarId,
      voiceId,
    })

    let heygenVideoUrl: string
    try {
      heygenVideoUrl = await pollHeyGenVideo(videoId)
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (isHeyGenTimeoutError(message)) {
        const recovered = await tryGetHeyGenVideoUrl(videoId)
        if (!recovered) throw err
        heygenVideoUrl = recovered
      } else {
        throw err
      }
    }

    await updateNoticieroHistory(historyId, { heygen_video_url: heygenVideoUrl })

    const { videoUrl: finalVideoUrl } = await renderNoticieroTemplate(heygenVideoUrl, bannerTitle)
    await updateNoticieroHistory(historyId, { final_video_url: finalVideoUrl })

    const caption = buildCaption(script, contentType, vehicle)
    let instagramPostId: string | null = null
    let facebookPostId: string | null = null

    try {
      const ig = await publishInstagramReel(finalVideoUrl, caption)
      instagramPostId = ig.mediaId ?? null
    } catch (igErr) {
      const msg = igErr instanceof Error ? igErr.message : 'Error publicando en Instagram'
      console.error('[noticiero/auto-publish] Instagram', igErr)
      await updateNoticieroHistory(historyId, {
        status: 'error',
        error_message: `Instagram: ${msg}`,
        final_video_url: finalVideoUrl,
        heygen_video_url: heygenVideoUrl,
        generated_script: script,
      })
      await touchConfigAfterRun(config)
      return {
        historyId,
        contentType,
        avatarId,
        script,
        heygenVideoUrl,
        finalVideoUrl,
        status: 'error',
        error: msg,
      }
    }

    try {
      const fb = await publishFacebookPageReel(finalVideoUrl, caption)
      facebookPostId = fb.postId ?? fb.videoId ?? null
    } catch (fbErr) {
      const msg = fbErr instanceof Error ? fbErr.message : 'Error publicando en Facebook'
      console.error('[noticiero/auto-publish] Facebook', fbErr)
      await updateNoticieroHistory(historyId, {
        status: 'error',
        error_message: `Facebook: ${msg}`,
        instagram_post_id: instagramPostId,
        final_video_url: finalVideoUrl,
        heygen_video_url: heygenVideoUrl,
        generated_script: script,
      })
      await touchConfigAfterRun(config)
      return {
        historyId,
        contentType,
        avatarId,
        script,
        heygenVideoUrl,
        finalVideoUrl,
        instagramPostId,
        status: 'error',
        error: msg,
      }
    }

    await updateNoticieroHistory(historyId, {
      status: 'completed',
      instagram_post_id: instagramPostId,
      facebook_post_id: facebookPostId,
      error_message: null,
    })

    await touchConfigAfterRun(config)

    return {
      historyId,
      contentType,
      avatarId,
      script,
      heygenVideoUrl,
      finalVideoUrl,
      instagramPostId,
      facebookPostId,
      status: 'completed',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error en publicación automática'
    console.error('[noticiero/auto-publish]', err)
    await updateNoticieroHistory(historyId, {
      status: 'error',
      error_message: message,
    }).catch(() => {})
    await touchConfigAfterRun(config).catch(() => {})
    return {
      historyId,
      status: 'error',
      error: message,
    }
  }
}

async function touchConfigAfterRun(config: NoticieroConfig): Promise<void> {
  const nextRunAt = computeNextRunAt(config.publish_days, config.publish_time)
  await updateNoticieroConfig(config.id, {
    last_run_at: new Date().toISOString(),
    next_run_at: nextRunAt,
  })
}

/** Ejecuta planificación + pipeline completo (cron). */
export async function runNoticieroAutoPublish(opts: {
  manual?: boolean
  force?: boolean
}): Promise<AutoPublishResult> {
  const planned = await planNoticieroAutoPublish(opts)
  if (planned.skipped || !planned.plan) return planned
  return executeNoticieroAutoPublishPlan(planned.plan)
}
