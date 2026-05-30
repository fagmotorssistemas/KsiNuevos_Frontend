'use client'

import { Calendar, ChevronRight, Inbox, MessageSquarePlus, Paperclip, User } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import { MODULE_LABELS, TYPE_LABELS } from '../constants'
import type { MarketingDevRequest, MarketingDevRequestStatus } from '@/types/marketing-dev-requests'
import { FilterBar } from './ui/FilterBar'
import { StatusBadge } from './ui/StatusBadge'

type Props = {
  requests: MarketingDevRequest[]
  loading: boolean
  statusFilter: MarketingDevRequestStatus | 'all'
  onStatusFilter: (v: MarketingDevRequestStatus | 'all') => void
  mineOnly: boolean
  onMineOnly: (v: boolean) => void
  search: string
  onSearch: (v: string) => void
  onSelect: (r: MarketingDevRequest) => void
  onNewClick: () => void
  isAdmin?: boolean
  areaLabel?: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-EC', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function RequestCard({ r, onSelect }: { r: MarketingDevRequest; onSelect: () => void }) {
  const attCount = r.attachments?.length ?? 0
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group w-full text-left rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">
              {r.reference_code}
            </span>
            <StatusBadge status={r.status} size="sm" />
          </div>
          <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-violet-900 transition-colors">
            {r.title}
          </h3>
          <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{r.description}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-slate-400" />
              {r.requester_name}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {formatDate(r.created_at)}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
              {MODULE_LABELS[r.target_module]}
            </span>
            <span className="text-slate-400">{TYPE_LABELS[r.request_type]}</span>
            {attCount > 0 && (
              <span className="inline-flex items-center gap-1 text-violet-600">
                <Paperclip className="h-3.5 w-3.5" />
                {attCount}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-violet-500 shrink-0 mt-1 transition-colors" />
      </div>
    </button>
  )
}

function ListSkeleton() {
  return (
    <ul className="space-y-3">
      {[1, 2, 3].map((i) => (
        <li key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
      ))}
    </ul>
  )
}

export function DevRequestList({
  requests,
  loading,
  statusFilter,
  onStatusFilter,
  mineOnly,
  onMineOnly,
  search,
  onSearch,
  onSelect,
  onNewClick,
  isAdmin = false,
  areaLabel,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {isAdmin ? 'Bandeja de solicitudes' : `Solicitudes de ${areaLabel ?? 'tu área'}`}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? 'Haz clic en una tarjeta para ver el detalle completo'
              : 'Tu equipo ve las solicitudes enviadas por personas de la misma área'}
          </p>
        </div>
        <button
          type="button"
          onClick={onNewClick}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/25 hover:bg-violet-700 transition-colors"
        >
          <MessageSquarePlus size={18} />
          Nueva solicitud
        </button>
      </div>

      <FilterBar
        search={search}
        onSearch={onSearch}
        statusFilter={statusFilter}
        onStatusFilter={onStatusFilter}
        mineOnly={mineOnly}
        onMineOnly={onMineOnly}
        totalCount={requests.length}
        isAdmin={isAdmin}
        areaLabel={areaLabel}
      />

      {loading ? (
        <ListSkeleton />
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white py-16 px-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
            <Inbox className="h-8 w-8" />
          </div>
          <p className="text-base font-bold text-slate-800">No hay solicitudes aquí</p>
          <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
            Prueba otro filtro o crea la primera solicitud para el equipo de desarrollo.
          </p>
          <button
            type="button"
            onClick={onNewClick}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Crear solicitud
          </button>
        </div>
      ) : (
        <ul className={twMerge('space-y-3', loading && 'opacity-60')}>
          {requests.map((r) => (
            <li key={r.id}>
              <RequestCard r={r} onSelect={() => onSelect(r)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
