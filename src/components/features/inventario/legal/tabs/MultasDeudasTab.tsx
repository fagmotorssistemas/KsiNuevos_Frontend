'use client'

import { useRef, useState } from 'react'
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  ACCEPT_UPLOAD,
  addVehicleFine,
  deleteVehicleFine,
  deleteVehicleFineFile,
  uploadVehicleFineFile,
} from '@/services/vehicleLegal.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { VehicleFineRow } from '@/types/vehicleLegal.types'

type Props = {
  supabase: SupabaseClient
  inventoryoracleId: string | null
  fines: VehicleFineRow[]
  profileId: string | null
  onRefresh: () => void
  loading?: boolean
}

function fileBaseName(name: string) {
  return name.replace(/\.[^.]+$/, '') || 'Comprobante de multa'
}

export function MultasDeudasTab({
  supabase,
  inventoryoracleId,
  fines,
  profileId,
  onRefresh,
  loading,
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const [deletingFineId, setDeletingFineId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allFiles = fines.flatMap((f) =>
    (f.files ?? []).map((file) => ({ fine: f, file }))
  )
  const pendingCount = fines.filter((f) => f.status === 'pendiente').length

  const handleUpload = async (selected: FileList | null) => {
    if (!inventoryoracleId || !selected?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(selected)) {
        const fine = await addVehicleFine(
          supabase,
          inventoryoracleId,
          {
            title: fileBaseName(file.name),
            amount: 0,
          },
          profileId
        )
        await uploadVehicleFineFile(supabase, inventoryoracleId, fine.id, file, profileId)
      }
      onRefresh()
      toast.success(
        selected.length === 1 ? 'Archivo subido' : `${selected.length} archivos subidos`
      )
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'No se pudo subir el archivo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteFile = async (fineId: string, fileId: string, filesLeft: number) => {
    setDeletingFileId(fileId)
    try {
      await deleteVehicleFineFile(supabase, fileId)
      // Si era el único archivo de la multa, eliminar el registro vacío
      if (filesLeft <= 1) {
        await deleteVehicleFine(supabase, fineId)
      }
      onRefresh()
      toast.success('Archivo eliminado')
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar')
    } finally {
      setDeletingFileId(null)
    }
  }

  const handleDeleteFine = async (fineId: string) => {
    setDeletingFineId(fineId)
    try {
      await deleteVehicleFine(supabase, fineId)
      onRefresh()
      toast.success('Eliminado')
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar')
    } finally {
      setDeletingFineId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
        <p className="text-sm">Cargando multas…</p>
      </div>
    )
  }

  if (!inventoryoracleId) {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-4">
        Vehículo no vinculado a inventoryoracle.
      </p>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {pendingCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900">
            Hay <strong>{pendingCount}</strong> multa{pendingCount !== 1 ? 's' : ''} registrada
            {pendingCount !== 1 ? 's' : ''}. Revisar antes de la venta.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-bold text-slate-800">Comprobantes de multas</p>
          <p className="text-[10px] text-slate-400 mt-0.5">PDF, JPG o PNG</p>
        </div>

        <div className="p-4 space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_UPLOAD}
            multiple
            className="hidden"
            onChange={(e) => void handleUpload(e.target.files)}
            disabled={uploading}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-3 rounded-lg border border-dashed border-slate-300 text-xs font-bold text-slate-600 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50/50 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? 'Subiendo…' : allFiles.length > 0 ? 'Agregar documento' : 'Subir PDF o imagen'}
          </button>

          {allFiles.length === 0 ? (
            <p className="py-4 text-sm text-slate-400 text-center">Sin documentos de multas.</p>
          ) : (
            <ul className="space-y-1.5">
              {allFiles.map(({ fine, file }) => (
                <li
                  key={file.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2"
                >
                  <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                  <span
                    className="text-xs text-slate-700 truncate flex-1 min-w-0"
                    title={file.file_name}
                  >
                    {file.file_name}
                  </span>
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-blue-600 hover:text-blue-800"
                    title="Ver archivo"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    disabled={deletingFileId === file.id || deletingFineId === fine.id}
                    onClick={() =>
                      void handleDeleteFile(fine.id, file.id, fine.files?.length ?? 1)
                    }
                    className="shrink-0 text-slate-400 hover:text-red-600 disabled:opacity-50"
                    title="Eliminar"
                  >
                    {deletingFileId === file.id || deletingFineId === fine.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
