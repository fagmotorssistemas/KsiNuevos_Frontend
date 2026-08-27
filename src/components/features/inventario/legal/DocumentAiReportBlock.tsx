'use client'

import { useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { DocumentAiReportRow } from '@/services/documentAiReports.service'

const QUALITY_LABEL: Record<string, string> = {
  ok: 'Legible',
  blurry: 'Borrosa',
  cropped: 'Recortada',
  wrong_document: 'No es el documento esperado',
  unreadable: 'Ilegible',
}

function qualityClass(quality: string): string {
  if (quality === 'ok') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (quality === 'wrong_document' || quality === 'unreadable') return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-amber-50 text-amber-800 border-amber-200'
}

function extractedFields(report: DocumentAiReportRow): { label: string; value: string }[] {
  const extracted = report.extracted
  if (!extracted || typeof extracted !== 'object' || Array.isArray(extracted)) return []
  const row = extracted as { owner?: unknown; expiry?: unknown; fields?: unknown }
  const fields: { label: string; value: string }[] = []
  if (typeof row.owner === 'string' && row.owner.trim()) fields.push({ label: 'Propietario', value: row.owner })
  if (typeof row.expiry === 'string' && row.expiry.trim()) fields.push({ label: 'Vencimiento', value: row.expiry })
  if (Array.isArray(row.fields)) {
    for (const item of row.fields) {
      if (!item || typeof item !== 'object') continue
      const field = item as { label?: unknown; value?: unknown }
      if (typeof field.label === 'string' && typeof field.value === 'string' && field.value.trim()) {
        fields.push({ label: field.label, value: field.value })
      }
    }
  }
  return fields
}

function issuesFromPayload(report: DocumentAiReportRow): string[] {
  const payload = report.payload
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return []
  const issues = (payload as { issues?: unknown }).issues
  return Array.isArray(issues) ? issues.filter((item): item is string => typeof item === 'string') : []
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

  const fields = report ? extractedFields(report) : []
  const issues = report ? issuesFromPayload(report) : []

  return (
    <div className={compact ? 'mt-2 rounded-lg border border-violet-100 bg-violet-50/50 p-2.5' : 'rounded-xl border border-violet-100 bg-violet-50/60 p-3'}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-violet-800 inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Reporte IA
        </p>
        <button
          type="button"
          onClick={() => void analyze()}
          disabled={analyzing || loading}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-violet-700 text-white text-[11px] font-semibold hover:bg-violet-800 disabled:opacity-50"
        >
          {analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {report ? 'Analizar de nuevo' : 'Analizar foto'}
        </button>
      </div>
      {loading && !report ? (
        <p className="text-[11px] text-violet-600 mt-2">Buscando reporte guardado…</p>
      ) : report ? (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${qualityClass(report.quality)}`}>
              {QUALITY_LABEL[report.quality] ?? report.quality}
            </span>
            {report.matches_plate === true ? (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                Placa coincide
              </span>
            ) : null}
            {report.matches_plate === false ? (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-50 text-red-700 border-red-200">
                Placa no coincide
              </span>
            ) : null}
            {(report.payload as { matricula_expired?: boolean } | null)?.matricula_expired ? (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-50 text-red-700 border-red-200">
                Matrícula vencida
              </span>
            ) : null}
            {(report.payload as { contraste_mismatch?: boolean } | null)?.contraste_mismatch ? (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-50 text-amber-800 border-amber-200">
                No coincide con API
              </span>
            ) : null}
            {(report.payload as { photo_should_not_be_uploaded?: boolean } | null)?.photo_should_not_be_uploaded ? (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-50 text-red-700 border-red-200">
                No debió subirse
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">{report.summary}</p>
          {fields.length > 0 ? (
            <ul className="text-[11px] text-slate-600 space-y-0.5">
              {fields.slice(0, compact ? 4 : 8).map((field) => (
                <li key={`${field.label}-${field.value}`}>
                  <span className="font-semibold text-slate-700">{field.label}:</span> {field.value}
                </li>
              ))}
            </ul>
          ) : null}
          {issues.length > 0 ? (
            <ul className="text-[11px] text-amber-900 space-y-1 list-disc pl-4">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="text-[11px] text-violet-700/80 mt-2">
          Aún no hay reporte. Pulsa Analizar foto (consume OpenAI).
        </p>
      )}
    </div>
  )
}
