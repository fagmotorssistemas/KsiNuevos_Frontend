'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight, CircleCheck, CircleDot, CirclePause, X } from 'lucide-react'
import type { EmbudoConversacion, EmbudoConteo, EmbudoPayload } from '@/lib/leads/embudo-types'
import { kommoLeadChatUrl } from '@/lib/leads/openKommoChat'

const money = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const countFmt = new Intl.NumberFormat('es-EC')

// Paleta: grises cálidos (stone) + rojo de marca. Rojo = donde se pierde o lo que más pesa; stone-700 = avance.
const TONE = {
  accent: 'bg-red-600',
  accentSoft: 'bg-red-300',
  progress: 'bg-stone-700',
  muted: 'bg-stone-300',
  faint: 'bg-stone-200',
}

const RAMP = [TONE.accent, TONE.accentSoft, TONE.muted]

function moneyOf(value: number | null): string {
  if (value == null) return '—'
  return money.format(value)
}

function countOf(value: number): string {
  return countFmt.format(value)
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

function titleCase(value: string): string {
  return value.replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase())
}

function dateTimeOf(iso: string): string {
  return new Date(iso).toLocaleString('es-EC', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Guayaquil',
  })
}

function dayOf(iso: string): string {
  return new Date(iso).toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Guayaquil',
  })
}

function shortDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

type BadgeTone = 'up' | 'down' | 'neutral'

function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  const cls = tone === 'down' ? 'bg-red-50 text-red-700' : 'bg-stone-100 text-stone-600'
  const Icon = tone === 'up' ? ArrowUpRight : tone === 'down' ? ArrowDownRight : null
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </span>
  )
}

function Card({
  title,
  value,
  badge,
  caption,
  action,
  className = '',
  children,
}: {
  title: string
  value?: ReactNode
  badge?: ReactNode
  caption?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={`flex flex-col rounded-2xl border border-stone-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(41,37,36,0.04),0_12px_32px_-16px_rgba(41,37,36,0.12)] ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm text-stone-500">{title}</h2>
          {value != null ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-[28px] font-semibold leading-tight tracking-tight text-stone-900">{value}</span>
              {badge}
            </div>
          ) : null}
          {caption ? <p className="mt-0.5 text-xs text-stone-400">{caption}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-5 flex flex-1 flex-col">{children}</div>
    </section>
  )
}

function CardButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900"
    >
      {children}
    </button>
  )
}

function Sparkline({ points }: { points: { fecha: string; total: number }[] }) {
  const max = Math.max(1, ...points.map((p) => p.total))
  const w = 300
  const h = 90
  const step = points.length > 1 ? w / (points.length - 1) : w
  const coords = points.map((p, i) => [i * step, h - 6 - (p.total / max) * (h - 12)] as const)
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `0,${h} ${line} ${w},${h}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-24 w-full" role="img" aria-label="Conversaciones nuevas por día">
      <defs>
        <linearGradient id="embudo-spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dc2626" stopOpacity={0.16} />
          <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#embudo-spark)" />
      <polyline points={line} fill="none" className="stroke-red-600" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}

function SegmentBar({ parts }: { parts: { key: string; value: number; color: string; label: string }[] }) {
  const total = parts.reduce((sum, p) => sum + p.value, 0)
  return (
    <div className="flex h-2 gap-1">
      {parts.map((p) =>
        p.value > 0 ? (
          <div
            key={p.key}
            className={`h-full rounded-full ${p.color}`}
            style={{ width: `${(p.value / Math.max(1, total)) * 100}%` }}
            title={`${p.label}: ${countOf(p.value)}`}
          />
        ) : null
      )}
    </div>
  )
}

function Legend({ items }: { items: { key: string; label: string; color: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <span key={item.key} className="flex items-center gap-1.5 text-xs text-stone-500">
          <span className={`h-2 w-2 rounded-full ${item.color}`} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

function MotivoLine({ rows, total }: { rows: EmbudoConteo[]; total: number }) {
  const top = rows[0]
  if (!top) return null
  return (
    <p className="mt-auto rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500">
      Se cancelan sobre todo por <span className="font-medium text-stone-700">{top.label.toLowerCase()}</span> (
      {pct(top.total, total)}%).
    </p>
  )
}

export function EmbudoDashboard() {
  const [data, setData] = useState<EmbudoPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [etapa, setEtapa] = useState('todas')
  const [objecion, setObjecion] = useState('todas')
  const [todasObjeciones, setTodasObjeciones] = useState(false)
  const [todosVehiculos, setTodosVehiculos] = useState(false)
  const listaRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let cancelled = false
    void fetch('/api/leads/embudo')
      .then(async (res) => {
        const body = (await res.json()) as EmbudoPayload & { message?: string }
        if (!res.ok) throw new Error(body.message || 'No se pudo cargar el embudo')
        if (!cancelled) setData(body)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar el embudo')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const conversaciones = useMemo(() => {
    if (!data) return []
    const query = q.trim().toLowerCase()
    return data.conversaciones.filter((row) => {
      if (etapa !== 'todas' && String(row.etapa) !== etapa) return false
      if (objecion !== 'todas' && (row.objecion ?? 'sin') !== objecion) return false
      if (!query) return true
      return (
        row.nombre.toLowerCase().includes(query) ||
        String(row.leadIdKommo ?? '').includes(query) ||
        (row.resumen ?? '').toLowerCase().includes(query)
      )
    })
  }, [data, q, etapa, objecion])

  function verLista(filtro: { etapa?: string; objecion?: string }) {
    if (filtro.etapa != null) setEtapa(filtro.etapa)
    if (filtro.objecion != null) setObjecion(filtro.objecion)
    listaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) {
    return <p className="py-16 text-center text-sm text-stone-500">Cargando embudo…</p>
  }
  if (error || !data) {
    return <p className="py-16 text-center text-sm text-red-700">{error ?? 'No se pudo cargar el embudo'}</p>
  }

  const total = data.totales.conversaciones
  const alcanzo = (n: number) => data.embudo.find((row) => row.etapa === n)?.alcanzaron ?? 0

  const ultimos7 = data.porDia.slice(-7).reduce((sum, p) => sum + p.total, 0)
  const previos7 = data.porDia.slice(-14, -7).reduce((sum, p) => sum + p.total, 0)
  const cambioSemana = previos7 > 0 ? Math.round(((ultimos7 - previos7) / previos7) * 100) : null

  const ticketTotal = data.tickets.reduce((sum, row) => sum + row.total, 0)

  const peorEtapa = [...data.embudo].sort((a, b) => b.seQuedaron - a.seQuedaron)[0]
  const conObjecion = total - data.totales.sinObjecion
  const topObjeciones = data.objeciones.slice(0, 3)
  const objecionesVisibles = todasObjeciones ? data.objeciones : data.objeciones.slice(0, 5)
  const vehiculosVisibles = todosVehiculos ? data.vehiculos : data.vehiculos.slice(0, 6)

  const senales = data.senales
  const tiposMax = Math.max(1, ...senales.tipos.map((row) => row.total))
  const temperaturaMax = Math.max(1, ...senales.temperatura.cambios.map((row) => row.total))

  const pasos = [
    { etapa: 3, label: 'Vio precio' },
    { etapa: 4, label: 'Pidió cuota' },
    { etapa: 5, label: 'Agendó' },
    { etapa: 6, label: 'Visitó' },
  ]

  return (
    <div className="space-y-5 pb-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Embudo</h1>
        <p className="text-sm text-stone-500">
          Cómo avanzan las conversaciones del bot, dónde se quedan y por qué.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Card
          title="Conversaciones"
          value={countOf(total)}
          badge={
            cambioSemana != null ? (
              <Badge tone={cambioSemana >= 0 ? 'up' : 'down'}>
                {cambioSemana >= 0 ? '+' : ''}
                {cambioSemana}% esta semana
              </Badge>
            ) : null
          }
          caption={`${countOf(ultimos7)} nuevas en los últimos 7 días`}
        >
          <Sparkline points={data.porDia} />
          <div className="mt-1 flex justify-between text-[11px] text-stone-400">
            <span>{data.porDia[0] ? shortDate(data.porDia[0].fecha) : ''}</span>
            <span>Nuevas por día</span>
            <span>Hoy</span>
          </div>
          <ul className="mt-4 space-y-2.5 border-t border-stone-100 pt-4 text-sm">
            {[
              { key: 'a', label: 'Activas', value: data.totales.seguimientoActivo, Icon: CircleDot, tone: 'text-stone-700' },
              { key: 'p', label: 'Aplazadas', value: data.totales.seguimientoAplazado, Icon: CirclePause, tone: 'text-red-400' },
              { key: 'c', label: 'Cerradas', value: data.totales.cerradas, Icon: CircleCheck, tone: 'text-stone-300' },
            ].map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-stone-600">
                  <row.Icon className={`h-4 w-4 ${row.tone}`} />
                  {row.label}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-medium tabular-nums text-stone-900">{countOf(row.value)}</span>
                  <span className="w-10 text-right text-xs tabular-nums text-stone-400">{pct(row.value, total)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Ticket del carro mostrado"
          value={countOf(ticketTotal)}
          badge={<Badge tone="neutral">{countOf(data.totales.sinSegmento)} sin precio</Badge>}
          caption="Low hasta $17 mil · medio hasta $33 mil · high más"
        >
          <div className="grid flex-1 grid-cols-3 divide-x divide-stone-100">
            {data.tickets.map((row, index) => (
              <div key={row.key} className="flex flex-col px-3 first:pl-0 last:pr-0">
                <span className="text-xs text-stone-500">{row.label}</span>
                <span className="mt-1 text-2xl font-semibold tabular-nums text-stone-900">
                  {pct(row.total, ticketTotal)}%
                </span>
                <span className="mt-auto pt-10 text-xs tabular-nums text-stone-400">{countOf(row.total)} conv.</span>
                <div className={`mt-2 h-2 rounded-full ${RAMP[index] ?? TONE.faint}`} />
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Agendaron visita"
          value={`${pct(alcanzo(5), total)}%`}
          badge={<Badge tone="neutral">{countOf(alcanzo(6))} visitaron</Badge>}
          caption="Sobre todas las conversaciones"
        >
          <ul className="space-y-4">
            {pasos.map((paso) => {
              const value = alcanzo(paso.etapa)
              return (
                <li key={paso.etapa}>
                  <button type="button" onClick={() => verLista({ etapa: String(paso.etapa) })} className="block w-full text-left">
                    <span className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-stone-600">{paso.label}</span>
                      <span className="flex items-baseline gap-3">
                        <span className="font-medium tabular-nums text-stone-900">{countOf(value)}</span>
                        <span className="w-10 text-right text-xs tabular-nums text-stone-400">{pct(value, total)}%</span>
                      </span>
                    </span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-stone-100">
                      <span className={`block h-full rounded-full ${TONE.progress}`} style={{ width: `${pct(value, total)}%` }} />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mt-auto pt-4 text-xs text-stone-400">Vendió todavía no se llena: falta conectar la factura.</p>
        </Card>

        <Card
          title="Dónde se quedan"
          value={peorEtapa ? peorEtapa.label : '—'}
          badge={
            peorEtapa ? (
              <Badge tone="down">
                {countOf(peorEtapa.seQuedaron)} · {pct(peorEtapa.seQuedaron, total)}%
              </Badge>
            ) : null
          }
          caption="Toca una columna para ver esas conversaciones"
          action={<CardButton onClick={() => verLista({ etapa: 'todas' })}>Ver lista</CardButton>}
          className="xl:col-span-2"
        >
          <div className="flex h-56 items-end gap-2 sm:gap-3">
            {data.embudo.map((row) => {
              const llegaron = (row.alcanzaron / Math.max(1, total)) * 100
              const quedaron = (row.seQuedaron / Math.max(1, total)) * 100
              const activa = etapa === String(row.etapa)
              return (
                <button
                  key={row.etapa}
                  type="button"
                  onClick={() => verLista({ etapa: String(row.etapa) })}
                  className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
                  title={`${row.label}: ${row.alcanzaron} llegaron, ${row.seQuedaron} se quedaron`}
                >
                  <span className="text-xs tabular-nums text-stone-500">{countOf(row.alcanzaron)}</span>
                  <span
                    className={`relative flex w-full max-w-14 flex-col justify-end overflow-hidden rounded-md ${TONE.faint} transition-opacity group-hover:opacity-80 ${
                      activa ? 'ring-2 ring-stone-400 ring-offset-2' : ''
                    }`}
                    style={{ height: `${Math.max(llegaron, 1.5)}%` }}
                  >
                    <span
                      className={`block w-full ${TONE.accent}`}
                      style={{ height: `${llegaron > 0 ? (quedaron / llegaron) * 100 : 0}%` }}
                    />
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex gap-2 sm:gap-3">
            {data.embudo.map((row) => (
              <span key={row.etapa} className="min-w-0 flex-1 text-center">
                <span className="block truncate text-[11px] text-stone-500">{row.label}</span>
                <span className="block text-sm font-semibold tabular-nums text-red-600">{countOf(row.seQuedaron)}</span>
              </span>
            ))}
          </div>
          <Legend
            items={[
              { key: 'q', label: 'Se quedaron en esa etapa (número rojo)', color: TONE.accent },
              { key: 's', label: 'Llegaron y siguieron (número gris arriba = llegaron)', color: TONE.faint },
            ]}
          />
        </Card>

        <Card
          title="Con objeción registrada"
          value={`${pct(conObjecion, total)}%`}
          badge={<Badge tone="neutral">{countOf(conObjecion)} conv.</Badge>}
          caption="Por qué no avanzan"
          action={
            data.objeciones.length > 5 ? (
              <CardButton onClick={() => setTodasObjeciones((v) => !v)}>{todasObjeciones ? 'Menos' : 'Ver todas'}</CardButton>
            ) : null
          }
        >
          <SegmentBar
            parts={topObjeciones.map((row, i) => ({
              key: row.key,
              value: row.total,
              color: RAMP[i],
              label: row.label,
            }))}
          />
          <Legend items={topObjeciones.map((row, i) => ({ key: row.key, label: row.label, color: RAMP[i] }))} />
          <table className="mt-4 w-full text-sm">
            <thead className="text-xs text-stone-400">
              <tr>
                <th className="pb-2 text-left font-normal">Objeción</th>
                <th className="pb-2 text-right font-normal">%</th>
                <th className="pb-2 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {objecionesVisibles.map((row) => (
                <tr
                  key={row.key}
                  onClick={() => verLista({ objecion: row.key })}
                  className="cursor-pointer border-t border-stone-100 hover:bg-stone-50"
                >
                  <td className="py-2 text-stone-700">{row.label}</td>
                  <td className="py-2 text-right tabular-nums text-stone-500">{pct(row.total, conObjecion)}%</td>
                  <td className="py-2 text-right font-medium tabular-nums text-stone-900">{countOf(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card
          title="Retomas que respondieron"
          value={`${pct(data.retomas.respondieron, data.retomas.enviadas)}%`}
          badge={<Badge tone="neutral">{countOf(data.retomas.enviadas)} enviadas</Badge>}
          caption="Mensajes 1, 2 y 3 del bot cuando el cliente se enfría"
        >
          <SegmentBar
            parts={[
              { key: 'e', value: data.retomas.enviadas, color: TONE.progress, label: 'Enviadas' },
              { key: 'p', value: data.retomas.pendientes, color: TONE.accentSoft, label: 'Pendientes' },
              { key: 'c', value: data.retomas.canceladas, color: TONE.faint, label: 'Canceladas' },
            ]}
          />
          <Legend
            items={[
              { key: 'e', label: `Enviadas ${countOf(data.retomas.enviadas)}`, color: TONE.progress },
              { key: 'p', label: `Pendientes ${countOf(data.retomas.pendientes)}`, color: TONE.accentSoft },
              { key: 'c', label: `Canceladas ${countOf(data.retomas.canceladas)}`, color: TONE.faint },
            ]}
          />
          <table className="mt-4 w-full text-sm">
            <thead className="text-xs text-stone-400">
              <tr>
                <th className="pb-2 text-left font-normal">Retoma</th>
                <th className="pb-2 text-right font-normal">Enviadas</th>
                <th className="pb-2 text-right font-normal">Respondieron</th>
              </tr>
            </thead>
            <tbody>
              {data.retomas.porRetoma.map((row) => (
                <tr key={row.retoma} className="border-t border-stone-100">
                  <td className="py-2 text-stone-700">Retoma {row.retoma}</td>
                  <td className="py-2 text-right tabular-nums text-stone-500">{countOf(row.enviadas)}</td>
                  <td className="py-2 text-right font-medium tabular-nums text-stone-900">
                    {countOf(row.respondieron)}
                    <span className="ml-1.5 text-xs font-normal text-stone-400">{pct(row.respondieron, row.enviadas)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex flex-1 flex-col">
            <MotivoLine rows={data.retomas.motivos} total={data.retomas.canceladas} />
          </div>
        </Card>

        <Card
          title="Mensajes después de las fotos"
          value={countOf(data.postFotos.enviadas)}
          badge={<Badge tone="neutral">{countOf(data.postFotos.canceladas)} canceladas</Badge>}
          caption="A los 40 min, 3 h y 6 h si el cliente no escribe"
        >
          <ul className="space-y-4">
            {data.postFotos.porPaso.map((row) => (
              <li key={row.paso}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-stone-600">{row.label}</span>
                  <span className="text-xs tabular-nums text-stone-400">
                    <span className="font-medium text-stone-900">{countOf(row.enviadas)}</span> enviadas de{' '}
                    {countOf(row.programadas)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
                  <div className={`h-full rounded-full ${TONE.progress}`} style={{ width: `${pct(row.enviadas, row.programadas)}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-1 flex-col">
            <MotivoLine rows={data.postFotos.motivos} total={data.postFotos.canceladas} />
          </div>
        </Card>

        <Card
          title="Carros más consultados"
          caption="Los que más se ofrecieron en las conversaciones"
          action={
            data.vehiculos.length > 6 ? (
              <CardButton onClick={() => setTodosVehiculos((v) => !v)}>{todosVehiculos ? 'Menos' : 'Ver todos'}</CardButton>
            ) : null
          }
        >
          {vehiculosVisibles.length === 0 ? (
            <p className="text-sm text-stone-500">Ninguna conversación tiene carros identificados.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {vehiculosVisibles.map((car, index) => (
                <li key={car.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-600">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-stone-800">{titleCase(car.nombre)}</span>
                    <span className="block text-xs text-stone-400">
                      {car.anio ?? '—'} · {moneyOf(car.precio)}
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-stone-900">{countOf(car.consultas)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Leads con señales de compra"
          value={countOf(senales.leads)}
          badge={<Badge tone="neutral">{countOf(senales.total)} señales</Badge>}
          caption={
            senales.desde
              ? `Lo que el cliente dijo en el chat que lo acerca o aleja de comprar · desde el ${dayOf(senales.desde)}`
              : 'Lo que el cliente dijo en el chat que lo acerca o aleja de comprar'
          }
          className="xl:col-span-2"
        >
          {senales.tipos.length === 0 ? (
            <p className="text-sm text-stone-500">Todavía no hay señales detectadas.</p>
          ) : (
            <ul className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
              {senales.tipos.map((row) => (
                <li key={row.key}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-stone-600">{row.label}</span>
                    <span className="font-medium tabular-nums text-stone-900">{countOf(row.total)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={`h-full rounded-full ${row.negativa ? TONE.accent : TONE.progress}`}
                      style={{ width: `${(row.total / tiposMax) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
            <Legend
              items={[
                { key: 'pos', label: 'Lo acerca a comprar', color: TONE.progress },
                { key: 'neg', label: 'Lo aleja', color: TONE.accent },
              ]}
            />
            <p className="mt-3 text-xs text-stone-400">
              Las detectó{' '}
              {senales.origenes.map((row, i) => (
                <span key={row.key}>
                  {i > 0 ? ' · ' : ''}
                  <span className="text-stone-600">{row.label.toLowerCase()}</span> {countOf(row.total)}
                </span>
              ))}
            </p>
          </div>
        </Card>

        <Card
          title="Cambios de temperatura"
          value={countOf(senales.temperatura.total)}
          badge={
            <>
              <Badge tone="up">{countOf(senales.temperatura.subieron)} subieron</Badge>
              <Badge tone="down">{countOf(senales.temperatura.bajaron)} bajaron</Badge>
            </>
          }
          caption="Cuando un lead pasa de frío, tibio o caliente a otro estado"
        >
          {senales.temperatura.cambios.length === 0 ? (
            <p className="text-sm text-stone-500">Todavía no hay cambios registrados.</p>
          ) : (
            <ul className="space-y-3">
              {senales.temperatura.cambios.map((row) => (
                <li key={`${row.de}-${row.a}`}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 text-stone-600">
                      {row.sube ? (
                        <ArrowUpRight className="h-4 w-4 text-stone-700" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                      )}
                      {row.deLabel} → {row.aLabel}
                    </span>
                    <span className="font-medium tabular-nums text-stone-900">{countOf(row.total)}</span>
                  </div>
                  <div className="ml-6 mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={`h-full rounded-full ${row.sube ? TONE.progress : TONE.accent}`}
                      style={{ width: `${(row.total / temperaturaMax) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section ref={listaRef} className="scroll-mt-6 rounded-2xl border border-stone-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(41,37,36,0.04),0_12px_32px_-16px_rgba(41,37,36,0.12)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-sm text-stone-500">Conversaciones</h2>
            <p className="mt-1 text-[28px] font-semibold leading-tight tracking-tight text-stone-900">
              {countOf(conversaciones.length)}
              <span className="ml-2 text-sm font-normal text-stone-400">de las {countOf(data.conversaciones.length)} más recientes</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Nombre o ID de Kommo"
              className="h-9 min-w-[12rem] rounded-lg border border-stone-200 px-3 text-sm outline-none focus:border-stone-400"
              aria-label="Buscar conversación"
            />
            <select
              value={etapa}
              onChange={(event) => setEtapa(event.target.value)}
              className="h-9 rounded-lg border border-stone-200 px-2.5 text-sm outline-none focus:border-stone-400"
              aria-label="Filtrar por etapa"
            >
              <option value="todas">Todas las etapas</option>
              {data.embudo.map((row) => (
                <option key={row.etapa} value={String(row.etapa)}>
                  Se quedó en {row.label.toLowerCase()}
                </option>
              ))}
            </select>
            <select
              value={objecion}
              onChange={(event) => setObjecion(event.target.value)}
              className="h-9 rounded-lg border border-stone-200 px-2.5 text-sm outline-none focus:border-stone-400"
              aria-label="Filtrar por objeción"
            >
              <option value="todas">Todas las objeciones</option>
              <option value="sin">Sin objeción</option>
              {data.objeciones.map((row) => (
                <option key={row.key} value={row.key}>
                  {row.label}
                </option>
              ))}
            </select>
            {etapa !== 'todas' || objecion !== 'todas' || q ? (
              <button
                type="button"
                onClick={() => {
                  setEtapa('todas')
                  setObjecion('todas')
                  setQ('')
                }}
                className="flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-800"
              >
                <X className="h-3.5 w-3.5" />
                Quitar filtros
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 max-h-[32rem] overflow-auto rounded-xl border border-stone-100">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-stone-50 text-xs text-stone-500">
              <tr>
                <th className="px-3 py-2.5 font-medium">Lead</th>
                <th className="px-3 py-2.5 font-medium">Se quedó en</th>
                <th className="px-3 py-2.5 font-medium">Objeción</th>
                <th className="px-3 py-2.5 font-medium">Ticket</th>
                <th className="px-3 py-2.5 font-medium">Presupuesto</th>
                <th className="px-3 py-2.5 font-medium">Seguimiento</th>
              </tr>
            </thead>
            <tbody>
              {conversaciones.map((row) => (
                <ConversationRows
                  key={row.id}
                  row={row}
                  open={abierta === row.id}
                  onToggle={() => setAbierta((current) => (current === row.id ? null : row.id))}
                />
              ))}
            </tbody>
          </table>
          {conversaciones.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-stone-500">Ninguna conversación coincide con el filtro.</p>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-stone-400">Toca un nombre para ver el resumen de la conversación.</p>
      </section>
    </div>
  )
}

function ConversationRows({
  row,
  open,
  onToggle,
}: {
  row: EmbudoConversacion
  open: boolean
  onToggle: () => void
}) {
  return (
    <>
      <tr className={open ? 'bg-stone-50' : 'hover:bg-stone-50/60'}>
        <td className="border-t border-stone-100 px-3 py-3">
          <button type="button" onClick={onToggle} className="text-left font-medium text-stone-900 hover:text-red-700">
            {row.nombre}
          </button>
          {row.humano ? (
            <span className="ml-2 rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-700">Humano</span>
          ) : null}
          {row.leadIdKommo != null ? (
            <a
              href={kommoLeadChatUrl(row.leadIdKommo)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 block w-fit text-xs tabular-nums text-stone-400 hover:text-red-700 hover:underline"
              title="Abrir en Kommo"
            >
              Kommo {row.leadIdKommo}
            </a>
          ) : (
            <span className="mt-0.5 block text-xs text-stone-300">Sin ID de Kommo</span>
          )}
          {row.senales.length > 0 ? (
            <span className="mt-1 inline-block rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-600">
              {row.senales.length} {row.senales.length === 1 ? 'señal' : 'señales'}
            </span>
          ) : null}
        </td>
        <td className="border-t border-stone-100 px-3 py-3 text-stone-700">{row.etapaLabel}</td>
        <td className="border-t border-stone-100 px-3 py-3 text-stone-700">{row.objecionLabel}</td>
        <td className="border-t border-stone-100 px-3 py-3 text-stone-700">{row.segmentoLabel}</td>
        <td className="border-t border-stone-100 px-3 py-3 tabular-nums text-stone-700">{moneyOf(row.presupuestoMonto)}</td>
        <td className="border-t border-stone-100 px-3 py-3 text-stone-700">{row.seguimientoLabel}</td>
      </tr>
      {open ? (
        <tr>
          <td colSpan={6} className="border-t border-stone-100 bg-stone-50 px-4 py-4 text-sm text-stone-700">
            <p className="max-w-3xl leading-relaxed">{row.resumen ?? 'Sin resumen.'}</p>
            {row.objecionTexto ? (
              <p className="mt-3 max-w-3xl leading-relaxed">
                <span className="font-medium text-stone-900">Objeción. </span>
                {row.objecionTexto}
              </p>
            ) : null}
            {row.objecionEvidencia ? (
              <p className="mt-2 max-w-3xl leading-relaxed text-stone-500">“{row.objecionEvidencia}”</p>
            ) : null}
            {row.senales.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Señales</p>
                <ul className="mt-2 space-y-2">
                  {row.senales.map((senal) => (
                    <li key={senal.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                          senal.negativa ? 'bg-red-50 text-red-700' : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {senal.label}
                      </span>
                      {senal.detalle ? <span className="text-stone-700">{senal.detalle}</span> : null}
                      {senal.fragmento ? <span className="text-stone-500">“{senal.fragmento}”</span> : null}
                      <span className="text-xs text-stone-400">
                        {senal.origen}
                        {senal.detectada ? ` · ${dateTimeOf(senal.detectada)}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {row.presupuestoDeclarado ? (
              <p className="mt-3 max-w-3xl leading-relaxed">
                <span className="font-medium text-stone-900">Lo que dijo de presupuesto. </span>
                {row.presupuestoDeclarado}
              </p>
            ) : null}
            <p className="mt-3 text-stone-500">
              Entrada {moneyOf(row.entradaDisponible)} · {row.formaPago ?? 'sin forma de pago'} · precio mostrado{' '}
              {moneyOf(row.precioMax)}
            </p>
            <p className="mt-1 text-xs text-stone-400">
              {row.analizadoHasta ? `Chat analizado hasta el ${dateTimeOf(row.analizadoHasta)}` : 'Sin fecha de análisis'}
              {row.cerradaAt ? ` · análisis cerrado el ${dateTimeOf(row.cerradaAt)}` : ''}
            </p>
            {row.leadId != null ? (
              <Link href={`/leads?lead=${row.leadId}`} className="mt-3 inline-block text-sm font-medium text-red-700 hover:underline">
                Abrir lead
              </Link>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  )
}
