'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, Scale, Sparkles, User, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { listContrasteConsultas, payloadFromConsulta, saveContrasteConsulta } from '@/services/contrasteConsultas.service'
import { VEHICLE_DOCUMENT_CATALOG, docCatalogByType } from '@/lib/inventario/vehicleDocumentCatalog'
import {
  DOCUMENT_SECTION_TITLES,
  formatShortDate,
  isDocumentCatalogItemVisible,
  isDocumentImageFile,
  listDocumentFiles,
} from '@/lib/inventario/vehicleLegalUi'
import { clarifyAiSystemWording, compactFindingReasons, isInvalidUploadText, listInvalidUploadReasons, sentenceCase } from '@/lib/inventario/documentAiRules'
import {
  buildContrastMatrix,
  contrastShowAmt,
  emptyContrasteStaff,
  formatContrasteConsultedPretty,
  formatContrasteRelative,
  summarizeMatrix,
  type EcuadorContrastePayload,
  type EcuadorJuiciosConsulta,
} from '@/lib/inventario/ecuadorContraste'
import type { DocumentAiAnalysis, VehicleAiFinding, VehicleAiSource, VehicleAiSynthesis, VehicleAiSynthesisItem } from '@/lib/inventario/openaiDocumentVision'
import type { Json } from '@/types/supabase'
import type { DocumentAiReportRow } from '@/services/documentAiReports.service'
import {
  parseVehicleAiInformePayload,
  type VehicleAiInformePayload,
  type VehicleAiInformeSection,
  type VehicleAiInformeSectionFile,
} from '@/services/vehicleAiInformes.service'
import type { VehicleDocType, VehicleDocumentFileRow, VehicleLegalDossier, VehicleOwnerRow } from '@/types/vehicleLegal.types'
import type { VehiculoInventario } from '@/types/inventario.types'

type PhotoPreview = {
  url: string
  fileName: string
  isImage: boolean
}

function dossierFilePreview(file: VehicleDocumentFileRow): PhotoPreview {
  return {
    url: file.file_url,
    fileName: file.file_name || 'Foto',
    isImage: isDocumentImageFile(file),
  }
}

function resolveFindingPhoto(
  source: VehicleAiFinding['sources'][number],
  dossier: VehicleLegalDossier,
  sections: VehicleAiInformeSection[]
): PhotoPreview | null {
  const files = dossier.documents.flatMap((row) => listDocumentFiles(row))
  if (source.fileId) {
    const match = files.find((file) => file.id === source.fileId)
    if (match) return dossierFilePreview(match)
  }
  const section = sections.find((item) => item.docType === source.docType)
  const sectionFile =
    section?.files.find((file) => source.photoIndex != null && file.photoIndex === source.photoIndex) ||
    section?.files.find((file) => source.fileName && file.fileName === source.fileName)
  if (sectionFile) {
    const match = files.find((file) => file.id === sectionFile.fileId)
    if (match) return dossierFilePreview(match)
  }
  if (source.fileName) {
    const match = files.find((file) => file.file_name === source.fileName)
    if (match) return dossierFilePreview(match)
  }
  return null
}

type FileJob = {
  fileId: string
  fileName: string
  docType: VehicleDocType
  docLabel: string
}

type ConclusionResult = {
  id: string
  bucket: 'invalid' | 'ok' | 'other'
  docLabel: string
  source: VehicleAiSource
  heading: string | null
  reasons: string[]
}

function formatJuicioLine(proceso: { causa: string | null; accion: string | null; rol: string | null; estado: string | null; fecha: string | null }): string {
  return [proceso.causa, proceso.accion, proceso.rol, proceso.estado, proceso.fecha].filter(Boolean).join(' · ')
}

function juiciosForSection(
  section: VehicleAiInformeSection,
  payload: VehicleAiInformePayload | null
): EcuadorJuiciosConsulta | null {
  if (section.docType !== 'procesos_legales') return null
  return section.juicios ?? payload?.juicios ?? null
}

function buildConclusionResults(payload: VehicleAiInformePayload): ConclusionResult[] {
  const results: ConclusionResult[] = []
  for (const section of payload.sections) {
    const juicios = juiciosForSection(section, payload)
    if (section.docType === 'procesos_legales' && juicios) {
      const reasons = juicios.error
        ? [juicios.error]
        : [
            juicios.procesos.length === 0
              ? `Función Judicial: sin procesos${juicios.cedula ? ` para cédula ${juicios.cedula}` : ''}.`
              : `Función Judicial: ${juicios.procesos.length} proceso${juicios.procesos.length === 1 ? '' : 's'}${juicios.cedula ? ` · cédula ${juicios.cedula}` : ''}.`,
            ...juicios.procesos.map(formatJuicioLine),
          ]
      results.push({
        id: 'juicios-oficiales',
        bucket: juicios.error ? 'other' : juicios.procesos.length > 0 ? 'other' : 'ok',
        docLabel: section.docLabel,
        source: {
          docType: section.docType,
          docLabel: section.docLabel,
          photoIndex: null,
          fileName: null,
          fileId: null,
          kind: 'api',
          label: 'Función Judicial',
        },
        heading: juicios.procesos.length > 0 ? `${juicios.procesos.length} procesos` : null,
        reasons,
      })
    }
    if (section.missing) {
      if (section.docType === 'procesos_legales' && juicios) {
        /* la consulta oficial ya cubre esta sección */
      } else {
        results.push({
          id: `missing-${section.docType}`,
          bucket: 'other',
          docLabel: section.docLabel,
          source: {
            docType: section.docType,
            docLabel: section.docLabel,
            photoIndex: null,
            fileName: null,
            fileId: null,
            kind: 'missing',
            label: section.docLabel,
          },
          heading: null,
          reasons: ['No se ha subido documento.'],
        })
      }
      continue
    }
    for (const file of section.files) {
      const invalid =
        Boolean(file.analysis?.photo_should_not_be_uploaded) ||
        Boolean(file.analysis?.issues?.some((issue) => isInvalidUploadText(issue))) ||
        Boolean(file.analysis?.summary && isInvalidUploadText(file.analysis.summary))
      let reasons: string[] = []
      if (invalid) {
        reasons = listInvalidUploadReasons(file.analysis?.summary || '', file.analysis?.issues ?? [])
      } else if (file.error) {
        reasons = [file.error]
      } else {
        reasons = (file.analysis?.issues ?? [])
          .map((issue) => clarifyAiSystemWording(issue))
          .filter((issue) => issue && !isInvalidUploadText(issue))
        if (reasons.length === 0) reasons = ['Se subió correctamente.']
        else reasons = compactFindingReasons(reasons)
      }
      results.push({
        id: file.fileId,
        bucket: invalid ? 'invalid' : file.error ? 'other' : 'ok',
        docLabel: section.docLabel,
        source: {
          docType: section.docType,
          docLabel: section.docLabel,
          photoIndex: file.photoIndex ?? null,
          fileName: file.fileName,
          fileId: file.fileId,
          kind: 'photo',
          label: file.fileName,
        },
        heading: invalid ? 'No debió subirse' : null,
        reasons,
      })
    }
  }
  return results
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
    matches_owner: fromPayload.matches_owner ?? null,
    matches_place: fromPayload.matches_place ?? null,
    matches_country: fromPayload.matches_country ?? null,
    matches_dates: fromPayload.matches_dates ?? null,
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
  fileResults: VehicleAiInformeSectionFile[],
  juicios?: EcuadorJuiciosConsulta | null
): VehicleAiInformeSection[] {
  const byType = new Map(dossier.documents.map((row) => [row.doc_type, row]))
  return VEHICLE_DOCUMENT_CATALOG.filter((col) => isDocumentCatalogItemVisible(col.docType, byType)).map((col) => {
    const row = byType.get(col.docType)
    const fileIds = new Set(row ? listDocumentFiles(row).map((file) => file.id) : [])
    const analyzable = fileResults
      .filter((file) => fileIds.has(file.fileId) && !file.fileId.startsWith('legacy-'))
      .map((file, index) => ({ ...file, photoIndex: index + 1 }))
    const sectionJuicios = col.docType === 'procesos_legales' ? juicios ?? null : null
    return {
      docType: col.docType,
      docLabel: col.label,
      category: col.category,
      detailText: row?.detail_text?.trim() || null,
      missing: analyzable.length === 0 && !sectionJuicios,
      files: analyzable,
      juicios: sectionJuicios,
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

type OwnerFact = { label: string; value: string }

function ownerFactsFromRow(owner: VehicleOwnerRow): OwnerFact[] {
  const facts: OwnerFact[] = [{ label: 'Nombre', value: owner.owner_name }]
  if (owner.id_number?.trim()) facts.push({ label: 'Cédula / ID', value: owner.id_number.trim() })
  facts.push({ label: 'Estado', value: owner.is_current ? 'Propietario actual' : 'Propietario anterior' })
  const from = formatShortDate(owner.from_date)
  const to = formatShortDate(owner.to_date)
  if (from) facts.push({ label: 'Desde', value: from })
  if (to) facts.push({ label: 'Hasta', value: to })
  else if (owner.is_current && owner.from_date) facts.push({ label: 'Hasta', value: 'Actual' })
  if (owner.notes?.trim()) facts.push({ label: 'Notas', value: owner.notes.trim() })
  return facts
}

function photoOwnerFacts(payload: VehicleAiInformePayload | null): OwnerFact[] {
  if (!payload) return []
  const facts: OwnerFact[] = []
  const seen = new Set<string>()
  for (const section of payload.sections) {
    for (const file of section.files) {
      const extracted = file.analysis?.extracted
      const photo = file.photoIndex ? `Foto ${file.photoIndex}` : file.fileName
      const name = extracted?.owner?.trim()
      if (name) {
        const key = name.toLowerCase()
        if (!seen.has(key)) {
          seen.add(key)
          facts.push({ label: `Leído en ${section.docLabel} (${photo})`, value: name })
        }
      }
      for (const field of extracted?.fields ?? []) {
        const label = field.label?.trim() ?? ''
        const value = field.value?.trim() ?? ''
        if (!value) continue
        if (!/propietari|c[eé]dula|identificaci[oó]n|ruc|pasaporte/i.test(label)) continue
        const key = `${label}|${value}`.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        facts.push({ label: `${label} (${section.docLabel})`, value })
      }
    }
  }
  return facts
}

function OwnerConclusionsBlock({
  vehiculo,
  dossier,
  payload,
  apiOwner,
  apiCanton,
}: {
  vehiculo: VehiculoInventario
  dossier: VehicleLegalDossier
  payload: VehicleAiInformePayload | null
  apiOwner: string | null
  apiCanton: string | null
}) {
  const owners = [...dossier.owners].sort((a, b) => Number(b.is_current) - Number(a.is_current) || a.sort_order - b.sort_order)
  const current = owners.find((owner) => owner.is_current) ?? owners[0] ?? null
  const headline =
    current?.owner_name ||
    apiOwner?.trim() ||
    vehiculo.nombreMatricula?.trim() ||
    null
  const extraFacts: OwnerFact[] = []
  if (vehiculo.nombreMatricula?.trim()) {
    extraFacts.push({ label: 'Nombre en matrícula (ficha KSI)', value: vehiculo.nombreMatricula.trim() })
  }
  if (vehiculo.lugarMatricula?.trim()) {
    extraFacts.push({ label: 'Lugar de matrícula', value: vehiculo.lugarMatricula.trim() })
  }
  if (apiOwner?.trim()) extraFacts.push({ label: 'Propietario EcuadorAPI', value: apiOwner.trim() })
  if (apiCanton?.trim()) extraFacts.push({ label: 'Cantón EcuadorAPI', value: apiCanton.trim() })
  extraFacts.push(...photoOwnerFacts(payload))

  const hasAny = Boolean(headline || owners.length || extraFacts.length)

  return (
    <div className="mb-4 rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-3">
      <div className="flex items-start gap-2">
        <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-violet-700" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700">Propietario</p>
          {headline ? (
            <p className="text-sm font-bold text-slate-900 mt-0.5">{headline}</p>
          ) : (
            <p className="text-sm text-slate-500 mt-0.5">Sin nombre de propietario registrado</p>
          )}
        </div>
      </div>
      {!hasAny ? (
        <p className="mt-2 text-xs text-slate-500">No hay datos de propietario en el expediente, la ficha ni EcuadorAPI.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {owners.map((owner) => (
            <dl
              key={owner.id}
              className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg bg-white/80 border border-violet-100 px-3 py-2"
            >
              {ownerFactsFromRow(owner).map((fact) => (
                <div key={`${owner.id}-${fact.label}`} className="min-w-0">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{fact.label}</dt>
                  <dd className="text-xs text-slate-800 break-words">{fact.value}</dd>
                </div>
              ))}
            </dl>
          ))}
          {extraFacts.length > 0 ? (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg bg-white/80 border border-violet-100 px-3 py-2">
              {extraFacts.map((fact) => (
                <div key={`${fact.label}-${fact.value}`} className="min-w-0">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{fact.label}</dt>
                  <dd className="text-xs text-slate-800 break-words">{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      )}
    </div>
  )
}

function juiciosSynthesisItem(juicios: EcuadorJuiciosConsulta | null): VehicleAiSynthesisItem | null {
  if (!juicios) return null
  const issues = juicios.error
    ? [juicios.error]
    : juicios.procesos.length === 0
      ? ['Sin procesos judiciales reportados por Función Judicial.']
      : juicios.procesos.map(formatJuicioLine)
  return {
    docType: 'procesos_legales',
    docLabel: 'Procesos legales',
    fileName: '',
    summary: juicios.error
      ? `Función Judicial: ${juicios.error}`
      : juicios.procesos.length === 0
        ? `Sin procesos judiciales para cédula ${juicios.cedula || 'del propietario'}.`
        : `${juicios.procesos.length} proceso(s) judiciales para cédula ${juicios.cedula || 'del propietario'}.`,
    issues,
    missing: false,
    photoIndex: null,
    detailText: null,
    error: juicios.error,
    photoShouldNotBeUploaded: false,
  }
}

function JuiciosConclusionsBlock({ juicios }: { juicios: EcuadorJuiciosConsulta | null | undefined }) {
  if (!juicios) return null
  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex items-start gap-2">
        <div className="h-8 w-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
          <Scale className="h-4 w-4 text-slate-700" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Función Judicial</p>
          <p className="text-sm font-bold text-slate-900 mt-0.5">
            {juicios.error
              ? juicios.error
              : juicios.procesos.length === 0
                ? 'Sin procesos reportados'
                : `${juicios.procesos.length} proceso${juicios.procesos.length === 1 ? '' : 's'}`}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {[juicios.titular, juicios.cedula ? `Cédula ${juicios.cedula}` : null].filter(Boolean).join(' · ') ||
              'Consulta por cédula del propietario'}
          </p>
        </div>
      </div>
      {juicios.procesos.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {juicios.procesos.map((proceso, index) => (
            <li
              key={`${proceso.causa || 'proceso'}-${index}`}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
            >
              <p className="font-semibold">{proceso.causa || 'Causa sin número'}</p>
              <p className="text-slate-600 mt-0.5">
                {[proceso.accion, proceso.rol, proceso.estado, proceso.fecha].filter(Boolean).join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function VehicleAiReportModal({
  vehiculo,
  dossier,
  onClose,
  onContrasteUpdated,
  onLegalRefresh,
}: {
  vehiculo: VehiculoInventario
  dossier: VehicleLegalDossier
  onClose: () => void
  onContrasteUpdated?: (payload: EcuadorContrastePayload) => void
  onLegalRefresh?: () => void
}) {
  const { supabase, profile, user } = useAuth()
  const jobs = useMemo(() => collectJobs(dossier), [dossier])
  const [running, setRunning] = useState(false)
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'contraste' | 'files' | 'synthesis'>('idle')
  const [payload, setPayload] = useState<VehicleAiInformePayload | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<PhotoPreview | null>(null)
  const [showLegalDetails, setShowLegalDetails] = useState(false)
  const [conclusionFilter, setConclusionFilter] = useState<'all' | 'invalid' | 'ok'>('all')
  const [apiOwner, setApiOwner] = useState<string | null>(null)
  const [apiCanton, setApiCanton] = useState<string | null>(null)
  const [contrasteJuicios, setContrasteJuicios] = useState<EcuadorJuiciosConsulta | null>(null)

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

  useEffect(() => {
    let cancelled = false
    void listContrasteConsultas(supabase, vehiculo.placa)
      .then((rows) => {
        if (cancelled) return
        const contrast = rows[0] ? payloadFromConsulta(rows[0]) : null
        setApiOwner(contrast?.lookup?.ownerName?.trim() || null)
        setApiCanton(contrast?.lookup?.canton?.trim() || null)
        setContrasteJuicios(contrast?.juicios ?? null)
      })
      .catch(() => {
        if (!cancelled) {
          setApiOwner(null)
          setApiCanton(null)
          setContrasteJuicios(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [supabase, vehiculo.placa])

  const run = async () => {
    if (running) return
    setRunning(true)
    setPhase('contraste')
    setProgress(0)
    let done = 0
    try {
      const readyRes = await fetch('/api/inventario/contraste/ready')
      const readyBody = readyRes.ok ? ((await readyRes.json()) as { ready?: boolean }) : { ready: false }
      let contrastePayload: EcuadorContrastePayload | null = null
      if (readyBody.ready) {
        const contrastRes = await fetch(`/api/inventario/contraste/${encodeURIComponent(vehiculo.placa)}`, {
          method: 'POST',
        })
        const contrastBody = (await contrastRes.json()) as { data?: EcuadorContrastePayload; error?: string }
        if (!contrastRes.ok || !contrastBody.data) {
          throw new Error(contrastBody.error || 'No se pudo consultar EcuadorAPI')
        }
        contrastePayload = contrastBody.data
        const staff = emptyContrasteStaff()
        const counts = summarizeMatrix(
          buildContrastMatrix(contrastBody.data, staff),
          contrastShowAmt(contrastBody.data)
        )
        await saveContrasteConsulta(supabase, {
          placa: vehiculo.placa,
          inventoryoracleId: dossier.inventoryoracleId,
          payload: contrastBody.data,
          staffSnapshot: staff as unknown as Json,
          coinciden: counts.coinciden,
          diferencias: counts.diferencias,
          sinVerificar: counts.sinVerificar,
          estadoGeneral: counts.estadoGeneral,
          consultedBy: profile?.id ?? null,
          consultedByName: profile?.full_name?.trim() || user?.email || 'Informe IA',
        })
        setApiOwner(contrastBody.data.lookup?.ownerName?.trim() || null)
        setApiCanton(contrastBody.data.lookup?.canton?.trim() || null)
        onContrasteUpdated?.(contrastBody.data)
        setContrasteJuicios(contrastBody.data.juicios ?? null)
      } else {
        throw new Error('EcuadorAPI no está configurada. No se puede actualizar el contraste.')
      }

      setPhase(jobs.length > 0 ? 'files' : 'synthesis')
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

      const sections = buildSections(dossier, fileResults, contrastePayload?.juicios ?? null)
      const juiciosItem = juiciosSynthesisItem(contrastePayload?.juicios ?? null)
      setPhase('synthesis')
      const synRes = await fetch('/api/inventario/documentos/informe-ia/sintesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placa: vehiculo.placa,
          vehicleLabel: `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anioModelo ?? ''}`.trim(),
          items: [
            ...sections.flatMap((section): VehicleAiSynthesisItem[] => {
              if (section.missing) {
                if (section.docType === 'procesos_legales' && juiciosItem) return []
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
                fileId: file.fileId,
                photoIndex: file.photoIndex ?? index + 1,
                summary: file.analysis?.summary || '',
                issues: file.analysis?.issues ?? [],
                photoShouldNotBeUploaded: file.analysis?.photo_should_not_be_uploaded ?? false,
                missing: false,
                detailText: section.detailText,
                error: file.error ?? null,
              }))
            }),
            ...(juiciosItem ? [juiciosItem] : []),
          ],
        }),
      })
      const synBody = (await synRes.json()) as { synthesis?: VehicleAiSynthesis; error?: string }
      if (!synRes.ok || !synBody.synthesis) throw new Error(synBody.error || 'No se pudo armar el informe')
      const next: VehicleAiInformePayload = {
        synthesis: synBody.synthesis,
        sections,
        juicios: contrastePayload?.juicios ?? null,
      }
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
      onLegalRefresh?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo generar el informe IA')
    } finally {
      setRunning(false)
      setPhase('idle')
    }
  }

  const displayPayload = useMemo(() => {
    if (!payload) return null
    const juicios = payload.juicios ?? contrasteJuicios
    if (!juicios) return payload
    const catalog = VEHICLE_DOCUMENT_CATALOG.find((col) => col.docType === 'procesos_legales')
    let sections = payload.sections.map((section) =>
      section.docType === 'procesos_legales'
        ? { ...section, juicios: section.juicios ?? juicios, missing: section.files.length === 0 && !juicios }
        : section
    )
    if (!sections.some((section) => section.docType === 'procesos_legales')) {
      sections = [
        ...sections,
        {
          docType: 'procesos_legales',
          docLabel: catalog?.label ?? 'Procesos legales',
          category: 'legal' as const,
          detailText: null,
          missing: false,
          files: [],
          juicios,
        },
      ]
    }
    return { ...payload, juicios, sections }
  }, [payload, contrasteJuicios])

  const legalBlocks = (displayPayload?.sections ?? []).filter((s) => s.category === 'legal')
  const physicalBlocks = (displayPayload?.sections ?? []).filter((s) => s.category === 'physical')
  const conclusionResults = useMemo(
    () => (displayPayload ? buildConclusionResults(displayPayload) : []),
    [displayPayload]
  )
  const filteredConclusions = conclusionResults.filter((item) => {
    if (conclusionFilter === 'all') return true
    return item.bucket === conclusionFilter
  })
  const invalidCount = conclusionResults.filter((item) => item.bucket === 'invalid').length
  const okCount = conclusionResults.filter((item) => item.bucket === 'ok').length
  const overallSummary = payload?.synthesis ? clarifyAiSystemWording(payload.synthesis.overall_summary) : ''
  const openFindingPhoto = (source: VehicleAiFinding['sources'][number]) => {
    const preview = resolveFindingPhoto(source, dossier, displayPayload?.sections ?? [])
    if (preview) setPhotoPreview(preview)
    else toast.error('No se encontró el archivo de esa foto en el expediente')
  }
  const openSectionPhoto = (file: VehicleAiInformeSectionFile) => {
    const preview = resolveFindingPhoto(
      {
        docType: '',
        docLabel: '',
        photoIndex: file.photoIndex ?? null,
        fileName: file.fileName,
        fileId: file.fileId,
        kind: 'photo',
        label: file.fileName,
      },
      dossier,
      payload?.sections ?? []
    )
    if (preview) setPhotoPreview(preview)
    else toast.error('No se encontró el archivo de esa foto en el expediente')
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
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
              {phase === 'contraste'
                ? 'Consultando EcuadorAPI para actualizar el contraste…'
                : phase === 'files'
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
              <OwnerConclusionsBlock
                vehiculo={vehiculo}
                dossier={dossier}
                payload={displayPayload ?? payload}
                apiOwner={apiOwner}
                apiCanton={apiCanton}
              />
              <JuiciosConclusionsBlock juicios={displayPayload?.juicios ?? payload.juicios} />
              {overallSummary && !/^no debió subirse\.?$/i.test(overallSummary) ? (
                <p className="text-sm text-slate-700 leading-relaxed">{overallSummary}</p>
              ) : null}
              {conclusionResults.length > 0 ? (
                <>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(
                      [
                        { id: 'all' as const, label: 'Todos', count: conclusionResults.length },
                        { id: 'invalid' as const, label: 'No debieron subirse', count: invalidCount },
                        { id: 'ok' as const, label: 'Subidos correctamente', count: okCount },
                      ]
                    ).map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => setConclusionFilter(chip.id)}
                        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-semibold border ${
                          conclusionFilter === chip.id
                            ? 'bg-violet-700 text-white border-violet-700'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {chip.label}
                        <span className={conclusionFilter === chip.id ? 'text-violet-100' : 'text-slate-400'}>
                          {chip.count}
                        </span>
                      </button>
                    ))}
                  </div>
                  {filteredConclusions.length > 0 ? (
                    <ConclusionsTable
                      rows={filteredConclusions}
                      onOpenPhoto={openFindingPhoto}
                    />
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">No hay resultados en este filtro.</p>
                  )}
                </>
              ) : payload.synthesis.alerts.length > 0 ? (
                <FindingsTable findings={payload.synthesis.alerts} onOpenPhoto={openFindingPhoto} />
              ) : null}
            </section>
          ) : null}

          {legalBlocks.length > 0 || physicalBlocks.length > 0 ? (
            <button
              type="button"
              aria-expanded={showLegalDetails}
              onClick={() => setShowLegalDetails((open) => !open)}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-violet-200 bg-violet-50 text-sm font-semibold text-violet-800 hover:bg-violet-100"
            >
              {showLegalDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showLegalDetails ? 'Ocultar detalles' : 'Ver más detalles'}
            </button>
          ) : null}

          {showLegalDetails && legalBlocks.length > 0 ? (
            <section>
              <h4 className="text-sm font-bold text-slate-900 mb-3">{DOCUMENT_SECTION_TITLES.legal}</h4>
              <div className="space-y-3">
                {legalBlocks.map((block) => (
                  <AiDocBlock
                    key={block.docType}
                    section={block}
                    synthesis={displayPayload?.synthesis.blocks.find((b) => b.docType === block.docType)}
                    onOpenFindingPhoto={openFindingPhoto}
                    onOpenSectionPhoto={openSectionPhoto}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {showLegalDetails && physicalBlocks.length > 0 ? (
            <section>
              <h4 className="text-sm font-bold text-slate-900 mb-3">{DOCUMENT_SECTION_TITLES.physical}</h4>
              <div className="space-y-3">
                {physicalBlocks.map((block) => (
                  <AiDocBlock
                    key={block.docType}
                    section={block}
                    synthesis={displayPayload?.synthesis.blocks.find((b) => b.docType === block.docType)}
                    onOpenFindingPhoto={openFindingPhoto}
                    onOpenSectionPhoto={openSectionPhoto}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
      {photoPreview ? <AiPhotoLightbox preview={photoPreview} onClose={() => setPhotoPreview(null)} /> : null}
    </div>
  )
}

function origenLabel(source: VehicleAiSource): string {
  if (source.kind === 'missing') return 'Sin archivo'
  if (source.kind === 'detail') return 'Detalle del encargado'
  if (source.kind === 'api') return source.label || 'Consulta oficial'
  return 'Foto del expediente'
}

function HallazgoCopy({
  heading,
  reasons,
}: {
  heading: string | null
  reasons: string[]
}) {
  return (
    <div>
      {heading ? <p className="font-semibold text-red-800">{heading}</p> : null}
      {reasons.length > 0 ? (
        <ul className={`${heading ? 'mt-1' : ''} list-disc pl-4 space-y-0.5 text-slate-800`}>
          {reasons.map((reason, index) => (
            <li key={`${index}-${reason}`}>{sentenceCase(clarifyAiSystemWording(reason))}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function PhotoCell({
  source,
  onOpenPhoto,
}: {
  source: VehicleAiSource | null
  onOpenPhoto: (source: VehicleAiFinding['sources'][number]) => void
}) {
  if (source?.kind === 'photo' && (source.photoIndex || source.fileId || source.fileName)) {
    return (
      <button
        type="button"
        onClick={() => onOpenPhoto(source)}
        className="inline-flex items-center rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-800 hover:bg-violet-100"
      >
        {source.photoIndex ? `Foto ${source.photoIndex}` : 'Ver foto'}
      </button>
    )
  }
  return <span>—</span>
}

function FindingsTable({
  findings,
  onOpenPhoto,
}: {
  findings: VehicleAiFinding[]
  onOpenPhoto: (source: VehicleAiFinding['sources'][number]) => void
}) {
  const rows = findings.flatMap((finding) => {
    if (finding.sources.length === 0) {
      return [{ finding, source: null as VehicleAiFinding['sources'][number] | null }]
    }
    return finding.sources.map((source) => ({ finding, source }))
  })

  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2.5 whitespace-nowrap border-r border-slate-200">Sección</th>
            <th className="px-3 py-2.5 border-r border-slate-200">Hallazgo</th>
            <th className="px-3 py-2.5 whitespace-nowrap border-r border-slate-200">Foto</th>
            <th className="px-3 py-2.5 whitespace-nowrap">Origen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const invalid = isInvalidUploadText(row.finding.text)
            const reasons = invalid
              ? listInvalidUploadReasons(row.finding.text)
              : compactFindingReasons([row.finding.text])
            return (
              <tr
                key={`${row.finding.text}-${row.source?.label ?? 'na'}-${index}`}
                className="border-b border-slate-100 last:border-0"
              >
                <td className="px-3 py-2.5 text-slate-700 align-top whitespace-nowrap border-r border-slate-200">
                  {row.source?.docLabel || '—'}
                </td>
                <td className="px-3 py-2.5 align-top min-w-[280px] border-r border-slate-200">
                  <HallazgoCopy heading={invalid ? 'No debió subirse' : null} reasons={reasons} />
                </td>
                <td className="px-3 py-2.5 text-slate-700 align-top whitespace-nowrap border-r border-slate-200">
                  <PhotoCell source={row.source} onOpenPhoto={onOpenPhoto} />
                </td>
                <td className="px-3 py-2.5 text-slate-600 align-top">
                  {row.source ? (
                    <span title={row.source.fileName || undefined}>
                      {origenLabel(row.source)}
                      {row.source.fileName ? ` · ${row.source.fileName}` : ''}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ConclusionsTable({
  rows,
  onOpenPhoto,
}: {
  rows: ConclusionResult[]
  onOpenPhoto: (source: VehicleAiFinding['sources'][number]) => void
}) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2.5 whitespace-nowrap border-r border-slate-200">Sección</th>
            <th className="px-3 py-2.5 border-r border-slate-200">Hallazgo</th>
            <th className="px-3 py-2.5 whitespace-nowrap border-r border-slate-200">Foto</th>
            <th className="px-3 py-2.5 whitespace-nowrap">Origen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const prev = rows[index - 1]
            const newSection = Boolean(prev && prev.docLabel !== row.docLabel)
            return (
              <Fragment key={row.id}>
                {newSection ? (
                  <tr aria-hidden>
                    <td colSpan={4} className="h-2.5 bg-slate-200 p-0 border-y border-slate-300" />
                  </tr>
                ) : null}
                <tr
                  className={`border-b border-slate-100 ${
                    row.bucket === 'invalid' ? 'bg-red-50/60' : row.bucket === 'ok' ? 'bg-emerald-50/50' : 'bg-white'
                  }`}
                >
              <td className="px-3 py-2.5 text-slate-700 align-top whitespace-nowrap border-r border-slate-200">{row.docLabel || '—'}</td>
              <td className="px-3 py-2.5 align-top min-w-[280px] border-r border-slate-200">
                <HallazgoCopy heading={row.heading} reasons={row.reasons} />
              </td>
              <td className="px-3 py-2.5 text-slate-700 align-top whitespace-nowrap border-r border-slate-200">
                <PhotoCell source={row.source} onOpenPhoto={onOpenPhoto} />
              </td>
              <td className="px-3 py-2.5 text-slate-600 align-top">
                <span title={row.source.fileName || undefined}>
                  {origenLabel(row.source)}
                  {row.source.fileName ? ` · ${row.source.fileName}` : ''}
                </span>
              </td>
                </tr>
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function AiDocBlock({
  section,
  synthesis,
  onOpenFindingPhoto,
  onOpenSectionPhoto,
}: {
  section: VehicleAiInformeSection
  synthesis?: VehicleAiSynthesis['blocks'][number]
  onOpenFindingPhoto: (source: VehicleAiFinding['sources'][number]) => void
  onOpenSectionPhoto: (file: VehicleAiInformeSectionFile) => void
}) {
  const missingLabel = 'No se ha subido documento.'
  const juicios = section.juicios ?? null
  const hasJuicios = Boolean(juicios)
  const conclusion =
    synthesis?.conclusion && !(hasJuicios && /no se ha subido documento/i.test(synthesis.conclusion))
      ? synthesis.conclusion
      : section.missing && !hasJuicios
        ? missingLabel
        : null
  const invalidConclusion = Boolean(conclusion && isInvalidUploadText(conclusion))
  const conclusionReasons = conclusion ? listInvalidUploadReasons(conclusion) : []
  const juiciosBadge = juicios
    ? juicios.error
      ? 'Consulta con error'
      : `${juicios.procesos.length} proceso${juicios.procesos.length === 1 ? '' : 's'}`
    : null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-slate-900">{section.docLabel}</p>
        {juiciosBadge ? (
          <span className="shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border bg-slate-50 text-slate-700 border-slate-200">
            {juiciosBadge}
          </span>
        ) : section.missing ? (
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
      {juicios ? (
        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Función Judicial</p>
          <p className="text-sm font-semibold text-slate-900 mt-0.5">
            {juicios.error
              ? juicios.error
              : juicios.procesos.length === 0
                ? `Sin procesos${juicios.cedula ? ` para cédula ${juicios.cedula}` : ''}.`
                : `${juicios.procesos.length} proceso${juicios.procesos.length === 1 ? '' : 's'}${juicios.cedula ? ` · cédula ${juicios.cedula}` : ''}.`}
          </p>
          {juicios.titular ? <p className="text-[11px] text-slate-500 mt-0.5">{juicios.titular}</p> : null}
          {juicios.procesos.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {juicios.procesos.map((proceso, index) => (
                <li
                  key={`${proceso.causa || 'proceso'}-${index}`}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                >
                  <p className="font-semibold">{proceso.causa || 'Causa sin número'}</p>
                  <p className="text-slate-600 mt-0.5">
                    {[proceso.accion, proceso.rol, proceso.estado, proceso.fecha].filter(Boolean).join(' · ')}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {section.missing && !hasJuicios ? (
        <p className="text-sm text-amber-800 mt-2">{missingLabel}</p>
      ) : null}
      {conclusion && !section.missing ? (
        invalidConclusion ? (
          <div className="mt-2">
            <p className="text-sm font-semibold text-red-800">No debió subirse</p>
            {conclusionReasons.length > 0 ? (
              <ul className="mt-1.5 list-disc pl-4 space-y-1 text-sm text-slate-700">
                {conclusionReasons.map((reason) => (
                  <li key={reason}>{clarifyAiSystemWording(reason)}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-700 mt-2 leading-relaxed">{clarifyAiSystemWording(conclusion)}</p>
        )
      ) : null}
      {synthesis?.alerts?.length ? (
        <FindingsTable findings={synthesis.alerts} onOpenPhoto={onOpenFindingPhoto} />
      ) : null}
      {section.files.length > 0 ? (
        <div className="mt-3 space-y-2">
          {section.files.map((file, index) => {
            const invalidFile =
              Boolean(file.analysis?.photo_should_not_be_uploaded) ||
              Boolean(file.analysis?.summary && isInvalidUploadText(file.analysis.summary))
            const invalidReasons = invalidFile
              ? listInvalidUploadReasons(file.analysis?.summary || '', file.analysis?.issues ?? [])
              : []
            const otherIssues = (file.analysis?.issues ?? []).filter(
              (issue) => !isInvalidUploadText(issue) || clarifyAiSystemWording(issue).length > 40
            )
            return (
            <div key={file.fileId} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold text-violet-800">
                <button
                  type="button"
                  onClick={() => onOpenSectionPhoto(file)}
                  className="inline-flex items-center rounded-md border border-violet-200 bg-white px-1.5 py-0.5 font-semibold text-violet-800 hover:bg-violet-50"
                >
                  Foto {file.photoIndex ?? index + 1}
                </button>
                <span className="font-normal text-slate-500"> · {file.fileName}</span>
                {invalidFile ? (
                  <span className="ml-2 inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold border bg-red-50 text-red-700 border-red-200">
                    No debió subirse
                  </span>
                ) : null}
              </p>
              {file.error ? (
                <p className="text-xs text-red-600 mt-1">{file.error}</p>
              ) : invalidFile ? (
                <div className="mt-1.5">
                  <p className="text-sm font-semibold text-red-800">No debió subirse</p>
                  {invalidReasons.length > 0 ? (
                    <ul className="mt-1 list-disc pl-4 text-[11px] text-amber-800 space-y-0.5">
                      {invalidReasons.map((reason) => (
                        <li key={reason}>{clarifyAiSystemWording(reason)}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                    {file.analysis?.summary ? clarifyAiSystemWording(file.analysis.summary) : null}
                  </p>
                  {otherIssues.length ? (
                    <ul className="mt-1 list-disc pl-4 text-[11px] text-amber-800 space-y-0.5">
                      {otherIssues.map((issue) => (
                        <li key={issue}>{clarifyAiSystemWording(issue)}</li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
            </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function AiPhotoLightbox({ preview, onClose }: { preview: PhotoPreview; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-900 truncate">{preview.fileName}</p>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-100"
            aria-label="Cerrar foto"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center min-h-[240px]">
          {preview.isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.url} alt={preview.fileName} className="max-h-[75vh] w-auto object-contain" />
          ) : (
            <iframe title={preview.fileName} src={preview.url} className="w-full h-[75vh] bg-white" />
          )}
        </div>
      </div>
    </div>
  )
}

export function VehicleAiReportButton({
  vehiculo,
  dossier,
  onContrasteUpdated,
  onLegalRefresh,
}: {
  vehiculo: VehiculoInventario
  dossier: VehicleLegalDossier
  onContrasteUpdated?: (payload: EcuadorContrastePayload) => void
  onLegalRefresh?: () => void
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
      {open ? (
        <VehicleAiReportModal
          vehiculo={vehiculo}
          dossier={dossier}
          onClose={() => setOpen(false)}
          onContrasteUpdated={onContrasteUpdated}
          onLegalRefresh={onLegalRefresh}
        />
      ) : null}
    </>
  )
}
