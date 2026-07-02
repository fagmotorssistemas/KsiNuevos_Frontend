'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Camera, Clapperboard, Megaphone, Minus, Plus, StickyNote, Trash2 } from 'lucide-react'
import type { CampaignVehicleRow } from '@/types/marketing-campaigns'
import { formatVehiclePrice, vehicleTitle } from '@/types/marketing-campaigns'
import { ContentNeedCheckbox } from './CampaignContentNeeds'

type Props = {
  index: number
  vehicle: CampaignVehicleRow
  onUpdate: (
    vehicleId: string,
    patch: {
      notes?: string | null
      reelsCount?: number
      postsCount?: number
      needsVideo?: boolean
      needsPhotos?: boolean
    }
  ) => void
  onRemove: (vehicleId: string) => void
}

function CountStepper({
  label,
  icon: Icon,
  value,
  onChange,
}: {
  label: string
  icon: typeof Clapperboard
  value: number
  onChange: (next: number) => void
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-1.5 py-1 ring-1 ring-slate-200">
      <Icon className="h-3 w-3 text-violet-600 shrink-0" />
      <span className="text-[10px] font-semibold text-slate-500">{label}</span>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="rounded-md p-0.5 text-slate-500 hover:bg-white hover:text-violet-700"
        aria-label={`Menos ${label}`}
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-9 rounded-md border border-gray-200 bg-white px-1 py-0.5 text-center text-[11px] font-bold text-slate-800"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="rounded-md p-0.5 text-slate-500 hover:bg-white hover:text-violet-700"
        aria-label={`Más ${label}`}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}

export function CampaignVehicleItem({ index, vehicle, onUpdate, onRemove }: Props) {
  const [notes, setNotes] = useState(vehicle.notes ?? '')
  const [reelsCount, setReelsCount] = useState(vehicle.reelsCount)
  const [postsCount, setPostsCount] = useState(vehicle.postsCount)
  const [needsVideo, setNeedsVideo] = useState(vehicle.needsVideo)
  const [needsPhotos, setNeedsPhotos] = useState(vehicle.needsPhotos)

  useEffect(() => {
    setNotes(vehicle.notes ?? '')
    setReelsCount(vehicle.reelsCount)
    setPostsCount(vehicle.postsCount)
    setNeedsVideo(vehicle.needsVideo)
    setNeedsPhotos(vehicle.needsPhotos)
  }, [
    vehicle.id,
    vehicle.notes,
    vehicle.reelsCount,
    vehicle.postsCount,
    vehicle.needsVideo,
    vehicle.needsPhotos,
  ])

  const persistCounts = (nextReels: number, nextPosts: number) => {
    if (nextReels !== vehicle.reelsCount || nextPosts !== vehicle.postsCount) {
      void onUpdate(vehicle.id, { reelsCount: nextReels, postsCount: nextPosts })
    }
  }

  const persistNeed = (field: 'needsVideo' | 'needsPhotos', next: boolean) => {
    if (field === 'needsVideo' && next !== vehicle.needsVideo) {
      void onUpdate(vehicle.id, { needsVideo: next })
    }
    if (field === 'needsPhotos' && next !== vehicle.needsPhotos) {
      void onUpdate(vehicle.id, { needsPhotos: next })
    }
  }

  return (
    <div className="flex items-start gap-2 rounded-xl border border-white bg-white px-3 py-2.5 shadow-sm">
      <span className="mt-1 text-xs font-bold text-violet-500 w-5 shrink-0">{index}.</span>

      <div className="relative h-10 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {vehicle.img_main_url ? (
          <Image src={vehicle.img_main_url} alt="" fill className="object-cover" sizes="48px" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300 text-[10px]">—</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {vehicleTitle(vehicle.brand, vehicle.model, vehicle.year)}
            </p>
            <p className="text-xs font-bold text-violet-700">
              {formatVehiclePrice(vehicle.display_price)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(vehicle.id)}
            className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Quitar vehículo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <CountStepper
            label="Reels"
            icon={Clapperboard}
            value={reelsCount}
            onChange={(next) => {
              setReelsCount(next)
              persistCounts(next, postsCount)
            }}
          />
          <CountStepper
            label="Posts"
            icon={Megaphone}
            value={postsCount}
            onChange={(next) => {
              setPostsCount(next)
              persistCounts(reelsCount, next)
            }}
          />
          <ContentNeedCheckbox
            label="Falta video"
            icon={Clapperboard}
            checked={needsVideo}
            onChange={(next) => {
              setNeedsVideo(next)
              persistNeed('needsVideo', next)
            }}
          />
          <ContentNeedCheckbox
            label="Faltan fotos"
            icon={Camera}
            checked={needsPhotos}
            onChange={(next) => {
              setNeedsPhotos(next)
              persistNeed('needsPhotos', next)
            }}
          />
        </div>

        <div className="mt-2">
          <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            <StickyNote className="h-3 w-3" />
            Nota
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              const trimmed = notes.trim()
              if (trimmed !== (vehicle.notes ?? '').trim()) {
                void onUpdate(vehicle.id, { notes: trimmed || null })
              }
            }}
            placeholder="Ej. Pedir fotos del interior, grabar reel en patio..."
            rows={2}
            className="w-full resize-none rounded-lg border border-gray-200 bg-slate-50/80 px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>
      </div>
    </div>
  )
}
