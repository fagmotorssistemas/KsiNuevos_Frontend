'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { VEHICLE_DOCUMENT_CATALOG, type DocCatalogEntry } from '@/lib/inventario/vehicleDocumentCatalog'
import { isDocumentCatalogItemVisible } from '@/lib/inventario/vehicleLegalUi'
import { ACCEPT_UPLOAD, uploadVehicleDocument, updateVehicleDocumentMeta } from '@/services/vehicleLegal.service'
import type { DocumentAiReportRow } from '@/services/documentAiReports.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { VehicleDocType, VehicleDocumentRow } from '@/types/vehicleLegal.types'

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

type AiCheck = {
  fileId: string
  fileName: string
  ok: boolean
  summary: string
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
}: Props) {
  const byType = useMemo(() => new Map(documents.map((row) => [row.doc_type, row])), [documents])
  const [prendaHasEvidence, setPrendaHasEvidence] = useState(() =>
    isDocumentCatalogItemVisible('levantamiento_prendas', byType)
  )
  const steps = useMemo(
    () =>
      VEHICLE_DOCUMENT_CATALOG.filter((item) =>
        item.docType === 'levantamiento_prendas' ? prendaHasEvidence : true
      ),
    [prendaHasEvidence]
  )

  const [index, setIndex] = useState(0)
  const [files, setFiles] = useState<File[]>([])
  const [note, setNote] = useState(() => steps[0] ? byType.get(steps[0].docType)?.detail_text ?? '' : '')
  const [busy, setBusy] = useState(false)
  const [checks, setChecks] = useState<AiCheck[] | null>(null)
  const [forceContinue, setForceContinue] = useState(false)

  const step = steps[index]
  const isLast = index >= steps.length - 1
  const failed = (checks ?? []).filter((item) => !item.ok)
  const canAdvancePastAi = !checks || failed.length === 0 || forceContinue

  const goToStep = (nextIndex: number) => {
    const next = steps[nextIndex]
    setIndex(nextIndex)
    setFiles([])
    setChecks(null)
    setForceContinue(false)
    setNote(next ? byType.get(next.docType)?.detail_text ?? '' : '')
  }

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return
    setFiles((current) => [...current, ...Array.from(list)])
    setChecks(null)
    setForceContinue(false)
  }

  const persistStep = async (catalog: DocCatalogEntry) => {
    const noteText = note.trim()
    const uploadedIds: string[] = []
    for (const file of files) {
      const saved = await uploadVehicleDocument(supabase, inventoryoracleId, catalog.docType, file, profileId, {
        status: 'cargado',
        detail_text: noteText || undefined,
        actor_name: actorName,
      })
      if (saved.lastUploadedFileId) uploadedIds.push(saved.lastUploadedFileId)
    }

    const row = byType.get(catalog.docType)
    if (row) {
      const hasPhotos = files.length > 0 || Boolean(row.file_url)
      await updateVehicleDocumentMeta(
        supabase,
        row.id,
        {
          detail_text: noteText || null,
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
    }

    if (catalog.docType === 'prenda_industrial') {
      const noPrenda = /no (tiene|hay) prenda|sin prenda/i.test(noteText)
      setPrendaHasEvidence(!noPrenda && (uploadedIds.length > 0 || files.length > 0 || /tiene prenda|\bsí\b|\bsi\b/i.test(noteText)))
    }

    const results: AiCheck[] = []
    for (let i = 0; i < uploadedIds.length; i++) {
      const fileId = uploadedIds[i]
      const fileName = files[i]?.name || 'Foto'
      const res = await fetch(`/api/inventario/documentos/archivos/${encodeURIComponent(fileId)}/analizar`, {
        method: 'POST',
      })
      const body = (await res.json()) as { report?: DocumentAiReportRow; error?: string }
      if (!res.ok || !body.report) {
        results.push({
          fileId,
          fileName,
          ok: false,
          summary: body.error || 'No se pudo validar esta foto',
        })
        continue
      }
      results.push({
        fileId,
        fileName,
        ok: photoMatchesSection(body.report),
        summary: body.report.summary,
      })
    }
    return results
  }

  const handleNext = async () => {
    if (!step || busy) return
    if (files.length === 0 && note.trim().length < 8) {
      toast.error('Sube al menos una foto o escribe por qué no hace falta en esta sección.')
      return
    }
    if (checks && !canAdvancePastAi) {
      toast.error('Hay fotos que no corresponden a esta sección. Cámbialas o confirma que continuarás así.')
      return
    }
    if (checks && canAdvancePastAi) {
      if (isLast) {
        onRefresh()
        onClose()
        toast.success('Documentación cargada')
        return
      }
      goToStep(index + 1)
      return
    }

    setBusy(true)
    try {
    const results = await persistStep(step)
      onRefresh()
      if (results.length > 0) {
        const bad = results.filter((item) => !item.ok)
        setChecks(results)
        if (bad.length > 0) {
          toast.error(`${bad.length} foto(s) no parecen de «${step.label}». Revisa antes de seguir.`)
          return
        }
        toast.success(`IA validó ${results.length} foto(s) de «${step.label}».`)
      }
      const finished = isLast || (step.docType === 'prenda_industrial' && index + 1 >= steps.length)
      if (finished) {
        onClose()
        toast.success('Documentación cargada')
        return
      }
      goToStep(index + 1)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar esta sección')
    } finally {
      setBusy(false)
    }
  }

  if (!step) return null

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
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
          <button type="button" onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="h-1.5 bg-slate-100">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              {step.category === 'legal' ? 'Documentación legal' : 'Estado del vehículo'}
            </p>
            <h3 className="text-base font-bold text-slate-900 mt-1">{step.label}</h3>
            <p className="text-sm text-slate-600 mt-1">
              Sube una o varias fotos de este documento. Si no aplica, deja constancia del motivo (sin eso no se puede
              seguir).
            </p>
          </div>

          <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 cursor-pointer hover:border-blue-300 hover:bg-blue-50/40">
            <Upload className="h-8 w-8 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Elegir fotos o PDF</span>
            <span className="text-[11px] text-slate-500">Puedes seleccionar varios archivos a la vez</span>
            <input
              type="file"
              accept={ACCEPT_UPLOAD}
              multiple
              className="sr-only"
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </label>

          {files.length > 0 ? (
            <ul className="space-y-1.5">
              {files.map((file, fileIndex) => (
                <li key={`${file.name}-${fileIndex}`} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                  <span className="truncate flex-1">{file.name}</span>
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-600"
                    onClick={() => setFiles((current) => current.filter((_, i) => i !== fileIndex))}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
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

          {checks ? (
            <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3 space-y-2">
              <p className="text-xs font-bold text-violet-900">Validación IA de esta sección</p>
              {checks.map((item) => (
                <p key={item.fileId} className={`text-xs ${item.ok ? 'text-emerald-800' : 'text-red-700'}`}>
                  <span className="font-semibold">{item.fileName}:</span>{' '}
                  {item.ok ? 'corresponde a esta sección' : 'no parece de esta sección'}. {item.summary}
                </p>
              ))}
              {failed.length > 0 ? (
                <label className="flex items-start gap-2 text-xs text-slate-700 pt-1">
                  <input
                    type="checkbox"
                    checked={forceContinue}
                    onChange={(e) => setForceContinue(e.target.checked)}
                    className="mt-0.5"
                  />
                  Entiendo que alguna foto no parece de {step.label} y igual quiero continuar.
                </label>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-slate-100">
          <button
            type="button"
            disabled={index === 0 || busy}
            onClick={() => goToStep(index - 1)}
            className="inline-flex items-center gap-1 h-10 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Atrás
          </button>
          <button
            type="button"
            disabled={busy || (Boolean(checks) && !canAdvancePastAi)}
            onClick={() => void handleNext()}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? 'Guardando y validando…' : isLast ? 'Terminar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  )
}
