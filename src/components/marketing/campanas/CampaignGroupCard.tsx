'use client'

import {
  Calendar,
  CheckCircle2,
  CircleDot,
  Plus,
  Trash2,
  User,
} from 'lucide-react'
import type { CampaignGroupRow, CampaignGroupStatus } from '@/types/marketing-campaigns'
import {
  CAMPAIGN_STATUS_LABELS,
  formatVehiclePrice,
} from '@/types/marketing-campaigns'
import { segmentLabel } from '@/lib/marketing/campaign-segments'
import { CreatorAvatar, CreatorBadge } from './CampaignSegmentTabs'
import { CampaignContentNeedsBanner } from './CampaignContentNeeds'
import { CampaignVehicleItem } from './CampaignVehicleItem'

const STATUS_STYLES: Record<CampaignGroupStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  completed: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
}

type Props = {
  group: CampaignGroupRow
  selected: boolean
  onSelect: () => void
  onStatusChange: (status: CampaignGroupStatus) => void
  onDelete: () => void
  onUpdateVehicle: (
    vehicleId: string,
    patch: {
      notes?: string | null
      reelsCount?: number
      postsCount?: number
      needsVideo?: boolean
      needsPhotos?: boolean
    }
  ) => void
  onRemoveVehicle: (vehicleId: string) => void
}

export function CampaignGroupCard({
  group,
  selected,
  onSelect,
  onStatusChange,
  onDelete,
  onUpdateVehicle,
  onRemoveVehicle,
}: Props) {
  const missingVideos = group.vehicles.filter((v) => v.needsVideo).length

  return (
    <article
      className={`rounded-2xl border bg-white shadow-sm transition-all overflow-hidden ${
        selected
          ? 'border-violet-300 ring-2 ring-violet-100 shadow-md'
          : 'border-gray-200 hover:border-violet-200 hover:shadow-md'
      }`}
    >
      <button type="button" onClick={onSelect} className="w-full text-left p-4 sm:p-5">
        <div className="flex gap-4">
          <div className="relative flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-violet-50 ring-1 ring-violet-100">
            {group.creator ? (
              <CreatorAvatar fullName={group.creator.full_name} size="lg" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-slate-400">
                <User className="h-7 w-7" />
              </div>
            )}
            {group.status === 'active' && (
              <span className="absolute left-1.5 top-1.5 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                Activa
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 truncate">{group.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {group.segment ? segmentLabel(group.segment) : group.vehicle_category ?? '—'}
                  {' · '}
                  {group.vehicles.length} vehículo{group.vehicles.length === 1 ? '' : 's'}
                  {missingVideos > 0 ? ` · ${missingVideos} sin video` : ''}
                </p>
                {group.creator && (
                  <div className="mt-2">
                    <CreatorBadge
                      fullName={group.creator.full_name}
                      role={group.creator.role}
                      compact
                    />
                  </div>
                )}
              </div>
              <span
                className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[group.status]}`}
              >
                <CircleDot className="h-3 w-3" />
                {CAMPAIGN_STATUS_LABELS[group.status]}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-violet-500" />
                {group.campaign_month}
              </span>
            </div>
          </div>
        </div>
      </button>

      {group.vehicles.length > 0 && <CampaignContentNeedsBanner group={group} />}

      {group.vehicles.length > 0 && (
        <div className="border-t border-gray-100 px-4 sm:px-5 py-3 space-y-2 bg-slate-50/50">
          {group.vehicles.map((vehicle, index) => (
            <CampaignVehicleItem
              key={vehicle.id}
              index={index + 1}
              vehicle={vehicle}
              onUpdate={onUpdateVehicle}
              onRemove={onRemoveVehicle}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-4 py-2.5 bg-white">
        <div className="flex items-center gap-1">
          {group.status !== 'active' && (
            <button
              type="button"
              onClick={() => onStatusChange('active')}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Activar
            </button>
          )}
          {group.status === 'active' && (
            <button
              type="button"
              onClick={() => onStatusChange('completed')}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50"
            >
              Completar
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Eliminar
        </button>
      </div>
    </article>
  )
}

export function CreateGroupButton({
  onCreate,
  nextIndex,
  category,
}: {
  onCreate: (name: string) => void
  nextIndex: number
  category?: string | null
}) {
  const label = category
    ? `${category} ${nextIndex}`
    : `Grupo ${nextIndex}`

  return (
    <button
      type="button"
      onClick={() => onCreate(label)}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 px-4 py-8 text-sm font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-50"
    >
      <Plus className="h-5 w-5" />
      Nuevo grupo — {label}
    </button>
  )
}

export function CampaignStatsBar({
  stats,
}: {
  stats: {
    groups?: number
    totalGroups?: number
    activeGroups: number
    assignedVehicles: number
    availableCount: number
    missingVideo: number
  }
}) {
  const totalGroups = stats.totalGroups ?? stats.groups ?? 0
  const items = [
    { label: 'Grupos', value: totalGroups },
    { label: 'Activas', value: stats.activeGroups },
    { label: 'En campaña', value: stats.assignedVehicles },
    { label: 'Disponibles', value: stats.availableCount },
    { label: 'Sin video', value: stats.missingVideo },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {item.label}
          </p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{item.value}</p>
        </div>
      ))}
    </div>
  )
}

export function groupVehicleSummary(group: CampaignGroupRow) {
  const total = group.vehicles.reduce((sum, v) => sum + (v.display_price ?? 0), 0)
  return formatVehiclePrice(total > 0 ? total : null)
}
