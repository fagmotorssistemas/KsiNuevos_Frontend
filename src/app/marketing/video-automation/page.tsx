'use client'

import { useState } from 'react'
import { VideoOrchestratorForm } from '@/components/features/video-automation/VideoOrchestratorForm'
import { VideoJobsDashboard } from '@/components/features/video-automation/VideoJobsDashboard'
import { QAApprovalModal } from '@/components/features/video-automation/QAApprovalModal'
import { Film, Zap } from 'lucide-react'

type SelectedJob = {
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

export default function VideoAutomationPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [selectedJob, setSelectedJob] = useState<SelectedJob | null>(null)

  const handleJobCreated = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleJobSelect = (job: SelectedJob) => {
    if (job.status === 'ready_for_qa' || job.status === 'processing_descript' || job.status === 'approved' || job.status === 'failed') {
      setSelectedJob(job)
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
              <Film className="w-5 h-5 text-white" />
            </div>
            La Máquina de Videos
          </h1>
          <p className="text-sm text-gray-500 mt-2 max-w-lg">
            Automatización de edición de video para redes sociales. Selecciona un vehículo,
            sube un video crudo y deja que la IA haga el resto.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-medium text-amber-700">Gemini + Descript</span>
        </div>
      </div>

      {/* Orchestrator Form */}
      <VideoOrchestratorForm onJobCreated={handleJobCreated} />

      {/* Jobs Dashboard */}
      <VideoJobsDashboard
        onSelectJob={handleJobSelect}
        refreshTrigger={refreshTrigger}
      />

      {/* QA Modal */}
      {selectedJob && (
        <QAApprovalModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onApproved={() => {
            setSelectedJob(null)
            setRefreshTrigger((prev) => prev + 1)
          }}
        />
      )}
    </div>
  )
}
