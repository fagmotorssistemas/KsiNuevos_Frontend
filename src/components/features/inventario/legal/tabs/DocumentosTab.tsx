'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { VEHICLE_DOCUMENT_CATALOG } from '@/lib/inventario/vehicleDocumentCatalog'
import { findExpedienteFagByPlate, type ExpedienteVinculo } from '@/services/expedienteVinculo.service'
import { uploadVehicleDocument, updateVehicleDocumentMeta } from '@/services/vehicleLegal.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { VehicleDocumentRow, VehicleDocType } from '@/types/vehicleLegal.types'
import { VehicleDocumentCard } from '../VehicleDocumentCard'

function DocumentSkeletonGrid({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 animate-pulse">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-5 bg-slate-100 rounded w-1/3" />
            </div>
          </div>
          <div className="mt-3 h-9 bg-slate-100 rounded-lg border border-dashed border-slate-200" />
        </div>
      ))}
    </div>
  )
}

type Props = {
  supabase: SupabaseClient
  placa: string
  inventoryoracleId: string | null
  documents: VehicleDocumentRow[]
  profileId: string | null
  onRefresh: () => void
  loading?: boolean
  disabled?: boolean
}

export function DocumentosTab({ supabase, placa, inventoryoracleId, documents, profileId, onRefresh, loading, disabled }: Props) {
  const [uploadingType, setUploadingType] = useState<string | null>(null)
  const [expedienteVinculo, setExpedienteVinculo] = useState<ExpedienteVinculo | null>(null)
  const [loadingVinculo, setLoadingVinculo] = useState(false)
  const retriedSeed = useRef(false)
  const expectedCount = VEHICLE_DOCUMENT_CATALOG.length

  useEffect(() => {
    if (!supabase || !placa || loading) return
    let cancelled = false
    setLoadingVinculo(true)
    void findExpedienteFagByPlate(supabase, placa)
      .then((v) => {
        if (!cancelled) setExpedienteVinculo(v)
      })
      .finally(() => {
        if (!cancelled) setLoadingVinculo(false)
      })
    return () => {
      cancelled = true
    }
  }, [supabase, placa, loading])

  useEffect(() => {
    if (
      !loading &&
      inventoryoracleId &&
      documents.length < expectedCount &&
      !retriedSeed.current
    ) {
      retriedSeed.current = true
      onRefresh()
    }
  }, [loading, inventoryoracleId, documents.length, expectedCount, onRefresh])

  const byType = new Map(documents.map((d) => [d.doc_type, d]))
  const legal = VEHICLE_DOCUMENT_CATALOG.filter((c) => c.category === 'legal')
  const physical = VEHICLE_DOCUMENT_CATALOG.filter((c) => c.category === 'physical')

  const renderSection = (title: string, items: typeof legal) => (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((cat) => {
          const row = byType.get(cat.docType)
          if (!row) return null
          return (
            <VehicleDocumentCard
              key={cat.docType}
              row={row}
              disabled={disabled || !inventoryoracleId}
              uploading={uploadingType === cat.docType}
              expedienteVinculo={cat.docType === 'historial_mantenimiento' ? expedienteVinculo : null}
              placaInventario={placa}
              onUpload={async (file) => {
                if (!inventoryoracleId) return
                setUploadingType(cat.docType)
                try {
                  await uploadVehicleDocument(supabase, inventoryoracleId, cat.docType as VehicleDocType, file, profileId, {
                    status: 'cargado',
                  })
                  onRefresh()
                } finally {
                  setUploadingType(null)
                }
              }}
              onUpdateMeta={async (patch) => {
                await updateVehicleDocumentMeta(supabase, row.id, patch)
                onRefresh()
              }}
            />
          )
        })}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          Cargando documentos del vehículo…
        </div>
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Documentos de propiedad y legales</p>
          <DocumentSkeletonGrid count={9} />
        </div>
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Documentos de condición física</p>
          <DocumentSkeletonGrid count={3} />
        </div>
      </div>
    )
  }

  if (!inventoryoracleId) {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-4">
        Vincule este vehículo en el catálogo web (tabla inventoryoracle) para gestionar documentos.
      </p>
    )
  }

  if (documents.length < expectedCount) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
        <p className="text-sm">Preparando slots de documentos…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {loadingVinculo && (
        <p className="text-xs text-slate-500 flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Buscando expediente de taller por placa…
        </p>
      )}
      {!loadingVinculo && !expedienteVinculo && (
        <p className="text-xs text-slate-500 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2">
          No hay expediente de Fabian Aguirre en taller con la placa <strong>{placa}</strong>. Puedes subir el historial de mantenimiento manualmente.
        </p>
      )}
      {renderSection('Documentos de propiedad y legales', legal)}
      {renderSection('Documentos de condición física', physical)}
      {uploadingType && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-2 shadow-lg z-[70]">
          <Loader2 className="h-3 w-3 animate-spin" /> Subiendo…
        </div>
      )}
    </div>
  )
}
