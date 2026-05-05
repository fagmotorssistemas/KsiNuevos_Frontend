'use client'

import { useCallback, useEffect, useState } from 'react'
import { X, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { VideoJobV2 } from '@/lib/videos-v2/types'
import { ecuadorLocalDateTimeToUtcIso, utcIsoToEcuadorDateAndTime } from '@/lib/videos-v2/ecuador-time'

type InventoryOracleRow = {
  id: string
  brand: string
  model: string
  year: number
  version: string | null
  engine_displacement: string | null
  engine_type: string | null
  fuel_type: string | null
  transmission: string | null
  drive_type: string | null
  type: string | null
  type_body: string | null
  price: number | null
}

export interface QueueRowLike {
  id: string
  vehicle_id: string | null
  caption: string
  platforms: string[]
  scheduled_at: string
}

interface SchedulePublishModalProps {
  isOpen: boolean
  onClose: () => void
  job: VideoJobV2 | null
  mode?: 'create' | 'edit'
  initialQueue?: QueueRowLike | null
  onScheduled: () => void
}

export function SchedulePublishModal({
  isOpen,
  onClose,
  job,
  mode = 'create',
  initialQueue,
  onScheduled,
}: SchedulePublishModalProps) {
  const [vehicles, setVehicles] = useState<InventoryOracleRow[]>([])
  const [vehicleId, setVehicleId] = useState<string>('')
  const [caption, setCaption] = useState('')
  const [ig, setIg] = useState(true)
  const [fb, setFb] = useState(true)
  const [dateYmd, setDateYmd] = useState('')
  const [timeHm, setTimeHm] = useState('10:00')
  const [loadingVehicles, setLoadingVehicles] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadVehicles = useCallback(async () => {
    setLoadingVehicles(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('inventoryoracle')
        .select(
          'id, brand, model, year, version, engine_displacement, engine_type, fuel_type, transmission, drive_type, type, type_body, price'
        )
        .order('updated_at', { ascending: false })
        .limit(400)
      if (error) throw error
      setVehicles((data ?? []) as InventoryOracleRow[])
    } catch (e) {
      console.error(e)
      toast.error('No se pudo cargar inventario')
    } finally {
      setLoadingVehicles(false)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    loadVehicles()
  }, [isOpen, loadVehicles])

  useEffect(() => {
    if (!isOpen || !initialQueue || mode !== 'edit') return
    setVehicleId(initialQueue.vehicle_id ?? '')
    setCaption(initialQueue.caption)
    setIg(initialQueue.platforms.includes('instagram'))
    setFb(initialQueue.platforms.includes('facebook'))
    const { dateYmd: dy, timeHm: th } = utcIsoToEcuadorDateAndTime(initialQueue.scheduled_at)
    setDateYmd(dy)
    setTimeHm(th)
  }, [isOpen, initialQueue, mode])

  useEffect(() => {
    if (!isOpen || mode !== 'create') return
    setVehicleId('')
    setCaption('')
    setIg(true)
    setFb(true)
    const future = new Date(Date.now() + 30 * 60 * 1000)
    const { dateYmd: dy, timeHm: th } = utcIsoToEcuadorDateAndTime(future.toISOString())
    setDateYmd(dy)
    setTimeHm(th)
  }, [isOpen, mode, job?.id])

  async function handleGenerateCaption() {
    if (!vehicleId) {
      toast.error('Selecciona un vehículo')
      return
    }
    const v = vehicles.find((x) => x.id === vehicleId)
    if (!v) return
    setGenerating(true)
    try {
      const motorParts = [v.engine_displacement, v.engine_type, v.fuel_type].filter(Boolean).join(' ')
      const res = await fetch('/api/videos-v2/caption/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marca: v.brand,
          modelo: v.model,
          version: v.version ?? '',
          año: v.year,
          motor: motorParts || '—',
          transmision: v.transmission ?? '—',
          traccion: v.drive_type ?? '—',
          tipo: v.type ?? v.type_body ?? '—',
        }),
      })
      const data = (await res.json()) as { caption?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Error')
      if (data.caption) setCaption(data.caption)
      toast.success('Caption generado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!job) return
    if (!vehicleId) {
      toast.error('Selecciona vehículo')
      return
    }
    if (!caption.trim()) {
      toast.error('Caption requerido')
      return
    }
    const platforms: string[] = []
    if (ig) platforms.push('instagram')
    if (fb) platforms.push('facebook')
    if (platforms.length === 0) {
      toast.error('Elige al menos una red')
      return
    }
    let scheduledIso: string
    try {
      scheduledIso = ecuadorLocalDateTimeToUtcIso(dateYmd, timeHm)
    } catch {
      toast.error('Fecha u hora inválida')
      return
    }
    if (new Date(scheduledIso).getTime() < Date.now() - 15_000) {
      toast.error('No puedes programar en el pasado (hora Ecuador)')
      return
    }

    setSaving(true)
    try {
      if (mode === 'edit' && initialQueue) {
        const res = await fetch(`/api/videos-v2/publish/queue/${initialQueue.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caption: caption.trim(),
            platforms,
            scheduledAt: scheduledIso,
          }),
        })
        const data = (await res.json()) as { error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Error')
        toast.success('Cola actualizada')
      } else {
        const res = await fetch('/api/videos-v2/publish/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: job.id,
            vehicleId,
            caption: caption.trim(),
            platforms,
            scheduledAt: scheduledIso,
          }),
        })
        const data = (await res.json()) as { error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Error')
        toast.success('Publicación programada')
      }
      onScheduled()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !job) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {mode === 'edit' ? 'Editar publicación' : 'Programar publicación'}
          </h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Vehículo (inventoryoracle)</label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
              disabled={loadingVehicles}
            >
              <option value="">{loadingVehicles ? 'Cargando…' : 'Seleccionar…'}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} {v.year}
                  {v.version ? ` · ${v.version}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!vehicleId || generating}
              onClick={handleGenerateCaption}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-40"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generar caption con IA
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={12}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono leading-relaxed"
              placeholder="Genera con IA o escribe a mano…"
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ig} onChange={(e) => setIg(e.target.checked)} />
              Instagram
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={fb} onChange={(e) => setFb(e.target.checked)} />
              Facebook
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha (Ecuador)</label>
              <input
                type="date"
                value={dateYmd}
                onChange={(e) => setDateYmd(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Hora (Ecuador)</label>
              <input
                type="time"
                value={timeHm}
                onChange={(e) => setTimeHm(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">Zona horaria: America/Guayaquil (GMT−5). Se guarda en UTC en base de datos.</p>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-200">
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 inline-flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {mode === 'edit' ? 'Guardar' : 'Programar'}
          </button>
        </div>
      </div>
    </div>
  )
}
