'use client'

import type { CampaignSegment } from '@/types/marketing-campaigns'
import { CAMPAIGN_SEGMENTS } from '@/lib/marketing/campaign-segments'

type Props = {
  activeSegment: CampaignSegment
  onChange: (segment: CampaignSegment) => void
  stats?: Record<
    CampaignSegment,
    { groups: number; availableCount: number; assignedVehicles: number }
  >
}

export function CampaignSegmentTabs({ activeSegment, onChange, stats }: Props) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
      {CAMPAIGN_SEGMENTS.map((segment) => {
        const active = activeSegment === segment.id
        const segStats = stats?.[segment.id]
        return (
          <button
            key={segment.id}
            type="button"
            onClick={() => onChange(segment.id)}
            className={`inline-flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              active
                ? 'bg-white text-violet-700 border border-gray-200 border-b-white -mb-px shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/80'
            }`}
          >
            <span>{segment.plural}</span>
            {segStats != null && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  active ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {segStats.availableCount} disp.
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function formatRole(role: string | null | undefined): string {
  if (!role) return 'Staff'
  const map: Record<string, string> = {
    admin: 'Admin',
    marketing: 'Marketing',
    contable: 'Contable',
  }
  return map[role.toLowerCase()] ?? role
}

export function getCreatorInitials(fullName: string): string {
  return (
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

export function CreatorAvatar({
  fullName,
  size = 'sm',
  className = '',
}: {
  fullName: string
  size?: 'sm' | 'lg'
  className?: string
}) {
  const initials = getCreatorInitials(fullName)
  const sizeClasses =
    size === 'lg' ? 'h-14 w-14 text-xl' : 'h-4 w-4 text-[9px]'

  return (
    <span
      className={`flex items-center justify-center rounded-full bg-violet-600 font-bold text-white ${sizeClasses} ${className}`}
      aria-hidden
    >
      {initials}
    </span>
  )
}

export function CreatorBadge({
  fullName,
  role,
  compact = false,
}: {
  fullName: string
  role?: string | null
  compact?: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200 ${
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
      }`}
      title={`Creado por ${fullName}`}
    >
      <CreatorAvatar fullName={fullName} size="sm" />
      <span className="font-semibold truncate max-w-[120px]">{fullName}</span>
      {!compact && <span className="text-slate-400">· {formatRole(role)}</span>}
    </span>
  )
}
