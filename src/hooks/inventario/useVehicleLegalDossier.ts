'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  computeLegalSummary,
  loadVehicleLegalDossier,
} from '@/services/vehicleLegal.service'
import type { VehicleLegalDossier } from '@/types/vehicleLegal.types'

const EMPTY: VehicleLegalDossier = {
  inventoryoracleId: null,
  documents: [],
  fines: [],
  debts: [],
  owners: [],
  events: [],
  notes: [],
}

export function useVehicleLegalDossier(
  placa: string | null,
  enabled: boolean,
  oracleId?: string | null
) {
  const { supabase } = useAuth()
  const [dossier, setDossier] = useState<VehicleLegalDossier>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase || !placa) return
    setLoading(true)
    setError(null)
    try {
      const data = await loadVehicleLegalDossier(supabase, placa, oracleId)
      setDossier(data)
      if (!data.inventoryoracleId) {
        setError(
          'Este vehículo no está en inventario web (inventoryoracle). Ejecute la sincronización Oracle o regístrelo en el catálogo con la misma placa.'
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando expediente')
      setDossier(EMPTY)
    } finally {
      setLoading(false)
    }
  }, [supabase, placa, oracleId])

  useEffect(() => {
    if (!enabled || !placa) {
      setDossier(EMPTY)
      setLoading(false)
      return
    }
    if (!supabase) {
      setLoading(true)
      return
    }
    void refresh()
  }, [enabled, placa, oracleId, supabase, refresh])

  const summary = useMemo(() => computeLegalSummary(dossier), [dossier])

  return { dossier, summary, loading, error, refresh, supabase }
}
