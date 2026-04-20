'use client'

import { useState, useCallback } from 'react'
import { X, Film, Layers, ChevronRight, ChevronLeft, Loader2, CheckCircle2, Sparkles, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { VideoUploader } from './VideoUploader'
import { MusicSelector } from './MusicSelector'
import { PipelineStatus } from './PipelineStatus'
import { VideoPlayer } from './VideoPlayer'
import type { VideoJobV2, GeminiSegmentAnalysisResult } from '@/lib/videos-v2/types'
import { VIDEO_V2_MAX_CLIPS } from '@/lib/videos-v2/clip-config'
import { readLocalVideoDurationSeconds } from './read-local-video-duration'

type Step = 1 | 2 | 3 | 4 | 5
type FlowType = 'single' | 'multiple'

const STEP_LABELS = ['Tipo', 'Videos', 'Música', 'Procesando', 'Resultado']

interface UploadInfo {
  path: string
  signedUrl: string
  token: string
}

interface CreateReelModalProps {
  isOpen: boolean
  onClose: () => void
  onJobCreated: () => void
}

/** Clips típicos de iPhone (IMG_*.MOV) suelen ir en HDR; al recomponer por API el tono puede verse lavado vs. export manual. */
function filesLookLikeIphoneMovForColorHint(files: File[]): boolean {
  return files.some((f) => {
    const n = f.name.trim()
    if (!/\.mov$/i.test(n)) return false
    return /^IMG_\d+/i.test(n) || /^RPReplay|ScreenRecording|Cinematic/i.test(n)
  })
}

export function CreateReelModal({ isOpen, onClose, onJobCreated }: CreateReelModalProps) {
  const [step, setStep] = useState<Step>(1)
  const [flowType, setFlowType] = useState<FlowType>('single')
  const [files, setFiles] = useState<File[]>([])
  const [selectedMusicId, setSelectedMusicId] = useState<string | null>(null)
  const [selectedMusicUrl, setSelectedMusicUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [completedJob, setCompletedJob] = useState<VideoJobV2 | null>(null)
  /** 'auto' = Gemini + visual_overlay; número = índice del clip cuyo audio completo abre el Reel (solo varios clips). */
  const [voiceOverBaseClipIndex, setVoiceOverBaseClipIndex] = useState<number | 'auto'>('auto')

  function reset() {
    setStep(1)
    setFlowType('single')
    setFiles([])
    setSelectedMusicId(null)
    setSelectedMusicUrl(null)
    setJobId(null)
    setCompletedJob(null)
    setIsSubmitting(false)
    setUploadProgress(null)
    setVoiceOverBaseClipIndex('auto')
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit() {
    if (!files.length || !selectedMusicId) {
      toast.error('Selecciona al menos un video y un track de música')
      return
    }

    setIsSubmitting(true)
    try {
      // ── PASO 1: Crear job y obtener URLs firmadas de upload ──────────────
      setUploadProgress('Preparando upload...')

      const createRes = await fetch('/api/videos-v2/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowType,
          files: files.map((f) => ({ filename: f.name, mimeType: f.type || 'video/mp4' })),
          musicTrackId: selectedMusicId,
        }),
      })

      const createData = (await createRes.json()) as {
        jobId?: string
        uploads?: UploadInfo[]
        error?: string
      }

      if (!createRes.ok || !createData.jobId || !createData.uploads) {
        throw new Error(createData.error ?? 'Error preparando el upload')
      }

      const { jobId: newJobId, uploads } = createData

      // ── PASO 2: Subir cada archivo DIRECTAMENTE a Supabase Storage ───────
      // El navegador sube el archivo directo; Next.js NO ve el contenido.
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const upload = uploads[i]
        setUploadProgress(`Subiendo ${i + 1} de ${files.length}: ${file.name}...`)

        const uploadRes = await fetch(upload.signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'video/mp4' },
          body: file,
        })

        if (!uploadRes.ok) {
          throw new Error(`Error subiendo ${file.name} (HTTP ${uploadRes.status})`)
        }
      }

      // ── PASO 3: Duración de cada clip en el navegador (clasificación B-roll + respaldo sin ffprobe)
      let clipDurations: (number | null)[] | undefined
      if (flowType === 'multiple') {
        setUploadProgress('Leyendo duración de los videos...')
        const durs = await Promise.all(files.map((f) => readLocalVideoDurationSeconds(f)))
        for (let i = 0; i < files.length; i++) {
          const d = durs[i]
          if (d == null || !Number.isFinite(d) || d <= 0.05) {
            throw new Error(
              `No se pudo leer la duración de "${files[i].name}". Prueba exportar de nuevo como MP4 o MOV.`
            )
          }
        }
        clipDurations = durs.map((d) => Number(d!.toFixed(3)))
      }

      // ── PASO 4: Notificar al servidor que los archivos están listos ───────
      setUploadProgress('Iniciando pipeline...')

      const voiceOverPayload =
        flowType === 'multiple' &&
        files.length >= 2 &&
        voiceOverBaseClipIndex !== 'auto'
          ? { voiceOverBaseClipIndex: voiceOverBaseClipIndex }
          : {}

      const startRes = await fetch('/api/videos-v2/jobs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: newJobId,
          paths: uploads.map((u) => u.path),
          ...(flowType === 'multiple' && clipDurations ? { clipDurations } : {}),
          ...voiceOverPayload,
        }),
      })

      const startData = (await startRes.json()) as { jobId?: string; error?: string }
      if (!startRes.ok) throw new Error(startData.error ?? 'Error iniciando el pipeline')

      setJobId(newJobId)
      setStep(4)
      onJobCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error iniciando el proceso')
    } finally {
      setIsSubmitting(false)
      setUploadProgress(null)
    }
  }

  const handleCompleted = useCallback((job: VideoJobV2) => {
    setCompletedJob(job)
    setStep(5)
  }, [])

  if (!isOpen) return null

  const segmentAnalysis = completedJob?.gemini_analysis as GeminiSegmentAnalysisResult | null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Crear Reel V2</h2>
              <p className="text-xs text-gray-400">Paso {step} de 5 — {STEP_LABELS[step - 1]}</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Stepper */}
        {step < 4 && (
          <div className="flex px-6 pt-4 gap-1">
            {STEP_LABELS.slice(0, 3).map((label, i) => {
              const s = (i + 1) as Step
              const isActive = step === s
              const isDone = step > s
              return (
                <div key={label} className="flex-1 flex items-center gap-1">
                  <div className={`flex items-center gap-1.5 ${i > 0 ? 'flex-1' : ''}`}>
                    {i > 0 && <div className={`h-px flex-1 ${isDone ? 'bg-violet-500' : 'bg-gray-200'}`} />}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isDone ? 'bg-violet-600 text-white' : isActive ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : s}
                    </div>
                  </div>
                  <span className={`text-xs ${isActive ? 'text-violet-700 font-semibold' : 'text-gray-400'}`}>{label}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* PASO 1 — Tipo de flujo */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">¿Qué tipo de material tienes para el Reel?</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFlowType('single')}
                  className={`flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all ${
                    flowType === 'single' ? 'border-violet-600 bg-violet-50' : 'border-gray-200 hover:border-violet-300'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    flowType === 'single' ? 'bg-violet-100' : 'bg-gray-100'
                  }`}>
                    <Film className={`w-7 h-7 ${flowType === 'single' ? 'text-violet-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-bold ${flowType === 'single' ? 'text-violet-800' : 'text-gray-700'}`}>
                      Tengo un video largo
                    </p>
                    <p className="text-xs text-gray-400 mt-1">2-3 minutos de grabación continua</p>
                  </div>
                  {flowType === 'single' && (
                    <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setFlowType('multiple')}
                  className={`flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all ${
                    flowType === 'multiple' ? 'border-violet-600 bg-violet-50' : 'border-gray-200 hover:border-violet-300'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    flowType === 'multiple' ? 'bg-violet-100' : 'bg-gray-100'
                  }`}>
                    <Layers className={`w-7 h-7 ${flowType === 'multiple' ? 'text-violet-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-bold ${flowType === 'multiple' ? 'text-violet-800' : 'text-gray-700'}`}>
                      Tengo varios clips
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {`2 a ${VIDEO_V2_MAX_CLIPS} clips; voz en off y planos se detectan solos`}
                    </p>
                  </div>
                  {flowType === 'multiple' && (
                    <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* PASO 2 — Upload */}
          {step === 2 && (
            <div className="space-y-6">
              <VideoUploader flowType={flowType} files={files} onFilesChange={setFiles} />

              {files.length > 0 && filesLookLikeIphoneMovForColorHint(files) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 leading-relaxed">
                  <p className="font-semibold text-amber-950">Sobre el color del resultado</p>
                  <p className="mt-1">
                    Los .MOV de iPhone suelen ser HDR (Dolby Vision / HLG). El render automático puede verse más
                    &quot;lavado&quot; que si exportas a mano en Creatomate. Para colores más fieles, sube versiones en{' '}
                    <strong>H.264 / SDR</strong> (por ejemplo desde Fotos: compartir → guardar como &quot;Más
                    compatible&quot;, o exportar MP4 desde DaVinci / HandBrake con perfil Rec.709).
                  </p>
                </div>
              )}

              {flowType === 'multiple' && files.length >= 2 && (
                <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-900">Clip de voz en off (audio completo + B-roll)</p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Elige el archivo cuyo audio debe reproducirse entero una vez en el Reel, con planos sin habla (B-roll
                    de AssemblyAI) encima y negro donde falte material. Gemini decide en qué momento del montaje va ese
                    bloque (inicio, mitad o cierre) según el ritmo; el resto son cortes con diálogo de los otros clips.
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="vo-base"
                        className="mt-1"
                        checked={voiceOverBaseClipIndex === 'auto'}
                        onChange={() => setVoiceOverBaseClipIndex('auto')}
                      />
                      <span className="text-sm text-gray-800">
                        <span className="font-medium">Automático</span>
                        <span className="text-gray-500"> — Gemini decide superposición (visual_overlay).</span>
                      </span>
                    </label>
                    {files.map((f, i) => (
                      <label key={`${f.name}-${i}`} className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="vo-base"
                          className="mt-1"
                          checked={voiceOverBaseClipIndex === i}
                          onChange={() => setVoiceOverBaseClipIndex(i)}
                        />
                        <span className="text-sm text-gray-800 min-w-0">
                          <span className="font-medium">Clip {i}</span>
                          <span className="text-gray-500"> — </span>
                          <span className="break-all">{f.name}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 3 — Música */}
          {step === 3 && (
            <div className="space-y-4">
              {files.length > 0 && filesLookLikeIphoneMovForColorHint(files) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 leading-relaxed">
                  Recuerda: si los colores del Reel salen apagados con clips <code className="bg-amber-100/80 px-1 rounded">IMG_*.MOV</code>, prueba
                  subir el mismo material como <strong>MP4 SDR</strong> y vuelve a generar.
                </div>
              )}
              <p className="text-sm text-gray-600">Elige el track de música de fondo para el Reel:</p>
              <MusicSelector
                selectedId={selectedMusicId}
                onSelect={(id, url) => { setSelectedMusicId(id); setSelectedMusicUrl(url) }}
              />
            </div>
          )}

          {/* PASO 4 — Procesando */}
          {step === 4 && jobId && (
            <PipelineStatus jobId={jobId} onCompleted={handleCompleted} />
          )}

          {/* PASO 5 — Resultado */}
          {step === 5 && completedJob?.final_video_url && (
            <div className="flex flex-col items-center gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-7 h-7 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">¡Tu Reel está listo!</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                  {segmentAnalysis?.overall_strategy ?? 'El video fue generado exitosamente por la IA'}
                </p>
              </div>

              <VideoPlayer
                url={completedJob.final_video_url}
                duration={completedJob.final_video_duration}
              />

              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Crear otro Reel
              </button>
            </div>
          )}
        </div>

        {/* Footer con botones de navegación */}
        {step < 4 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={() => step > 1 ? setStep((s) => (s - 1) as Step) : handleClose()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl border border-gray-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {step === 1 ? 'Cancelar' : 'Atrás'}
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={step === 2 && files.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedMusicId || isSubmitting}
                className="flex flex-col items-center gap-0.5 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-w-[140px]"
              >
                <span className="flex items-center gap-2">
                  {isSubmitting
                    ? <Upload className="w-4 h-4 animate-bounce" />
                    : <Sparkles className="w-4 h-4" />
                  }
                  {isSubmitting ? 'Subiendo...' : 'Generar Reel'}
                </span>
                {uploadProgress && (
                  <span className="text-xs text-white/70 font-normal truncate max-w-[160px]">
                    {uploadProgress}
                  </span>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
