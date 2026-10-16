'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, ChevronRight, MapPin, Megaphone, Search, X } from 'lucide-react'
import type {
  AuditoriaCarro,
  AuditoriaCarroPayload,
  AuditoriaCarroSort,
} from '@/lib/leads/auditoria-carro-types'

const money = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const countFmt = new Intl.NumberFormat('es-EC')

function moneyOf(value: number | null | undefined): string {
  if (value == null) return '—'
  return money.format(value)
}

function countOf(value: number): string {
  return countFmt.format(value)
}

function pctLabel(part: number, total: number): string {
  if (total <= 0) return '—'
  return `${Math.round((part / total) * 100)}%`
}

function titleCase(value: string): string {
  return value.replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase())
}

const ROW_GRID =
  'grid min-w-[60rem] grid-cols-[minmax(14rem,1.6fr)_6rem_5rem_minmax(9rem,1.1fr)_minmax(7rem,0.9fr)_minmax(9rem,1fr)_5.5rem_8.5rem_3.5rem] items-center'

function Brand({ brand }: { brand: string }) {
  const initials = brand.replace(/[^\p{L}]/gu, '').slice(0, 2).toUpperCase() || '—'
  return (
    <span className="relative isolate flex h-10 w-10 shrink-0 items-center justify-center">
      <span className="absolute -inset-1 -z-10 rounded-2xl bg-gradient-to-br from-red-300/60 via-rose-200/50 to-red-200/60 blur-md" />
      <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white bg-gradient-to-br from-white/80 via-white/35 to-stone-300/40 text-[11px] font-bold tracking-wide text-stone-800 shadow-[inset_0_1px_1px_rgba(255,255,255,1),inset_0_-6px_10px_-6px_rgba(41,37,36,0.25),0_8px_18px_-8px_rgba(41,37,36,0.4)] backdrop-blur-xl">
        <span className="pointer-events-none absolute -left-3 -top-4 h-8 w-14 rotate-[-25deg] bg-gradient-to-b from-white/90 to-white/0" />
        <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-stone-900/5" />
        <span className="relative">{initials}</span>
      </span>
    </span>
  )
}

const SIGNAL_TONES: Record<string, string> = {
  atrae_no_cierra: 'bg-orange-50 text-orange-700 ring-orange-200/70',
  cae_precio: 'bg-amber-50 text-amber-700 ring-amber-200/70',
  cae_cuota: 'bg-amber-50 text-amber-700 ring-amber-200/70',
  cae_agenda: 'bg-amber-50 text-amber-700 ring-amber-200/70',
  problema_patio: 'bg-violet-50 text-violet-700 ring-violet-200/70',
  ads_mal: 'bg-sky-50 text-sky-700 ring-sky-200/70',
  bajar_precio_no_funciona: 'bg-rose-50 text-rose-700 ring-rose-200/70',
  bot_ciego: 'bg-slate-100 text-slate-700 ring-slate-200/70',
  ofertan_bajo: 'bg-red-50 text-red-700 ring-red-200/70',
  piden_rebaja: 'bg-pink-50 text-pink-700 ring-pink-200/70',
}

function Stack({ top, bottom, strong }: { top: ReactNode; bottom?: ReactNode; strong?: boolean }) {
  return (
    <div className="min-w-0 leading-tight">
      <p className={`truncate text-xs ${strong ? 'font-semibold text-stone-900' : 'text-stone-700'}`}>{top}</p>
      {bottom != null ? <p className="mt-1 truncate text-xs text-stone-500">{bottom}</p> : null}
    </div>
  )
}

function FunnelSteps({ car }: { car: AuditoriaCarro }) {
  const steps = [
    { label: 'Chats', value: car.conversaciones },
    { label: 'Precio', value: car.vioPrecio },
    { label: 'Cuota', value: car.pidioCuota },
    { label: 'Agenda', value: car.agendo },
  ]
  return (
    <div className="flex items-start gap-1.5">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-start gap-1.5">
          {i > 0 ? <span className="pt-px text-[11px] text-stone-300">›</span> : null}
          <div className="leading-tight">
            <p
              className={`text-xs font-semibold tabular-nums ${
                i === steps.length - 1 ? 'text-red-600' : 'text-stone-900'
              }`}
            >
              {countOf(step.value)}
            </p>
            <p className="mt-0.5 text-[10px] text-stone-400">{step.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function SignalPill({ insight, label }: { insight: string | null; label: string | null }) {
  if (!label || !insight) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200/70">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Sin alerta
      </span>
    )
  }
  const tone = SIGNAL_TONES[insight] ?? 'bg-stone-100 text-stone-700 ring-stone-200/70'
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${tone}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
      <span className="truncate">{label}</span>
    </span>
  )
}

function Row({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs text-stone-500">{label}</span>
      <span className="text-right">
        <span className="text-sm font-semibold tabular-nums text-stone-900">{value}</span>
        {hint ? <span className="block text-[11px] text-stone-400">{hint}</span> : null}
      </span>
    </div>
  )
}

const GLASS =
  'rounded-2xl border border-white/80 bg-white/60 shadow-[0_4px_20px_-10px_rgba(41,37,36,0.18)] backdrop-blur-xl'

function Section({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`${GLASS} p-4 ${className}`}>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">{title}</h3>
      {children}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={`${GLASS} px-3 py-2.5`}>
      <p className="text-[10px] uppercase tracking-wider text-stone-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-stone-900">{value}</p>
    </div>
  )
}

function DropBar({ car }: { car: AuditoriaCarro }) {
  const max = Math.max(1, car.conversaciones)
  const rows = [
    { label: 'Consultó', value: car.conversaciones },
    { label: 'Precio', value: car.vioPrecio },
    { label: 'Cuota', value: car.pidioCuota },
    { label: 'Agendó', value: car.agendo },
    { label: 'Visitó', value: car.visitoEmbudo },
  ]
  return (
    <ul className="space-y-2.5">
      {rows.map((row, i) => (
        <li key={row.label} className="grid grid-cols-[4rem_1fr_2.5rem_2.5rem] items-center gap-2">
          <span className="text-xs text-stone-500">{row.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-stone-900/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-400 to-red-600"
              style={{ width: `${Math.max(2, Math.round((row.value / max) * 100))}%` }}
            />
          </div>
          <span className="text-right text-sm font-semibold tabular-nums text-stone-900">{countOf(row.value)}</span>
          <span className="text-right text-[11px] tabular-nums text-stone-400">
            {i === 0 ? '' : pctLabel(row.value, rows[i - 1].value)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function DetailPanel({ car, onClose }: { car: AuditoriaCarro; onClose: () => void }) {
  const alcanza =
    car.price != null && car.presupuestoProm != null
      ? car.presupuestoProm >= car.price
        ? 'El presupuesto alcanza el precio'
        : `Presupuesto cubre ~${pctLabel(car.presupuestoProm, car.price)} del precio`
      : null

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end bg-stone-900/25 backdrop-blur-[2px]" onClick={onClose}>
      <aside
        className="relative isolate flex h-dvh w-full max-w-md flex-col overflow-hidden border-l border-white/70 bg-stone-50/95 shadow-2xl backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-red-200/40 blur-3xl" />
          <div className="absolute -left-20 bottom-10 h-64 w-64 rounded-full bg-rose-100/50 blur-3xl" />
        </div>

        <header className="flex shrink-0 items-start gap-3 border-b border-white/70 px-5 py-4">
          <Brand brand={car.brand} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold tracking-tight text-stone-900">
              {titleCase(car.model || car.nombre)}
            </h2>
            <p className="mt-0.5 text-xs text-stone-500">
              {titleCase(car.brand)} · {car.year ?? '—'} · {moneyOf(car.price)}
            </p>
            <div className="mt-2">
              <SignalPill insight={car.insight} label={car.insightLabel} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-white/80 hover:text-stone-700"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4 scrollbar-hide">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Consultas" value={countOf(car.conversaciones)} />
            <Stat label="Agendó" value={countOf(car.agendo)} />
            <Stat label="Días" value={car.diasEnPatio ?? '—'} />
          </div>

          <Section title="Embudo">
            <DropBar car={car} />
            {car.peorCaida && car.peorCaida.perdidos > 0 ? (
              <p className="mt-3 rounded-xl bg-red-50/80 px-3 py-2 text-xs text-red-700">
                Se pierde más de {car.peorCaida.de} a {car.peorCaida.a}: −{countOf(car.peorCaida.perdidos)}
              </p>
            ) : null}
            <p className="mt-2 text-[11px] text-stone-400">
              {pctLabel(car.soloUnCarro, car.conversaciones)} miró solo este carro
              {car.atribucionAproximada ? ' · resto aproximado' : ''}
            </p>
          </Section>

          <div className="grid grid-cols-2 gap-3">
            <Section title="Patio">
              <Row label="Visitas" value={countOf(car.visitasPatio)} />
              <Row label="Test drives" value={countOf(car.testDrives)} />
            </Section>
            <Section title="Objeción">
              <Row label="Top" value={car.objecionTopLabel} />
              <Row label="Por dinero" value={countOf(car.objPlata)} hint="precio, entrada, crédito" />
              <Row label="Por el carro" value={countOf(car.objCarro)} hint="modelo, km, equipamiento" />
            </Section>
            <Section title="Marketing">
              <Row label="Gasto" value={moneyOf(car.gastoAds)} />
              <Row label="Leads" value={countOf(car.leadsAds)} />
              <Row
                label="Por agenda"
                value={car.agendo > 0 ? moneyOf(Math.round(car.gastoAds / car.agendo)) : '—'}
              />
            </Section>
            <Section title="Inventario">
              <Row label="Cambios precio" value={countOf(car.cambiosPrecio)} />
              <Row label="Pendientes bot" value={countOf(car.pendientesBot)} />
            </Section>
          </div>

          <Section title="Negociación">
            {car.ofertas === 0 && car.pidieronRebaja === 0 ? (
              <p className="text-xs text-stone-400">
                Nadie ha ofrecido un monto ni pedido rebaja por este carro todavía.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-4">
                  <Row label="Pidieron rebaja" value={countOf(car.pidieronRebaja)} />
                  <Row label="Ofertas" value={countOf(car.ofertas)} />
                  <Row label="Oferta prom." value={moneyOf(car.ofertaProm)} />
                  <Row label="Oferta máx." value={moneyOf(car.ofertaMax)} />
                </div>
                {car.ofertaBajoPrecioPct != null ? (
                  <p
                    className={`mt-2 rounded-xl px-3 py-2 text-xs ${
                      car.ofertaBajoPrecioPct >= 15 ? 'bg-red-50/80 text-red-700' : 'bg-stone-900/[0.04] text-stone-600'
                    }`}
                  >
                    {car.ofertaBajoPrecioPct > 0
                      ? `Ofrecen en promedio ${car.ofertaBajoPrecioPct}% por debajo de ${moneyOf(car.price)}`
                      : `Ofrecen en promedio el precio publicado o más`}
                  </p>
                ) : null}
              </>
            )}
          </Section>

          <Section title="Plata del cliente">
            <div className="grid grid-cols-2 gap-x-4">
              <Row label="Presupuesto" value={moneyOf(car.presupuestoProm)} />
              <Row label="Entrada" value={moneyOf(car.entradaProm)} />
            </div>
            {alcanza ? <p className="mt-1 text-[11px] text-stone-500">{alcanza}</p> : null}
          </Section>

          <Section title="Desde dónde escriben">
            {car.conversaciones === 0 ? (
              <p className="text-xs text-stone-400">Nadie ha escrito por este carro todavía.</p>
            ) : (
              <>
                {car.ubicaciones.length > 0 ? (
                  <ul className="space-y-2">
                    {car.ubicaciones.map((u) => (
                      <li key={u.ciudad} className="grid grid-cols-[1fr_2rem] items-center gap-2 text-xs">
                        <span className="flex min-w-0 items-center gap-1.5 text-stone-600">
                          <MapPin className="h-3 w-3 shrink-0 text-red-400" />
                          <span className="truncate">{u.ciudad}</span>
                        </span>
                        <span className="text-right font-semibold tabular-nums text-stone-900">{countOf(u.n)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p
                  className={`rounded-xl bg-stone-900/[0.04] px-3 py-2 text-xs text-stone-600 ${
                    car.ubicaciones.length > 0 ? 'mt-3' : ''
                  }`}
                >
                  {countOf(car.sinUbicacion)} de {countOf(car.conversaciones)} sin ubicación
                  {car.ubicaciones.length === 0 ? ' · el bot aún no registra la ciudad de estos clientes' : ''}
                </p>
              </>
            )}
          </Section>
        </div>
      </aside>
    </div>,
    document.body
  )
}

const SORT_OPTIONS: { value: AuditoriaCarroSort; label: string }[] = [
  { value: 'conversaciones', label: 'Conversaciones' },
  { value: 'vio_precio', label: 'Vio precio' },
  { value: 'agendo', label: 'Agendó' },
  { value: 'visitas_patio', label: 'Visitas' },
  { value: 'dias_en_patio', label: 'Días' },
  { value: 'gasto_ads', label: 'Ads' },
  { value: 'pidieron_rebaja', label: 'Piden rebaja' },
]

const STATUS_OPTIONS = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'vendido', label: 'Vendido' },
  { value: 'todos', label: 'Todos' },
]

type ChatFilter = 'con' | 'sin' | 'todos'

const CHAT_OPTIONS: { value: ChatFilter; label: string; hint: string }[] = [
  { value: 'con', label: 'Con chat', hint: 'Carros que alguien consultó al bot' },
  { value: 'sin', label: 'Sin chat', hint: 'Carros que nadie ha consultado' },
  { value: 'todos', label: 'Todos', hint: 'Todo el inventario del estado elegido' },
]

function GlassSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm transition-colors ${
          open ? 'border-stone-400 bg-white' : 'border-stone-200 bg-white/80 hover:border-stone-300 hover:bg-white'
        }`}
      >
        <span className="text-[11px] uppercase tracking-wider text-stone-400">{label}</span>
        <span className="font-medium text-stone-800">{current?.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 z-30 mt-2 min-w-full overflow-hidden rounded-2xl border border-white/80 bg-white/85 p-1.5 shadow-[0_16px_40px_-16px_rgba(41,37,36,0.35)] backdrop-blur-xl"
        >
          {options.map((opt) => {
            const active = opt.value === value
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center justify-between gap-6 whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    active ? 'bg-red-50 font-medium text-red-700' : 'text-stone-700 hover:bg-stone-100/80'
                  }`}
                >
                  {opt.label}
                  {active ? <Check className="h-3.5 w-3.5" /> : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

export function AuditoriaCarroPanel() {
  const [data, setData] = useState<AuditoriaCarroPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<AuditoriaCarroSort>('conversaciones')
  const [status, setStatus] = useState('disponible')
  const [chat, setChat] = useState<ChatFilter>('con')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<AuditoriaCarro | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({
      sort,
      order: 'desc',
      solo_con_chat: '0',
    })
    if (status !== 'todos') params.set('status', status)

    void fetch(`/api/leads/auditoria-carro?${params}`)
      .then(async (res) => {
        const body = (await res.json()) as AuditoriaCarroPayload & { message?: string }
        if (!res.ok) throw new Error(body.message || 'No se pudo cargar la auditoría')
        if (!cancelled) {
          setData(body)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar la auditoría')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [sort, status])

  const chatCounts = useMemo(() => {
    const all = data?.carros ?? []
    const con = all.filter((c) => c.conversaciones > 0).length
    return { con, sin: all.length - con, todos: all.length }
  }, [data])

  const rows = useMemo(() => {
    if (!data) return []
    const byChat =
      chat === 'todos'
        ? data.carros
        : data.carros.filter((c) => (chat === 'con' ? c.conversaciones > 0 : c.conversaciones === 0))
    const query = q.trim().toLowerCase()
    if (!query) return byChat
    return byChat.filter(
      (c) =>
        c.nombre.toLowerCase().includes(query) ||
        String(c.year ?? '').includes(query) ||
        (c.objecionTopLabel ?? '').toLowerCase().includes(query)
    )
  }, [data, q, chat])

  if (loading && !data) {
    return <p className="py-12 text-center text-sm text-stone-500">Cargando…</p>
  }
  if (error && !data) {
    return <p className="py-12 text-center text-sm text-red-700">{error}</p>
  }
  if (!data) return null

  return (
    <div className="relative isolate space-y-5">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-10 top-0 h-72 w-72 rounded-full bg-red-200/35 blur-3xl" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-rose-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-96 rounded-full bg-sky-200/40 blur-3xl" />
      </div>

      <div className="relative z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-white/70 bg-white/60 p-3 shadow-[0_8px_30px_-12px_rgba(41,37,36,0.18)] backdrop-blur-xl">
        <div className="relative min-w-[14rem] flex-1">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar carro"
            className="h-10 w-full rounded-xl border border-stone-200 bg-white pl-4 pr-10 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:border-stone-400"
          />
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        </div>
        <GlassSelect label="Estado" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
        <GlassSelect label="Orden" value={sort} options={SORT_OPTIONS} onChange={setSort} />
        <div role="radiogroup" aria-label="Consultas en chat" className="flex h-10 items-center gap-1 rounded-xl border border-stone-200 bg-white/80 p-1">
          {CHAT_OPTIONS.map((opt) => {
            const active = chat === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setChat(opt.value)}
                title={opt.hint}
                className={`flex h-full items-center gap-1.5 rounded-lg px-3 text-sm transition-colors ${
                  active ? 'bg-red-50 font-medium text-red-700 shadow-sm' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {opt.label}
                <span
                  className={`rounded-md px-1.5 text-[11px] tabular-nums ${
                    active ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {chatCounts[opt.value]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className={`${ROW_GRID} pb-2 text-[11px] text-stone-500`}>
          <span className="pl-[4.25rem]">Carro</span>
          <span className="px-3">Año</span>
          <span className="px-3">Días</span>
          <span className="px-3">Embudo del chat</span>
          <span className="px-3">Objeción</span>
          <span className="px-3">Señal</span>
          <span className="px-3">Patio</span>
          <span className="px-3">Ads</span>
          <span />
        </div>

        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-stone-400">Sin resultados</p>
        ) : (
          <ul className="space-y-2.5">
            {rows.map((car) => (
              <li key={car.inventoryId}>
                <button
                  type="button"
                  onClick={() => setSelected(car)}
                  className={`group ${ROW_GRID} min-h-[4rem] w-full overflow-hidden rounded-2xl border border-white/80 bg-white/65 text-left shadow-[0_4px_20px_-10px_rgba(41,37,36,0.18)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-px hover:bg-white/85 hover:shadow-[0_12px_28px_-12px_rgba(41,37,36,0.28)]`}
                >
                  <div className="flex min-w-0 items-center gap-4 px-4 py-3">
                    <Brand brand={car.brand} />
                    <p className="truncate text-sm font-semibold text-stone-900">{titleCase(car.model || car.nombre)}</p>
                  </div>
                  <div className="px-3">
                    <Stack top={car.year ?? '—'} bottom={moneyOf(car.price)} />
                  </div>
                  <div className="px-3 text-sm text-stone-700 tabular-nums">{car.diasEnPatio ?? '—'}</div>
                  <div className="px-3">
                    <FunnelSteps car={car} />
                  </div>
                  <div className="px-3">
                    <Stack
                      top={car.objecionTopLabel}
                      bottom={`${countOf(car.objPlata)} por dinero · ${countOf(car.objCarro)} por el carro`}
                    />
                  </div>
                  <div className="px-3">
                    <SignalPill insight={car.insight} label={car.insightLabel} />
                  </div>
                  <div className="px-3">
                    <Stack strong top={`${countOf(car.visitasPatio)} visitas`} bottom={`${countOf(car.testDrives)} test drive`} />
                  </div>
                  <div className="flex h-full items-center gap-2.5 border-l border-white/70 bg-stone-900/[0.03] px-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        car.gastoAds > 0 ? 'bg-sky-100 text-sky-600' : 'bg-stone-100 text-stone-300'
                      }`}
                    >
                      <Megaphone className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 leading-tight">
                      <p className="text-xs font-semibold tabular-nums text-stone-900">{moneyOf(car.gastoAds)}</p>
                      <p className="mt-1 text-[11px] text-stone-500">{countOf(car.leadsAds)} leads</p>
                    </div>
                  </div>
                  <div className="flex h-full items-center justify-center border-l border-white/70">
                    <ChevronRight className="h-4 w-4 text-stone-400 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected ? <DetailPanel car={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  )
}
