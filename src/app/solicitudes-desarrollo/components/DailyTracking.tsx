'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, CheckCircle2, ClipboardList, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { twMerge } from 'tailwind-merge'

type TrackingStatus = 'pendiente' | 'en_progreso' | 'en_pruebas' | 'bloqueado' | 'terminado'

interface TrackingEntry {
  id: string
  titulo: string
  fecha: string
  responsable: string
  proyecto: string
  estado: TrackingStatus
  avances: string
  pendientes: string
  bloqueos: string
  proximoPaso: string
  fechaEntrega: string
}

const STORAGE_KEY = 'ksi:dev-daily-tracking'

const TEAM = [
  { nombre: 'Darwin', proyecto: 'SKYTRACK' },
  { nombre: 'Pablo', proyecto: 'Página web' },
  { nombre: 'Carlos', proyecto: 'Automatización' },
]

const PROJECTS = TEAM.map((t) => t.proyecto)

const STATUS_META: Record<TrackingStatus, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-slate-100 text-slate-700' },
  en_progreso: { label: 'En progreso', className: 'bg-blue-100 text-blue-700' },
  en_pruebas: { label: 'En pruebas', className: 'bg-amber-100 text-amber-800' },
  bloqueado: { label: 'Bloqueado', className: 'bg-red-100 text-red-700' },
  terminado: { label: 'Terminado', className: 'bg-emerald-100 text-emerald-700' },
}

const PROJECT_STYLES: Record<string, string> = {
  SKYTRACK: 'bg-violet-100 text-violet-700',
  'Página web': 'bg-sky-100 text-sky-700',
  Automatización: 'bg-teal-100 text-teal-700',
}

const DAILY_QUESTIONS = [
  '¿Qué terminaste hoy y cómo comprobaste que funciona?',
  '¿Qué quedó pendiente?',
  '¿Qué problema te impidió avanzar, si lo hubo?',
  '¿Qué vas a entregar mañana?',
]

const today = () => new Date().toISOString().slice(0, 10)

const formatDate = (iso: string) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const emptyEntry = (): Omit<TrackingEntry, 'id'> => ({
  titulo: '',
  fecha: today(),
  responsable: TEAM[0].nombre,
  proyecto: TEAM[0].proyecto,
  estado: 'en_progreso',
  avances: '',
  pendientes: '',
  bloqueos: '',
  proximoPaso: '',
  fechaEntrega: '',
})

const seedEntries = (): TrackingEntry[] => [
  {
    id: 'seed-darwin',
    titulo: 'Respaldo de base de datos',
    fecha: today(),
    responsable: 'Darwin',
    proyecto: 'SKYTRACK',
    estado: 'en_pruebas',
    avances: 'Se implementó el respaldo de la base de datos y se verificó la generación del archivo.',
    pendientes: 'Falta probar la restauración de los datos respaldados.',
    bloqueos: 'No se puede probar la restauración porque falta acceso al servidor.',
    proximoPaso: 'Restaurar una copia en un entorno de prueba y documentar el resultado.',
    fechaEntrega: '',
  },
  {
    id: 'seed-pablo',
    titulo: 'Secciones de la página',
    fecha: today(),
    responsable: 'Pablo',
    proyecto: 'Página web',
    estado: 'en_progreso',
    avances: 'Secciones desarrolladas y cambios visuales realizados.',
    pendientes: 'Detallar secciones pendientes y errores.',
    bloqueos: '',
    proximoPaso: 'Terminar las secciones pendientes.',
    fechaEntrega: '',
  },
  {
    id: 'seed-carlos',
    titulo: 'Flujos de automatización',
    fecha: today(),
    responsable: 'Carlos',
    proyecto: 'Automatización',
    estado: 'en_progreso',
    avances: 'Flujos desarrollados y pruebas ejecutadas.',
    pendientes: 'Registrar fallos de integración y pruebas faltantes.',
    bloqueos: '',
    proximoPaso: 'Corregir los fallos de integración detectados.',
    fechaEntrega: '',
  },
]

const loadEntries = (): TrackingEntry[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as TrackingEntry[]) : seedEntries()
  } catch {
    return seedEntries()
  }
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  )
}

function CellText({ value, tone = 'default' }: { value: string; tone?: 'default' | 'danger' }) {
  if (!value) return <span className="text-slate-300">—</span>
  return (
    <p
      className={twMerge(
        'text-xs leading-relaxed line-clamp-3',
        tone === 'danger' ? 'text-red-700' : 'text-slate-600',
      )}
      title={value}
    >
      {value}
    </p>
  )
}

export function DailyTracking() {
  const [entries, setEntries] = useState<TrackingEntry[]>(loadEntries)
  const [view, setView] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState(emptyEntry)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [entries])

  const filtered = useMemo(
    () =>
      entries
        .filter((e) => view === 'all' || e.responsable === view)
        .filter((e) => !dateFilter || e.fecha === dateFilter)
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [entries, view, dateFilter],
  )

  const stats = useMemo(
    () => ({
      total: filtered.length,
      terminados: filtered.filter((e) => e.estado === 'terminado').length,
      bloqueados: filtered.filter((e) => e.estado === 'bloqueado' || e.bloqueos.trim()).length,
    }),
    [filtered],
  )

  const update = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const handleResponsable = (nombre: string) => {
    const member = TEAM.find((t) => t.nombre === nombre)
    setDraft((d) => ({ ...d, responsable: nombre, proyecto: member?.proyecto ?? d.proyecto }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.titulo.trim() || !draft.avances.trim()) {
      toast.error('Completa al menos la tarea y los avances de hoy')
      return
    }
    setEntries((prev) => [{ ...draft, id: crypto.randomUUID() }, ...prev])
    setDraft(emptyEntry())
    setShowForm(false)
    toast.success('Reporte registrado')
  }

  const handleStatusChange = (id: string, estado: TrackingStatus) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, estado } : e)))

  const handleDelete = (id: string) => setEntries((prev) => prev.filter((e) => e.id !== id))

  const views = [{ id: 'all', label: 'Vista general' }, ...TEAM.map((t) => ({ id: t.nombre, label: t.nombre }))]

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Reportes</p>
            <p className="text-xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Terminados</p>
            <p className="text-xl font-bold text-slate-900">{stats.terminados}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Con bloqueos</p>
            <p className="text-xl font-bold text-slate-900">{stats.bloqueados}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
        <p className="text-sm font-bold text-violet-900">Al cierre de cada jornada, responde:</p>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {DAILY_QUESTIONS.map((q) => (
            <li key={q} className="text-xs text-violet-800 flex gap-2">
              <span className="text-violet-400">•</span>
              {q}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-violet-700/80">
          No marques una tarea como terminada solo porque se escribió código: registra si fue probada y si funciona.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {views.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={twMerge(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors',
                view === v.id
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300',
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={twMerge(inputClass, 'pl-9 py-1.5 w-auto')}
            />
          </div>
          {dateFilter && (
            <button
              type="button"
              onClick={() => setDateFilter('')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Limpiar
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-violet-700"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cerrar' : 'Nuevo reporte'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Tarea / reporte">
              <input
                className={inputClass}
                value={draft.titulo}
                onChange={(e) => update('titulo', e.target.value)}
                placeholder="Ej: Respaldo de base de datos"
              />
            </Field>
            <Field label="Fecha">
              <input type="date" className={inputClass} value={draft.fecha} onChange={(e) => update('fecha', e.target.value)} />
            </Field>
            <Field label="Responsable">
              <select className={inputClass} value={draft.responsable} onChange={(e) => handleResponsable(e.target.value)}>
                {TEAM.map((t) => (
                  <option key={t.nombre} value={t.nombre}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Proyecto">
              <select className={inputClass} value={draft.proyecto} onChange={(e) => update('proyecto', e.target.value)}>
                {PROJECTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estado">
              <select
                className={inputClass}
                value={draft.estado}
                onChange={(e) => update('estado', e.target.value as TrackingStatus)}
              >
                {Object.entries(STATUS_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fecha de entrega">
              <input
                type="date"
                className={inputClass}
                value={draft.fechaEntrega}
                onChange={(e) => update('fechaEntrega', e.target.value)}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Avances de hoy">
              <textarea
                rows={3}
                className={inputClass}
                value={draft.avances}
                onChange={(e) => update('avances', e.target.value)}
                placeholder="Tareas terminadas, funciones implementadas y pruebas realizadas"
              />
            </Field>
            <Field label="Pendientes">
              <textarea
                rows={3}
                className={inputClass}
                value={draft.pendientes}
                onChange={(e) => update('pendientes', e.target.value)}
                placeholder="Lo que no se terminó y cuándo se espera completarlo"
              />
            </Field>
            <Field label="Problemas / bloqueos">
              <textarea
                rows={3}
                className={inputClass}
                value={draft.bloqueos}
                onChange={(e) => update('bloqueos', e.target.value)}
                placeholder="Errores, dependencias o decisiones que necesitan intervención"
              />
            </Field>
            <Field label="Próximo paso">
              <textarea
                rows={3}
                className={inputClass}
                value={draft.proximoPaso}
                onChange={(e) => update('proximoPaso', e.target.value)}
                placeholder="La tarea concreta que realizará mañana"
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(emptyEntry())
                setShowForm(false)
              }}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-bold text-white hover:bg-violet-700"
            >
              Guardar reporte
            </button>
          </div>
        </form>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Responsable / Proyecto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 w-[18%]">Avances de hoy</th>
                <th className="px-4 py-3 w-[16%]">Pendientes</th>
                <th className="px-4 py-3 w-[16%]">Problemas / bloqueos</th>
                <th className="px-4 py-3 w-[16%]">Próximo paso</th>
                <th className="px-4 py-3">Entrega</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">
                    No hay reportes para esta vista.
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr key={entry.id} className="align-top hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-xs font-semibold text-slate-700 whitespace-nowrap">
                      {formatDate(entry.fecha)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-slate-900">{entry.responsable}</p>
                      <span
                        className={twMerge(
                          'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          PROJECT_STYLES[entry.proyecto] ?? 'bg-slate-100 text-slate-700',
                        )}
                      >
                        {entry.proyecto}
                      </span>
                      <p className="mt-1.5 text-xs text-slate-500">{entry.titulo}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={entry.estado}
                        onChange={(e) => handleStatusChange(entry.id, e.target.value as TrackingStatus)}
                        className={twMerge(
                          'rounded-full border-0 px-2.5 py-1 text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-200',
                          STATUS_META[entry.estado].className,
                        )}
                      >
                        {Object.entries(STATUS_META).map(([value, meta]) => (
                          <option key={value} value={value}>
                            {meta.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <CellText value={entry.avances} />
                    </td>
                    <td className="px-4 py-3">
                      <CellText value={entry.pendientes} />
                    </td>
                    <td className="px-4 py-3">
                      <CellText value={entry.bloqueos} tone="danger" />
                    </td>
                    <td className="px-4 py-3">
                      <CellText value={entry.proximoPaso} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                      {formatDate(entry.fechaEntrega)}
                    </td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
