'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  Car,
  ClipboardCheck,
  FileText,
  Key,
  Lock,
  Search,
  Shield,
  Upload,
  Wrench,
  ExternalLink,
  Loader2,
  IdCard,
  FolderOpen,
} from 'lucide-react'
import type { ExpedienteVinculo } from '@/services/expedienteVinculo.service'
import { docCatalogByType } from '@/lib/inventario/vehicleDocumentCatalog'
import { docStatusClass, formatShortDate, statusLabel } from '@/lib/inventario/vehicleLegalUi'
import type { VehicleDocumentRow, VehicleDocStatus, VehicleDocType } from '@/types/vehicleLegal.types'

const ICONS: Record<string, typeof FileText> = {
  titulo_propiedad: FileText,
  matricula: IdCard,
  soat: Shield,
  revision_tecnica: ClipboardCheck,
  factura_compra: FileText,
  levantamiento_prendas: Lock,
  liberacion_bancaria: Building2,
  informe_ant_siat: Search,
  contrato_compra_venta: Car,
  historial_mantenimiento: Wrench,
  informe_peritaje: ClipboardCheck,
  accesorios_llaves: Key,
}

type Props = {
  row: VehicleDocumentRow
  disabled?: boolean
  uploading?: boolean
  expedienteVinculo?: ExpedienteVinculo | null
  placaInventario?: string
  onUpload: (file: File) => Promise<void>
  onUpdateMeta: (patch: { status?: VehicleDocStatus; detail_text?: string | null; expires_at?: string | null }) => Promise<void>
}

export function VehicleDocumentCard({
  row,
  disabled,
  uploading,
  expedienteVinculo,
  placaInventario,
  onUpload,
  onUpdateMeta,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const catalog = docCatalogByType(row.doc_type as VehicleDocType)
  const Icon = ICONS[row.doc_type] ?? FileText
  const [editing, setEditing] = useState(false)
  const [detail, setDetail] = useState(row.detail_text ?? '')
  const [expires, setExpires] = useState(row.expires_at ?? '')

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await onUpload(file)
    e.target.value = ''
  }

  const saveMeta = async () => {
    await onUpdateMeta({
      detail_text: detail || null,
      expires_at: expires || null,
      status: row.file_url ? (expires ? 'vigente' : 'cargado') : row.status,
    })
    setEditing(false)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-slate-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">{catalog?.label ?? row.doc_type}</p>
          <span className={`inline-flex mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${docStatusClass(row.status)}`}>
            {statusLabel(row.status)}
          </span>
          {row.detail_text && !editing && (
            <p className="text-xs text-slate-500 mt-2 line-clamp-2">{row.detail_text}</p>
          )}
          {row.expires_at && (
            <p className="text-xs text-slate-500 mt-1">Vence {formatShortDate(row.expires_at)}</p>
          )}
          {row.file_name && (
            <p className="text-[10px] text-slate-400 mt-1 truncate">{row.file_name}</p>
          )}
          {expedienteVinculo && row.doc_type === 'historial_mantenimiento' && (
            <p className="text-[10px] text-violet-700 font-semibold mt-2">
              Vinculado · Expediente #{expedienteVinculo.numeroOrden} (Fabian Aguirre)
            </p>
          )}
        </div>
      </div>

      {expedienteVinculo && row.doc_type === 'historial_mantenimiento' && placaInventario && (
        <Link
          href={`/inventario/expediente/${expedienteVinculo.ordenId}?placa=${encodeURIComponent(placaInventario)}`}
          className="mt-3 flex items-center gap-2 w-full rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs font-bold text-violet-800 hover:bg-violet-100 transition-colors"
        >
          <FolderOpen className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 text-left">
            Ver expediente taller #{expedienteVinculo.numeroOrden}
            <span className="block font-normal text-violet-600 truncate">
              {expedienteVinculo.marca} {expedienteVinculo.modelo} · {expedienteVinculo.placa}
            </span>
          </span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        </Link>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {catalog?.requiresFile && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => void handleFile(e)}
              disabled={disabled || uploading}
            />
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
              className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed border-slate-300 text-xs font-bold text-slate-600 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50/50 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {row.file_url ? 'Reemplazar' : 'Subir documento'}
            </button>
            {row.file_url && (
              <a
                href={row.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-blue-700 hover:bg-blue-50"
              >
                Ver <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </>
        )}
        {!catalog?.requiresFile && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setEditing((v) => !v)}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            {editing ? 'Cerrar' : 'Editar detalle'}
          </button>
        )}
        {catalog?.requiresFile && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setEditing((v) => !v)}
            className="text-xs font-bold text-slate-500 hover:text-slate-700"
          >
            Detalle
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-3 space-y-2 pt-3 border-t border-slate-100">
          <textarea
            className="w-full text-xs border border-slate-200 rounded-lg p-2"
            rows={2}
            placeholder="Detalle (ej. CEMAVIN, banco, 2 llaves…)"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
          {(row.doc_type === 'matricula' || row.doc_type === 'soat' || row.doc_type === 'revision_tecnica') && (
            <input
              type="date"
              className="w-full text-xs border border-slate-200 rounded-lg p-2"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
          )}
          <button
            type="button"
            onClick={() => void saveMeta()}
            className="text-xs font-bold text-white bg-blue-600 px-3 py-1.5 rounded-lg"
          >
            Guardar
          </button>
        </div>
      )}
    </div>
  )
}
