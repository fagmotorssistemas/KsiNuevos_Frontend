'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  RefreshCw,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Film,
  Eye,
} from 'lucide-react'

type JobWithVehicle = {
  id: string
  vehicle_id: string
  raw_video_url: string
  status: string
  ai_generated_prompt: string | null
  descript_project_id: string | null
  descript_project_url: string | null
  final_export_url: string | null
  error_log: string | null
  created_at: string
  updated_at: string
  inventoryoracle: {
    brand: string
    model: string
    year: number
    plate: string | null
    price: number | null
    color: string | null
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  pending_upload: { label: 'Pendiente', color: 'text-gray-600', icon: Clock, bg: 'bg-gray-100' },
  analyzing_gemini: { label: 'Analizando IA', color: 'text-blue-600', icon: Sparkles, bg: 'bg-blue-100' },
  sending_to_descript: { label: 'Enviando a Descript', color: 'text-indigo-600', icon: Loader2, bg: 'bg-indigo-100' },
  processing_descript: { label: 'Editando en Descript', color: 'text-purple-600', icon: Film, bg: 'bg-purple-100' },
  ready_for_qa: { label: 'Listo para revisión', color: 'text-amber-600', icon: Eye, bg: 'bg-amber-100' },
  approved: { label: 'Aprobado', color: 'text-green-600', icon: CheckCircle2, bg: 'bg-green-100' },
  failed: { label: 'Error', color: 'text-red-600', icon: AlertCircle, bg: 'bg-red-100' },
}

export function VideoJobsDashboard({
  onSelectJob,
  refreshTrigger,
}: {
  onSelectJob?: (job: JobWithVehicle) => void
  refreshTrigger?: number
}) {
  const supabase = createClient()
  const [jobs, setJobs] = useState<JobWithVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(false)

  const fetchJobs = useCallback(async () => {
    const { data, error } = await supabase
      .from('video_automation_jobs')
      .select(`
        *,
        inventoryoracle!inner (
          brand,
          model,
          year,
          plate,
          price,
          color
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setJobs(data as unknown as JobWithVehicle[])
    }
    setLoading(false)
    setPolling(false)
  }, [supabase])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs, refreshTrigger])

  useEffect(() => {
    const interval = setInterval(() => {
      setPolling(true)
      fetchJobs()
    }, 15000)
    return () => clearInterval(interval)
  }, [fetchJobs])

  const handleRefresh = () => {
    setPolling(true)
    fetchJobs()
  }

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr))
  }

  const formatPrice = (price: number | null) => {
    if (!price) return '—'
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(price)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        <span className="ml-2 text-sm text-gray-500">Cargando trabajos...</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Film className="w-5 h-5 text-red-500" />
            Trabajos de Automatización
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {jobs.length} trabajo{jobs.length !== 1 ? 's' : ''} registrado{jobs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${polling ? 'animate-spin' : ''}`} />
          Refrescar
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="p-12 text-center">
          <Film className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No hay trabajos de automatización aún.</p>
          <p className="text-xs text-gray-400 mt-1">Usa el formulario para crear tu primer video automatizado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehículo</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Precio</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job) => {
                const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending_upload
                const StatusIcon = config.icon

                return (
                  <tr
                    key={job.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onSelectJob?.(job)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                          <Film className="w-4 h-4 text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {job.inventoryoracle.brand} {job.inventoryoracle.model} {job.inventoryoracle.year}
                          </p>
                          {job.inventoryoracle.plate && (
                            <p className="text-xs text-gray-400 font-mono">{job.inventoryoracle.plate}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color} ${config.bg}`}>
                        <StatusIcon className={`w-3.5 h-3.5 ${job.status === 'analyzing_gemini' || job.status === 'sending_to_descript' || job.status === 'processing_descript' ? 'animate-spin' : ''}`} />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                      {formatPrice(job.inventoryoracle.price)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(job.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {job.descript_project_url && (
                          <a
                            href={job.descript_project_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Descript
                          </a>
                        )}
                        {(job.status === 'ready_for_qa' || job.status === 'processing_descript') && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onSelectJob?.(job) }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            Revisar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
