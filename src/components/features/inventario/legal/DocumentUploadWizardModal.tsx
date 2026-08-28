'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, FileText, Loader2, Plus, Replace, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { VEHICLE_DOCUMENT_CATALOG, type DocCatalogEntry } from '@/lib/inventario/vehicleDocumentCatalog'
import {
  getCatalogDocumentRow,
  getDocumentCheckStatus,
  isDocumentCatalogItemVisible,
  isDocumentImageFile,
  listDocumentFiles,
  listPendingDocumentCatalog,
  orderCatalogPendingFirst,
} from '@/lib/inventario/vehicleLegalUi'
import {
  deleteVehicleDocumentFile,
  uploadVehicleDocument,
  updateVehicleDocumentMeta,
} from '@/services/vehicleLegal.service'
import type { DocumentAiReportRow } from '@/services/documentAiReports.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { VehicleDocType, VehicleDocumentFileRow, VehicleDocumentRow } from '@/types/vehicleLegal.types'
import { PendingDocumentsNotice } from './PendingDocumentsNotice'

const NOTE_PLACEHOLDERS: Partial<Record<VehicleDocType, string>> = {
  poder_contrato: 'Ej. No hay poder porque el vendedor firmó en agencia…',
  matricula: 'Ej. La matrícula física no llegó; se regulariza el…',
  revision_tecnica: 'Ej. Vehículo exento / RTV en trámite…',
  contrato_interno: 'Ej. Aún no se firma el contrato interno porque…',
  prenda_industrial: 'Ej. No tiene prenda industrial.',
  levantamiento_prendas: 'Ej. La prenda sigue vigente; el levantamiento va el…',
  informe_ant_siat: 'Ej. Informe ANT se solicita esta semana porque…',
  historial_mantenimiento: 'Ej. Sin historial; vehículo nuevo de agencia…',
  accesorios_llaves: 'Ej. 1 llave, sin control; el resto no aplica porque…',
  documentos_pendientes: 'Lista de lo que falta y por qué no hay foto todavía…',
  procesos_legales: 'Ej. No hay procesos legales abiertos.',
}

type PendingAiFile = {
  fileId: string
  fileName: string
  docLabel: string
}

type PickedFile = {
  file: File
  preview: string | null
}

const WIZARD_ACCEPT = 'image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.bmp'

function isPreviewable(file: File) {
  return file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name)
}

function revokePreviews(items: PickedFile[]) {
  for (const item of items) {
    if (item.preview) URL.revokeObjectURL(item.preview)
  }
}

function vehicleHasUploadedDocs(documents: VehicleDocumentRow[]) {
  const byType = new Map(documents.map((row) => [row.doc_type, row]))
  return VEHICLE_DOCUMENT_CATALOG.some((item) => {
    const row = getCatalogDocumentRow(byType, item.docType)
    return row ? listDocumentFiles(row).length > 0 : false
  })
}

function isLegacyFileId(fileId: string) {
  return fileId.startsWith('legacy-')
}

function withoutFile(row: VehicleDocumentRow, fileId: string): VehicleDocumentRow {
  const remaining = listDocumentFiles(row).filter((file) => file.id !== fileId)
  const latest = remaining[0]
  return {
    ...row,
    files: remaining.filter((file) => !isLegacyFileId(file.id)),
    file_url: latest?.file_url ?? null,
    file_name: latest?.file_name ?? null,
    file_path: latest?.file_path ?? null,
    mime_type: latest?.mime_type ?? null,
  }
}

function photoMatchesSection(report: DocumentAiReportRow): boolean {
  if (report.quality === 'wrong_document' || report.quality === 'unreadable') return false
  if (report.matches_plate === false) return false
  const payload = report.payload
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const flags = payload as {
      matches_expected_type?: unknown
      matches_owner?: unknown
      matches_place?: unknown
      matches_country?: unknown
      matches_dates?: unknown
    }
    if (flags.matches_expected_type === false) return false
    if (flags.matches_owner === false) return false
    if (flags.matches_place === false) return false
    if (flags.matches_country === false) return false
    if (flags.matches_dates === false) return false
  }
  return true
}

type Props = {
  supabase: SupabaseClient
  placa: string
  inventoryoracleId: string
  documents: VehicleDocumentRow[]
  profileId: string | null
  actorName: string
  onClose: () => void
  onRefresh: () => void
  focusDocType?: VehicleDocType | null
}

export function DocumentUploadWizardModal({
  supabase,
  placa,
  inventoryoracleId,
  documents,
  profileId,
  actorName,
  onClose,
  onRefresh,
  focusDocType = null,
}: Props) {
  const [docs, setDocs] = useState(documents)
  const byType = useMemo(() => new Map(docs.map((row) => [row.doc_type, row])), [docs])
  const pendingDocs = useMemo(() => listPendingDocumentCatalog(byType), [byType])
  const reviewGroups = useMemo(
    () => orderCatalogPendingFirst(byType, focusDocType),
    [byType, focusDocType]
  )
  const [steps] = useState(() => {
    const initial = orderCatalogPendingFirst(
      new Map(documents.map((row) => [row.doc_type, row])),
      focusDocType
    )
    return [...initial.pending, ...initial.complete]
  })
  const [prendaHasEvidence, setPrendaHasEvidence] = useState(() =>
    isDocumentCatalogItemVisible('levantamiento_prendas', byType)
  )

  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<PickedFile[]>([])
  const [note, setNote] = useState(() => (steps[0] ? getCatalogDocumentRow(byType, steps[0].docType)?.detail_text ?? '' : ''))
  const [busy, setBusy] = useState(false)
  const [validating, setValidating] = useState(false)
  const [pendingAi, setPendingAi] = useState<PendingAiFile[]>([])
  const [reviewMode] = useState(() => vehicleHasUploadedDocs(documents))

  const step = steps[index]
  const isLast = index >= steps.length - 1
  const stepRow = step ? getCatalogDocumentRow(byType, step.docType) : undefined
  const existingFiles = stepRow ? listDocumentFiles(stepRow) : []
  const hasEvidence = picked.length > 0 || existingFiles.length > 0

  const upsertDoc = (row: VehicleDocumentRow) => {
    setDocs((current) => {
      const next = current.filter((item) => item.id !== row.id)
      next.push(row)
      return next
    })
  }

  const goToStep = (nextIndex: number) => {
    const next = steps[nextIndex]
    revokePreviews(picked)
    setPicked([])
    setIndex(nextIndex)
    const nextRow = next ? getCatalogDocumentRow(byType, next.docType) : undefined
    const nextNote = nextRow?.detail_text ?? ''
    const nextExisting = nextRow ? listDocumentFiles(nextRow) : []
    if (
      next?.docType === 'levantamiento_prendas' &&
      !prendaHasEvidence &&
      nextExisting.length === 0 &&
      nextNote.trim().length < 8
    ) {
      setNote('No aplica: sin prenda industrial.')
    } else {
      setNote(nextNote)
    }
  }

  const addFiles = (list: FileList | File[] | null) => {
    if (!list || list.length === 0) return
    const extras: PickedFile[] = Array.from(list).map((file) => ({
      file,
      preview: isPreviewable(file) ? URL.createObjectURL(file) : null,
    }))
    setPicked((current) => [...current, ...extras])
  }

  const persistStep = async (catalog: DocCatalogEntry): Promise<PendingAiFile[]> => {
    const noteText = note.trim()
    const uploaded: PendingAiFile[] = []
    let lastSaved: VehicleDocumentRow | null = null
    for (const item of picked) {
      const saved = await uploadVehicleDocument(supabase, inventoryoracleId, catalog.docType, item.file, profileId, {
        status: 'cargado',
        detail_text: noteText || undefined,
        actor_name: actorName,
      })
      lastSaved = saved
      if (saved.lastUploadedFileId) {
        uploaded.push({
          fileId: saved.lastUploadedFileId,
          fileName: item.file.name || 'Foto',
          docLabel: catalog.label,
        })
      }
    }
    if (lastSaved) upsertDoc(lastSaved)

    const row = lastSaved ?? getCatalogDocumentRow(byType, catalog.docType)
    if (row && picked.length === 0) {
      const hasPhotos = listDocumentFiles(row).length > 0 || Boolean(row.file_url)
      try {
        await updateVehicleDocumentMeta(
          supabase,
          row.id,
          {
            detail_text: noteText || row.detail_text,
            status: hasPhotos ? 'cargado' : 'completo',
          },
          {
            actor_id: profileId,
            actor_name: actorName,
            inventoryoracle_id: inventoryoracleId,
            doc_type: catalog.docType,
            previous_status: row.status,
          }
        )
      } catch {
        // Si solo se avanza con archivo ya existente, no bloquear el wizard.
      }
    }

    if (catalog.docType === 'prenda_industrial') {
      const noPrenda = /no (tiene|hay) prenda|sin prenda/i.test(noteText)
      setPrendaHasEvidence(
        !noPrenda &&
          (uploaded.length > 0 ||
            picked.length > 0 ||
            existingFiles.length > 0 ||
            /tiene prenda|\bsí\b|\bsi\b/i.test(noteText))
      )
    }

    return uploaded
  }

  const analyzePendingPhotos = async (queue: PendingAiFile[]) => {
    if (queue.length === 0) return
    setValidating(true)
    let mismatches = 0
    let errors = 0
    for (const item of queue) {
      try {
        const res = await fetch(`/api/inventario/documentos/archivos/${encodeURIComponent(item.fileId)}/analizar`, {
          method: 'POST',
        })
        const body = (await res.json()) as { report?: DocumentAiReportRow; error?: string }
        if (!res.ok || !body.report) {
          errors += 1
          continue
        }
        if (!photoMatchesSection(body.report)) mismatches += 1
      } catch {
        errors += 1
      }
    }
    if (errors > 0) {
      toast.warning(`IA no pudo revisar ${errors} foto(s). El resto quedó analizado.`)
    }
    if (mismatches > 0) {
      toast.warning(`${mismatches} foto(s) no coinciden con su sección. Revisa el informe IA en el expediente.`)
    } else if (queue.length > errors) {
      toast.success(`IA validó ${queue.length - errors} foto(s) del expediente.`)
    }
  }

  const uploadFilesToSection = async (catalog: DocCatalogEntry, files: File[]) => {
    const uploaded: PendingAiFile[] = []
    let lastSaved: VehicleDocumentRow | null = null
    for (const file of files) {
      const saved = await uploadVehicleDocument(supabase, inventoryoracleId, catalog.docType, file, profileId, {
        status: 'cargado',
        actor_name: actorName,
      })
      lastSaved = saved
      if (saved.lastUploadedFileId) {
        uploaded.push({
          fileId: saved.lastUploadedFileId,
          fileName: file.name || 'Foto',
          docLabel: catalog.label,
        })
      }
    }
    if (lastSaved) upsertDoc(lastSaved)
    if (uploaded.length > 0) setPendingAi((current) => [...current, ...uploaded])
  }

  const dropStoredFile = async (file: VehicleDocumentFileRow) => {
    if (isLegacyFileId(file.id)) return false
    await deleteVehicleDocumentFile(supabase, file.id, {
      actor_id: profileId,
      actor_name: actorName,
    })
    setDocs((current) =>
      current.map((row) => (row.id === file.document_id ? withoutFile(row, file.id) : row))
    )
    return true
  }

  const handleAddToSection = async (catalog: DocCatalogEntry, list: FileList | null) => {
    const files = list ? Array.from(list) : []
    if (files.length === 0 || busy || validating) return
    setBusy(true)
    try {
      await uploadFilesToSection(catalog, files)
      toast.success(
        files.length === 1 ? `Foto agregada en ${catalog.label}` : `${files.length} fotos agregadas en ${catalog.label}`
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo agregar el archivo')
    } finally {
      setBusy(false)
    }
  }

  const handleReplaceOne = async (catalog: DocCatalogEntry, current: VehicleDocumentFileRow, next: File) => {
    if (busy || validating) return
    setBusy(true)
    try {
      await dropStoredFile(current)
      await uploadFilesToSection(catalog, [next])
      toast.success(`Foto actualizada en ${catalog.label}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cambiar la foto')
    } finally {
      setBusy(false)
    }
  }

  const handleReplaceAll = async (catalog: DocCatalogEntry, list: FileList | null) => {
    const files = list ? Array.from(list) : []
    if (files.length === 0 || busy || validating) return
    const row = getCatalogDocumentRow(byType, catalog.docType)
    const existing = row ? listDocumentFiles(row) : []
    if (existing.length > 0) {
      const ok = window.confirm(
        `¿Reemplazar ${existing.length} archivo(s) de ${catalog.label} por ${files.length} nuevo(s)?`
      )
      if (!ok) return
    }
    setBusy(true)
    try {
      for (const file of existing) {
        await dropStoredFile(file)
      }
      await uploadFilesToSection(catalog, files)
      toast.success(`Se actualizó ${catalog.label}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudieron reemplazar las fotos')
    } finally {
      setBusy(false)
    }
  }

  const finishReview = async () => {
    if (busy || validating) return
    setBusy(true)
    try {
      await analyzePendingPhotos(pendingAi)
      onRefresh()
      onClose()
    } finally {
      setBusy(false)
      setValidating(false)
    }
  }

  const dismissReview = () => {
    if (busy || validating) return
    onRefresh()
    onClose()
  }

  const handleNext = async () => {
    if (!step || busy || validating) return
    if (!hasEvidence && note.trim().length < 8) {
      toast.error('Sube al menos una foto, usa la que ya está en el expediente, o escribe por qué no hace falta.')
      return
    }

    setBusy(true)
    try {
      const uploaded = await persistStep(step)
      const allPending = [...pendingAi, ...uploaded]
      setPendingAi(allPending)

      const finished = isLast || (step.docType === 'prenda_industrial' && index + 1 >= steps.length)
      if (finished) {
        await analyzePendingPhotos(allPending)
        onRefresh()
        onClose()
        toast.success('Documentación cargada')
        return
      }
      goToStep(index + 1)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar esta sección')
    } finally {
      setBusy(false)
      setValidating(false)
    }
  }

  if (reviewMode) {
    const blocked = busy || validating

    const renderReviewItem = (catalog: DocCatalogEntry) => {
      const row = getCatalogDocumentRow(byType, catalog.docType)
      const files = row ? listDocumentFiles(row) : []
      const pending = getDocumentCheckStatus(row, catalog) !== 'ok'
      const addId = `review-add-${catalog.docType}`
      const replaceId = `review-replace-${catalog.docType}`
      return (
        <div
          key={catalog.docType}
          className={`rounded-xl border bg-white p-4 space-y-3 ${
            pending ? 'border-amber-200' : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">{catalog.label}</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {files.length === 0
                  ? 'Sin archivos. Puedes agregar fotos ahora.'
                  : `${files.length} archivo${files.length === 1 ? '' : 's'} · cambia una, agrega más o reemplaza todas.`}
              </p>
            </div>
            {pending ? (
              <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                Pendiente
              </span>
            ) : (
              <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                Completo
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {files.map((file) => (
              <label
                key={file.id}
                title={`${file.file_name} · Cambiar esta foto`}
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 ${
                  blocked ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:ring-2 hover:ring-blue-400'
                }`}
              >
                {isDocumentImageFile(file) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.file_url} alt={file.file_name} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-1">
                    <FileText className="h-5 w-5 text-slate-500" />
                    <span className="line-clamp-2 text-center text-[9px] leading-tight text-slate-500">
                      {file.file_name}
                    </span>
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-slate-900/70 py-0.5 text-center text-[9px] font-semibold text-white">
                  Cambiar
                </span>
                <input
                  type="file"
                  accept={WIZARD_ACCEPT}
                  disabled={blocked}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => {
                    const next = e.target.files?.[0]
                    e.target.value = ''
                    if (next) void handleReplaceOne(catalog, file, next)
                  }}
                />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <label
              htmlFor={addId}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 ${
                blocked ? 'pointer-events-none opacity-40' : 'cursor-pointer hover:bg-slate-100'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </label>
            <input
              id={addId}
              type="file"
              accept={WIZARD_ACCEPT}
              multiple
              disabled={blocked}
              className="sr-only"
              onChange={(e) => {
                const list = e.target.files
                e.target.value = ''
                void handleAddToSection(catalog, list)
              }}
            />
            {files.length > 0 ? (
              <>
                <label
                  htmlFor={replaceId}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-900 ${
                    blocked ? 'pointer-events-none opacity-40' : 'cursor-pointer hover:bg-amber-100'
                  }`}
                >
                  <Replace className="h-3.5 w-3.5" />
                  Reemplazar todas
                </label>
                <input
                  id={replaceId}
                  type="file"
                  accept={WIZARD_ACCEPT}
                  multiple
                  disabled={blocked}
                  className="sr-only"
                  onChange={(e) => {
                    const list = e.target.files
                    e.target.value = ''
                    void handleReplaceAll(catalog, list)
                  }}
                />
              </>
            ) : null}
          </div>
        </div>
      )
    }

    return (
      <div
        className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/50 p-4"
        onClick={blocked ? undefined : dismissReview}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-wizard-title"
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
            <div>
              <p id="upload-wizard-title" className="text-lg font-bold text-slate-900">
                Revisar documentación
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {placa} · Cambia fotos por sección. Los cambios se guardan al instante.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissReview}
              disabled={blocked}
              className="p-2 rounded-full text-slate-400 hover:bg-slate-100 disabled:opacity-40"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            <PendingDocumentsNotice labels={pendingDocs.map((item) => item.label)} />
            {reviewGroups.pending.length > 0 ? (
              <section className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                  Pendientes por subir
                </p>
                {reviewGroups.pending.map(renderReviewItem)}
              </section>
            ) : null}
            {reviewGroups.complete.length > 0 ? (
              <section className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Ya cargados
                </p>
                {reviewGroups.complete.map(renderReviewItem)}
              </section>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
            <button
              type="button"
              disabled={blocked}
              onClick={() => void finishReview()}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50"
            >
              {blocked ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {validating ? 'Validando fotos con IA…' : busy ? 'Guardando…' : 'Listo'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!step) return null

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={busy || validating ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-wizard-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div>
            <p id="upload-wizard-title" className="text-lg font-bold text-slate-900">
              Subir documentación
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {placa} · Paso {index + 1} de {steps.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy || validating}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-100 disabled:opacity-40"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="h-1.5 bg-slate-100">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <PendingDocumentsNotice labels={pendingDocs.map((item) => item.label)} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              {step.category === 'legal' ? 'Documentación legal' : 'Estado del vehículo'}
            </p>
            <h3 className="text-base font-bold text-slate-900 mt-1">{step.label}</h3>
            <p className="text-sm text-slate-600 mt-1">
              Sube una o varias fotos, o continúa si esta sección ya tiene archivo. Si no aplica, deja constancia del
              motivo. La IA revisa las fotos nuevas al terminar el flujo.
            </p>
          </div>

          <div
            className="relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 hover:border-blue-300 hover:bg-blue-50/40"
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              addFiles(e.dataTransfer.files)
            }}
          >
            <Upload className="h-8 w-8 text-slate-400 pointer-events-none" />
            <span className="text-sm font-semibold text-slate-700 pointer-events-none">Elegir fotos o PDF</span>
            <span className="text-[11px] text-slate-500 pointer-events-none">
              Toca aquí o arrastra el archivo. Se muestra el nombre al seleccionarlo.
            </span>
            <input
              key={step.docType}
              type="file"
              accept={WIZARD_ACCEPT}
              multiple
              disabled={busy || validating}
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>

          {existingFiles.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1.5">Ya en el expediente</p>
              <ul className="space-y-1.5">
                {existingFiles.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-sm"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-emerald-700" />
                    <span className="truncate flex-1 text-slate-800" title={file.file_name}>
                      {file.file_name || 'Archivo'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {picked.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1.5">Seleccionadas ahora ({picked.length})</p>
              <ul className="space-y-1.5">
                {picked.map((item, fileIndex) => (
                  <li
                    key={`${item.file.name}-${item.file.size}-${fileIndex}`}
                    className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-sm"
                  >
                    {item.preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.preview} alt="" className="h-10 w-10 rounded object-cover shrink-0 bg-slate-200" />
                    ) : (
                      <FileText className="h-4 w-4 shrink-0 text-blue-700" />
                    )}
                    <span className="truncate flex-1" title={item.file.name}>
                      {item.file.name}
                    </span>
                    <button
                      type="button"
                      className="text-xs font-semibold text-red-600"
                      onClick={() => {
                        const itemToRemove = picked[fileIndex]
                        if (itemToRemove?.preview) URL.revokeObjectURL(itemToRemove.preview)
                        setPicked((current) => current.filter((_, i) => i !== fileIndex))
                      }}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <label htmlFor="wizard-note" className="text-xs font-semibold text-slate-700">
              Nota si no hay foto (obligatoria si no subes archivo)
            </label>
            <textarea
              id="wizard-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={NOTE_PLACEHOLDERS[step.docType] ?? 'Explica por qué no se sube este documento.'}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-slate-100">
          <button
            type="button"
            disabled={index === 0 || busy || validating}
            onClick={() => goToStep(index - 1)}
            className="inline-flex items-center gap-1 h-10 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Atrás
          </button>
          <button
            type="button"
            disabled={busy || validating}
            onClick={() => void handleNext()}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50"
          >
            {busy || validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {validating ? 'Validando fotos con IA…' : busy ? 'Guardando…' : isLast ? 'Terminar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  )
}
