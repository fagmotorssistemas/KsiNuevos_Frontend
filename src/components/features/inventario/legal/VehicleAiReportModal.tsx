'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { VEHICLE_DOCUMENT_CATALOG, docCatalogByType } from '@/lib/inventario/vehicleDocumentCatalog'
import {
  DOCUMENT_SECTION_TITLES,
  isDocumentCatalogItemVisible,
  listDocumentFiles,
} from '@/lib/inventario/vehicleLegalUi'
import {
  formatContrasteConsultedPretty,
  formatContrasteRelative,
} from '@/lib/inventario/ecuadorContraste'
import type { DocumentAiAnalysis, VehicleAiFinding, VehicleAiSynthesis, VehicleAiSynthesisItem } from '@/lib/inventario/openaiDocumentVision'
import type { VehiculoInventario } from '@/types/inventario.types'
import type { DocumentAiReportRow } from '@/services/documentAiReports.service'
import {
  parseVehicleAiInformePayload,
  type VehicleAiInformePayload,
  type VehicleAiInformeSection,
  type VehicleAiInformeSectionFile,
} from '@/services/vehicleAiInformes.service'
import type { VehicleDocType, VehicleLegalDossier } from '@/types/vehicleLegal.types'

type FileJob = {
  fileId: string
  fileName: string
  docType: VehicleDocType
  docLabel: string
}

function analysisFromReport(report: DocumentAiReportRow): DocumentAiAnalysis {
  const payload = report.payload
  const fromPayload =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Partial<DocumentAiAnalysis>)
      : {}
  const extracted = report.extracted
  const extractedObj =
    extracted && typeof extracted === 'object' && !Array.isArray(extracted)
      ? (extracted as DocumentAiAnalysis['extracted'])
      : {}
  return {
    summary: report.summary,
    document_kind_guess: fromPayload.document_kind_guess ?? null,
    matches_expected_type: fromPayload.matches_expected_type ?? null,
    matches_plate: report.matches_plate,
    plate_read: fromPayload.plate_read ?? null,
    quality: (fromPayload.quality as DocumentAiAnalysis['quality']) ?? 'ok',
    extracted: extractedObj,
    issues: Array.isArray(fromPayload.issues) ? fromPayload.issues.filter((i): i is string => typeof i === 'string') : [],
    confidence: fromPayload.confidence ?? null,
    matricula_expired: fromPayload.matricula_expired ?? null,
    vigencia_hasta: fromPayload.vigencia_hasta ?? null,
    contraste_mismatch: fromPayload.contraste_mismatch ?? null,
    photo_should_not_be_uploaded: fromPayload.photo_should_not_be_uploaded ?? null,
  }
}

function collectJobs(dossier: VehicleLegalDossier): FileJob[] {
  const jobs: FileJob[] = []
  for (const row of dossier.documents) {
    const catalog = docCatalogByType(row.doc_type as VehicleDocType)
    for (const file of listDocumentFiles(row)) {
      if (file.id.startsWith('legacy-')) continue
      jobs.push({
        fileId: file.id,
        fileName: file.file_name,
        docType: row.doc_type as VehicleDocType,
        docLabel: catalog?.label ?? row.doc_type,
      })
    }
  }
  return jobs
}

function buildSections(
  dossier: VehicleLegalDossier,
  fileResults: VehicleAiInformeSectionFile[]
): VehicleAiInformeSection[] {
  const byType = new Map(dossier.documents.map((row) => [row.doc_type, row]))
  return VEHICLE_DOCUMENT_CATALOG.filter((col) => isDocumentCatalogItemVisible(col.docType, byType)).map((col) => {
    const row = byType.get(col.docType)
    const fileIds = new Set(row ? listDocumentFiles(row).map((file) => file.id) : [])
    const analyzable = fileResults
      .filter((file) => fileIds.has(file.fileId) && !file.fileId.startsWith('legacy-'))
      .map((file, index) => ({ ...file, photoIndex: index + 1 }))
    return {
      docType: col.docType,
      docLabel: col.label,
      category: col.category,
      detailText: row?.detail_text?.trim() || null,
      missing: analyzable.length === 0,
      files: analyzable,
    }
  })
}

async function mapPool<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  let index = 0
  async function worker() {
    while (index < items.length) {
      const current = index
      index += 1
      out[current] = await mapper(items[current])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, () => worker()))
  return out
}

function VehicleAiReportModal({
  vehiculo,
  dossier,
  onClose,
}: {
  vehiculo: VehiculoInventario
  dossier: VehicleLegalDossier
  onClose: () => void
}) {
  const jobs = useMemo(() => collectJobs(dossier), [dossier])
  const [running, setRunning] = useState(false)
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'files' | 'synthesis'>('idle')
  const [payload, setPayload] = useState<VehicleAiInformePayload | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadingSaved(true)
    void fetch(`/api/inventario/documentos/informe-ia?placa=${encodeURIComponent(vehiculo.placa)}`)
      .then(async (res) => {
        const body = (await res.json()) as {
          informe?: { created_at: string; payload: unknown } | null
          error?: string
        }
        if (!res.ok) throw new Error(body.error || 'No se pudo cargar el informe')
        if (cancelled || !body.informe) return
        const parsed = parseVehicleAiInformePayload(body.informe.payload)
        if (parsed) {
          setPayload(parsed)
          setSavedAt(body.informe.created_at)
        }
      })
      .catch(() => {
        /* sin informe previo */
      })
      .finally(() => {
        if (!cancelled) setLoadingSaved(false)
      })
    return () => {
      cancelled = true
    }
  }, [vehiculo.placa])

  const run = async () => {
    if (running) return
    setRunning(true)
    setPhase(jobs.length > 0 ? 'files' : 'synthesis')
    setProgress(0)
    let done = 0
    try {
      const fileResults: VehicleAiInformeSectionFile[] =
        jobs.length === 0
          ? []
          : await mapPool(jobs, 3, async (job) => {
              try {
                const res = await fetch(
                  `/api/inventario/documentos/archivos/${encodeURIComponent(job.fileId)}/analizar`,
                  { method: 'POST' }
                )
                const body = (await res.json()) as { report?: DocumentAiReportRow; error?: string }
                done += 1
                setProgress(done)
                if (!res.ok || !body.report) {
                  return { fileId: job.fileId, fileName: job.fileName, error: body.error || 'No se pudo analizar' }
                }
                return { fileId: job.fileId, fileName: job.fileName, analysis: analysisFromReport(body.report) }
              } catch (e) {
                done += 1
                setProgress(done)
                return {
                  fileId: job.fileId,
                  fileName: job.fileName,
                  error: e instanceof Error ? e.message : 'Error de red',
                }
              }
            })

      const sections = buildSections(dossier, fileResults)
      setPhase('synthesis')
      const synRes = await fetch('/api/inventario/documentos/informe-ia/sintesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placa: vehiculo.placa,
          vehicleLabel: `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anioModelo ?? ''}`.trim(),
          items: sections.flatMap((section): VehicleAiSynthesisItem[] => {
            if (section.missing) {
              return [
                {
                  docType: section.docType,
                  docLabel: section.docLabel,
                  fileName: '',
                  summary: 'No se ha subido documento.',
                  issues: ['No se ha subido documento.'],
                  missing: true,
                  photoIndex: null,
                  detailText: section.detailText,
                  error: null,
                },
              ]
            }
            return section.files.map((file, index) => ({
              docType: section.docType,
              docLabel: section.docLabel,
              fileName: file.fileName,
              photoIndex: file.photoIndex ?? index + 1,
              summary: file.analysis?.summary || '',
              issues: file.analysis?.issues ?? [],
              photoShouldNotBeUploaded: file.analysis?.photo_should_not_be_uploaded ?? false,
              missing: false,
              detailText: section.detailText,
              error: file.error ?? null,
            }))
          }),
        }),
      })
      const synBody = (await synRes.json()) as { synthesis?: VehicleAiSynthesis; error?: string }
      if (!synRes.ok || !synBody.synthesis) throw new Error(synBody.error || 'No se pudo armar el informe')
      const next: VehicleAiInformePayload = { synthesis: synBody.synthesis, sections }
      const saveRes = await fetch('/api/inventario/documentos/informe-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placa: vehiculo.placa,
          inventoryoracleId: dossier.inventoryoracleId,
          payload: next,
        }),
      })
      const saveBody = (await saveRes.json()) as { informe?: { created_at: string }; error?: string }
      if (!saveRes.ok) throw new Error(saveBody.error || 'No se pudo guardar el informe')
      setPayload(next)
      setSavedAt(saveBody.informe?.created_at ?? new Date().toISOString())
      toast.success('Informe IA guardado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo generar el informe IA')
    } finally {
      setRunning(false)
      setPhase('idle')
    }
  }

  const legalBlocks = (payload?.sections ?? []).filter((s) => s.category === 'legal')
  const physicalBlocks = (payload?.sections ?? []).filter((s) => s.category === 'physical')

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 bg-white border-b border-slate-100">
          <div>
            <p className="text-lg font-bold text-slate-900">Informe IA</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {vehiculo.placa}
              {savedAt
                ? ` · Último análisis: ${formatContrasteConsultedPretty(savedAt)} · ${formatContrasteRelative(savedAt)}`
                : ' · Aún no hay un análisis guardado'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void run()}
              disabled={running || loadingSaved}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-violet-700 text-white text-sm font-semibold hover:bg-violet-800 disabled:opacity-50"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {payload ? 'Analizar de nuevo' : 'Analizar todo'}
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loadingSaved ? (
            <p className="text-sm text-slate-500 inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando último informe…
            </p>
          ) : null}

          {running ? (
            <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-800">
              {phase === 'files'
                ? `Analizando fotos ${progress} de ${jobs.length}…`
                : 'Redactando conclusiones por sección…'}
            </div>
          ) : null}

          {!loadingSaved && !payload && !running ? (
            <p className="text-sm text-slate-500">
              Pulsa Analizar todo para generar el informe de cada sección legal. Si ya hubo un análisis, aparecerá aquí
              con fecha.
            </p>
          ) : null}

          {payload?.synthesis ? (
            <section className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
              <h4 className="text-sm font-bold text-violet-900 mb-2">Conclusiones</h4>
              <p className="text-sm text-slate-700 leading-relaxed">{payload.synthesis.overall_summary}</p>
              {payload.synthesis.alerts.length > 0 ? (
                <FindingsTable findings={payload.synthesis.alerts} />
              ) : null}
            </section>
          ) : null}

          {legalBlocks.length > 0 ? (
            <section>
              <h4 className="text-sm font-bold text-slate-900 mb-3">{DOCUMENT_SECTION_TITLES.legal}</h4>
              <div className="space-y-3">
                {legalBlocks.map((block) => (
                  <AiDocBlock
                    key={block.docType}
                    section={block}
                    synthesis={payload?.synthesis.blocks.find((b) => b.docType === block.docType)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {physicalBlocks.length > 0 ? (
            <section>
              <h4 className="text-sm font-bold text-slate-900 mb-3">{DOCUMENT_SECTION_TITLES.physical}</h4>
              <div className="space-y-3">
                {physicalBlocks.map((block) => (
                  <AiDocBlock
                    key={block.docType}
                    section={block}
                    synthesis={payload?.synthesis.blocks.find((b) => b.docType === block.docType)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function origenLabel(kind: VehicleAiFinding['sources'][number]['kind']): string {
  if (kind === 'missing') return 'Sin archivo'
  if (kind === 'detail') return 'Detalle del encargado'
  if (kind === 'api') return 'EcuadorAPI (contraste)'
  return 'Foto'
}

function FindingsTable({ findings }: { findings: VehicleAiFinding[] }) {
  const rows = findings.flatMap((finding) => {
    if (finding.sources.length === 0) {
      return [{ finding, source: null as VehicleAiFinding['sources'][number] | null }]
    }
    return finding.sources.map((source) => ({ finding, source }))
  })

  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[560px] text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2.5">Hallazgo</th>
            <th className="px-3 py-2.5">Sección</th>
            <th className="px-3 py-2.5">Foto</th>
            <th className="px-3 py-2.5">Origen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.finding.text}-${row.source?.label ?? 'na'}-${index}`} className="border-b border-slate-100 last:border-0">
              <td className="px-3 py-2.5 text-slate-800 align-top">{row.finding.text}</td>
              <td className="px-3 py-2.5 text-slate-700 align-top whitespace-nowrap">
                {row.source?.docLabel || '—'}
              </td>
              <td className="px-3 py-2.5 text-slate-700 align-top whitespace-nowrap">
                {row.source?.kind === 'photo' && row.source.photoIndex
                  ? `Foto ${row.source.photoIndex}`
                  : '—'}
              </td>
              <td className="px-3 py-2.5 text-slate-600 align-top">
                {row.source ? (
                  <span title={row.source.fileName || undefined}>
                    {origenLabel(row.source.kind)}
                    {row.source.fileName ? ` · ${row.source.fileName}` : ''}
                  </span>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AiDocBlock({
  section,
  synthesis,
}: {
  section: VehicleAiInformeSection
  synthesis?: VehicleAiSynthesis['blocks'][number]
}) {
  const missingLabel = 'No se ha subido documento.'
  const conclusion =
    synthesis?.conclusion ||
    (section.missing ? missingLabel : null)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-slate-900">{section.docLabel}</p>
        {section.missing ? (
          <span className="shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border bg-slate-50 text-slate-600 border-slate-200">
            Sin archivo
          </span>
        ) : null}
      </div>
      {section.detailText ? (
        <p className="text-xs text-slate-600 mt-2 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2">
          <span className="font-semibold text-slate-700">Detalle del encargado: </span>
          {section.detailText}
        </p>
      ) : null}
      {section.missing ? (
        <p className="text-sm text-amber-800 mt-2">{missingLabel}</p>
      ) : null}
      {conclusion && !section.missing ? (
        <p className="text-sm text-slate-700 mt-2 leading-relaxed">{conclusion}</p>
      ) : null}
      {synthesis?.alerts?.length ? (
        <FindingsTable findings={synthesis.alerts} />
      ) : null}
      {section.files.length > 0 ? (
        <div className="mt-3 space-y-2">
          {section.files.map((file, index) => (
            <div key={file.fileId} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold text-violet-800">
                Foto {file.photoIndex ?? index + 1}
                <span className="font-normal text-slate-500"> · {file.fileName}</span>
                {file.analysis?.photo_should_not_be_uploaded ? (
                  <span className="ml-2 inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold border bg-red-50 text-red-700 border-red-200">
                    No debió subirse
                  </span>
                ) : null}
              </p>
              {file.error ? (
                <p className="text-xs text-red-600 mt-1">{file.error}</p>
              ) : (
                <>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed">{file.analysis?.summary}</p>
                  {file.analysis?.issues?.length ? (
                    <ul className="mt-1 list-disc pl-4 text-[11px] text-amber-800 space-y-0.5">
                      {file.analysis.issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function VehicleAiReportButton({
  vehiculo,
  dossier,
}: {
  vehiculo: VehiculoInventario
  dossier: VehicleLegalDossier
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-violet-700 text-sm font-semibold text-white hover:bg-violet-800"
      >
        <Sparkles className="h-5 w-5" />
        Informe IA
      </button>
      {open ? <VehicleAiReportModal vehiculo={vehiculo} dossier={dossier} onClose={() => setOpen(false)} /> : null}
    </>
  )
}
