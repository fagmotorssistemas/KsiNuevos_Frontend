'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarClock, CheckCircle2, History, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { scriptsService } from '@/services/scripts.service'
import type { MonthOverviewItem, ScheduleLogEntry } from '@/types/script-assignment'

type Props = {
  item: MonthOverviewItem | null
  onClose: () => void
  onRescheduled: () => void
}

function formatFecha(ymd: string) {
  const d = new Date(`${ymd}T12:00:00`)
  return format(d, "d 'de' MMMM yyyy", { locale: es })
}

function userLabel(entry: ScheduleLogEntry) {
  const p = entry.profiles
  return p?.full_name?.trim() || 'Usuario'
}

export function GuionesAssignmentSlotModal({ item, onClose, onRescheduled }: Props) {
  const [fechaDestino, setFechaDestino] = useState('')
  const [justificacion, setJustificacion] = useState('')
  const [saving, setSaving] = useState(false)
  const [log, setLog] = useState<ScheduleLogEntry[]>([])
  const [loadingLog, setLoadingLog] = useState(false)

  const canReschedule =
    item &&
    !item.readonly &&
    !item.reel_cumplido &&
    item.reprogramaciones_count < 2

  useEffect(() => {
    if (!item) return
    setFechaDestino(item.fecha_programada)
    setJustificacion('')
    setLoadingLog(true)
    scriptsService
      .getAssignmentScheduleLog(item.assignment_id)
      .then(setLog)
      .catch(() => setLog([]))
      .finally(() => setLoadingLog(false))
  }, [item])

  const handleReschedule = useCallback(async () => {
    if (!item || !canReschedule) return
    if (fechaDestino === item.fecha_programada) {
      toast.error('Elige una fecha distinta a la programada actual')
      return
    }
    if (justificacion.trim().length < 10) {
      toast.error('Escribe una justificación de al menos 10 caracteres')
      return
    }
    setSaving(true)
    try {
      await scriptsService.rescheduleAssignment(
        item.assignment_id,
        fechaDestino,
        justificacion.trim()
      )
      toast.success('Reel reprogramado')
      onRescheduled()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo reprogramar')
    } finally {
      setSaving(false)
    }
  }, [canReschedule, fechaDestino, item, justificacion, onClose, onRescheduled])

  if (!item) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-wide text-violet-700">
              {item.readonly ? 'Histórico' : 'Asignación de grabación'}
            </p>
            <h3 className="text-lg font-extrabold text-gray-900 mt-1 leading-snug">
              {item.vehicle_label}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Día en calendario: <strong>{formatFecha(item.fecha)}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 shrink-0"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
            Los ajustes manuales dependen del usuario que los registró. Toda reprogramación
            requiere justificante.
          </p>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
              <p className="text-[10px] font-bold uppercase text-gray-500">Guión</p>
              <p className="font-bold text-gray-900 mt-0.5">
                {item.guion_generado ? 'Generado' : 'Pendiente'}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
              <p className="text-[10px] font-bold uppercase text-gray-500">Reel subido</p>
              <p className="font-bold text-gray-900 mt-0.5 flex items-center gap-1.5">
                {item.reel_cumplido ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Cumplido
                  </>
                ) : (
                  'Pendiente'
                )}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 col-span-2">
              <p className="text-[10px] font-bold uppercase text-gray-500">Fecha original (cron)</p>
              <p className="font-semibold text-gray-800 mt-0.5">
                {formatFecha(item.fecha_asignacion_original)}
              </p>
            </div>
          </div>

          {item.sombreado && (
            <p className="text-xs text-gray-600 bg-gray-100 rounded-lg px-3 py-2">
              Este vehículo no se grabó el día original y queda visible sombreado como referencia.
            </p>
          )}

          {canReschedule && (
            <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
              <div className="flex items-center gap-2 text-violet-900">
                <CalendarClock className="h-4 w-4 shrink-0" />
                <p className="text-sm font-extrabold">Mover grabación a otro día</p>
              </div>
              <p className="text-xs text-violet-800/90">
                Reprogramaciones usadas: {item.reprogramaciones_count} / 2. El día original seguirá
                visible sombreado hasta que subas el reel en Videos.
              </p>
              <label className="block text-xs font-bold text-gray-700">
                Nueva fecha
                <input
                  type="date"
                  value={fechaDestino}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => setFechaDestino(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold"
                />
              </label>
              <label className="block text-xs font-bold text-gray-700">
                Justificación (obligatoria)
                <textarea
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                  rows={3}
                  placeholder="Ej.: No hubo espacio en taller / vendedor no disponible…"
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-y"
                />
              </label>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleReschedule()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-700 text-white text-sm font-bold hover:bg-violet-800 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirmar reprogramación
              </button>
            </div>
          )}

          {item.readonly && (
            <p className="text-xs text-gray-500 italic">
              Mes archivado: solo consulta. No se pueden hacer reprogramaciones.
            </p>
          )}

          <div>
            <div className="flex items-center gap-2 mb-2">
              <History className="h-4 w-4 text-gray-500" />
              <p className="text-xs font-extrabold uppercase text-gray-500">Historial de ajustes</p>
            </div>
            {loadingLog ? (
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando…
              </p>
            ) : log.length === 0 ? (
              <p className="text-sm text-gray-500">Sin reprogramaciones registradas.</p>
            ) : (
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {log.map((entry) => (
                  <li
                    key={entry.id}
                    className="text-xs rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                  >
                    <p className="font-bold text-gray-800">
                      {formatFecha(entry.fecha_origen)} → {formatFecha(entry.fecha_destino)}
                    </p>
                    <p className="text-gray-600 mt-1">{entry.justificacion}</p>
                    <p className="text-gray-400 mt-1">
                      {userLabel(entry)} ·{' '}
                      {format(new Date(entry.created_at), "d MMM yyyy HH:mm", { locale: es })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
