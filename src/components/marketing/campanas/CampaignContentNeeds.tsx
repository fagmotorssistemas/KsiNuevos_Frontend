'use client'

import { Camera, Clapperboard } from 'lucide-react'
import type { CampaignGroupRow } from '@/types/marketing-campaigns'

export function CampaignContentNeedsBanner({ group }: { group: CampaignGroupRow }) {
  const hasVideoNeeds = group.needsVideoVehicles.length > 0
  const hasPhotoNeeds = group.needsPhotosVehicles.length > 0

  if (!hasVideoNeeds && !hasPhotoNeeds) return null

  return (
    <div className="mx-4 sm:mx-5 mb-3 overflow-hidden rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-violet-50 shadow-sm">
      <div className="border-b border-amber-100/80 bg-white/60 px-4 py-2.5">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
          Pendientes de contenido
        </p>
      </div>
      <div className="space-y-2.5 px-4 py-3">
        {hasVideoNeeds && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-violet-800">
              <Clapperboard className="h-3.5 w-3.5" />
              Necesitan video / reel
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.needsVideoVehicles.map((label) => (
                <span
                  key={`v-${label}`}
                  className="inline-flex items-center rounded-lg bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-800 ring-1 ring-violet-200"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
        {hasPhotoNeeds && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-sky-800">
              <Camera className="h-3.5 w-3.5" />
              Necesitan fotos
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.needsPhotosVehicles.map((label) => (
                <span
                  key={`p-${label}`}
                  className="inline-flex items-center rounded-lg bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-800 ring-1 ring-sky-200"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function ContentNeedCheckbox({
  label,
  icon: Icon,
  checked,
  onChange,
}: {
  label: string
  icon: typeof Clapperboard
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 ring-1 ring-slate-200 hover:bg-white">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
      />
      <Icon className="h-3 w-3 text-violet-600 shrink-0" />
      <span className="text-[10px] font-semibold text-slate-600">{label}</span>
    </label>
  )
}
