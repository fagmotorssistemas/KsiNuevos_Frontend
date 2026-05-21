'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useExpedientes } from '@/hooks/taller/useExpedientes'
import { ExpedienteDetail } from '@/components/features/taller/expedientes/ExpedienteDetail'
import { CLIENTE_INTERNO_FAG_ID } from '@/components/features/taller/expedientes/ExpedientesTopBar'
import { fetchExpedienteOrdenById } from '@/services/expedienteVinculo.service'
import { normalizePlate } from '@/lib/inventario/normalizePlate'
import type { OrdenTrabajo } from '@/types/taller'
import { OrderPrintView } from '@/components/features/taller/OrderPrintView'
import { useReactToPrint } from 'react-to-print'

export default function InventarioExpedientePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const ordenId = typeof params.ordenId === 'string' ? params.ordenId : ''
  const placaRef = searchParams.get('placa')

  const { supabase } = useAuth()
  const { subirArchivo, actualizarEstadoContable, fetchExpedientes } = useExpedientes()

  const [orden, setOrden] = useState<OrdenTrabajo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadConfig, setUploadConfig] = useState<{ bucket: 'taller-evidencias' | 'taller-comprobantes' | 'ordenes-trabajo' | 'taller-facturas'; transaccionId?: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const printComponentRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: orden ? `Orden_${orden.numero_orden}` : 'Expediente',
  })

  const loadOrden = useCallback(async () => {
    if (!supabase || !ordenId) return
    setLoading(true)
    setError(null)
    try {
      const { orden: raw, error: err } = await fetchExpedienteOrdenById(supabase, ordenId)
      if (err || !raw) {
        setError('No se encontró el expediente solicitado.')
        setOrden(null)
        return
      }

      const o = raw as unknown as OrdenTrabajo
      if (o.cliente_id !== CLIENTE_INTERNO_FAG_ID) {
        setError('Este expediente no pertenece al inventario interno (Fabian Aguirre).')
        setOrden(null)
        return
      }

      if (placaRef && normalizePlate(o.vehiculo_placa) !== normalizePlate(placaRef)) {
        setError('La placa del expediente no coincide con el vehículo del inventario.')
        setOrden(null)
        return
      }

      setOrden(o)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el expediente')
      setOrden(null)
    } finally {
      setLoading(false)
    }
  }, [supabase, ordenId, placaRef])

  useEffect(() => {
    void loadOrden()
  }, [loadOrden])

  const triggerUpload = (
    bucket: 'taller-evidencias' | 'taller-comprobantes' | 'ordenes-trabajo' | 'taller-facturas',
    transaccionId?: string
  ) => {
    setUploadConfig({ bucket, transaccionId })
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !orden || !uploadConfig) return
    setIsUploading(true)
    await subirArchivo(orden.id, file, uploadConfig.bucket, uploadConfig.transaccionId)
    await loadOrden()
    setIsUploading(false)
    setUploadConfig(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
        <p className="text-sm font-medium">Cargando expediente de taller…</p>
      </div>
    )
  }

  if (error || !orden) {
    return (
      <div className="max-w-lg mx-auto mt-12 p-6 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900">
        <p className="font-bold">Expediente no disponible</p>
        <p className="text-sm mt-2">{error ?? 'Sin datos'}</p>
        <button
          type="button"
          onClick={() => router.push('/inventario')}
          className="mt-4 text-sm font-bold text-blue-700 hover:underline"
        >
          Volver al inventario
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-12rem)] bg-slate-50 overflow-hidden rounded-xl border border-slate-200">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf" />

      <ExpedienteDetail
        orden={orden}
        onClose={() => router.push('/inventario')}
        isUploading={isUploading}
        onTriggerUpload={triggerUpload}
        onUpdateContable={actualizarEstadoContable}
        onPrint={() => handlePrint?.()}
        onRefreshOrder={async () => {
          await fetchExpedientes()
          await loadOrden()
        }}
        initialTab="archivos"
        backLabel="Volver al inventario"
        subtitle="Historial de mantenimiento · expediente taller (Fabian Aguirre)"
      />

      <div className="hidden">
        <OrderPrintView ref={printComponentRef} orden={orden} />
      </div>
    </div>
  )
}
