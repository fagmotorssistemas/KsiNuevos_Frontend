'use client'

import { useState, useCallback } from 'react'
import { Newspaper, Loader2, RefreshCw, Share2, Play } from 'lucide-react'
import { toast } from 'sonner'
import { parseJsonOrThrow } from '@/lib/safe-fetch-json'
import type { NoticieroMode, NoticieroPipelineStep, NoticieroVehicle } from '@/lib/noticiero/types'
import type { VehicleCaptionInput } from '@/lib/videos/caption'
import { VehicleSelector } from './components/VehicleSelector'
import { CustomTopicInput } from './components/CustomTopicInput'
import { GenerationProgress } from './components/GenerationProgress'

interface PipelineResult {
  script: string
  bannerTitle: string
  finalVideoUrl: string
  caption: string
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await parseJsonOrThrow<T & { error?: string }>(res)
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Error HTTP ${res.status}`)
  }
  return data
}

function vehicleToCaptionInput(v: NoticieroVehicle): VehicleCaptionInput {
  return {
    marca: v.brand,
    modelo: v.model,
    version: v.version || '(sin versión)',
    año: v.year ?? '',
    motor: v.engine_displacement || '(no indicado)',
    transmision: v.transmission || '(no indicada)',
    traccion: v.drive_type || '(no indicada)',
    tipo: v.type_body || '(no indicado)',
  }
}

function buildCustomCaption(script: string): string {
  return `${script}\n\n📍 KSINUEVOS – Av. España 6-73 y Sevilla, Cuenca, Ecuador\n📲 Agenda tu visita 👉 wa.me/593983335555\n\n#KSINUEVOS #NoticiasAutos #CuencaEcuador #ConcesionarioCuenca`
}

export default function NoticieroPage() {
  const [mode, setMode] = useState<NoticieroMode>('vehicle')
  const [vehicle, setVehicle] = useState<NoticieroVehicle | null>(null)
  const [vehicleId, setVehicleId] = useState('')
  const [customTopic, setCustomTopic] = useState('')
  const [pipelineStep, setPipelineStep] = useState<NoticieroPipelineStep>('idle')
  const [pipelineError, setPipelineError] = useState<string | null>(null)
  const [result, setResult] = useState<PipelineResult | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [socialPublished, setSocialPublished] = useState(false)

  const isRunning = pipelineStep !== 'idle' && pipelineStep !== 'done' && pipelineStep !== 'error'

  const canGenerate =
    !isRunning &&
    (mode === 'vehicle' ? Boolean(vehicle) : customTopic.trim().length >= 10)

  const reset = useCallback(() => {
    setPipelineStep('idle')
    setPipelineError(null)
    setResult(null)
    setSocialPublished(false)
  }, [])

  async function fetchCaption(v: NoticieroVehicle): Promise<string> {
    const data = await postJson<{ caption: string }>('/api/videos/caption/generate', vehicleToCaptionInput(v))
    return data.caption
  }

  async function publishToSocial(videoUrl: string, caption: string): Promise<void> {
    setPipelineStep('social')
    setPipelineError(null)

    const ig = await postJson<{ mediaId: string }>('/api/videos/publish/instagram', {
      videoUrl,
      caption,
    })
    console.log('[noticiero] Instagram publicado:', ig)

    const fb = await postJson<{ postId: string }>('/api/videos/publish/facebook', {
      videoUrl,
      caption,
    })
    console.log('[noticiero] Facebook publicado:', fb)

    setSocialPublished(true)
    toast.success('Video publicado en Instagram y Facebook')
  }

  async function handleGenerate() {
    reset()
    setPipelineStep('script')
    setPipelineError(null)

    try {
      const scriptPayload =
        mode === 'vehicle'
          ? { mode: 'vehicle' as const, vehicle }
          : { mode: 'custom' as const, customTopic: customTopic.trim() }

      if (mode === 'vehicle' && !vehicle) {
        throw new Error('Selecciona un vehículo del inventario')
      }

      console.log('[noticiero] Paso 1: generando guión')
      const { script, bannerTitle } = await postJson<{ script: string; bannerTitle: string }>(
        '/api/marketing/noticiero/generate-script',
        scriptPayload
      )

      setPipelineStep('avatar')
      console.log('[noticiero] Paso 2: HeyGen avatar')
      const { videoUrl: heygenVideoUrl } = await postJson<{ videoUrl: string; videoId: string }>(
        '/api/marketing/noticiero/generate-avatar',
        { script }
      )

      setPipelineStep('video')
      console.log('[noticiero] Paso 3: Creatomate composición')
      const videoPayload = {
        heygenVideoUrl,
        bannerTitle,
        mode,
        ...(mode === 'vehicle' ? { vehicle } : { customTopic: customTopic.trim() }),
      }
      const { videoUrl: finalVideoUrl } = await postJson<{ videoUrl: string; bannerTitle: string }>(
        '/api/marketing/noticiero/generate-video',
        videoPayload
      )

      const caption =
        mode === 'vehicle' && vehicle
          ? await fetchCaption(vehicle)
          : buildCustomCaption(script)

      const pipelineResult: PipelineResult = {
        script,
        bannerTitle,
        finalVideoUrl,
        caption,
      }
      setResult(pipelineResult)

      try {
        await publishToSocial(finalVideoUrl, caption)
      } catch (socialErr) {
        const msg = socialErr instanceof Error ? socialErr.message : 'Error al publicar en redes'
        console.error('[noticiero] Publicación automática falló:', socialErr)
        setPipelineError(
          `Video generado correctamente, pero la publicación automática falló: ${msg}. Puedes publicar manualmente.`
        )
        setPipelineStep('done')
        toast.warning('Video listo. Publicación manual disponible.')
        return
      }

      setPipelineStep('done')
      toast.success('Noticiero generado y publicado')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en el pipeline del noticiero'
      console.error('[noticiero] Pipeline error:', err)
      setPipelineError(message)
      setPipelineStep('error')
      toast.error(message)
    }
  }

  async function handleManualPublish() {
    if (!result?.finalVideoUrl || !result.caption) return
    setIsPublishing(true)
    try {
      await publishToSocial(result.finalVideoUrl, result.caption)
      setPipelineStep('done')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al publicar'
      toast.error(message)
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Newspaper className="w-5 h-5 text-white" />
            </div>
            KSI Nuevos News
          </h1>
          <p className="text-sm text-gray-500 mt-2 max-w-xl">
            Noticiero con IA: guión (Gemini), presentadora (HeyGen), composición (Creatomate) y
            publicación automática en Instagram y Facebook.
          </p>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-gray-900">Configuración del clip</h2>

        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            disabled={isRunning}
            onClick={() => {
              setMode('vehicle')
              reset()
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              mode === 'vehicle' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Vehículo del inventario
          </button>
          <button
            type="button"
            disabled={isRunning}
            onClick={() => {
              setMode('custom')
              reset()
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              mode === 'custom' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tema personalizado
          </button>
        </div>

        {mode === 'vehicle' ? (
          <VehicleSelector
            selectedId={vehicleId}
            disabled={isRunning}
            onSelect={(v) => {
              setVehicle(v)
              setVehicleId(v?.id ?? '')
            }}
          />
        ) : (
          <CustomTopicInput value={customTopic} onChange={setCustomTopic} disabled={isRunning} />
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            disabled={!canGenerate}
            onClick={() => void handleGenerate()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-violet-500/20"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Generar Noticiero
              </>
            )}
          </button>

          {result && !isRunning && (
            <button
              type="button"
              onClick={() => {
                reset()
                setVehicleId('')
                setVehicle(null)
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerar
            </button>
          )}
        </div>
      </section>

      <GenerationProgress currentStep={pipelineStep} error={pipelineError} />

      {result && (
        <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-gray-900">Resultado</h2>

          {result.bannerTitle && (
            <p className="text-xs font-bold tracking-wide text-violet-700 uppercase">{result.bannerTitle}</p>
          )}

          <div className="aspect-video max-w-3xl bg-black rounded-xl overflow-hidden">
            <video src={result.finalVideoUrl} controls className="w-full h-full" playsInline />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Guión generado</h3>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4 leading-relaxed whitespace-pre-wrap">
              {result.script}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {!socialPublished && (
              <button
                type="button"
                disabled={isPublishing}
                onClick={() => void handleManualPublish()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl"
              >
                {isPublishing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                Publicar en Instagram y Facebook
              </button>
            )}
            {socialPublished && (
              <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-800 text-sm font-semibold rounded-xl">
                Publicado en redes sociales
              </span>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
