'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Loader2,
  Play,
  Plus,
  Settings,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { parseJsonOrThrow } from '@/lib/safe-fetch-json'
import {
  DAY_KEYS,
  DAY_LABELS,
  formatNextRunDisplay,
  type DayKey,
} from '@/lib/noticiero/auto-publish-schedule'
import type {
  NoticieroConfig,
  NoticieroCreativeMode,
  NoticieroDayContentType,
  NoticieroHistory,
  NoticieroVehicleOrder,
} from '@/lib/noticiero/types'
import { NOTICIERO_AVATARS } from '../config/avatars'
import { GenerationProgress } from '../components/GenerationProgress'
import {
  NoticieroHistoryDetailModal,
  NoticieroHistoryTable,
  historyTitle,
} from '../components/NoticieroHistoryPanel'
import { useAutoPublishRunner } from '../hooks/useAutoPublishRunner'

const VEHICLE_ORDER_OPTIONS: { value: NoticieroVehicleOrder; label: string }[] = [
  { value: 'price_desc', label: 'Más caros primero' },
  { value: 'price_asc', label: 'Más baratos primero' },
  { value: 'newest', label: 'Recién ingresados' },
  { value: 'is_featured', label: 'Más destacados' },
  { value: 'mileage_desc', label: 'Mayor kilometraje primero' },
  { value: 'mileage_asc', label: 'Menor kilometraje primero' },
]

const CREATIVE_MODE_OPTIONS: { value: NoticieroCreativeMode; label: string }[] = [
  { value: 'predefined', label: 'Temas predefinidos' },
  { value: 'gemini_auto', label: 'Gemini automático' },
  { value: 'both', label: 'Ambos alternando' },
]

type FormState = {
  is_active: boolean
  publish_time: string
  publish_days: DayKey[]
  day_type_config: Record<DayKey, NoticieroDayContentType>
  vehicle_order: NoticieroVehicleOrder
  creative_mode: NoticieroCreativeMode
  creative_topics: string[]
  avatar_rotation: string[]
}

function configToForm(config: NoticieroConfig): FormState {
  const dayType = config.day_type_config as Record<string, NoticieroDayContentType>
  const day_type_config = {} as Record<DayKey, NoticieroDayContentType>
  for (const key of DAY_KEYS) {
    day_type_config[key] = dayType[key] ?? 'vehicle'
  }
  return {
    is_active: config.is_active,
    publish_time: config.publish_time,
    publish_days: config.publish_days.filter((d): d is DayKey => DAY_KEYS.includes(d as DayKey)),
    day_type_config,
    vehicle_order: config.vehicle_order,
    creative_mode: config.creative_mode,
    creative_topics: [...config.creative_topics],
    avatar_rotation: [...config.avatar_rotation],
  }
}

export default function NoticieroConfiguracionPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configMeta, setConfigMeta] = useState<Pick<
    NoticieroConfig,
    'id' | 'last_run_at' | 'next_run_at'
  > | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [history, setHistory] = useState<NoticieroHistory[]>([])
  const [selectedHistory, setSelectedHistory] = useState<NoticieroHistory | null>(null)
  const [newTopic, setNewTopic] = useState('')
  const [runningManual, setRunningManual] = useState(false)

  const loadHistory = useCallback(async () => {
    const res = await fetch('/api/marketing/noticiero/history')
    const data = await parseJsonOrThrow<{ items?: NoticieroHistory[]; error?: string }>(res)
    if (!res.ok) throw new Error(data.error ?? 'Error cargando historial')
    setHistory(data.items ?? [])
  }, [])

  const loadConfig = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/marketing/noticiero/config')
      const data = await parseJsonOrThrow<NoticieroConfig & { error?: string }>(res)
      if (!res.ok) throw new Error(data.error ?? 'Error cargando configuración')
      setConfigMeta({
        id: data.id,
        last_run_at: data.last_run_at,
        next_run_at: data.next_run_at,
      })
      setForm(configToForm(data))
      await loadHistory()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [loadHistory])

  useEffect(() => {
    void loadConfig()
  }, [loadConfig])

  const refreshAfterRun = useCallback(() => {
    void loadConfig()
    void loadHistory()
  }, [loadConfig, loadHistory])

  const { isRunning, pipelineStep, pipelineError, startRun } = useAutoPublishRunner(refreshAfterRun)

  const lastPublication = useMemo(() => {
    const last = history.find((h) => h.status === 'completed' || h.status === 'error')
    if (!last) return null
    const typeLabel = last.content_type === 'vehicle' ? 'Vehículo' : 'Creativo'
    const date = new Date(last.published_at).toLocaleString('es-EC', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    return `${date} · ${typeLabel} · ${historyTitle(last)}`
  }, [history])

  const enabledAvatars = useMemo(() => {
    if (!form) return []
    return NOTICIERO_AVATARS.filter((a) => form.avatar_rotation.includes(a.id))
  }, [form])

  function toggleDay(day: DayKey) {
    if (!form) return
    const active = form.publish_days.includes(day)
    const publish_days = active
      ? form.publish_days.filter((d) => d !== day)
      : [...form.publish_days, day]
    setForm({ ...form, publish_days })
  }

  function moveAvatar(id: string, direction: 'up' | 'down') {
    if (!form) return
    const order = [...form.avatar_rotation]
    const idx = order.indexOf(id)
    if (idx < 0) return
    const swap = direction === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= order.length) return
    ;[order[idx], order[swap]] = [order[swap], order[idx]]
    setForm({ ...form, avatar_rotation: order })
  }

  function toggleAvatar(id: string) {
    if (!form) return
    const inRotation = form.avatar_rotation.includes(id)
    const avatar_rotation = inRotation
      ? form.avatar_rotation.filter((a) => a !== id)
      : [...form.avatar_rotation, id]
    setForm({ ...form, avatar_rotation })
  }

  function addTopic() {
    if (!form) return
    const topic = newTopic.trim()
    if (!topic) return
    setForm({ ...form, creative_topics: [...form.creative_topics, topic] })
    setNewTopic('')
  }

  function removeTopic(index: number) {
    if (!form) return
    setForm({
      ...form,
      creative_topics: form.creative_topics.filter((_, i) => i !== index),
    })
  }

  async function handleSave() {
    if (!form || !configMeta) return

    if (form.publish_days.length === 0) {
      toast.error('Selecciona al menos un día de publicación')
      return
    }
    if (form.avatar_rotation.length === 0) {
      toast.error('Selecciona al menos un avatar en la rotación')
      return
    }
    if (form.creative_topics.length < 3) {
      toast.error('Se requieren al menos 3 temas creativos')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/marketing/noticiero/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: form.is_active,
          publish_time: form.publish_time,
          publish_days: form.publish_days,
          day_type_config: form.day_type_config,
          vehicle_order: form.vehicle_order,
          creative_mode: form.creative_mode,
          creative_topics: form.creative_topics,
          avatar_rotation: form.avatar_rotation,
        }),
      })
      const data = await parseJsonOrThrow<NoticieroConfig & { error?: string }>(res)
      if (!res.ok) throw new Error(data.error ?? 'Error guardando')

      setConfigMeta({
        id: data.id,
        last_run_at: data.last_run_at,
        next_run_at: data.next_run_at,
      })
      setForm(configToForm(data))
      toast.success('Configuración guardada correctamente')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleManualRun() {
    setRunningManual(true)
    try {
      await startRun()
      toast.message('Publicación iniciada. Sigue el progreso abajo.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo ejecutar')
    } finally {
      setRunningManual(false)
    }
  }

  if (loading || !form) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Cargando configuración...
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-28">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/marketing/noticiero"
            className="inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-800 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al noticiero
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Settings className="w-5 h-5 text-white" />
            </div>
            Configuración · Publicación automática
          </h1>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl">
            Programa publicaciones automáticas en Instagram y Facebook. El cron de Vercel corre en
            UTC (9:00 AM Ecuador = 14:00 UTC).
          </p>
        </div>
      </div>

      {/* SECCIÓN 1 — Estado del sistema */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
        <h2 className="text-base font-bold text-gray-900">Estado del sistema</h2>

        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="sr-only peer"
            />
            <span className="relative w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-violet-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5" />
            <span className="text-sm font-medium text-gray-700">Publicación automática</span>
          </label>

          <span
            className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
              form.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {form.is_active ? 'Activo' : 'Pausado'}
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
            <p className="text-violet-600 font-bold text-xs uppercase mb-1">Próxima publicación</p>
            <p className="text-gray-900 font-medium">
              {formatNextRunDisplay(configMeta?.next_run_at ?? null)}
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-gray-500 font-bold text-xs uppercase mb-1">Última publicación</p>
            <p className="text-gray-900 font-medium">{lastPublication ?? 'Sin registros aún'}</p>
          </div>
        </div>

        <button
          type="button"
          disabled={isRunning || runningManual}
          onClick={() => void handleManualRun()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl"
        >
          {isRunning || runningManual ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Ejecutando...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Ejecutar ahora manualmente
            </>
          )}
        </button>

        {(isRunning || pipelineStep === 'done' || pipelineStep === 'error') && (
          <GenerationProgress currentStep={pipelineStep} error={pipelineError} />
        )}
      </section>

      {/* SECCIÓN 2 — Horario */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
        <h2 className="text-base font-bold text-gray-900">Horario de publicación</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hora (Ecuador)</label>
          <input
            type="time"
            value={form.publish_time}
            onChange={(e) => setForm({ ...form, publish_time: e.target.value })}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Días activos</p>
          <div className="flex flex-wrap gap-3">
            {DAY_KEYS.map((day) => (
              <label key={day} className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.publish_days.includes(day)}
                  onChange={() => toggleDay(day)}
                  className="rounded border-gray-300 text-violet-600"
                />
                {DAY_LABELS[day]}
              </label>
            ))}
          </div>

          {form.publish_days.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs text-gray-500">Tipo de contenido por día activo</p>
              {form.publish_days.map((day) => (
                <div key={day} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="w-24 font-medium text-gray-700">{DAY_LABELS[day]}</span>
                  <select
                    value={form.day_type_config[day]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        day_type_config: {
                          ...form.day_type_config,
                          [day]: e.target.value as NoticieroDayContentType,
                        },
                      })
                    }
                    className="border border-gray-200 rounded-lg px-3 py-1.5"
                  >
                    <option value="vehicle">Vehículo del inventario</option>
                    <option value="creative">Tema creativo</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECCIÓN 3 — Vehículos */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900">Configuración de vehículos</h2>
        <select
          value={form.vehicle_order}
          onChange={(e) =>
            setForm({ ...form, vehicle_order: e.target.value as NoticieroVehicleOrder })
          }
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-full max-w-md"
        >
          {VEHICLE_ORDER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-500">
          Los vehículos se irán publicando en este orden, sin repetir hasta completar todo el
          inventario disponible.
        </p>
      </section>

      {/* SECCIÓN 4 — Temas creativos */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900">Configuración de temas creativos</h2>

        <div className="flex flex-wrap gap-2">
          {CREATIVE_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setForm({ ...form, creative_mode: opt.value })}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                form.creative_mode === opt.value
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {form.creative_topics.map((topic, i) => (
            <span
              key={`${topic}-${i}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-50 text-violet-900 rounded-full text-sm border border-violet-100"
            >
              {topic}
              <button
                type="button"
                onClick={() => removeTopic(i)}
                className="p-0.5 hover:bg-violet-200 rounded-full"
                aria-label="Eliminar tema"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2 max-w-xl">
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="Nuevo tema creativo..."
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTopic()
              }
            }}
          />
          <button
            type="button"
            onClick={addTopic}
            className="inline-flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold"
          >
            <Plus className="w-4 h-4" />
            Agregar tema
          </button>
        </div>
        <p className="text-xs text-gray-500">Mínimo 3 temas requeridos ({form.creative_topics.length}/3)</p>
      </section>

      {/* SECCIÓN 5 — Avatares */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900">Rotación de avatares</h2>
        <p className="text-sm text-gray-500">
          Los avatares se rotarán en este orden en cada publicación.
        </p>

        <ul className="space-y-2">
          {NOTICIERO_AVATARS.map((avatar) => {
            const active = form.avatar_rotation.includes(avatar.id)
            const orderIdx = form.avatar_rotation.indexOf(avatar.id)
            return (
              <li
                key={avatar.id}
                className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleAvatar(avatar.id)}
                  className="rounded border-gray-300 text-violet-600"
                />
                <span className="font-medium text-gray-900 w-24">{avatar.name}</span>
                {active && (
                  <>
                    <span className="text-xs text-gray-500">Orden: {orderIdx + 1}</span>
                    <button
                      type="button"
                      disabled={orderIdx <= 0}
                      onClick={() => moveAvatar(avatar.id, 'up')}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={orderIdx >= form.avatar_rotation.length - 1}
                      onClick={() => moveAvatar(avatar.id, 'down')}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>

        {enabledAvatars.length > 0 && (
          <p className="text-xs text-violet-700">
            Rotación actual: {enabledAvatars.map((a) => a.name).join(' → ')}
          </p>
        )}
      </section>

      {/* SECCIÓN 6 — Historial */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900">Historial de publicaciones</h2>
        <NoticieroHistoryTable items={history} onSelect={setSelectedHistory} />
      </section>

      <NoticieroHistoryDetailModal row={selectedHistory} onClose={() => setSelectedHistory(null)} />

      {/* Botón fijo guardar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-4">
        <div className="max-w-5xl mx-auto flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar configuración'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
