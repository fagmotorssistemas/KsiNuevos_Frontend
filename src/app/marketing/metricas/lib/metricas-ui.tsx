'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Car,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Megaphone,
  Package,
  Search,
  Sparkles,
  Tag,
  Video,
  X,
} from 'lucide-react'

import type {
  CampaignRankRow,
  MetricasCampaignMonth,
  OrganicCreativesGroup,
  OrganicVideoPost,
  VehicleVideoViewsRow,
  VehicleLeadsRow,
} from './dashboard-metrics'

function formatCampaignMonthLabel(ym: MetricasCampaignMonth): string {
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return ym
  const raw = new Intl.DateTimeFormat('es-EC', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Guayaquil',
  }).format(new Date(Date.UTC(y, m - 1, 1, 12, 0, 0)))
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export function CampaignMonthPicker({
  value,
  options,
  onChange,
}: {
  value: MetricasCampaignMonth
  options: MetricasCampaignMonth[]
  onChange: (ym: MetricasCampaignMonth) => void
}) {
  const months = options.length > 0 ? options : [value]
  return (
    <label className="flex items-center gap-2 shrink-0">
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-gray-500 hidden sm:inline">
        Mes de campaña
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-extrabold text-gray-900 shadow-sm min-w-[160px] focus:outline-none focus:ring-2 focus:ring-violet-300"
      >
        {months.map((ym) => (
          <option key={ym} value={ym}>
            {formatCampaignMonthLabel(ym)}
          </option>
        ))}
      </select>
    </label>
  )
}

export function KpiTile({
  label,
  value,
  hint,
  accent = 'default',
  trend,
  valueVariant = 'numeric',
}: {
  label: string
  value: ReactNode
  hint?: string
  accent?: 'default' | 'violet' | 'emerald' | 'amber' | 'rose'
  trend?: number | null
  /** Texto largo (ej. nombre de vehículo): tipografía más pequeña y multilínea */
  valueVariant?: 'numeric' | 'text'
}) {
  const accentCls =
    accent === 'violet'
      ? 'border-indigo-200/60 bg-indigo-50/30'
      : accent === 'emerald'
        ? 'border-emerald-200/60 bg-emerald-50/30'
        : accent === 'amber'
          ? 'border-amber-200/60 bg-amber-50/30'
          : accent === 'rose'
            ? 'border-rose-200/60 bg-rose-50/30'
            : 'border-slate-200/60 bg-white'

  const labelColorCls =
    accent === 'violet'
      ? 'text-indigo-600'
      : accent === 'emerald'
        ? 'text-emerald-700'
        : accent === 'amber'
          ? 'text-amber-700'
          : accent === 'rose'
            ? 'text-rose-700'
            : 'text-slate-500'

  return (
    <div className={`rounded-3xl border p-5 shadow-sm transition-all hover:shadow-md ${accentCls}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-[11px] font-extrabold uppercase tracking-wider ${labelColorCls}`}>{label}</p>
        {trend != null &&
          (trend >= 0 ? (
            <div className="flex items-center gap-0.5 bg-emerald-100/50 text-emerald-700 px-1.5 py-0.5 rounded-md text-[10px] font-bold">
              <ArrowUpRight className="h-3 w-3 shrink-0" />
              <span>{trend}%</span>
            </div>
          ) : (
            <div className="flex items-center gap-0.5 bg-rose-100/50 text-rose-700 px-1.5 py-0.5 rounded-md text-[10px] font-bold">
              <ArrowDownRight className="h-3 w-3 shrink-0" />
              <span>{Math.abs(trend)}%</span>
            </div>
          ))}
      </div>
      <p
        className={
          valueVariant === 'text'
            ? 'mt-3 text-sm font-bold text-slate-800 leading-snug line-clamp-3 break-words'
            : 'mt-3 text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight'
        }
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-slate-500 leading-relaxed font-medium">{hint}</p>}
    </div>
  )
}

export type MetricsChannelTab = 'paid' | 'organic'

const CHANNEL_TABS: Array<{
  id: MetricsChannelTab
  label: string
  shortLabel: string
  icon: typeof Megaphone
  activeClass: string
  iconWrapActive: string
  iconClassActive: string
}> = [
  {
    id: 'paid',
    label: 'Campañas pagadas',
    shortLabel: 'Campañas',
    icon: Megaphone,
    activeClass: 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/80',
    iconWrapActive: 'bg-indigo-100 border-indigo-200/60',
    iconClassActive: 'text-indigo-600',
  },
  {
    id: 'organic',
    label: 'Contenido orgánico',
    shortLabel: 'Orgánico',
    icon: Video,
    activeClass: 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200/80',
    iconWrapActive: 'bg-emerald-100 border-emerald-200/60',
    iconClassActive: 'text-emerald-600',
  },
]

export function MetricsChannelTabs({
  active,
  onChange,
  paid,
  organic,
}: {
  active: MetricsChannelTab
  onChange: (tab: MetricsChannelTab) => void
  paid: ReactNode
  organic: ReactNode
}) {
  const meta =
    active === 'paid'
      ? {
          title: 'Campañas pagadas (Meta Ads)',
          subtitle:
            'Lo que reporta Facebook/Instagram en el mes seleccionado (no es la tabla de leads reales de abajo)',
          source: 'meta_campaign_metrics + meta_ad_vehicle_metrics',
        }
      : {
          title: 'Contenido orgánico',
          subtitle: 'Videos en Meta enlazados a inventario (marca, modelo y año desde inventoryoracle)',
          source: 'meta_video_metrics',
        }

  const activeTab = CHANNEL_TABS.find((t) => t.id === active) ?? CHANNEL_TABS[0]
  const ActiveIcon = activeTab.icon

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 bg-white space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex p-1 rounded-2xl bg-slate-100/90 border border-slate-200/60 w-full sm:w-auto">
            {CHANNEL_TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = active === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChange(tab.id)}
                  className={`flex flex-1 sm:flex-initial items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive ? tab.activeClass : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/80'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl border shrink-0 transition-colors ${
                      isActive
                        ? tab.iconWrapActive
                        : 'bg-transparent border-transparent'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${isActive ? tab.iconClassActive : 'text-slate-400'}`}
                    />
                  </span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </button>
              )
            })}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 shrink-0 self-start sm:self-center">
            {meta.source}
          </span>
        </div>

        <div className="flex items-start gap-3">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-2xl shrink-0 border ${activeTab.iconWrapActive}`}
          >
            <ActiveIcon className={`h-5 w-5 ${activeTab.iconClassActive}`} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">{meta.title}</h2>
            <p className="text-sm text-slate-500 mt-0.5 leading-snug">{meta.subtitle}</p>
          </div>
        </div>
      </div>
      <div className="p-6 bg-slate-50/30">{active === 'paid' ? paid : organic}</div>
    </section>
  )
}

/** @deprecated Usar MetricsChannelTabs para el panel principal de métricas */
export function MetricsBlock({
  step,
  title,
  subtitle,
  source,
  children,
}: {
  step: number
  title: string
  subtitle: string
  source: string
  children: ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 bg-white">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-extrabold text-indigo-600 shrink-0 border border-indigo-100/50">
            {step}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">{title}</h2>
            <p className="text-sm text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
            {source}
          </span>
        </div>
      </div>
      <div className="p-6 bg-slate-50/30">{children}</div>
    </section>
  )
}

export function RankingBars({
  items,
  maxValue,
  valueLabel,
  barClass = 'bg-indigo-500',
}: {
  items: Array<{ id: string; title: string; meta: string; value: number }>
  maxValue: number
  valueLabel: (n: number) => string
  barClass?: string
}) {
  const max = Math.max(1, maxValue)
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
        <p className="text-sm font-medium text-slate-500">Sin datos en este periodo.</p>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const pct = Math.round((item.value / max) * 100)
        return (
          <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="min-w-0 flex-1 flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {item.title}
                  </p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">{item.meta}</p>
                </div>
              </div>
              <span className="text-sm font-extrabold text-slate-900 shrink-0 tabular-nums bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                {valueLabel(item.value)}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full rounded-full ${barClass} transition-all duration-1000 ease-out`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatOrganicVideoDate(iso: string | null): string {
  if (!iso) return 'Fecha no disponible'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return new Intl.DateTimeFormat('es-EC', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Guayaquil',
  }).format(d)
}

function OrganicVideoPostRow({ post }: { post: OrganicVideoPost }) {
  const [captionExpanded, setCaptionExpanded] = useState(false)
  const [captionTruncated, setCaptionTruncated] = useState(false)
  const captionRef = useRef<HTMLParagraphElement>(null)
  const label =
    post.caption?.trim() ||
    post.title?.trim() ||
    `Video ${post.videoId.slice(-8)}`

  useEffect(() => {
    const el = captionRef.current
    if (!el || captionExpanded) return
    setCaptionTruncated(el.scrollHeight > el.clientHeight + 1)
  }, [label, captionExpanded])

  const toggleCaption = () => {
    if (captionTruncated || captionExpanded) setCaptionExpanded((v) => !v)
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            ref={captionRef}
            role={captionTruncated || captionExpanded ? 'button' : undefined}
            tabIndex={captionTruncated || captionExpanded ? 0 : undefined}
            onClick={toggleCaption}
            onKeyDown={(e) => {
              if (!captionTruncated && !captionExpanded) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toggleCaption()
              }
            }}
            className={`text-xs font-bold text-slate-900 leading-snug ${
              captionExpanded ? 'whitespace-pre-wrap' : 'line-clamp-1'
            } ${
              captionTruncated || captionExpanded
                ? 'cursor-pointer hover:text-emerald-800 transition-colors'
                : ''
            }`}
          >
            {label}
          </p>
          <p className="text-[11px] font-medium text-slate-500 mt-1">
            {formatOrganicVideoDate(post.createdTime)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-extrabold text-slate-900 tabular-nums">
            {fmtInt(post.views)} views
          </p>
          {post.retentionPct != null && (
            <p className="text-[10px] font-bold text-emerald-700 mt-0.5">
              Ret. {Math.round(post.retentionPct)}%
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-500">
        {post.avgTimeWatchedS != null && post.avgTimeWatchedS > 0 && (
          <span>Tiempo prom. {post.avgTimeWatchedS.toFixed(1)}s</span>
        )}
        {post.commentsCount > 0 && <span>{fmtInt(post.commentsCount)} coment.</span>}
        {post.sharesCount > 0 && <span>{fmtInt(post.sharesCount)} shares</span>}
      </div>
      {post.permalinkUrl && (
        <a
          href={post.permalinkUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
        >
          Ver en Meta
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  )
}

export type OrganicVehicleStatusTab = 'available' | 'sold'

export type OrganicMetricsSubTab = 'vehicles' | 'creatives'

const ORGANIC_TAB_GROUP_CLASS =
  'inline-flex flex-wrap gap-1 p-1 rounded-2xl bg-slate-100 border border-slate-200/80'

function OrganicTabButton({
  active,
  onClick,
  label,
  count,
  icon: Icon,
  activeBadgeClass,
  activeIconClass,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  icon: typeof Video
  activeBadgeClass: string
  activeIconClass: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all',
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
      ].join(' ')}
    >
      <Icon className={['h-3.5 w-3.5 shrink-0', active ? activeIconClass : 'text-slate-400'].join(' ')} />
      {label}
      <span
        className={[
          'tabular-nums rounded-md px-1.5 py-0.5 text-[10px] font-bold',
          active ? activeBadgeClass : 'bg-white text-slate-600',
        ].join(' ')}
      >
        {count}
      </span>
    </button>
  )
}

export function OrganicMetricsTabsBar({
  subTab,
  onSubTabChange,
  vehicleCount,
  creativeCount,
  vehicleStatus,
  onVehicleStatusChange,
  availableCount,
  soldCount,
}: {
  subTab: OrganicMetricsSubTab
  onSubTabChange: (tab: OrganicMetricsSubTab) => void
  vehicleCount: number
  creativeCount: number
  vehicleStatus: OrganicVehicleStatusTab
  onVehicleStatusChange: (tab: OrganicVehicleStatusTab) => void
  availableCount: number
  soldCount: number
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
      <div className={ORGANIC_TAB_GROUP_CLASS}>
        <OrganicTabButton
          active={subTab === 'vehicles'}
          onClick={() => onSubTabChange('vehicles')}
          label="Por vehículo"
          count={vehicleCount}
          icon={Video}
          activeBadgeClass="bg-emerald-100 text-emerald-800"
          activeIconClass="text-emerald-600"
        />
        <OrganicTabButton
          active={subTab === 'creatives'}
          onClick={() => onSubTabChange('creatives')}
          label="Creativos"
          count={creativeCount}
          icon={Sparkles}
          activeBadgeClass="bg-violet-100 text-violet-800"
          activeIconClass="text-violet-600"
        />
      </div>

      {subTab === 'vehicles' && (
        <div className={`${ORGANIC_TAB_GROUP_CLASS} sm:ml-auto`}>
          <OrganicTabButton
            active={vehicleStatus === 'available'}
            onClick={() => onVehicleStatusChange('available')}
            label="Disponibles"
            count={availableCount}
            icon={Car}
            activeBadgeClass="bg-emerald-100 text-emerald-800"
            activeIconClass="text-emerald-600"
          />
          <OrganicTabButton
            active={vehicleStatus === 'sold'}
            onClick={() => onVehicleStatusChange('sold')}
            label="Vendidos"
            count={soldCount}
            icon={Tag}
            activeBadgeClass="bg-slate-200 text-slate-700"
            activeIconClass="text-slate-600"
          />
        </div>
      )}
    </div>
  )
}

export function OrganicCreativesList({ group }: { group: OrganicCreativesGroup }) {
  const [isOpen, setIsOpen] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)

  if (group.posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
        <p className="text-sm font-medium text-slate-500">
          Sin creativos (TOP 5, comparativos, quiénes somos, etc.).
        </p>
      </div>
    )
  }

  const toggle = () => {
    setIsOpen((prev) => {
      const next = !prev
      if (next) {
        requestAnimationFrame(() => {
          rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        })
      }
      return next
    })
  }

  return (
    <div className="space-y-3">
      <div
        ref={rowRef}
        className={`rounded-2xl border bg-white shadow-sm transition-all ${
          isOpen
            ? 'border-emerald-200 ring-2 ring-emerald-100 shadow-md'
            : 'border-slate-100 hover:shadow-md'
        }`}
      >
        <button type="button" onClick={toggle} className="w-full text-left p-4 cursor-pointer">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="min-w-0 flex-1 flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                <Sparkles className="h-3.5 w-3.5 text-violet-600" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">{group.label}</p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  {fmtInt(group.videoCount)} video{group.videoCount !== 1 ? 's' : ''} · ret.{' '}
                  {group.retentionAvgPct != null
                    ? `${Math.round(group.retentionAvgPct)}%`
                    : '—'}
                  <span className="text-emerald-600 font-bold ml-1">
                    · {isOpen ? 'Ocultar' : 'Ver videos'}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-extrabold text-slate-900 tabular-nums bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                {fmtInt(group.views)} views
              </span>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </div>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 w-full opacity-40" />
          </div>
        </button>

        {isOpen && (
          <div className="px-4 pb-4 pt-0 border-t border-slate-100/80 animate-in slide-in-from-top-2 duration-200">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 pt-3 pb-2">
              {group.posts.length} video{group.posts.length !== 1 ? 's' : ''} desde ene 2026
            </p>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {group.posts.map((post) => (
                <OrganicVideoPostRow key={post.videoId} post={post} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const ORGANIC_VEHICLE_PAGE_SIZE = 10

export function OrganicVehicleRanking({
  vehicles,
  maxValue,
}: {
  vehicles: VehicleVideoViewsRow[]
  maxValue: number
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const max = Math.max(1, maxValue)
  const totalPages = Math.max(1, Math.ceil(vehicles.length / ORGANIC_VEHICLE_PAGE_SIZE))

  useEffect(() => {
    setPage(1)
    setExpandedId(null)
  }, [vehicles.length])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageRows = useMemo(() => {
    const start = (page - 1) * ORGANIC_VEHICLE_PAGE_SIZE
    return vehicles.slice(start, start + ORGANIC_VEHICLE_PAGE_SIZE)
  }, [vehicles, page])

  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
        <p className="text-sm font-medium text-slate-500">Sin vehículos en esta categoría.</p>
      </div>
    )
  }

  const toggle = (id: string) => {
    const next = expandedId === id ? null : id
    setExpandedId(next)
    if (next) {
      requestAnimationFrame(() => {
        rowRefs.current.get(next)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    }
  }

  const startIdx = (page - 1) * ORGANIC_VEHICLE_PAGE_SIZE + 1
  const endIdx = Math.min(page * ORGANIC_VEHICLE_PAGE_SIZE, vehicles.length)

  return (
    <div className="space-y-4">
      <div className="space-y-3">
      {pageRows.map((vehicle, i) => {
        const id = vehicle.rowId
        const isOpen = expandedId === id
        const rank = startIdx + i
        const pct = Math.round((vehicle.views / max) * 100)
        const hasPosts = vehicle.posts.length > 0

        return (
          <div
            key={id}
            ref={(el) => {
              if (el) rowRefs.current.set(id, el)
              else rowRefs.current.delete(id)
            }}
            className={`rounded-2xl border bg-white shadow-sm transition-all ${
              isOpen
                ? 'border-emerald-200 ring-2 ring-emerald-100 shadow-md'
                : vehicle.isVendido
                  ? 'border-slate-200 bg-slate-50/40 hover:shadow-md'
                  : 'border-slate-100 hover:shadow-md'
            }`}
          >
            <button
              type="button"
              onClick={() => hasPosts && toggle(id)}
              disabled={!hasPosts}
              className={`w-full text-left p-4 ${hasPosts ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0 flex-1 flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                    {rank}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={`text-sm font-bold truncate ${
                          vehicle.isVendido ? 'text-slate-500' : 'text-slate-900'
                        }`}
                      >
                        {vehicle.vehicleLabel}
                      </p>
                      {vehicle.isVendido && (
                        <span className="inline-flex shrink-0 items-center rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                          Vendido
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                      {fmtInt(vehicle.videoCount)} video{vehicle.videoCount !== 1 ? 's' : ''} · ret.{' '}
                      {vehicle.retentionAvgPct != null
                        ? `${Math.round(vehicle.retentionAvgPct)}%`
                        : '—'}
                      {hasPosts && (
                        <span className="text-emerald-600 font-bold ml-1">
                          · {isOpen ? 'Ocultar' : 'Ver videos'}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-extrabold text-slate-900 tabular-nums bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                    {fmtInt(vehicle.views)} views
                  </span>
                  {hasPosts && (
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  )}
                </div>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>

            {isOpen && hasPosts && (
              <div className="px-4 pb-4 pt-0 border-t border-slate-100/80 animate-in slide-in-from-top-2 duration-200">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 pt-3 pb-2">
                  {vehicle.posts.length} video{vehicle.posts.length !== 1 ? 's' : ''} desde ene 2026
                </p>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {vehicle.posts.map((post) => (
                    <OrganicVideoPostRow key={post.videoId} post={post} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
          <p className="text-xs font-semibold text-slate-600">
            Mostrando {startIdx}–{endIdx} de {fmtInt(vehicles.length)} vehículos
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => {
                setExpandedId(null)
                setPage((p) => Math.max(1, p - 1))
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Anterior
            </button>
            <span className="text-xs font-extrabold text-slate-700 tabular-nums px-1">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => {
                setExpandedId(null)
                setPage((p) => Math.min(totalPages, p + 1))
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function fmtUsd(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toLocaleString('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

/** Gasto Meta: muestra $0.00 en lugar de guion cuando el valor es cero. */
export function fmtUsdSpend(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—'
  return fmtUsd(n)
}

export function fmtInt(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toLocaleString('es-EC')
}

export function fmtPct(n: number | null | undefined, digits = 1) {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n.toLocaleString('es-EC', { maximumFractionDigits: digits })}%`
}

function AutoBadge({ label }: { label: string | null }) {
  if (!label || label === '—') {
    return <span className="text-gray-300 text-xs">—</span>
  }
  const isVarios = label === 'Varios'
  return (
    <span
      className={[
        'inline-block max-w-[140px] truncate text-[10px] font-bold px-2 py-0.5 rounded-full',
        isVarios ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800',
      ].join(' ')}
      title={label}
    >
      {label}
    </span>
  )
}

export function CampaignMetricsTable({ rows }: { rows: CampaignRankRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6">
        No hay campañas sincronizadas para este periodo. Ejecuta el refresh de Meta Ads.
      </p>
    )
  }

  return (
    <div className="rounded-xl border border-violet-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr className="bg-violet-900 text-white text-left">
              <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide">Campaña</th>
              <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-right">
                Gasto
              </th>
              <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-right">
                Contactos
              </th>
              <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-right">CPL</th>
              <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-right">
                Alcance
              </th>
              <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-right">
                Impresiones
              </th>
              <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-right">
                Clics
              </th>
              <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-center">
                Snapshot
              </th>
              <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-center">
                Auto(s)
              </th>
              <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-center">
                Ads
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr
                key={`${c.campaign_id}-${c.isGeneral ? 'g' : 'v'}-${i}`}
                className={i % 2 === 0 ? 'bg-white' : 'bg-violet-50/30'}
              >
                <td className="px-3 py-3 align-top">
                  <p className="font-extrabold text-gray-900 leading-snug max-w-[220px]">
                    {c.campaign_name}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5 truncate max-w-[200px]">
                    {c.campaign_id}
                  </p>
                  {c.dateStart && c.dateStop && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      {c.dateStart} → {c.dateStop}
                    </p>
                  )}
                </td>
                <td className="px-3 py-3 text-right font-bold text-gray-900 tabular-nums">
                  {fmtUsd(c.spend)}
                </td>
                <td className="px-3 py-3 text-right font-extrabold text-violet-800 tabular-nums">
                  {fmtInt(c.leads)}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-emerald-700 tabular-nums">
                  {fmtUsd(c.cpl)}
                </td>
                <td className="px-3 py-3 text-right text-gray-700 tabular-nums">{fmtInt(c.reach)}</td>
                <td className="px-3 py-3 text-right text-gray-700 tabular-nums">
                  {fmtInt(c.impressions)}
                </td>
                <td className="px-3 py-3 text-right text-gray-700 tabular-nums">{fmtInt(c.clicks)}</td>
                <td className="px-3 py-3 text-center text-[10px] font-mono text-gray-500">
                  {c.reportDate ?? '—'}
                </td>
                <td className="px-3 py-3 text-center">
                  <AutoBadge label={c.autoLabel} />
                </td>
                <td className="px-3 py-3 text-center text-xs font-semibold text-gray-600 tabular-nums">
                  {c.adsCount != null && c.adsCount > 0 ? fmtInt(c.adsCount) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 text-white font-extrabold">
              <td className="px-3 py-3 text-xs uppercase">Total</td>
              <td className="px-3 py-3 text-right tabular-nums">
                {fmtUsd(rows.reduce((s, c) => s + c.spend, 0))}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {fmtInt(rows.reduce((s, c) => s + c.leads, 0))}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {fmtUsd(
                  rows.reduce((s, c) => s + c.leads, 0) > 0
                    ? rows.reduce((s, c) => s + c.spend, 0) / rows.reduce((s, c) => s + c.leads, 0)
                    : null
                )}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {fmtInt(rows.reduce((s, c) => s + c.reach, 0))}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {fmtInt(rows.reduce((s, c) => s + c.impressions, 0))}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {fmtInt(rows.reduce((s, c) => s + c.clicks, 0))}
              </td>
              <td />
              <td />
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

const VEHICLE_LEADS_PAGE_SIZE = 10

type VehicleLeadsTab = 'campaign' | 'neutral'

function normalizeVehicleSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function matchesVehicleLeadsSearch(row: VehicleLeadsRow, query: string): boolean {
  const q = normalizeVehicleSearchText(query.trim())
  if (!q) return true
  const haystack = [
    row.vehicleLabel,
    row.brand,
    row.model,
    row.plate,
    row.plateShort,
  ]
    .filter((part) => part != null && String(part).trim() !== '')
    .map((part) => normalizeVehicleSearchText(String(part)))
  return haystack.some((part) => part.includes(q))
}

function VehicleLeadsTableBody({
  rows,
  mode,
  emptyMessage,
}: {
  rows: VehicleLeadsRow[]
  mode: VehicleLeadsTab
  emptyMessage: string
}) {
  const [page, setPage] = useState(1)
  const isNeutral = mode === 'neutral'

  const totalPages = Math.max(1, Math.ceil(rows.length / VEHICLE_LEADS_PAGE_SIZE))

  useEffect(() => {
    setPage(1)
  }, [rows.length, mode])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageRows = useMemo(() => {
    const start = (page - 1) * VEHICLE_LEADS_PAGE_SIZE
    return rows.slice(start, start + VEHICLE_LEADS_PAGE_SIZE)
  }, [rows, page])

  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-500 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center font-medium">
        {emptyMessage}
      </p>
    )
  }

  const totCamp = rows.reduce((s, r) => s + r.leadsCampanas, 0)
  const totOrg = rows.reduce((s, r) => s + r.leadsOrganicos, 0)
  const totAll = rows.reduce((s, r) => s + r.leadsTotal, 0)
  const totSpend = rows.reduce((s, r) => s + r.spendCampanas, 0)
  const totCpl = totCamp > 0 ? totSpend / totCamp : null
  const totReach = rows.reduce((s, r) => s + r.reachSum, 0)
  const totImpressions = rows.reduce((s, r) => s + r.impressionsSum, 0)
  const totClicks = rows.reduce((s, r) => s + r.clicksSum, 0)
  const totCaliente = rows.reduce((s, r) => s + r.leadsCaliente, 0)
  const totTibio = rows.reduce((s, r) => s + r.leadsTibio, 0)
  const totFrio = rows.reduce((s, r) => s + r.leadsFrio, 0)
  const totShowroom = rows.reduce((s, r) => s + r.showroomVisitas, 0)
  const totCitasIa = rows.reduce((s, r) => s + r.citasIa, 0)

  const startIdx = (page - 1) * VEHICLE_LEADS_PAGE_SIZE + 1
  const endIdx = Math.min(page * VEHICLE_LEADS_PAGE_SIZE, rows.length)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[1260px] text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 text-left border-b border-slate-200">
                <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider">Vehículo</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-right">
                  Leads campañas
                </th>
                <th
                  className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-right"
                  title={
                    isNeutral
                      ? 'Visitas showroom en el mes'
                      : 'Visitas showroom (visit_start) en ventana de campaña del auto'
                  }
                >
                  Showroom
                </th>
                <th
                  className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-right"
                  title="Sugerencias IA en ventana de campaña (solo autos con campaña)"
                >
                  Citas IA
                </th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-right">
                  Gasto (Meta)
                </th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-right">
                  CPL
                </th>
                <th
                  className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-right"
                  title="Pico en ventana de campaña"
                >
                  🔥 Caliente
                </th>
                <th
                  className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-right"
                  title="Pico en ventana de campaña"
                >
                  ⛅ Tibio
                </th>
                <th
                  className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-right"
                  title="Pico en ventana de campaña"
                >
                  🧊 Frío
                </th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-right">
                  Alcance
                </th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-right">
                  Impresiones
                </th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-right">
                  Clics
                </th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-right">
                  {isNeutral ? 'Leads mes' : 'Leads orgánicos'}
                </th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-right">
                  Total leads
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.map((v) => (
                <tr
                  key={v.inventoryId}
                  className={`transition-colors hover:bg-slate-50/80 ${
                    v.isVendido ? 'bg-slate-50/50' : 'bg-white'
                  }`}
                >
                  <td className="px-4 py-3.5 align-top">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`font-bold ${v.isVendido ? 'text-slate-500' : 'text-slate-900'}`}>
                        {v.vehicleLabel}
                      </p>
                      {v.isVendido && (
                        <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                          Vendido
                        </span>
                      )}
                      {isNeutral && (
                        <span className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-800">
                          Sin campaña
                        </span>
                      )}
                    </div>
                    {v.campaignCount > 0 && (
                      <p className="text-[10px] text-slate-500 mt-1 font-medium">
                        {v.campaignCount} campaña{v.campaignCount !== 1 ? 's' : ''} · leads y citas IA por
                        created_at en ventana
                      </p>
                    )}
                    {isNeutral && (
                      <p className="text-[10px] text-slate-500 mt-1 font-medium">
                        Disponible en patio · sin publicación en Meta este mes
                      </p>
                    )}
                    {v.isVendido && v.spendCampanas > 0 && v.campaignCount === 0 && (
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        Gasto Meta en campaña del mes
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-indigo-600 tabular-nums">
                    {fmtInt(v.leadsCampanas)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-slate-700 tabular-nums">
                    {fmtInt(v.showroomVisitas)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-violet-600 tabular-nums">
                    {fmtInt(v.citasIa)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-900 tabular-nums">
                    {fmtUsdSpend(v.spendCampanas)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium text-emerald-600 tabular-nums">
                    {fmtUsd(v.cplReal)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-rose-600 tabular-nums">
                    {fmtInt(v.leadsCaliente)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-amber-600 tabular-nums">
                    {fmtInt(v.leadsTibio)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium text-sky-600 tabular-nums">
                    {fmtInt(v.leadsFrio)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-600 tabular-nums">{fmtInt(v.reachSum)}</td>
                  <td className="px-4 py-3.5 text-right text-slate-600 tabular-nums">
                    {fmtInt(v.impressionsSum)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-600 tabular-nums">{fmtInt(v.clicksSum)}</td>
                  <td className="px-4 py-3.5 text-right text-slate-500 tabular-nums">
                    {fmtInt(v.leadsOrganicos)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-slate-900 tabular-nums">
                    {fmtInt(v.leadsTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold">
                <td className="px-4 py-4 text-xs uppercase tracking-wider">Total</td>
                <td className="px-4 py-4 text-right tabular-nums">{fmtInt(totCamp)}</td>
                <td className="px-4 py-4 text-right tabular-nums">{fmtInt(totShowroom)}</td>
                <td className="px-4 py-4 text-right tabular-nums">{fmtInt(totCitasIa)}</td>
                <td className="px-4 py-4 text-right tabular-nums">{fmtUsdSpend(totSpend)}</td>
                <td className="px-4 py-4 text-right tabular-nums">{fmtUsd(totCpl)}</td>
                <td className="px-4 py-4 text-right tabular-nums">{fmtInt(totCaliente)}</td>
                <td className="px-4 py-4 text-right tabular-nums">{fmtInt(totTibio)}</td>
                <td className="px-4 py-4 text-right tabular-nums">{fmtInt(totFrio)}</td>
                <td className="px-4 py-4 text-right tabular-nums">{fmtInt(totReach)}</td>
                <td className="px-4 py-4 text-right tabular-nums">{fmtInt(totImpressions)}</td>
                <td className="px-4 py-4 text-right tabular-nums">{fmtInt(totClicks)}</td>
                <td className="px-4 py-4 text-right tabular-nums">{fmtInt(totOrg)}</td>
                <td className="px-4 py-4 text-right tabular-nums">{fmtInt(totAll)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
          <p className="text-xs font-semibold text-slate-600">
            Mostrando {startIdx}–{endIdx} de {fmtInt(rows.length)} vehículos
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Anterior
            </button>
            <span className="text-xs font-extrabold text-slate-700 tabular-nums px-1">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function VehicleLeadsTable({
  campaignRows,
  neutralRows,
}: {
  campaignRows: VehicleLeadsRow[]
  neutralRows: VehicleLeadsRow[]
}) {
  const [tab, setTab] = useState<VehicleLeadsTab>('campaign')
  const [searchQuery, setSearchQuery] = useState('')

  const activeRows = tab === 'campaign' ? campaignRows : neutralRows
  const filteredRows = useMemo(
    () => activeRows.filter((row) => matchesVehicleLeadsSearch(row, searchQuery)),
    [activeRows, searchQuery]
  )
  const hasSearch = searchQuery.trim().length > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200/80 w-fit">
        <button
          type="button"
          onClick={() => setTab('campaign')}
          className={[
            'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all',
            tab === 'campaign'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900',
          ].join(' ')}
        >
          <Megaphone className="h-3.5 w-3.5 text-indigo-600" />
          En campaña
          <span
            className={[
              'tabular-nums rounded-md px-1.5 py-0.5 text-[10px]',
              tab === 'campaign' ? 'bg-indigo-100 text-indigo-800' : 'bg-white text-slate-600',
            ].join(' ')}
          >
            {campaignRows.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab('neutral')}
          className={[
            'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all',
            tab === 'neutral'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900',
          ].join(' ')}
        >
          <Package className="h-3.5 w-3.5 text-sky-600" />
          Inventario neutro
          <span
            className={[
              'tabular-nums rounded-md px-1.5 py-0.5 text-[10px]',
              tab === 'neutral' ? 'bg-sky-100 text-sky-800' : 'bg-white text-slate-600',
            ].join(' ')}
          >
            {neutralRows.length}
          </span>
        </button>
        </div>

        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por marca, modelo o placa..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm font-medium text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            aria-label="Buscar vehículos por marca, modelo o placa"
          />
          {hasSearch && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {hasSearch && (
        <p className="text-xs font-semibold text-slate-500 -mt-1">
          {filteredRows.length === 0
            ? 'Sin coincidencias para tu búsqueda.'
            : `${fmtInt(filteredRows.length)} de ${fmtInt(activeRows.length)} vehículo${
                activeRows.length !== 1 ? 's' : ''
              }`}
        </p>
      )}

      {tab === 'neutral' && (
        <p className="text-xs text-slate-500 font-medium -mt-1">
          Autos <span className="font-extrabold text-slate-700">disponibles en patio</span> sin campaña Meta en el
          mes. Leads = contactos del mes sin ventana de anuncio.
        </p>
      )}

      <VehicleLeadsTableBody
        key={`${tab}-${searchQuery}`}
        rows={filteredRows}
        mode={tab}
        emptyMessage={
          hasSearch
            ? 'Ningún vehículo coincide con marca, modelo o placa.'
            : tab === 'campaign'
              ? 'Sin vehículos con campaña o gasto Meta mapeado en este mes.'
              : 'No hay autos disponibles en patio sin campaña en este mes.'
        }
      />
    </div>
  )
}
