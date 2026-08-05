'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarClock, Loader2, Plus, Sparkles, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { uploadRawVideoClip } from '@/lib/videos/upload-raw-clip'
import { VIDEO_RAW_BUCKET_MAX_BYTES } from '@/lib/videos/resolve-video-mime'
import {
  RAW_FULL_VIDEOS_BUCKET,
  RAW_FULL_VIDEOS_MAX_PER_FOLDER,
} from '@/lib/videos/raw-full-videos-types'
import {
  RAW_FULL_CAPTION_FORMATOS,
  buildAdaptedDayPilarCaption,
  buildRawFullCaption,
  isDayAdaptedCaptionFormato,
  rawFullFormatoToPilarSistema,
  type CaptionVehicleBits,
  type RawFullCaptionFormato,
} from '@/lib/videos/raw-full-caption-templates'
import {
  VehicleInventoryPicker,
  type InventoryPickerRow,
} from '@/components/videos/VehicleInventoryPicker'
import { ScheduleRawFullPublishModal } from '@/components/videos/ScheduleRawFullPublishModal'
import { pilaresService } from '@/services/pilares.service'
import { ecuadorCalendarParts } from '@/lib/marketing-planner/timezone'
import type { PilarAssignmentRow, PilarScript } from '@/types/pilar'

function ecuadorTodayYmd() {
  const p = ecuadorCalendarParts()
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

type InvDetail = InventoryPickerRow & {
  engine_displacement?: string | null
  fuel_type?: string | null
  type?: string | null
  type_body?: string | null
  mileage?: number | null
  version?: string | null
}

interface UploadFullVideosModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  /** Tras programar publicación (abre cola en el padre). */
  onScheduled?: () => void
  existingFolder?: { id: string; title: string; videoCount: number } | null
}

function toCaptionBits(v: InvDetail | null | undefined): Partial<CaptionVehicleBits> | null {
  if (!v) return null
  return {
    marca: v.brand ?? '',
    modelo: v.model ?? '',
    version: v.version ?? '',
    anio: v.year != null ? String(v.year) : '',
    tipo: v.type ?? v.type_body ?? 'vehículo',
    cc: v.engine_displacement ?? '',
    combustible: v.fuel_type ?? 'gasolina',
    km: v.mileage != null ? String(v.mileage) : '',
    extras: 'equipamiento revisado',
    caracteristicas: 'diseño, confort y buen rendimiento',
  }
}

export function UploadFullVideosModal({
  isOpen,
  onClose,
  onSaved,
  onScheduled,
  existingFolder = null,
}: UploadFullVideosModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [inventoryRows, setInventoryRows] = useState<InvDetail[]>([])
  const [loadingInventory, setLoadingInventory] = useState(false)
  const [formato, setFormato] = useState<RawFullCaptionFormato>('video_autos')
  const [vehicleId, setVehicleId] = useState('')
  const [vehicleId2, setVehicleId2] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [caption, setCaption] = useState('')
  const [progress, setProgress] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [createdFolderId, setCreatedFolderId] = useState<string | null>(null)
  const [createdPaths, setCreatedPaths] = useState<string[]>([])
  const [dayScripts, setDayScripts] = useState<PilarScript[]>([])
  const [dayAssignments, setDayAssignments] = useState<PilarAssignmentRow[]>([])
  const [dayTopicLabel, setDayTopicLabel] = useState<string | null>(null)
  const [loadingDayTopic, setLoadingDayTopic] = useState(false)
  const [selectedDayScriptId, setSelectedDayScriptId] = useState<string | null>(null)

  const isAppendMode = !!existingFolder
  const formatoMeta = useMemo(
    () => RAW_FULL_CAPTION_FORMATOS.find((f) => f.id === formato)!,
    [formato]
  )
  const maxAllowed = isAppendMode
    ? Math.max(0, RAW_FULL_VIDEOS_MAX_PER_FOLDER - existingFolder.videoCount)
    : RAW_FULL_VIDEOS_MAX_PER_FOLDER

  const vehicleOk = (() => {
    const need = formatoMeta.vehiclesRequired
    const v1 = vehicleId.trim()
    const v2 = vehicleId2.trim()
    if (need === 0) return true
    if (need === 1) return !!v1
    return !!v1 && !!v2 && v1 !== v2
  })()

  const canSaveCreate = !isAppendMode && files.length > 0 && vehicleOk && !!caption.trim()

  const resetForm = useCallback(() => {
    setFormato('video_autos')
    setVehicleId('')
    setVehicleId2('')
    setFiles([])
    setCaption('')
    setProgress(null)
    setSaving(false)
    setCreatedFolderId(null)
    setCreatedPaths([])
    setDayScripts([])
    setDayAssignments([])
    setDayTopicLabel(null)
    setSelectedDayScriptId(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  useEffect(() => {
    if (!isOpen) {
      resetForm()
      return
    }
    if (isAppendMode) {
      setLoadingInventory(false)
      return
    }

    let cancelled = false
    setLoadingInventory(true)
    setLoadingDayTopic(true)
    const supabase = createClient()
    const fecha = ecuadorTodayYmd()

    void (async () => {
      const [invRes, scriptsRes, asgRes] = await Promise.all([
        supabase
          .from('inventoryoracle')
          .select(
            'id, brand, model, year, plate, version, engine_displacement, fuel_type, type, type_body, mileage'
          )
          .eq('status', 'disponible')
          .order('updated_at', { ascending: false })
          .limit(200),
        pilaresService.getScriptsByDate(fecha).catch(() => ({ scripts: [] as PilarScript[] })),
        pilaresService.getAssignmentsByDate(fecha).catch(() => ({
          assignments: [] as PilarAssignmentRow[],
        })),
      ])

      if (cancelled) return

      if (invRes.error) {
        toast.error('No se pudo cargar el inventario')
      } else {
        setInventoryRows((invRes.data ?? []) as InvDetail[])
      }
      setDayScripts(scriptsRes.scripts ?? [])
      setDayAssignments(asgRes.assignments ?? [])
      setLoadingInventory(false)
      setLoadingDayTopic(false)
    })()

    return () => {
      cancelled = true
    }
  }, [isOpen, resetForm, isAppendMode])

  const dayTopicsForFormato = useMemo(() => {
    const sistema = rawFullFormatoToPilarSistema(formato)
    if (!sistema || !isDayAdaptedCaptionFormato(formato)) return []
    const fromScripts = dayScripts
      .filter((s) => s.sistema === sistema)
      .map((s) => ({
        id: s.id || s.assignment_id || s.titulo || s.hook_texto || String(Math.random()),
        titulo: s.titulo,
        hookTexto: s.hook_texto,
        objetivo: s.objetivo,
        label: (s.titulo || s.hook_texto || 'Tema del día').trim(),
      }))
    if (fromScripts.length > 0) return fromScripts

    return dayAssignments
      .filter((a) => a.sistema === sistema)
      .map((a) => ({
        id: a.assignment_id,
        titulo: a.hook_texto,
        hookTexto: a.hook_texto,
        objetivo: null as string | null,
        label: (a.hook_texto || 'Tema del día').trim(),
      }))
  }, [formato, dayScripts, dayAssignments])

  function pickDayTopic(nextFormato: RawFullCaptionFormato): {
    titulo: string | null
    hookTexto: string | null
    objetivo: string | null
    label: string | null
  } {
    const sistema = rawFullFormatoToPilarSistema(nextFormato)
    if (!sistema || !isDayAdaptedCaptionFormato(nextFormato)) {
      return { titulo: null, hookTexto: null, objetivo: null, label: null }
    }

    const topics = (() => {
      const fromScripts = dayScripts
        .filter((s) => s.sistema === sistema)
        .map((s) => ({
          id: s.id || s.assignment_id || '',
          titulo: s.titulo,
          hookTexto: s.hook_texto,
          objetivo: s.objetivo,
          label: (s.titulo || s.hook_texto || 'Tema del día').trim(),
        }))
      if (fromScripts.length) return fromScripts
      return dayAssignments
        .filter((a) => a.sistema === sistema)
        .map((a) => ({
          id: a.assignment_id,
          titulo: a.hook_texto,
          hookTexto: a.hook_texto,
          objetivo: null as string | null,
          label: (a.hook_texto || 'Tema del día').trim(),
        }))
    })()

    const picked =
      (selectedDayScriptId
        ? topics.find((t) => t.id === selectedDayScriptId)
        : null) ?? topics[0] ?? null

    if (!picked) return { titulo: null, hookTexto: null, objetivo: null, label: null }
    return {
      titulo: picked.titulo,
      hookTexto: picked.hookTexto,
      objetivo: picked.objetivo,
      label: picked.label,
    }
  }

  function regenerateCaption(
    nextFormato: RawFullCaptionFormato,
    id1: string,
    id2: string
  ) {
    if (isDayAdaptedCaptionFormato(nextFormato)) {
      const topic = pickDayTopic(nextFormato)
      setDayTopicLabel(topic.label)
      setCaption(
        buildAdaptedDayPilarCaption({
          formato: nextFormato,
          titulo: topic.titulo,
          hookTexto: topic.hookTexto,
          objetivo: topic.objetivo,
        })
      )
      return
    }

    setDayTopicLabel(null)
    const v1 = inventoryRows.find((r) => r.id === id1) ?? null
    const v2 = inventoryRows.find((r) => r.id === id2) ?? null
    setCaption(
      buildRawFullCaption({
        formato: nextFormato,
        vehicle: toCaptionBits(v1),
        vehicle2: toCaptionBits(v2),
      })
    )
  }

  useEffect(() => {
    if (!isOpen || isAppendMode) return
    regenerateCaption(formato, vehicleId, vehicleId2)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- al abrir/cambiar formato, vehículos o temas del día
  }, [
    isOpen,
    isAppendMode,
    formato,
    vehicleId,
    vehicleId2,
    inventoryRows,
    dayScripts,
    dayAssignments,
    selectedDayScriptId,
  ])

  useEffect(() => {
    if (!isDayAdaptedCaptionFormato(formato)) {
      setSelectedDayScriptId(null)
      return
    }
    if (dayTopicsForFormato.length === 0) {
      setSelectedDayScriptId(null)
      return
    }
    if (
      !selectedDayScriptId ||
      !dayTopicsForFormato.some((t) => t.id === selectedDayScriptId)
    ) {
      setSelectedDayScriptId(dayTopicsForFormato[0]!.id)
    }
  }, [formato, dayTopicsForFormato, selectedDayScriptId])

  function handleFilesChange(list: FileList | null) {
    if (!list?.length) return
    const picked = Array.from(list).filter(
      (f) => f.type.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv|m4v)$/i.test(f.name)
    )
    if (!picked.length) {
      toast.error('Selecciona videos (MP4, MOV, etc.)')
      return
    }
    setFiles((prev) => {
      const merged = [...prev, ...picked]
      if (merged.length > maxAllowed) {
        toast.error(`Máximo ${RAW_FULL_VIDEOS_MAX_PER_FOLDER} videos por carpeta`)
        return merged.slice(0, maxAllowed)
      }
      return merged
    })
  }

  async function uploadFiles(): Promise<{ folderId: string; paths: string[] }> {
    const supabase = createClient()
    let folderId: string
    let uploads: Array<{ path: string; signedUrl: string; token: string }>

    if (isAppendMode && existingFolder) {
      setProgress('Preparando subida…')
      const res = await fetch(`/api/videos/raw-full/library/${existingFolder.id}/videos`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: files.map((f) => ({ filename: f.name, mimeType: f.type })),
        }),
      })
      const data = (await res.json()) as {
        error?: string
        uploads?: Array<{ path: string; signedUrl: string; token: string }>
      }
      if (!res.ok || !data.uploads?.length) {
        throw new Error(data.error ?? 'No se pudo preparar la subida')
      }
      folderId = existingFolder.id
      uploads = data.uploads
    } else {
      setProgress('Creando carpeta…')
      const res = await fetch('/api/videos/raw-full/library/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formato,
          inventory_vehicle_id:
            formatoMeta.vehiclesAllowed >= 1 && vehicleId.trim() ? vehicleId.trim() : null,
          inventory_vehicle_id_2:
            formatoMeta.vehiclesAllowed >= 2 && vehicleId2.trim() ? vehicleId2.trim() : null,
          caption: caption.trim(),
          files: files.map((f) => ({ filename: f.name, mimeType: f.type })),
        }),
      })
      const data = (await res.json()) as {
        error?: string
        folderId?: string
        uploads?: Array<{ path: string; signedUrl: string; token: string }>
      }
      if (!res.ok || !data.folderId || !data.uploads?.length) {
        throw new Error(data.error ?? 'No se pudo crear la carpeta')
      }
      folderId = data.folderId
      uploads = data.uploads
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!
      const upload = uploads[i]!
      setProgress(`Subiendo ${i + 1}/${files.length}: ${file.name}`)
      await uploadRawVideoClip(supabase, folderId, upload.path, upload.token, file, {
        onProgress: setProgress,
        bucket: RAW_FULL_VIDEOS_BUCKET,
      })
    }

    setProgress('Registrando videos…')
    const completeRes = await fetch('/api/videos/raw-full/library/complete', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderId,
        paths: uploads.map((u) => u.path),
        append: isAppendMode,
      }),
    })
    const completeData = (await completeRes.json()) as { error?: string }
    if (!completeRes.ok) throw new Error(completeData.error ?? 'Error al completar')

    return { folderId, paths: uploads.map((u) => u.path) }
  }

  async function handleSaveOnly() {
    if (!isAppendMode && !canSaveCreate) {
      toast.error('Completa formato, vehículos (si aplica), caption y videos')
      return
    }
    if (!files.length) {
      toast.error('Selecciona al menos un video')
      return
    }
    setSaving(true)
    try {
      await uploadFiles()
      toast.success(isAppendMode ? 'Videos agregados' : 'Carpeta creada')
      onSaved()
      onClose()
    } catch (e) {
      console.error('[UploadFullVideosModal]', e)
      toast.error(e instanceof Error ? e.message : 'Error al subir')
    } finally {
      setSaving(false)
      setProgress(null)
    }
  }

  async function handleSaveAndSchedule() {
    if (!canSaveCreate) {
      toast.error('Completa formato, vehículos (si aplica), caption y videos')
      return
    }
    setSaving(true)
    try {
      const { folderId, paths } = await uploadFiles()
      setCreatedFolderId(folderId)
      setCreatedPaths(paths)
      toast.success('Video subido. Elige fecha para programar.')
      onSaved()
      setScheduleOpen(true)
    } catch (e) {
      console.error('[UploadFullVideosModal]', e)
      toast.error(e instanceof Error ? e.message : 'Error al subir')
    } finally {
      setSaving(false)
      setProgress(null)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
        <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isAppendMode ? 'Agregar videos en bruto' : 'Nueva carpeta de videos en bruto'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Elige el formato del guión, genera el copy y programa como en Videos. Máx.{' '}
                {(VIDEO_RAW_BUCKET_MAX_BYTES / (1024 * 1024 * 1024)).toFixed(0)} GB c/u.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2.5 text-[12px] text-sky-900 leading-snug">
              <strong className="font-bold">Recomendación:</strong> nombra el archivo con el
              vehículo o el tema del día (ej. <em>Nissan-Kicks-2020.mp4</em> o{' '}
              <em>Error-comun-usado.mp4</em>) para localizarlo rápido en la biblioteca.
            </div>

            {isAppendMode && existingFolder ? (
              <div className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-sm text-violet-900">
                Carpeta: <strong>{existingFolder.title}</strong> · {existingFolder.videoCount} video(s)
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                    Formato del video
                  </label>
                  <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {RAW_FULL_CAPTION_FORMATOS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          setFormato(f.id)
                          if (f.vehiclesAllowed < 2) setVehicleId2('')
                          if (f.vehiclesAllowed < 1) {
                            setVehicleId('')
                            setVehicleId2('')
                          }
                        }}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold border text-left transition-colors flex items-center gap-2 ${
                          formato === f.id
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${f.dotClass}`} />
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-500">{formatoMeta.hint}</p>
                </div>

                {isDayAdaptedCaptionFormato(formato) ? (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2.5 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">
                      Tema del día (Guiones V2)
                    </p>
                    {loadingDayTopic ? (
                      <p className="text-xs text-emerald-700 inline-flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Cargando plan de hoy…
                      </p>
                    ) : dayTopicsForFormato.length === 0 ? (
                      <p className="text-xs text-emerald-800">
                        No hay guion de este pilar para hoy. Se usará un copy genérico + CTA fijo.
                      </p>
                    ) : (
                      <>
                        <select
                          value={selectedDayScriptId ?? dayTopicsForFormato[0]?.id ?? ''}
                          onChange={(e) => setSelectedDayScriptId(e.target.value)}
                          disabled={saving}
                          className="w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-2 text-xs font-semibold text-gray-800"
                        >
                          {dayTopicsForFormato.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        {dayTopicLabel ? (
                          <p className="text-[11px] text-emerald-900">
                            Copy adaptado (corto) a: <strong>{dayTopicLabel}</strong>
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}

                {formatoMeta.vehiclesAllowed >= 1 ? (
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                      {formatoMeta.vehiclesAllowed === 2
                        ? 'Vehículo 1'
                        : formatoMeta.vehiclesRequired === 0
                          ? 'Vehículo (opcional)'
                          : 'Vehículo'}
                    </label>
                    <div className="mt-1.5">
                      <VehicleInventoryPicker
                        vehicleId={vehicleId}
                        onSelect={setVehicleId}
                        rows={inventoryRows}
                        loading={loadingInventory}
                        disabled={saving}
                      />
                    </div>
                  </div>
                ) : null}

                {formatoMeta.vehiclesAllowed >= 2 ? (
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                      Vehículo 2 (comparación)
                    </label>
                    <div className="mt-1.5">
                      <VehicleInventoryPicker
                        vehicleId={vehicleId2}
                        onSelect={setVehicleId2}
                        rows={inventoryRows}
                        loading={loadingInventory}
                        disabled={saving}
                      />
                    </div>
                  </div>
                ) : null}

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                      Caption / copy
                    </label>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => regenerateCaption(formato, vehicleId, vehicleId2)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-700 hover:text-violet-900"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Regenerar copy
                    </button>
                  </div>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    disabled={saving}
                    rows={8}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs text-gray-900 font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                Videos
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,.mp4,.mov,.webm,.mkv,.m4v,.avi"
                multiple
                className="hidden"
                onChange={(e) => handleFilesChange(e.target.files)}
              />
              <button
                type="button"
                disabled={saving || maxAllowed <= 0}
                onClick={() => fileInputRef.current?.click()}
                className="mt-1.5 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 hover:border-violet-400 hover:bg-violet-50 text-sm font-semibold text-gray-700 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                Elegir archivos
              </button>
              {files.length > 0 ? (
                <ul className="mt-2 space-y-1 max-h-28 overflow-y-auto">
                  {files.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex items-center justify-between gap-2 text-xs bg-gray-50 rounded-lg px-2.5 py-1.5"
                    >
                      <span className="truncate font-medium text-gray-800">{f.name}</span>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-red-600 hover:underline shrink-0"
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {progress ? (
              <p className="text-xs text-violet-700 font-medium flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {progress}
              </p>
            ) : null}
          </div>

          <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap justify-end gap-2 shrink-0">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving || (isAppendMode ? !files.length : !canSaveCreate)}
              onClick={() => void handleSaveOnly()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {isAppendMode ? 'Agregar' : 'Solo guardar'}
            </button>
            {!isAppendMode ? (
              <button
                type="button"
                disabled={saving || !canSaveCreate}
                onClick={() => void handleSaveAndSchedule()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CalendarClock className="w-4 h-4" />
                )}
                Guardar y programar
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <ScheduleRawFullPublishModal
        isOpen={scheduleOpen}
        onClose={() => {
          setScheduleOpen(false)
          onClose()
        }}
        folderId={createdFolderId}
        videoPath={createdPaths[0] ?? null}
        initialCaption={caption}
        initialVehicleId={vehicleId || null}
        onScheduled={() => {
          setScheduleOpen(false)
          onScheduled?.()
          onClose()
        }}
      />
    </>
  )
}
