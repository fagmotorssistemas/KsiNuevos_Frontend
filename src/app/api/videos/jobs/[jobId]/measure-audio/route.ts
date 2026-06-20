import { NextRequest, NextResponse } from 'next/server'
import {
  callNestMeasureAudioServer,
  type NestMeasureAudioResult,
} from '@/lib/videos/nest-measure-audio-server'
import {
  FALLBACK_DIALOGUE_VOLUME,
  FALLBACK_MUSIC_VOLUME,
} from '@/lib/videos/audio-balance-core'

export const runtime = 'nodejs'
export const maxDuration = 130

function fallback503(): NestMeasureAudioResult {
  return {
    reelMusicVolume: FALLBACK_MUSIC_VOLUME,
    reelDialogueVolume: FALLBACK_DIALOGUE_VOLUME,
    voiceMeanDb: null,
    musicMeanDb: null,
    source: 'fallback',
    nestReachable: false,
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  try {
    const body = await req.json()
    const musicUrl = body.musicUrl?.trim()
    const voiceSamples = Array.isArray(body.voiceSamples) ? body.voiceSamples : []

    if (!musicUrl || voiceSamples.length === 0) {
      console.warn(`[measure-audio][${jobId}] Payload incompleto; fallback.`)
      return NextResponse.json(fallback503(), { status: 503 })
    }

    const result = await callNestMeasureAudioServer({
      jobId,
      musicUrl,
      musicTrimStartSec: body.musicTrimStartSec ?? 0,
      reelDurationSec: body.reelDurationSec,
      voiceSamples,
    })

    if (!result.nestReachable) {
      return NextResponse.json(result, { status: 503 })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[measure-audio][${jobId}] Error: ${msg}`)
    return NextResponse.json(fallback503(), { status: 503 })
  }
}
