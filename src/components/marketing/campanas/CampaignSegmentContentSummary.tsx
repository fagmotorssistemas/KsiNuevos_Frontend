'use client'

import { Camera, Clapperboard } from 'lucide-react'
import type { CampaignGroupRow, CampaignSegment } from '@/types/marketing-campaigns'
import { segmentLabel } from '@/lib/marketing/campaign-segments'
import { vehicleTitle } from '@/types/marketing-campaigns'

export function CampaignSegmentContentSummary({
  segment,
  groups,
}: {
  segment: CampaignSegment
  groups: CampaignGroupRow[]
}) {
  const videoSet = new Set<string>()
  const photoSet = new Set<string>()

  for (const group of groups) {
    for (const v of group.vehicles) {
      if (v.needsVideo) videoSet.add(vehicleTitle(v.brand, v.model, v.year))
      if (v.needsPhotos) photoSet.add(vehicleTitle(v.brand, v.model, v.year))
    }
  }

  if (videoSet.size === 0 && photoSet.size === 0) return null

  return (
    <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/80 via-white to-amber-50/50 p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-violet-800 mb-3">
        Contenido pendiente · {segmentLabel(segment)}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {videoSet.size > 0 && (
          <div className="rounded-xl bg-white/80 p-3 ring-1 ring-violet-100">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-violet-900">
              <Clapperboard className="h-4 w-4 text-violet-600" />
              Necesitan video ({videoSet.size})
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              {[...videoSet].join(' · ')}
            </p>
          </div>
        )}
        {photoSet.size > 0 && (
          <div className="rounded-xl bg-white/80 p-3 ring-1 ring-sky-100">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-sky-900">
              <Camera className="h-4 w-4 text-sky-600" />
              Necesitan fotos ({photoSet.size})
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              {[...photoSet].join(' · ')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
