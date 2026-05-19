'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  X,
  Film,
  Layers,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  Upload,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { VideoUploader } from './VideoUploader'
import { ManualClipOrderSortable } from './ManualClipOrderSortable'
import { MusicSelector } from './MusicSelector'
import { PipelineStatus } from './PipelineStatus'
import { VideoPlayer } from './VideoPlayer'
import type { VideoJob, GeminiSegmentAnalysisResult } from '@/lib/videos/types'
import { VIDEO_MAX_CLIPS } from '@/lib/videos/clip-config'
import { parseJsonOrThrow } from '@/lib/safe-fetch-json'
import {
  VIDEO_RAW_BUCKET,
  VIDEO_RAW_BUCKET_MAX_BYTES,
  fileWithResolvedVideoMime,
  resolveVideoMimeType,
} from '@/lib/videos/resolve-video-mime'
import { readLocalVideoDurationSeconds } from './read-local-video-duration'
import { readLocalAudioDurationSeconds } from './read-local-audio-duration'

type VoiceOverUiMode = 'auto' | 'clip' | 'mp3'
type MusicTrimMode = 'smart' | 'manual'

type Step = 1 | 2 | 3 | 4 | 5 | 6
type FlowType = 'single' | 'multiple'

const STEP_LABELS = ['Tipo', 'Videos', 'Guion', 'Música', 'Procesando', 'Resultado']

interface UploadInfo {
  path: string
  signedUrl: string
  token: string
}

interface ScriptUploadInfo {
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
  const [jobName, setJobName] = useState('')
  const [flowType, setFlowType] = useState<FlowType>('single')
  const [files, setFiles] = useState<File[]>([])
  const [selectedMusicId, setSelectedMusicId] = useState<string | null>(null)
  const [selectedMusicUrl, setSelectedMusicUrl] = useState<string | null>(null)
  const [selectedMusicDurationSec, setSelectedMusicDurationSec] = useState<number | null>(null)
  const [musicTrimMode, setMusicTrimMode] = useState<MusicTrimMode>('smart')
  const [manualMusicTrimStartSec, setManualMusicTrimStartSec] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [completedJob, setCompletedJob] = useState<VideoJob | null>(null)
  /** Automático, audio de un clip, o archivo MP3 de voz en off. */
  const [voiceOverMode, setVoiceOverMode] = useState<VoiceOverUiMode>('auto')
  /** Si `voiceOverMode === 'clip'`: índice del clip cuyo audio completo va como VO. */
  const [voiceOverClipIndex, setVoiceOverClipIndex] = useState(0)
  /** Archivo MP3 (u otro audio) de VO cuando `voiceOverMode === 'mp3'`. */
  const [voiceOverMp3File, setVoiceOverMp3File] = useState<File | null>(null)
  const [voiceOverMp3DurationSec, setVoiceOverMp3DurationSec] = useState<number | null>(null)
  /** Índices de los clips que van como B-roll visual encima del VO (sin audio), en el orden elegido. */
  const [voiceOverOverlayClipIndices, setVoiceOverOverlayClipIndices] = useState<number[]>([])
  const [scriptPdfFile, setScriptPdfFile] = useState<File | null>(null)
  /** URLs objeto para previsualizar clips locales (revocadas al cambiar archivos o cerrar). */
  const clipPreviewUrls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => {
    return () => {
      clipPreviewUrls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [clipPreviewUrls])

  type InventoryRow = { id: string; brand: string | null; model: string | null; year: number | null }
  const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>([])
  const [inventoryPickId, setInventoryPickId] = useState<string>('')
  const [vehicleBrand, setVehicleBrand] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehicleYear, setVehicleYear] = useState('')
  const [manualIntroEnabled, setManualIntroEnabled] = useState(false)
  /** Hasta 3 índices de clip en orden; null = vacío. */
  const [manualIntroSlots, setManualIntroSlots] = useState<(number | null)[]>([null, null, null])
  /** Orden macro de clips en el Reel (permutación de índices elegibles). */
  const [manualFullClipOrderEnabled, setManualFullClipOrderEnabled] = useState(false)
  const [manualClipOrderIndices, setManualClipOrderIndices] = useState<number[]>([])

  function reset() {
    setStep(1)
    setJobName('')
    setFlowType('single')
    setFiles([])
    setSelectedMusicId(null)
    setSelectedMusicUrl(null)
    setSelectedMusicDurationSec(null)
    setMusicTrimMode('smart')
    setManualMusicTrimStartSec(0)
    setJobId(null)
    setCompletedJob(null)
    setIsSubmitting(false)
    setUploadProgress(null)
    setVoiceOverMode('auto')
    setVoiceOverClipIndex(0)
    setVoiceOverMp3File(null)
    setVoiceOverMp3DurationSec(null)
    setVoiceOverOverlayClipIndices([])
    setScriptPdfFile(null)
    setInventoryRows([])
    setInventoryPickId('')
    setVehicleBrand('')
    setVehicleModel('')
    setVehicleYear('')
    setManualIntroEnabled(false)
    setManualIntroSlots([null, null, null])
    setManualFullClipOrderEnabled(false)
    setManualClipOrderIndices([])
  }

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    const supabase = createClient()
    supabase
      .from('inventoryoracle')
      .select('id, brand, model, year')
      .eq('status', 'disponible')
      .order('updated_at', { ascending: false })
      .limit(120)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return
        setInventoryRows(data as InventoryRow[])
      })
    return () => {
      cancelled = true
    }
  }, [isOpen])

  useEffect(() => {
    if (!inventoryPickId) return
    const row = inventoryRows.find((r) => r.id === inventoryPickId)
    if (!row) return
    setVehicleBrand(row.brand?.trim() ?? '')
    setVehicleModel(row.model?.trim() ?? '')
    setVehicleYear(row.year != null ? String(row.year) : '')
  }, [inventoryPickId, inventoryRows])

  const clipIndexBlockedForNarrative = useCallback((i: number): boolean => {
    if (voiceOverMode === 'clip' && i === voiceOverClipIndex) return true
    if (voiceOverOverlayClipIndices.includes(i)) return true
    return false
  }, [voiceOverMode, voiceOverClipIndex, voiceOverOverlayClipIndices])

  useEffect(() => {
    if (!manualFullClipOrderEnabled || flowType !== 'multiple' || files.length < 2) return
    const eligible = files.map((_, i) => i).filter((i) => !clipIndexBlockedForNarrative(i))
    setManualClipOrderIndices((prev) => {
      const kept = prev.filter((i) => eligible.includes(i))
      const missing = eligible.filter((i) => !kept.includes(i)).sort((a, b) => a - b)
      return [...kept, ...missing]
    })
  }, [
    files,
    flowType,
    manualFullClipOrderEnabled,
    clipIndexBlockedForNarrative,
  ])

  function manualIntroPayload(): number[] | undefined {
    if (!manualIntroEnabled || flowType !== 'multiple' || files.length < 2) return undefined
    const out: number[] = []
    const seen = new Set<number>()
    for (const x of manualIntroSlots) {
      if (x == null || !Number.isInteger(x)) continue
      if (x < 0 || x >= files.length) continue
      if (clipIndexBlockedForNarrative(x)) continue
      if (seen.has(x)) continue
      seen.add(x)
      out.push(x)
      if (out.length >= 3) break
    }
    return out.length > 0 ? out : undefined
  }

  function canonicalVehiclePayload():
    | { brand: string; model: string; year: string }
    | undefined {
    const b = vehicleBrand.trim()
    const m = vehicleModel.trim()
    const y = vehicleYear.trim()
    if (!b && !m && !y) return undefined
    return { brand: b, model: m, year: y }
  }

  useEffect(() => {
    if (voiceOverMode === 'auto') {
      setVoiceOverOverlayClipIndices([])
      return
    }
    if (voiceOverMode === 'clip') {
      setVoiceOverOverlayClipIndices((prev) => prev.filter((i) => i !== voiceOverClipIndex))
    }
  }, [voiceOverMode, voiceOverClipIndex])

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
      for (const file of files) {
        if (!resolveVideoMimeType(file)) {
          throw new Error(
            `Tipo de archivo no permitido para "${file.name}". Usa MP4, MOV, AVI, WEBM o MKV.`
          )
        }
        if (file.size > VIDEO_RAW_BUCKET_MAX_BYTES) {
          const mb = (file.size / (1024 * 1024)).toFixed(0)
          throw new Error(
            `"${file.name}" pesa ~${mb} MB y supera el límite de 2 GB por clip. Comprime o divide el video.`
          )
        }
      }

      const supabase = createClient()

      // ── PASO 1: Crear job y obtener URLs firmadas de upload ──────────────
      setUploadProgress('Preparando upload...')

      const createRes = await fetch('/api/videos/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobName: jobName.trim(),
          flowType,
          files: files.map((f) => ({ filename: f.name, mimeType: f.type || 'video/mp4' })),
          musicTrackId: selectedMusicId,
        }),
      })

      const createData = await parseJsonOrThrow<{
        jobId?: string
        uploads?: UploadInfo[]
        scriptUpload?: ScriptUploadInfo
        error?: string
      }>(createRes)

      if (!createRes.ok || !createData.jobId || !createData.uploads) {
        throw new Error(createData.error ?? 'Error preparando el upload')
      }

      const { jobId: newJobId, uploads, scriptUpload } = createData

      let voiceOverStoredPath: string | undefined
      if (flowType === 'multiple' && voiceOverMode === 'mp3') {
        if (!voiceOverMp3File) {
          throw new Error('Selecciona un archivo de audio (MP3) para la voz en off')
        }
        if (voiceOverMp3DurationSec == null || !Number.isFinite(voiceOverMp3DurationSec) || voiceOverMp3DurationSec <= 0.2) {
          throw new Error('No se pudo leer la duración del audio. Prueba con otro MP3.')
        }
        setUploadProgress('Subiendo audio de voz en off...')
        const voFd = new FormData()
        voFd.append('file', voiceOverMp3File)
        const voUp = await fetch(`/api/videos/jobs/${newJobId}/voice-over-audio`, {
          method: 'POST',
          body: voFd,
        })
        const voData = await parseJsonOrThrow<{ path?: string; error?: string }>(voUp)
        if (!voUp.ok || !voData.path) {
          throw new Error(voData.error ?? `Error subiendo el audio de voz en off (HTTP ${voUp.status})`)
        }
        voiceOverStoredPath = voData.path
      }

      // ── PASO 2: Subir cada archivo DIRECTAMENTE a Supabase Storage ───────
      // Usar uploadToSignedUrl (FormData + headers del SDK); PUT crudo con File suele dar 400.
      for (let i = 0; i < files.length; i++) {
        const file = fileWithResolvedVideoMime(files[i])
        const upload = uploads[i]
        setUploadProgress(`Subiendo ${i + 1} de ${files.length}: ${file.name}...`)

        const { error: uploadError } = await supabase.storage
          .from(VIDEO_RAW_BUCKET)
          .uploadToSignedUrl(upload.path, upload.token, file, { cacheControl: '3600' })

        if (uploadError) {
          throw new Error(`Error subiendo ${file.name}: ${uploadError.message}`)
        }
      }

      let scriptPdfPath: string | undefined
      if (scriptPdfFile) {
        if (!scriptUpload) {
          throw new Error('No se pudo preparar la subida del guion. Actualiza la app e inténtalo de nuevo.')
        }
        const n = scriptPdfFile.name.trim().toLowerCase()
        if (!n.endsWith('.pdf') && scriptPdfFile.type !== 'application/pdf') {
          throw new Error('El guion debe ser un archivo PDF')
        }
        setUploadProgress('Subiendo guion (PDF)...')
        const scriptBody =
          scriptPdfFile.type === 'application/pdf'
            ? scriptPdfFile
            : new File([scriptPdfFile], scriptPdfFile.name, {
                type: 'application/pdf',
                lastModified: scriptPdfFile.lastModified,
              })
        const { error: scriptUploadError } = await supabase.storage
          .from(VIDEO_RAW_BUCKET)
          .uploadToSignedUrl(scriptUpload.path, scriptUpload.token, scriptBody, {
            cacheControl: '3600',
          })
        if (scriptUploadError) {
          throw new Error(`Error subiendo el guion: ${scriptUploadError.message}`)
        }
        scriptPdfPath = scriptUpload.path
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
        flowType === 'multiple' && files.length >= 2
          ? voiceOverMode === 'clip'
            ? {
                voiceOverBaseClipIndex: voiceOverClipIndex,
                ...(voiceOverOverlayClipIndices.length > 0
                  ? { voiceOverOverlayClipIndices }
                  : {}),
              }
            : voiceOverMode === 'mp3' && voiceOverStoredPath && voiceOverMp3DurationSec != null
              ? {
                  voiceOverAudioPath: voiceOverStoredPath,
                  voiceOverMp3DurationSec: voiceOverMp3DurationSec,
                  ...(voiceOverOverlayClipIndices.length > 0
                    ? { voiceOverOverlayClipIndices }
                    : {}),
                }
              : {}
          : {}

      const introIdx = manualFullClipOrderEnabled ? undefined : manualIntroPayload()
      const canonV = canonicalVehiclePayload()

      if (manualFullClipOrderEnabled && flowType === 'multiple' && files.length >= 2) {
        const eligible = files.map((_, i) => i).filter((i) => !clipIndexBlockedForNarrative(i))
        const ok =
          eligible.length > 0 &&
          eligible.length === manualClipOrderIndices.length &&
          eligible.every((i) => manualClipOrderIndices.includes(i))
        if (!ok) {
          throw new Error(
            'Orden manual de clips: revisa que la lista incluya exactamente todos los clips del montaje (sin el de VO ni los planos reservados).'
          )
        }
      }

      const startRes = await fetch('/api/videos/jobs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: newJobId,
          paths: uploads.map((u) => u.path),
          ...(flowType === 'multiple' && clipDurations ? { clipDurations } : {}),
          ...voiceOverPayload,
          ...(scriptPdfPath ? { scriptPdfPath } : {}),
          ...(introIdx && introIdx.length > 0 ? { manualIntroClipIndices: introIdx } : {}),
          ...(manualFullClipOrderEnabled &&
          flowType === 'multiple' &&
          manualClipOrderIndices.length > 0
            ? { manualClipOrderIndices: manualClipOrderIndices }
            : {}),
          ...(canonV ? { canonicalVehicle: canonV } : {}),
          ...(musicTrimMode === 'manual' ? { musicTrimStartSec: manualMusicTrimStartSec } : {}),
        }),
      })

      const startData = await parseJsonOrThrow<{ jobId?: string; error?: string }>(startRes)
      if (!startRes.ok) throw new Error(startData.error ?? 'Error iniciando el pipeline')

      setJobId(newJobId)
      setStep(5)
      onJobCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error iniciando el proceso')
    } finally {
      setIsSubmitting(false)
      setUploadProgress(null)
    }
  }

  const handleCompleted = useCallback((job: VideoJob) => {
    setCompletedJob(job)
    setStep(6)
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
              <p className="text-xs text-gray-400">Paso {step} de 6 — {STEP_LABELS[step - 1]}</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Stepper */}
        {step < 5 && (
          <div className="flex px-6 pt-4 gap-1">
            {STEP_LABELS.slice(0, 4).map((label, i) => {
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
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <label className="text-xs font-semibold text-gray-600">Nombre del JOB (opcional)</label>
                <input
                  type="text"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  maxLength={100}
                  placeholder="Ej: Hilux negra mayo 2026"
                  className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
                />
              </div>
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
                      {`2 a ${VIDEO_MAX_CLIPS} clips; voz en off y planos se detectan solos`}
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
              <VideoUploader flowType={flowType} files={files} onFilesChange={setFiles} previewUrls={clipPreviewUrls} />

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
                  <p className="text-sm font-semibold text-gray-900">Voz en off</p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Elige cómo va el audio principal del bloque de voz en off. Los clips que marques como planos encima
                    van en mudo en Creatomate para que no choquen con ese audio. Gemini sigue ordenando el resto del Reel
                    y en qué momento entra el bloque de VO.
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="vo-mode"
                        className="mt-1"
                        checked={voiceOverMode === 'auto'}
                        onChange={() => {
                          setVoiceOverMode('auto')
                          setVoiceOverOverlayClipIndices([])
                          setVoiceOverMp3File(null)
                          setVoiceOverMp3DurationSec(null)
                        }}
                      />
                      <span className="text-sm text-gray-800">
                        <span className="font-medium">Automático</span>
                        <span className="text-gray-500"> — Gemini y AssemblyAI deciden el montaje.</span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="vo-mode"
                        className="mt-1"
                        checked={voiceOverMode === 'clip'}
                        onChange={() => {
                          setVoiceOverMode('clip')
                          setVoiceOverMp3File(null)
                          setVoiceOverMp3DurationSec(null)
                        }}
                      />
                      <span className="text-sm text-gray-800">
                        <span className="font-medium">Audio de un clip</span>
                        <span className="text-gray-500"> — El audio completo de un video subido.</span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="vo-mode"
                        className="mt-1"
                        checked={voiceOverMode === 'mp3'}
                        onChange={() => {
                          setVoiceOverMode('mp3')
                          setVoiceOverOverlayClipIndices([])
                        }}
                      />
                      <span className="text-sm text-gray-800">
                        <span className="font-medium">Archivo MP3</span>
                        <span className="text-gray-500"> — Sube tu voz en off; los videos solo aportan imagen encima.</span>
                      </span>
                    </label>
                  </div>

                  {voiceOverMode === 'clip' && (
                    <div className="space-y-3 pt-1">
                      <p className="text-xs font-medium text-gray-700">
                        ¿Qué clip aporta el audio entero de la VO? Revisa la miniatura para no equivocarte de archivo.
                      </p>
                      {files.map((f, i) => (
                        <label
                          key={`${f.name}-${i}`}
                          className={`flex gap-3 rounded-xl border p-2.5 cursor-pointer transition-colors ${
                            voiceOverClipIndex === i ? 'border-violet-500 bg-violet-50/50' : 'border-gray-200 hover:border-violet-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="vo-clip"
                            className="mt-2 shrink-0"
                            checked={voiceOverClipIndex === i}
                            onChange={() => {
                              setVoiceOverClipIndex(i)
                              setVoiceOverOverlayClipIndices((prev) => prev.filter((x) => x !== i))
                            }}
                          />
                          <div className="w-28 shrink-0 aspect-video rounded-lg bg-black overflow-hidden border border-gray-200">
                            {clipPreviewUrls[i] ? (
                              <video
                                src={clipPreviewUrls[i]}
                                className="h-full w-full object-cover"
                                controls
                                playsInline
                                preload="metadata"
                              />
                            ) : null}
                          </div>
                          <span className="text-sm text-gray-800 min-w-0 flex-1">
                            <span className="font-semibold">Clip {i}</span>
                            <span className="block text-xs text-gray-500 break-all mt-0.5">{f.name}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {voiceOverMode === 'mp3' && (
                    <div className="space-y-2 pt-1 rounded-lg border border-violet-200/60 bg-white/60 p-3">
                      <p className="text-xs font-medium text-gray-700">Archivo de audio (recomendado: MP3)</p>
                      <input
                        type="file"
                        accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/aac,audio/mp4,audio/m4a"
                        className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-violet-700"
                        onChange={async (e) => {
                          const f = e.target.files?.[0] ?? null
                          setVoiceOverMp3File(f)
                          setVoiceOverMp3DurationSec(null)
                          if (!f) return
                          const d = await readLocalAudioDurationSeconds(f)
                          setVoiceOverMp3DurationSec(d)
                          if (d == null) {
                            toast.error('No se pudo leer la duración del audio. Prueba otro archivo.')
                          }
                        }}
                      />
                      {voiceOverMp3File && (
                        <p className="text-xs text-gray-600">
                          {voiceOverMp3File.name}
                          {voiceOverMp3DurationSec != null
                            ? ` · ${voiceOverMp3DurationSec.toFixed(2)} s`
                            : ''}
                        </p>
                      )}
                    </div>
                  )}

                  {(voiceOverMode === 'clip' || voiceOverMode === 'mp3') && (
                    <div className="mt-4 pt-3 border-t border-violet-100 space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Planos encima del audio de la voz en off (opcional)
                        </p>
                        <p className="text-xs text-gray-500 leading-relaxed mt-1">
                          Elige qué vídeos se <strong>ven</strong> durante la VO (su audio va en silencio en ese tramo).
                          Marca en el orden deseado: el número indica la secuencia en pantalla. Si no eliges ninguno, la
                          IA reparte planos sola.
                        </p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {files.map((f, i) => {
                          if (voiceOverMode === 'clip' && i === voiceOverClipIndex) return null
                          const isChecked = voiceOverOverlayClipIndices.includes(i)
                          const orderPos = voiceOverOverlayClipIndices.indexOf(i) + 1
                          return (
                            <label
                              key={`overlay-${i}`}
                              className={`flex gap-2 rounded-xl border p-2 cursor-pointer transition-colors ${
                                isChecked ? 'border-violet-500 bg-violet-50/40' : 'border-gray-200 hover:border-violet-200'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="mt-8 shrink-0 accent-violet-600"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setVoiceOverOverlayClipIndices((prev) => [...prev, i])
                                  } else {
                                    setVoiceOverOverlayClipIndices((prev) => prev.filter((x) => x !== i))
                                  }
                                }}
                              />
                              <div className="w-24 shrink-0 aspect-video rounded-lg bg-black overflow-hidden border border-gray-200">
                                {clipPreviewUrls[i] ? (
                                  <video
                                    src={clipPreviewUrls[i]}
                                    className="h-full w-full object-cover"
                                    controls
                                    playsInline
                                    preload="metadata"
                                  />
                                ) : null}
                              </div>
                              <span className="text-xs text-gray-800 min-w-0 flex-1 flex flex-col justify-center">
                                <span className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold">Clip {i}</span>
                                  {isChecked && (
                                    <span className="rounded-full bg-violet-600 text-white text-[10px] font-bold px-1.5 py-0.5">
                                      orden {orderPos}
                                    </span>
                                  )}
                                </span>
                                <span className="text-gray-500 break-all mt-0.5 line-clamp-2">{f.name}</span>
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-gray-200 space-y-3">
                    <p className="text-sm font-semibold text-gray-900">Vehículo de referencia (opcional)</p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Ayuda a la IA a interpretar la transcripción (marca, modelo, año correctos). Puedes elegir del
                      inventario o escribir a mano.
                    </p>
                    {inventoryRows.length > 0 && (
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Desde inventario</label>
                        <select
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
                          value={inventoryPickId}
                          onChange={(e) => setInventoryPickId(e.target.value)}
                        >
                          <option value="">— Ninguno / manual —</option>
                          {inventoryRows.map((r) => (
                            <option key={r.id} value={r.id}>
                              {[r.brand, r.model, r.year].filter(Boolean).join(' ') || r.id}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs font-medium text-gray-600">Marca</label>
                        <input
                          className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                          value={vehicleBrand}
                          onChange={(e) => {
                            setVehicleBrand(e.target.value)
                            setInventoryPickId('')
                          }}
                          placeholder="Toyota"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Modelo</label>
                        <input
                          className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                          value={vehicleModel}
                          onChange={(e) => {
                            setVehicleModel(e.target.value)
                            setInventoryPickId('')
                          }}
                          placeholder="Prado"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Año</label>
                        <input
                          className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                          value={vehicleYear}
                          onChange={(e) => {
                            setVehicleYear(e.target.value)
                            setInventoryPickId('')
                          }}
                          placeholder="2016"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-amber-100 bg-amber-50/30 rounded-xl p-3 space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 accent-amber-600"
                        checked={manualIntroEnabled}
                        onChange={(e) => {
                          const v = e.target.checked
                          setManualIntroEnabled(v)
                          if (v) {
                            setManualFullClipOrderEnabled(false)
                            setManualClipOrderIndices([])
                          }
                          if (!v) setManualIntroSlots([null, null, null])
                        }}
                      />
                      <span className="text-sm text-gray-900">
                        <span className="font-semibold text-amber-950">Intro fija (emergencia)</span>
                        <span className="block text-xs text-gray-600 mt-0.5 leading-relaxed">
                          Si la automatización no ordena bien los microclips de apertura (marca → modelo → año),
                          elige aquí hasta <strong>3 clips en orden</strong>. Irán <strong>siempre al inicio</strong> del
                          reel; el resto sigue automático. No uses el clip de VO ni los reservados como planos encima.
                        </span>
                      </span>
                    </label>
                    {manualIntroEnabled && (
                      <div className="grid gap-3 sm:grid-cols-3 pt-1">
                        {['1.º (ej. marca)', '2.º (ej. modelo)', '3.º (ej. año)'].map((label, slotIdx) => (
                          <div key={label} className="space-y-1.5">
                            <span className="text-xs font-medium text-gray-700">{label}</span>
                            <select
                              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
                              value={manualIntroSlots[slotIdx] ?? ''}
                              onChange={(e) => {
                                const v = e.target.value
                                setManualIntroSlots((prev) => {
                                  const next = [...prev]
                                  next[slotIdx] = v === '' ? null : Number(v)
                                  return next
                                })
                              }}
                            >
                              <option value="">—</option>
                              {files
                                .map((_, i) => i)
                                .filter((i) => !clipIndexBlockedForNarrative(i))
                                .map((i) => (
                                  <option key={i} value={i}>
                                    Clip {i}
                                  </option>
                                ))}
                            </select>
                            {manualIntroSlots[slotIdx] != null && clipPreviewUrls[manualIntroSlots[slotIdx]!] ? (
                              <div className="aspect-video rounded-lg bg-black overflow-hidden border border-gray-200">
                                <video
                                  src={clipPreviewUrls[manualIntroSlots[slotIdx]!]!}
                                  className="h-full w-full object-cover"
                                  playsInline
                                  controls
                                  preload="metadata"
                                />
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-emerald-100 bg-emerald-50/30 rounded-xl p-3 space-y-3">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 accent-emerald-600"
                        checked={manualFullClipOrderEnabled}
                        onChange={(e) => {
                          const on = e.target.checked
                          setManualFullClipOrderEnabled(on)
                          if (on) {
                            setManualIntroEnabled(false)
                            setManualIntroSlots([null, null, null])
                            const eligible = files.map((_, i) => i).filter((i) => !clipIndexBlockedForNarrative(i))
                            setManualClipOrderIndices(eligible.slice().sort((a, b) => a - b))
                          }
                        }}
                      />
                      <span className="text-sm text-gray-900">
                        <span className="font-semibold text-emerald-950">Ordenar clips manualmente</span>
                        <span className="block text-xs text-gray-600 mt-0.5 leading-relaxed">
                          Elige el orden de los clips en el Reel (arrastra la lista). Dentro de cada clip siguen valiendo
                          los cortes automáticos, subtítulos y música. No se combina con Intro fija (emergencia).
                        </span>
                      </span>
                    </label>
                    {manualFullClipOrderEnabled && manualClipOrderIndices.length > 0 && (
                      <ManualClipOrderSortable
                        order={manualClipOrderIndices}
                        onOrderChange={setManualClipOrderIndices}
                        files={files}
                        previewUrls={clipPreviewUrls}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 3 — Guion PDF (opcional) */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                <div className="mt-0.5 rounded-lg bg-violet-100 p-2">
                  <FileText className="h-5 w-5 text-violet-700" />
                </div>
                <div className="min-w-0 space-y-2">
                  <p className="text-sm font-semibold text-gray-900">Guion en PDF (opcional)</p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Si tienes un guion, súbelo como referencia para orden de ideas, ritmo y subtítulos. El sistema extrae
                    automáticamente las frases entre comillas como lista de diálogos para alinearlas con la
                    transcripción. La IA puede apartarse del PDF si el material en cámara pide otro enfoque.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-4 space-y-3">
                <label className="block">
                  <span className="text-xs font-medium text-gray-500">Archivo</span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-violet-700"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null
                      setScriptPdfFile(f)
                    }}
                  />
                </label>
                {scriptPdfFile && (
                  <div className="flex items-center justify-between gap-2 text-xs text-gray-700">
                    <span className="truncate">{scriptPdfFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setScriptPdfFile(null)}
                      className="shrink-0 text-violet-700 font-semibold hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASO 4 — Música */}
          {step === 4 && (
            <div className="space-y-4">
              {files.length > 0 && filesLookLikeIphoneMovForColorHint(files) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 leading-relaxed">
                  Recuerda: si los colores del Reel salen apagados con clips <code className="bg-amber-100/80 px-1 rounded">IMG_*.MOV</code>, prueba
                  subir el mismo material como <strong>MP4 SDR</strong> y vuelve a generar.
                </div>
              )}
              <p className="text-sm text-gray-600">Elige el track de música de fondo para el Reel:</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Al generar, el sistema elige solo el fragmento de la pista que mejor encaja con la duración del Reel
                (parte más dinámica y alineada con los cortes cuando el servidor puede analizar el audio).
              </p>
              <MusicSelector
                selectedId={selectedMusicId}
                onSelect={(track) => {
                  setSelectedMusicId(track.id)
                  setSelectedMusicUrl(track.public_url)
                  const dur = track.duration_seconds
                  if (typeof dur === 'number' && Number.isFinite(dur) && dur > 0) {
                    setSelectedMusicDurationSec(dur)
                    setManualMusicTrimStartSec((prev) => Math.max(0, Math.min(prev, Math.max(0, dur - 1))))
                  } else {
                    setSelectedMusicDurationSec(null)
                    setManualMusicTrimStartSec(0)
                  }
                }}
              />
              {selectedMusicId && (
                <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/40 p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-900">Tramo de música</p>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="music-trim-mode"
                        className="mt-1"
                        checked={musicTrimMode === 'smart'}
                        onChange={() => setMusicTrimMode('smart')}
                      />
                      <span className="text-sm text-gray-800">
                        <span className="font-medium">Selección inteligente</span>
                        <span className="text-gray-500"> — Detecta automáticamente la parte más movida.</span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="music-trim-mode"
                        className="mt-1"
                        checked={musicTrimMode === 'manual'}
                        onChange={() => setMusicTrimMode('manual')}
                      />
                      <span className="text-sm text-gray-800">
                        <span className="font-medium">Elegir manualmente</span>
                        <span className="text-gray-500"> — Define desde qué segundo inicia la canción.</span>
                      </span>
                    </label>
                  </div>
                  {musicTrimMode === 'manual' && (
                    <div className="space-y-2 rounded-lg border border-violet-200/70 bg-white/70 p-3">
                      <label className="text-xs font-medium text-gray-700">Inicio manual del track (segundos)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          step={0.1}
                          max={Math.max(0, (selectedMusicDurationSec ?? 300) - 1)}
                          value={manualMusicTrimStartSec}
                          onChange={(e) => setManualMusicTrimStartSec(Number(e.target.value))}
                          className="flex-1 accent-violet-600"
                          disabled={selectedMusicDurationSec == null}
                        />
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          max={Math.max(0, (selectedMusicDurationSec ?? 300) - 1)}
                          value={manualMusicTrimStartSec}
                          onChange={(e) => setManualMusicTrimStartSec(Math.max(0, Number(e.target.value) || 0))}
                          className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        El Reel usará este segundo como arranque y tomará la duración necesaria del clip final.
                        {selectedMusicDurationSec == null
                          ? ' Esta pista aún no tiene duración calculada en la base; se usa un rango temporal aproximado.'
                          : ''}
                      </p>
                      {selectedMusicUrl && (
                        <audio
                          controls
                          src={selectedMusicUrl}
                          className="w-full"
                          onLoadedMetadata={(e) => {
                            const el = e.currentTarget
                            if (!Number.isFinite(el.duration) || el.duration <= 0) return
                            setSelectedMusicDurationSec(el.duration)
                          }}
                          onCanPlay={(e) => {
                            const el = e.currentTarget
                            const t = Math.max(0, manualMusicTrimStartSec)
                            if (Math.abs(el.currentTime - t) > 0.25) {
                              try {
                                el.currentTime = t
                              } catch {
                                // Algunos navegadores bloquean seek temprano; no interrumpe el flujo.
                              }
                            }
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PASO 5 — Procesando */}
          {step === 5 && jobId && (
            <PipelineStatus jobId={jobId} onCompleted={handleCompleted} />
          )}

          {/* PASO 6 — Resultado */}
          {step === 6 && completedJob?.final_video_url && (
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
        {step < 5 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={() => step > 1 ? setStep((s) => (s - 1) as Step) : handleClose()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl border border-gray-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {step === 1 ? 'Cancelar' : 'Atrás'}
            </button>

            {step < 4 ? (
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
