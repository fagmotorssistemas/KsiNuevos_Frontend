/**
 * POST /api/videos/jobs/[jobId]/finalize
 *
 * Tras subir clips al Storage: mide audio en Nest (servidor) y arranca el pipeline.
 * El modal puede cerrarse en cuanto esta ruta responde OK.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { executeJobStart, type StartJobBody } from '@/lib/videos/execute-job-start'
import {
  buildNestVoiceSamplesFromPaths,
  callNestMeasureAudioServer,
  sumClipDurationsSec,
} from '@/lib/videos/nest-measure-audio-server'
import { normalizeReelAudioVolume } from '@/lib/videos/clip-config'

export const runtime = 'nodejs'
export const maxDuration = 130

type FinalizeJobBody = Omit<StartJobBody, 'jobId'> & {
  /** Si true (default), mide audio en Nest cuando no vienen volúmenes en el body. */
  measureAudio?: boolean
}

function getServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const body = (await request.json()) as FinalizeJobBody

    const {
      measureAudio = true,
      reelMusicVolume: reelMusicVolumeRaw,
      reelDialogueVolume: reelDialogueVolumeRaw,
      paths,
      clipDurations: clipDurationsRaw,
      voiceOverBaseClipIndex: voiceOverRaw,
      musicTrimStartSec: musicTrimStartRaw,
      ...rest
    } = body

    if (!paths?.length) {
      return NextResponse.json({ error: 'paths es requerido' }, { status: 400 })
    }

    let reelMusicVolume = normalizeReelAudioVolume(reelMusicVolumeRaw ?? undefined)
    let reelDialogueVolume = normalizeReelAudioVolume(reelDialogueVolumeRaw ?? undefined)
    let audioSource: 'client' | 'measured' | 'fallback' | 'skipped' = 'skipped'

    if (reelMusicVolume != null && reelDialogueVolume != null) {
      audioSource = 'client'
    } else if (
      measureAudio &&
      reelMusicVolume == null &&
      reelDialogueVolume == null
    ) {
      const supabase = getServiceClient()
      const { data: job, error: jobErr } = await supabase
        .from('video_jobs_v2')
        .select('music_track_url')
        .eq('id', jobId)
        .single()

      if (jobErr || !job?.music_track_url) {
        console.warn(`[finalize][${jobId}] Sin music_track_url; start sin medición previa.`)
      } else {
        const excludeIndices: number[] =
          voiceOverRaw != null && Number.isInteger(voiceOverRaw) ? [Number(voiceOverRaw)] : []

        const clipDurations = Array.isArray(clipDurationsRaw) ? clipDurationsRaw : undefined
        const nestSamples = buildNestVoiceSamplesFromPaths(paths, clipDurations, excludeIndices)
        const reelDurationSec = sumClipDurationsSec(clipDurations)

        console.log(`[finalize][${jobId}] Midiendo audio en Nest (${nestSamples.length} muestras)…`)

        const measured = await callNestMeasureAudioServer({
          jobId,
          musicUrl: job.music_track_url,
          musicTrimStartSec:
            musicTrimStartRaw != null && Number.isFinite(Number(musicTrimStartRaw))
              ? Number(musicTrimStartRaw)
              : 0,
          reelDurationSec,
          voiceSamples: nestSamples,
        })

        reelMusicVolume = measured.reelMusicVolume
        reelDialogueVolume = measured.reelDialogueVolume
        audioSource = measured.source
      }
    }

    const result = await executeJobStart({
      jobId,
      paths,
      clipDurations: clipDurationsRaw,
      voiceOverBaseClipIndex: voiceOverRaw,
      musicTrimStartSec: musicTrimStartRaw,
      reelMusicVolume: reelMusicVolume ?? undefined,
      reelDialogueVolume: reelDialogueVolume ?? undefined,
      ...rest,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      jobId: result.jobId,
      status: result.status,
      audioSource,
      reelMusicVolume: reelMusicVolume ?? null,
      reelDialogueVolume: reelDialogueVolume ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error(`[VideoV2][/jobs/finalize] Error:`, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
