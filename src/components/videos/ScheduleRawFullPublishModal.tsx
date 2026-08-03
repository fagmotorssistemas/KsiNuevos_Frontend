'use client'

import { useEffect, useState } from 'react'
import { Calendar, Clock, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { ecuadorLocalDateTimeToUtcIso, utcIsoToEcuadorDateAndTime } from '@/lib/videos/ecuador-time'

interface ScheduleRawFullPublishModalProps {
  isOpen: boolean
  onClose: () => void
  folderId: string | null
  videoPath: string | null
  initialCaption: string
  initialVehicleId?: string | null
  onScheduled: () => void
}

export function ScheduleRawFullPublishModal({
  isOpen,
  onClose,
  folderId,
  videoPath,
  initialCaption,
  initialVehicleId = null,
  onScheduled,
}: ScheduleRawFullPublishModalProps) {
  const [caption, setCaption] = useState(initialCaption)
  const [ig, setIg] = useState(true)
  const [fb, setFb] = useState(true)
  const [dateYmd, setDateYmd] = useState('')
  const [timeHm, setTimeHm] = useState('10:00')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setCaption(initialCaption)
    setIg(true)
    setFb(true)
    const future = new Date(Date.now() + 30 * 60 * 1000)
    const { dateYmd: dy, timeHm: th } = utcIsoToEcuadorDateAndTime(future.toISOString())
    setDateYmd(dy)
    setTimeHm(th)
  }, [isOpen, initialCaption])

  async function handleSave() {
    if (!folderId || !videoPath) {
      toast.error('Falta el video a programar')
      return
    }
    if (!caption.trim()) {
      toast.error('Caption requerido')
      return
    }
    const platforms: string[] = []
    if (ig) platforms.push('instagram')
    if (fb) platforms.push('facebook')
    if (!platforms.length) {
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
      const res = await fetch('/api/videos/raw-full/library/schedule', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId,
          videoPath,
          caption: caption.trim(),
          platforms,
          scheduledAt: scheduledIso,
          vehicleId: initialVehicleId,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'No se pudo programar')
      toast.success('Publicación programada (misma cola que Videos)')
      onScheduled()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al programar')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !folderId || !videoPath) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Programar publicación</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-900">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={8}
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs leading-relaxed"
            />
          </div>

          <div className="flex gap-4">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
              <input type="checkbox" checked={ig} onChange={(e) => setIg(e.target.checked)} />
              Instagram
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
              <input type="checkbox" checked={fb} onChange={(e) => setFb(e.target.checked)} />
              Facebook
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Fecha (Ecuador)
              </label>
              <input
                type="date"
                value={dateYmd}
                onChange={(e) => setDateYmd(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Hora
              </label>
              <input
                type="time"
                value={timeHm}
                onChange={(e) => setTimeHm(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Programar
          </button>
        </div>
      </div>
    </div>
  )
}
