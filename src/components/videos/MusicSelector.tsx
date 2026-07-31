'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { Music, Play, Pause, Loader2, CheckCircle2, Search } from 'lucide-react'
import type { MusicTrack } from '@/lib/videos/types'
import { parseJsonOrThrow } from '@/lib/safe-fetch-json'

interface MusicSelectorProps {
  selectedId: string | null
  onSelect: (track: MusicTrack) => void
}

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')} min`
}

function TrackCard({
  track,
  isSelected,
  isPlaying,
  onSelect,
  onTogglePreview,
}: {
  track: MusicTrack
  isSelected: boolean
  isPlaying: boolean
  onSelect: () => void
  onTogglePreview: () => void
}) {
  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect()
      }}
      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer select-none ${
        isSelected
          ? 'border-violet-600 bg-violet-50'
          : 'border-gray-200 bg-white hover:border-violet-300 hover:bg-gray-50'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isSelected ? 'bg-violet-100' : 'bg-gray-100'
        }`}
      >
        <Music className={`w-5 h-5 ${isSelected ? 'text-violet-600' : 'text-gray-400'}`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-violet-800' : 'text-gray-800'}`}>
          {track.name}
        </p>
        {track.duration_seconds != null && track.duration_seconds > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">{formatDuration(track.duration_seconds)}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onTogglePreview()
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            isPlaying ? 'bg-violet-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}
          title={isPlaying ? 'Pausar preview' : 'Escuchar preview'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>

        {isSelected && <CheckCircle2 className="w-5 h-5 text-violet-600" />}
      </div>
    </div>
  )
}

export function MusicSelector({ selectedId, onSelect }: MusicSelectorProps) {
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/videos/music')
        const data = await parseJsonOrThrow<{ tracks?: MusicTrack[] }>(r)
        setTracks(data.tracks ?? [])
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  const selectedTrack = useMemo(
    () => (selectedId ? tracks.find((t) => t.id === selectedId) ?? null : null),
    [tracks, selectedId]
  )

  const filteredTracks = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tracks
    return tracks.filter((t) => t.name.toLowerCase().includes(q))
  }, [tracks, query])

  function togglePreview(track: MusicTrack) {
    if (playingId === track.id) {
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      if (audioRef.current) audioRef.current.pause()
      const audio = new Audio(track.public_url)
      audio.onended = () => setPlayingId(null)
      audio.play()
      audioRef.current = audio
      setPlayingId(track.id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
      </div>
    )
  }

  if (tracks.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        No hay tracks de música disponibles. El administrador debe subir un MP3 primero.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar música…"
          className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
        />
      </div>

      {selectedTrack && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-violet-700">Seleccionada</p>
          <TrackCard
            track={selectedTrack}
            isSelected
            isPlaying={playingId === selectedTrack.id}
            onSelect={() => onSelect(selectedTrack)}
            onTogglePreview={() => togglePreview(selectedTrack)}
          />
        </div>
      )}

      <div className="max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-gray-100 p-2 -mx-0.5">
        {filteredTracks.length === 0 ? (
          <p className="text-center py-6 text-sm text-gray-500">No hay pistas con ese nombre.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Pistas de música">
            {filteredTracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                isSelected={selectedId === track.id}
                isPlaying={playingId === track.id}
                onSelect={() => onSelect(track)}
                onTogglePreview={() => togglePreview(track)}
              />
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        {filteredTracks.length === tracks.length
          ? `${tracks.length} pistas`
          : `${filteredTracks.length} de ${tracks.length} pistas`}
      </p>
    </div>
  )
}
