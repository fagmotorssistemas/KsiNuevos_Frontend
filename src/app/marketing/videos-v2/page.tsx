'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Film, Plus, Music, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { VideoJobList } from '@/components/videos-v2/VideoJobList'
import { CreateReelModal } from '@/components/videos-v2/CreateReelModal'
import { MusicUploader } from '@/components/videos-v2/MusicUploader'
import type { MusicTrackV2 } from '@/lib/videos-v2/types'

export default function VideosV2Page() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [monthCount, setMonthCount] = useState<number | null>(null)
  const [showMusicPanel, setShowMusicPanel] = useState(false)
  const [tracks, setTracks] = useState<MusicTrackV2[]>([])

  useEffect(() => {
    const supabase = createClient()
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    supabase
      .from('video_jobs_v2')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('created_at', startOfMonth.toISOString())
      .then(({ count }) => setMonthCount(count ?? 0))

    // Cargar tracks para el panel de música
    fetch('/api/videos-v2/music')
      .then((r) => r.json())
      .then((data: { tracks: MusicTrackV2[] }) => setTracks(data.tracks ?? []))
  }, [])

  function handleJobCreated() {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Film className="w-5 h-5 text-white" />
            </div>
            Generación de Videos V2
          </h1>
          <p className="text-sm text-gray-500 mt-2 max-w-lg">
            Fábrica automatizada de Reels. AssemblyAI + Gemini + Creatomate.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Contador del mes */}
          {monthCount !== null && (
            <div className="hidden sm:flex flex-col items-end px-4 py-2 bg-violet-50 rounded-xl">
              <span className="text-lg font-extrabold text-violet-700">{monthCount}</span>
              <span className="text-xs text-violet-500 font-medium">videos este mes</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowMusicPanel((v) => !v)}
            className="flex items-center gap-2 px-3 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl border border-gray-200 transition-colors"
            title="Gestión de música"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Música</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-violet-500/20"
          >
            <Plus className="w-4 h-4" />
            Crear Reel
          </button>
        </div>
      </div>

      {/* Panel de gestión de música (colapsable) */}
      {showMusicPanel && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center">
              <Music className="w-4 h-4 text-violet-600" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Gestión de Música de Fondo</h2>
          </div>
          <MusicUploader
            tracks={tracks}
            onTrackAdded={(track) => setTracks((prev) => [track as MusicTrackV2, ...prev])}
            onTrackDeleted={(id) => setTracks((prev) => prev.filter((t) => t.id !== id))}
          />
        </div>
      )}

      {/* Lista de jobs */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-600" />
          Reels Generados
        </h2>
        <VideoJobList refreshKey={refreshKey} />
      </div>

      {/* Modal de creación */}
      <CreateReelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onJobCreated={handleJobCreated}
      />
    </div>
  )
}
