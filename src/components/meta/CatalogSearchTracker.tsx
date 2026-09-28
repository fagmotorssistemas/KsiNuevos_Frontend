'use client'

import { useEffect, useRef } from 'react'
import type { InventoryFiltersState } from '@/hooks/Homeksi/useInventoryMaster'
import { trackSearch } from '@/lib/meta/pixel'

type CatalogSearchTrackerProps = {
  isLoading: boolean
  brandSlug?: string
  filters: InventoryFiltersState
  contentIds: string[]
}

function searchString(filters: InventoryFiltersState, brandSlug?: string) {
  const parts = [
    brandSlug?.trim(),
    filters.searchQuery.trim(),
    ...filters.categories,
    filters.specs.minYear != null ? `año:${filters.specs.minYear}` : '',
    ...(filters.specs.transmission ?? []),
    ...(filters.specs.fuelType ?? []),
  ].filter(Boolean)
  return parts.join(' ').trim()
}

export function CatalogSearchTracker({
  isLoading,
  brandSlug,
  filters,
  contentIds,
}: CatalogSearchTrackerProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSent = useRef<string | null>(null)
  const ids = contentIds.map((id) => id.trim()).filter(Boolean).slice(0, 10)
  const idsKey = ids.join(',')

  useEffect(() => {
    if (isLoading || ids.length === 0) return

    const signature = `${brandSlug ?? ''}|${searchString(filters, brandSlug)}|${idsKey}`
    if (lastSent.current === signature) return

    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      lastSent.current = signature
      trackSearch({
        searchString: searchString(filters, brandSlug) || 'inventario',
        contentIds: idsKey.split(',').filter(Boolean),
        make: brandSlug?.trim() || undefined,
      })
    }, 700)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [isLoading, brandSlug, filters, idsKey])

  return null
}
