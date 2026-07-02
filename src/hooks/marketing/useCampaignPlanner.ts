'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type {
  CampaignDashboardPayload,
  CampaignGroupStatus,
  CampaignSegment,
} from '@/types/marketing-campaigns'
import { currentCampaignMonth } from '@/types/marketing-campaigns'
import { groupBelongsToSegment, segmentLabel } from '@/lib/marketing/campaign-segments'

export function useCampaignPlanner(initialMonth = currentCampaignMonth()) {
  const [campaignMonth, setCampaignMonth] = useState(initialMonth)
  const [activeSegment, setActiveSegment] = useState<CampaignSegment>('suv')
  const [data, setData] = useState<CampaignDashboardPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const migrationToastShown = useRef(false)

  const fetchDashboard = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true)
      else setRefreshing(true)

      try {
        const params = new URLSearchParams({ month: campaignMonth })
        const res = await fetch(`/api/marketing/campaigns?${params.toString()}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Error al cargar campañas')

        setData(json as CampaignDashboardPayload)
        if (json.groupsError && json.tablesReady === false && !migrationToastShown.current) {
          migrationToastShown.current = true
          toast.message('Migración pendiente', {
            description:
              'Aplica la migración de campañas en Supabase para guardar grupos. El inventario ya se carga.',
          })
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al cargar campañas')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [campaignMonth]
  )

  useEffect(() => {
    void fetchDashboard()
  }, [fetchDashboard])

  const segmentGroups = useMemo(() => {
    return (data?.groups ?? []).filter((g) =>
      g.segment ? g.segment === activeSegment : groupBelongsToSegment(g.vehicle_category, activeSegment)
    )
  }, [data?.groups, activeSegment])

  useEffect(() => {
    setSelectedGroupId((prev) => {
      if (prev && segmentGroups.some((g) => g.id === prev)) return prev
      return segmentGroups[0]?.id ?? null
    })
  }, [segmentGroups, activeSegment])

  const createGroup = useCallback(
    async (name: string, segment: CampaignSegment) => {
      const res = await fetch('/api/marketing/campaigns/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, campaignMonth, segment, vehicleCategory: segment }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'No se pudo crear el grupo')
      toast.success('Grupo creado')
      await fetchDashboard({ silent: true })
      if (json.group?.id) setSelectedGroupId(json.group.id)
    },
    [campaignMonth, fetchDashboard]
  )

  const updateGroupStatus = useCallback(
    async (groupId: string, status: CampaignGroupStatus) => {
      const res = await fetch(`/api/marketing/campaigns/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'No se pudo actualizar')
      await fetchDashboard({ silent: true })
    },
    [fetchDashboard]
  )

  const deleteGroup = useCallback(
    async (groupId: string) => {
      const res = await fetch(`/api/marketing/campaigns/groups/${groupId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'No se pudo eliminar')
      toast.success('Grupo eliminado')
      await fetchDashboard({ silent: true })
    },
    [fetchDashboard]
  )

  const addVehicleToGroup = useCallback(
    async (groupId: string, inventoryId: string) => {
      const res = await fetch(`/api/marketing/campaigns/groups/${groupId}/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventoryId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'No se pudo agregar el vehículo')
      toast.success('Vehículo agregado a la campaña')
      await fetchDashboard({ silent: true })
    },
    [fetchDashboard]
  )

  const updateVehicle = useCallback(
    async (
      vehicleId: string,
      patch: {
        notes?: string | null
        reelsCount?: number
        postsCount?: number
        needsVideo?: boolean
        needsPhotos?: boolean
      }
    ) => {
      const res = await fetch(`/api/marketing/campaigns/vehicles/${vehicleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: patch.notes,
          reelsCount: patch.reelsCount,
          postsCount: patch.postsCount,
          needsVideo: patch.needsVideo,
          needsPhotos: patch.needsPhotos,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'No se pudo actualizar')
      await fetchDashboard({ silent: true })
    },
    [fetchDashboard]
  )

  const removeVehicle = useCallback(
    async (vehicleId: string) => {
      const res = await fetch(`/api/marketing/campaigns/vehicles/${vehicleId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'No se pudo quitar el vehículo')
      toast.success('Vehículo devuelto al inventario disponible')
      await fetchDashboard({ silent: true })
    },
    [fetchDashboard]
  )

  const filteredAvailable = (data?.availableVehicles ?? []).filter((v) => {
    if (v.segment !== activeSegment) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      v.brand.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      String(v.year).includes(q) ||
      (v.plate?.toLowerCase().includes(q) ?? false)
    )
  })

  const segmentStats = data?.segmentStats?.[activeSegment] ?? {
    groups: segmentGroups.length,
    activeGroups: segmentGroups.filter((g) => g.status === 'active').length,
    assignedVehicles: segmentGroups.reduce((n, g) => n + g.vehicles.length, 0),
    availableCount: filteredAvailable.length,
    missingVideo: segmentGroups.reduce((n, g) => n + g.vehicles.filter((v) => v.needsVideo).length, 0),
  }

  return {
    campaignMonth,
    setCampaignMonth,
    activeSegment,
    setActiveSegment,
    segmentLabel: segmentLabel(activeSegment),
    data,
    loading,
    refreshing,
    selectedGroupId,
    setSelectedGroupId,
    search,
    setSearch,
    segmentGroups,
    filteredAvailable,
    segmentStats,
    refresh: () => fetchDashboard({ silent: true }),
    createGroup,
    updateGroupStatus,
    deleteGroup,
    addVehicleToGroup,
    updateVehicle,
    removeVehicle,
  }
}
