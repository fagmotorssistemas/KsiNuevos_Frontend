'use client'

import { useState } from 'react'
import {
  Car,
  X,
  History,
  FileText,
  Loader2,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  FolderOpen,
  Scale,
  StickyNote,
  Cog,
  Tag,
  MapPin,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useVehicleLegalDossier } from '@/hooks/inventario/useVehicleLegalDossier'
import { inventarioService } from '@/services/inventario.service'
import { MovimientoKardex, VehiculoInventario } from '@/types/inventario.types'
import { VehicleLegalSummaryBar } from './legal/VehicleLegalSummaryBar'
import { DocumentosTab } from './legal/tabs/DocumentosTab'
import { MultasDeudasTab } from './legal/tabs/MultasDeudasTab'
import { HistorialVehiculoTab } from './legal/tabs/HistorialVehiculoTab'
import { NotasInternasTab } from './legal/tabs/NotasInternasTab'

function getPrecioVentaFromHistorial(historial: MovimientoKardex[]): number | null {
  if (!historial?.length) return null
  const notaEntrega = historial.find((m) => m.tipoTransaccion?.toUpperCase().includes('NOTA DE ENTREGA'))
  if (notaEntrega != null) return notaEntrega.total
  const egresos = historial.filter((m) => !m.esIngreso)
  return egresos.length ? egresos[egresos.length - 1].total : null
}

export type VehicleDetailTab =
  | 'documentos'
  | 'multas'
  | 'historial'
  | 'notas'
  | 'ficha'
  | 'movimientos'

type Props = {
  vehiculo: VehiculoInventario
  onClose: () => void
  onPrecioVenta?: (placa: string, precio: number) => void
  initialTab?: VehicleDetailTab
}

export function VehicleDetailModal({ vehiculo, onClose, onPrecioVenta, initialTab }: Props) {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<VehicleDetailTab>(initialTab ?? 'ficha')
  const [historial, setHistorial] = useState<MovimientoKardex[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [historialError, setHistorialError] = useState<string | null>(null)

  const { dossier, summary, loading: loadingLegal, error: legalError, refresh, supabase } = useVehicleLegalDossier(
    vehiculo.placa,
    true,
    vehiculo.proId
  )
  const legalTabActive = activeTab !== 'ficha' && activeTab !== 'movimientos'

  const authorName = profile?.full_name?.trim() || 'Equipo KSI'

  const handleTabChange = async (tab: VehicleDetailTab) => {
    setActiveTab(tab)
    if (tab === 'movimientos' && historial.length === 0 && !loadingHistorial) {
      try {
        setLoadingHistorial(true)
        setHistorialError(null)
        const data = await inventarioService.getDetalleVehiculo(vehiculo.placa)
        const movimientos = data.historialMovimientos || []
        setHistorial(movimientos)
        const precioVenta = getPrecioVentaFromHistorial(movimientos)
        if (precioVenta != null && onPrecioVenta) onPrecioVenta(vehiculo.placa, precioVenta)
      } catch (error) {
        console.error('Error cargando historial', error)
        setHistorialError('No se pudieron cargar los movimientos contables.')
      } finally {
        setLoadingHistorial(false)
      }
    }
  }

  const tabs: { id: VehicleDetailTab; label: string; icon: typeof FileText }[] = [
    { id: 'ficha', label: 'Ficha técnica', icon: FileText },
    { id: 'movimientos', label: 'Movimientos contables', icon: Cog },
    { id: 'documentos', label: 'Documentos', icon: FolderOpen },
    { id: 'multas', label: 'Multas', icon: Scale },
    { id: 'historial', label: 'Historial', icon: History },
    { id: 'notas', label: 'Notas internas', icon: StickyNote },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-lg">
              <Car className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {vehiculo.marca} {vehiculo.modelo}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-slate-800 text-white text-xs font-mono px-2 py-0.5 rounded">{vehiculo.placa}</span>
                <span className="text-slate-500 text-sm border-l border-slate-300 pl-2">{vehiculo.anioModelo}</span>
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <VehicleLegalSummaryBar summary={summary} />

        <div className="flex border-b border-slate-200 px-4 overflow-x-auto shrink-0">
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => void handleTabChange(t.id)}
                className={`flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="p-6 overflow-y-auto bg-white flex-1 min-h-0">
          {legalTabActive && legalError && !loadingLegal && (
            <div className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">{legalError}</div>
          )}

          {legalTabActive && !supabase && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
              <p className="text-sm">Conectando con el servidor…</p>
            </div>
          )}

          {activeTab === 'documentos' && supabase && (
            <DocumentosTab
              supabase={supabase}
              placa={vehiculo.placa}
              inventoryoracleId={dossier.inventoryoracleId}
              documents={dossier.documents}
              profileId={profile?.id ?? null}
              onRefresh={() => void refresh()}
              loading={loadingLegal}
              disabled={loadingLegal}
            />
          )}

          {activeTab === 'multas' && supabase && (
            <MultasDeudasTab
              supabase={supabase}
              inventoryoracleId={dossier.inventoryoracleId}
              fines={dossier.fines}
              profileId={profile?.id ?? null}
              onRefresh={() => void refresh()}
              loading={loadingLegal}
            />
          )}

          {activeTab === 'historial' && supabase && (
            <HistorialVehiculoTab
              supabase={supabase}
              inventoryoracleId={dossier.inventoryoracleId}
              owners={dossier.owners}
              events={dossier.events}
              profileId={profile?.id ?? null}
              onRefresh={() => void refresh()}
              loading={loadingLegal}
            />
          )}

          {activeTab === 'notas' && supabase && (
            <NotasInternasTab
              supabase={supabase}
              inventoryoracleId={dossier.inventoryoracleId}
              notes={dossier.notes}
              authorName={authorName}
              profileId={profile?.id ?? null}
              onRefresh={() => void refresh()}
              loading={loadingLegal}
            />
          )}

          {activeTab === 'ficha' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-left-4 duration-300">
              <FichaSection title="Detalles generales" icon={Tag}>
                <ItemDetail label="Marca" value={vehiculo.marca} />
                <ItemDetail label="Modelo" value={vehiculo.modelo} />
                <ItemDetail label="Año" value={vehiculo.anioModelo} />
                <ItemDetail label="Color" value={vehiculo.color} />
                <ItemDetail label="Tipo" value={vehiculo.tipo} />
                <ItemDetail label="Versión" value={vehiculo.version} />
              </FichaSection>
              <FichaSection title="Mecánica" icon={Cog}>
                <ItemDetail label="Motor" value={vehiculo.motor} highlight />
                <ItemDetail label="Chasis" value={vehiculo.chasis} highlight />
                <ItemDetail label="Cilindraje" value={vehiculo.cilindraje} />
                <ItemDetail label="Combustible" value={vehiculo.combustible} />
                <ItemDetail label="Ejes" value={vehiculo.nroEjes} />
                <ItemDetail label="Llantas" value={vehiculo.nroLlantas} />
              </FichaSection>
              <FichaSection title="Legal" icon={MapPin}>
                <ItemDetail label="País origen" value={vehiculo.paisOrigen} />
                <ItemDetail label="Año matrícula" value={vehiculo.anioMatricula} />
                <ItemDetail label="Lugar matrícula" value={vehiculo.lugarMatricula} />
                <ItemDetail label="Proveedor" value={vehiculo.proveedor} />
              </FichaSection>
              <div className="md:col-span-3">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción sistema</span>
                  <p className="text-sm text-slate-700">{vehiculo.descripcion || 'Sin descripción'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'movimientos' && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              {historialError && (
                <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{historialError}</div>
              )}
              {loadingHistorial ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin mb-2 text-blue-500" />
                  <p className="text-sm">Cargando movimientos contables…</p>
                </div>
              ) : historial.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <History className="h-8 w-8 mb-2 opacity-50" />
                  <p>No hay registros de movimientos para este vehículo.</p>
                </div>
              ) : (
                <MovimientosTimeline historial={historial} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FichaSection({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof Tag
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-blue-600 font-medium border-b border-blue-50 pb-2">
        <Icon className="h-4 w-4" /> {title}
      </div>
      <div className="grid grid-cols-1 gap-3">{children}</div>
    </div>
  )
}

function MovimientosTimeline({ historial }: { historial: MovimientoKardex[] }) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
      <div className="space-y-6">
        {historial.map((mov, idx) => (
          <div key={idx} className="relative pl-10 group">
            <div
              className={`absolute left-[10px] top-1.5 h-3 w-3 rounded-full border-2 border-white ring-1 z-10 
                ${mov.tipoTransaccion.includes('NOTA DE ENTREGA') ? 'bg-orange-500 ring-orange-200' : mov.esIngreso ? 'bg-emerald-500 ring-emerald-200' : 'bg-blue-500 ring-blue-200'}`}
            />
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded border 
                        ${mov.tipoTransaccion.includes('NOTA DE ENTREGA') ? 'bg-orange-50 text-orange-700 border-orange-100' : mov.esIngreso ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}
                    >
                      {mov.tipoTransaccion}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{mov.fecha}</span>
                  </div>
                  <h4 className="font-medium text-slate-800 mt-1">{mov.concepto}</h4>
                  {mov.clienteProveedor && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <User className="h-3 w-3" />
                      {mov.clienteProveedor}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold flex items-center justify-end gap-1 ${mov.esIngreso ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {mov.esIngreso ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                    ${mov.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 bg-slate-50 px-1.5 py-0.5 rounded inline-block">Doc: {mov.documento}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ItemDetail({ label, value, highlight = false }: { label: string; value: string | null | undefined; highlight?: boolean }) {
  const isEmpty = !value || value.trim() === ''
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase font-bold text-slate-400">{label}</span>
      <div
        className={`text-xs p-2 rounded border ${
          isEmpty
            ? 'bg-red-50 text-red-600 border-red-100 italic'
            : highlight
              ? 'bg-blue-50 text-blue-800 border-blue-100 font-bold'
              : 'bg-white text-slate-700 border-slate-200'
        }`}
      >
        {isEmpty ? 'No especificado' : value}
      </div>
    </div>
  )
}
