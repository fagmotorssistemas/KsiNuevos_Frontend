'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Inbox,
  Loader2,
  RefreshCw,
  Trash2,
  Tag,
  Upload,
  X,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatBytes } from '@/lib/videos/resolve-job-vehicle'
import type { MarketingInboxVideoItem } from '@/lib/videos/marketing-inbox-videos-types'
import {
  RAW_FULL_CAPTION_FORMATOS,
  buildRawFullCaption,
  type CaptionVehicleBits,
  type RawFullCaptionFormato,
} from '@/lib/videos/raw-full-caption-templates'
import {
  VehicleInventoryPicker,
  type InventoryPickerRow,
} from '@/components/videos/VehicleInventoryPicker'

type InvDetail = InventoryPickerRow & {
  engine_displacement?: string | null
  fuel_type?: string | null
  type?: string | null
  type_body?: string | null
  mileage?: number | null
  version?: string | null
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

function formatUploadDay(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-EC', {
      timeZone: 'America/Guayaquil',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

export function MarketingInboxVideosPanel({
  refreshKey = 0,
  onRequestUpload,
  onAssigned,
}: {
  refreshKey?: number
  onRequestUpload?: () => void
  onAssigned?: () => void
}) {
  const [videos, setVideos] = useState<MarketingInboxVideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [preview, setPreview] = useState<MarketingInboxVideoItem | null>(null)
  const [assignTarget, setAssignTarget] = useState<MarketingInboxVideoItem | null>(null)
  const [inventoryRows, setInventoryRows] = useState<InvDetail[]>([])
  const [loadingInventory, setLoadingInventory] = useState(false)
  const [formato, setFormato] = useState<RawFullCaptionFormato>('video_autos')
  const [vehicleId, setVehicleId] = useState('')
  const [caption, setCaption] = useState('')
  const [assigning, setAssigning] = useState(false)

  const formatoMeta = useMemo(
    () => RAW_FULL_CAPTION_FORMATOS.find((f) => f.id === formato)!,
    [formato]
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/videos/inbox', { credentials: 'include' })
      const data = (await res.json()) as { videos?: MarketingInboxVideoItem[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setVideos(data.videos ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cargar la bandeja')
      setVideos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  useEffect(() => {
    if (!assignTarget) return
    let cancelled = false
    setLoadingInventory(true)
    const supabase = createClient()
    void supabase
      .from('inventoryoracle')
      .select(
        'id, brand, model, year, plate, version, engine_displacement, fuel_type, type, type_body, mileage'
      )
      .eq('status', 'disponible')
      .order('updated_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) toast.error('No se pudo cargar el inventario')
        else setInventoryRows((data ?? []) as InvDetail[])
        setLoadingInventory(false)
      })
    return () => {
      cancelled = true
    }
  }, [assignTarget])

  useEffect(() => {
    if (!assignTarget) return
    const v1 = inventoryRows.find((r) => r.id === vehicleId) ?? null
    setCaption(
      buildRawFullCaption({
        formato,
        vehicle: toCaptionBits(v1),
      })
    )
  }, [assignTarget, formato, vehicleId, inventoryRows])

  function openAssign(item: MarketingInboxVideoItem) {
    setFormato('video_autos')
    setVehicleId('')
    setCaption('')
    setAssignTarget(item)
  }

  async function handleDelete(item: MarketingInboxVideoItem) {
    if (!confirm(`¿Eliminar "${item.originalFilename}" de la bandeja?`)) return
    setBusyId(item.id)
    try {
      const res = await fetch(`/api/videos/inbox/${item.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'No se pudo eliminar')
      toast.success('Video eliminado')
      if (preview?.id === item.id) setPreview(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar')
    } finally {
      setBusyId(null)
    }
  }

  async function handleAssign() {
    if (!assignTarget) return
    if (formatoMeta.vehiclesRequired >= 1 && !vehicleId.trim()) {
      toast.error('Selecciona el vehículo')
      return
    }
    setAssigning(true)
    try {
      const res = await fetch(`/api/videos/inbox/${assignTarget.id}/assign`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formato,
          inventory_vehicle_id: formatoMeta.vehiclesAllowed >= 1 && vehicleId.trim() ? vehicleId.trim() : null,
          caption: caption.trim() || null,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'No se pudo asignar')
      toast.success('Video asignado')
      if (preview?.id === assignTarget.id) setPreview(null)
      setAssignTarget(null)
      onAssigned?.()
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al asignar')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-violet-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">Bandeja de material</h2>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            Videos subidos sin destino. Elige cada uno y asígnalo al carro o a la sección que corresponda.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          {onRequestUpload ? (
            <button
              type="button"
              onClick={onRequestUpload}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold"
            >
              <Upload className="w-4 h-4" />
              Subir material
            </button>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 w-fit">
        <p className="text-[11px] font-bold uppercase text-gray-500">Sin asignar</p>
        <p className="text-xl font-extrabold text-gray-900 mt-0.5">{loading ? '—' : videos.length}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      ) : videos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <Inbox className="w-10 h-10 text-gray-300 mx-auto" />
          <p className="mt-3 font-bold text-gray-800">Bandeja vacía</p>
          <p className="text-sm text-gray-500 mt-1">
            Usa Subir material para cargar videos sin elegir auto ni sección.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm flex flex-col gap-3"
            >
              <button
                type="button"
                onClick={() => setPreview(item)}
                className="relative aspect-video rounded-xl bg-black overflow-hidden"
              >
                {item.signedUrl ? (
                  <video
                    src={item.signedUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/70 text-xs">
                    Sin preview
                  </div>
                )}
              </button>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 truncate text-sm" title={item.originalFilename}>
                  {item.originalFilename}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatUploadDay(item.createdAt)}
                  {item.sizeBytes != null ? ` · ${formatBytes(item.sizeBytes)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => openAssign(item)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  <Tag className="w-3.5 h-3.5" />
                  Asignar
                </button>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => void handleDelete(item)}
                  className="w-9 h-9 rounded-xl border border-gray-200 text-red-600 hover:bg-red-50 flex items-center justify-center disabled:opacity-50"
                  aria-label="Eliminar"
                >
                  {busyId === item.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview ? (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-3xl bg-black rounded-2xl overflow-hidden relative">
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-xl bg-white/90 hover:bg-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            {preview.signedUrl ? (
              <video src={preview.signedUrl} className="w-full max-h-[80vh]" controls autoPlay playsInline />
            ) : (
              <p className="text-white text-center py-16">No hay URL de preview</p>
            )}
            <p className="text-white/80 text-xs px-4 py-3 truncate">{preview.originalFilename}</p>
          </div>
        </div>
      ) : null}

      {assignTarget ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-gray-900">Asignar video</h2>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{assignTarget.originalFilename}</p>
              </div>
              <button
                type="button"
                disabled={assigning}
                onClick={() => setAssignTarget(null)}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                  Sección / formato
                </label>
                <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {RAW_FULL_CAPTION_FORMATOS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      disabled={assigning}
                      onClick={() => {
                        setFormato(f.id)
                        if (f.vehiclesAllowed < 1) setVehicleId('')
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

              {formatoMeta.vehiclesAllowed >= 1 ? (
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                    {formatoMeta.vehiclesRequired === 0 ? 'Vehículo (opcional)' : 'Vehículo'}
                  </label>
                  <div className="mt-1.5">
                    <VehicleInventoryPicker
                      vehicleId={vehicleId}
                      onSelect={setVehicleId}
                      rows={inventoryRows}
                      loading={loadingInventory}
                      disabled={assigning}
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
                    disabled={assigning}
                    onClick={() => {
                      const v1 = inventoryRows.find((r) => r.id === vehicleId) ?? null
                      setCaption(buildRawFullCaption({ formato, vehicle: toCaptionBits(v1) }))
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-700 hover:text-violet-900"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Regenerar copy
                  </button>
                </div>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  disabled={assigning}
                  rows={6}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs text-gray-900 font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                disabled={assigning}
                onClick={() => setAssignTarget(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={assigning || (formatoMeta.vehiclesRequired >= 1 && !vehicleId.trim())}
                onClick={() => void handleAssign()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold disabled:opacity-50"
              >
                {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                Asignar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
