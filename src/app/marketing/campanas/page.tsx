'use client'

import { useState } from 'react'
import { Loader2, Megaphone, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useCampaignPlanner } from '@/hooks/marketing/useCampaignPlanner'
import {
  formatCampaignMonthLabel,
  currentCampaignMonth,
} from '@/types/marketing-campaigns'
import { segmentLabel } from '@/lib/marketing/campaign-segments'
import { AvailableVehiclesPanel } from '@/components/marketing/campanas/AvailableVehiclesPanel'
import {
  CampaignGroupCard,
  CampaignStatsBar,
  CreateGroupButton,
} from '@/components/marketing/campanas/CampaignGroupCard'
import { CampaignSegmentTabs } from '@/components/marketing/campanas/CampaignSegmentTabs'
import { CampaignSegmentContentSummary } from '@/components/marketing/campanas/CampaignSegmentContentSummary'

export default function CampanasPage() {
  const planner = useCampaignPlanner()
  const [addingId, setAddingId] = useState<string | null>(null)

  const handleCreateGroup = async (name?: string) => {
    const nextIndex = planner.segmentGroups.length + 1
    const monthLabel = formatCampaignMonthLabel(planner.campaignMonth)
    const groupName =
      name ?? `${segmentLabel(planner.activeSegment)} ${nextIndex} · ${monthLabel}`

    try {
      await planner.createGroup(groupName, planner.activeSegment)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear grupo')
    }
  }

  const handleAddVehicle = async (inventoryId: string) => {
    if (!planner.selectedGroupId) return
    setAddingId(inventoryId)
    try {
      await planner.addVehicleToGroup(planner.selectedGroupId, inventoryId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo agregar')
    } finally {
      setAddingId(null)
    }
  }

  if (planner.loading) {
    return (
      <div className="flex min-h-[480px] flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        <span className="text-sm font-medium">Cargando campañas...</span>
      </div>
    )
  }

  const groups = planner.segmentGroups
  const stats = planner.segmentStats

  return (
    <div className="pb-6">
      <header className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Marketing / Campañas
          </p>
          <div className="mt-1 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 md:text-3xl">
                Organizador de campañas
              </h1>
              <p className="text-sm text-slate-500 mt-0.5 max-w-xl">
                Reparte el trabajo por categoría: SUVs, Sedans y Camionetas. Cada persona arma sus
                grupos con el inventario que le corresponde.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={planner.campaignMonth}
            onChange={(e) => planner.setCampaignMonth(e.target.value || currentCampaignMonth())}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm"
          />
          <button
            type="button"
            onClick={() => void planner.refresh()}
            disabled={planner.refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${planner.refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </header>

      <div className="mb-4">
        <CampaignSegmentTabs
          activeSegment={planner.activeSegment}
          onChange={planner.setActiveSegment}
          stats={planner.data?.segmentStats}
        />
      </div>

      <div className="mb-4">
        <CampaignStatsBar stats={stats} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <section className="space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              {formatCampaignMonthLabel(planner.campaignMonth)} · {segmentLabel(planner.activeSegment)}
            </h2>
            <span className="text-xs text-slate-400">{groups.length} grupos</span>
          </div>

          <CampaignSegmentContentSummary segment={planner.activeSegment} groups={groups} />

          {groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
              <p className="text-slate-600 font-medium">
                Aún no hay grupos de {segmentLabel(planner.activeSegment)} este mes
              </p>
              <p className="text-sm text-slate-400 mt-1 mb-6">
                Crea tu primer grupo y agrega autos desde el panel derecho.
              </p>
              <CreateGroupButton
                onCreate={(name) => void handleCreateGroup(name)}
                nextIndex={1}
                category={segmentLabel(planner.activeSegment)}
              />
            </div>
          ) : (
            <>
              {groups.map((group) => (
                <CampaignGroupCard
                  key={group.id}
                  group={group}
                  selected={planner.selectedGroupId === group.id}
                  onSelect={() => planner.setSelectedGroupId(group.id)}
                  onStatusChange={(status) =>
                    void planner.updateGroupStatus(group.id, status).catch((err) =>
                      toast.error(err instanceof Error ? err.message : 'Error')
                    )
                  }
                  onDelete={() => {
                    if (!confirm(`¿Eliminar "${group.name}"?`)) return
                    void planner.deleteGroup(group.id).catch((err) =>
                      toast.error(err instanceof Error ? err.message : 'Error')
                    )
                  }}
                  onUpdateVehicle={(id, patch) =>
                    void planner.updateVehicle(id, patch).catch((err) =>
                      toast.error(err instanceof Error ? err.message : 'Error')
                    )
                  }
                  onRemoveVehicle={(id) =>
                    void planner.removeVehicle(id).catch((err) =>
                      toast.error(err instanceof Error ? err.message : 'Error')
                    )
                  }
                />
              ))}

              <CreateGroupButton
                onCreate={(name) => void handleCreateGroup(name)}
                nextIndex={groups.length + 1}
                category={segmentLabel(planner.activeSegment)}
              />
            </>
          )}
        </section>

        <div className="flex flex-col min-h-0 max-h-[70vh] overflow-hidden xl:sticky xl:top-4 xl:self-start xl:h-[calc(100dvh-7rem)] xl:max-h-[calc(100dvh-7rem)]">
          <AvailableVehiclesPanel
            vehicles={planner.filteredAvailable}
            segment={planner.activeSegment}
            totalInventory={planner.data?.totalInventory}
            search={planner.search}
            onSearchChange={planner.setSearch}
            selectedGroupId={planner.selectedGroupId}
            onAddVehicle={(id) => void handleAddVehicle(id)}
            addingId={addingId}
          />
        </div>
      </div>
    </div>
  )
}
