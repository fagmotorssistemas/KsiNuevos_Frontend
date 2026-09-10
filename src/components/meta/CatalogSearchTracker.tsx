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

function hasActiveSearch(filters: InventoryFiltersState, brandSlug?: string) {
  if (brandSlug?.trim()) return true
  if (filters.searchQuery.trim()) return true
  if (filters.minPrice != null || filters.maxPrice != null) return true
  if (filters.categories.length > 0 || filters.locations.length > 0) return true
  const specs = filters.specs
  if (specs.minYear != null || specs.maxYear != null) return true
  if (specs.minMileage != null || specs.maxMileage != null) return true
  if ((specs.transmission?.length ?? 0) > 0) return true
  if ((specs.fuelType?.length ?? 0) > 0) return true
  if ((specs.colors?.length ?? 0) > 0) return true
  return false
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
  const idsKey = contentIds.slice(0, 5).join(',')

  useEffect(() => {
    if (isLoading || !hasActiveSearch(filters, brandSlug)) return

    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      trackSearch({
        searchString: searchString(filters, brandSlug) || undefined,
        contentIds: idsKey ? idsKey.split(',') : undefined,
        make: brandSlug?.trim() || undefined,
      })
    }, 700)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [isLoading, brandSlug, filters, idsKey])

  return null
}
