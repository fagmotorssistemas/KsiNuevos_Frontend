'use client'

import { useState } from 'react'
import {
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Film,
  Car,
  Send,
} from 'lucide-react'

type JobData = {
  id: string
  status: string
  raw_video_url: string
  ai_generated_prompt: string | null
  descript_project_url: string | null
  final_export_url: string | null
  error_log: string | null
  inventoryoracle: {
    brand: string
    model: string
    year: number
    plate: string | null
    price: number | null
    color: string | null
  }
}

export function QAApprovalModal({
  job,
  onClose,
  onApproved,
}: {
  job: JobData
  onClose: () => void
  onApproved: () => void
}) {
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState('')
  const [approved, setApproved] = useState(false)

  const handleApprove = async () => {
    setApproving(true)
    setError('')

    try {
      const res = await fetch('/api/video-automation/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al aprobar')
      }

      setApproved(true)
      onApproved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setApproving(false)
    }
  }

  const v = job.inventoryoracle
  const canApprove = job.status === 'ready_for_qa' || job.status === 'processing_descript'
  const formatPrice = (price: number | null) => {
    if (!price) return '—'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(price)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Film className="w-5 h-5 text-red-500" />
            Control de Calidad
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Vehicle Info Card */}
          <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
              <Car className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">
                {v.brand} {v.model} {v.year}
              </p>
              <div className="flex items-center gap-3 mt-1">
                {v.plate && (
                  <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-600">
                    {v.plate}
                  </span>
                )}
                {v.color && <span className="text-xs text-gray-500">{v.color}</span>}
                <span className="text-sm font-semibold text-green-600">
                  {formatPrice(v.price)}
                </span>
              </div>
            </div>
          </div>

          {/* AI Prompt */}
          {job.ai_generated_prompt && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Prompt de IA generado por Gemini
              </p>
              <p className="text-sm text-amber-900 italic leading-relaxed">
                {job.ai_generated_prompt}
              </p>
            </div>
          )}

          {/* Descript Link */}
          {job.descript_project_url && (
            <a
              href={job.descript_project_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-200 rounded-lg flex items-center justify-center">
                  <Film className="w-5 h-5 text-indigo-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-900">Revisar edición en Descript</p>
                  <p className="text-xs text-indigo-600">Abre el proyecto para verificar la edición</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
            </a>
          )}

          {/* Error display */}
          {job.error_log && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{job.error_log}</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success message */}
          {approved && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Video aprobado exitosamente</p>
                <p className="text-xs text-green-600 mt-0.5">
                  Pendiente: Integración con n8n para publicación automática en redes sociales.
                </p>
              </div>
            </div>
          )}

          {/* Approve Button */}
          {canApprove && !approved && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-green-600 text-white font-bold text-base rounded-xl hover:bg-green-700 shadow-lg shadow-green-600/20 hover:shadow-green-600/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {approving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {approving ? 'Aprobando...' : 'Aprobar y Enviar a Redes Sociales'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
