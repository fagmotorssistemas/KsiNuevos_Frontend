'use client'

import { useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
  analysisFailsAiApproval,
  clarifyAiSystemWording,
  compactFindingReasons,
} from '@/lib/inventario/documentAiRules'
import type { DocumentAiAnalysis } from '@/lib/inventario/openaiDocumentVision'
import { reportFailsAiApproval, type DocumentAiReportRow } from '@/services/documentAiReports.service'

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

function issuesFromPayload(report: DocumentAiReportRow): string[] {
  const payload = report.payload
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return []
  const issues = (payload as { issues?: unknown }).issues
  return Array.isArray(issues) ? issues.filter((item): item is string => typeof item === 'string') : []
}

function summaryAsList(summary: string): string[] {
  const cleaned = clarifyAiSystemWording(summary)
  if (!cleaned) return []
  const parts = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.replace(/^[•\-]\s*/, '').trim())
    .filter((part) => part.length > 8)
  const compacted = compactFindingReasons(parts)
  return (compacted.length > 0 ? compacted : parts).slice(0, 5)
}

function failReasons(report: DocumentAiReportRow): string[] {
  const raw = issuesFromPayload(report).map((issue) => clarifyAiSystemWording(issue))
  const compacted = compactFindingReasons(raw)
  if (compacted.length > 0) return compacted
  return summaryAsList(report.summary)
}

type Props = {
  fileId: string
  compact?: boolean
}

export function DocumentAiReportBlock({ fileId, compact = false }: Props) {
  const [report, setReport] = useState<DocumentAiReportRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    if (!fileId || fileId.startsWith('legacy-')) {
      setReport(null)
      return
    }
    let cancelled = false
    setLoading(true)
    void fetch(`/api/inventario/documentos/archivos/${encodeURIComponent(fileId)}/analizar`)
      .then(async (res) => {
        const body = (await res.json()) as { report?: DocumentAiReportRow | null; error?: string }
        if (!res.ok) throw new Error(body.error || 'No se pudo cargar el reporte')
        if (!cancelled) setReport(body.report ?? null)
      })
      .catch(() => {
        if (!cancelled) setReport(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fileId])

  const analyze = async () => {
    if (analyzing || fileId.startsWith('legacy-')) return
    setAnalyzing(true)
    try {
      const res = await fetch(`/api/inventario/documentos/archivos/${encodeURIComponent(fileId)}/analizar`, {
        method: 'POST',
      })
      const body = (await res.json()) as { report?: DocumentAiReportRow; error?: string }
      if (!res.ok || !body.report) throw new Error(body.error || 'No se pudo analizar')
      setReport(body.report)
      toast.success('Reporte de la foto listo')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo analizar el archivo')
    } finally {
      setAnalyzing(false)
    }
  }

  if (fileId.startsWith('legacy-')) return null

  const rejected = report
    ? reportFailsAiApproval(report) || analysisFailsAiApproval(analysisFromReport(report))
    : false
  const reasons = report ? (rejected ? failReasons(report) : summaryAsList(report.summary)) : []

  return (
    <div className={compact ? 'mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5' : 'rounded-xl border border-slate-200 bg-slate-50 p-3'}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-slate-800 inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Reporte IA
        </p>
        <button
          type="button"
          onClick={() => void analyze()}
          disabled={analyzing || loading}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-slate-800 text-white text-[11px] font-semibold hover:bg-slate-900 disabled:opacity-50"
        >
          {analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {report ? 'Analizar de nuevo' : 'Analizar foto'}
        </button>
      </div>
      {loading && !report ? (
        <p className="text-[11px] text-slate-500 mt-2">Buscando reporte guardado…</p>
      ) : report ? (
        <div className="mt-2 space-y-1.5">
          <p className={`text-sm font-semibold ${rejected ? 'text-red-800' : 'text-slate-800'}`}>
            {rejected ? 'No debió subirse' : 'Debió subirse'}
          </p>
          {reasons.length > 0 ? (
            <ul className={`text-[11px] space-y-1 list-disc pl-4 ${rejected ? 'text-red-900' : 'text-slate-600'}`}>
              {reasons.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : rejected ? (
            <p className="text-[11px] text-red-800">La foto no corresponde a esta sección.</p>
          ) : null}
        </div>
      ) : (
        <p className="text-[11px] text-slate-500 mt-2">
          Aún no hay reporte. Pulsa Analizar foto (consume OpenAI).
        </p>
      )}
    </div>
  )
}
