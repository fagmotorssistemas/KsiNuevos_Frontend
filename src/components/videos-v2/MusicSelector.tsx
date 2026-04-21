'use client'

import { useEffect, useState, useRef } from 'react'
import { Music, Play, Pause, Loader2, CheckCircle2 } from 'lucide-react'
import type { MusicTrackV2 } from '@/lib/videos-v2/types'
import { parseJsonOrThrow } from '@/lib/safe-fetch-json'

interface MusicSelectorProps {
  selectedId: string | null
  onSelect: (id: string, url: string) => void
}

export function MusicSelector({ selectedId, onSelect }: MusicSelectorProps) {
  const [tracks, setTracks] = useState<MusicTrackV2[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/videos-v2/music')
        const data = await parseJsonOrThrow<{ tracks?: MusicTrackV2[] }>(r)
        setTracks(data.tracks ?? [])
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  function togglePreview(track: MusicTrackV2) {
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {tracks.map((track) => {
        const isSelected = selectedId === track.id
        const isPlaying = playingId === track.id

        return (
          // div en lugar de button para evitar button-dentro-de-button
          <div
            key={track.id}
            role="radio"
            aria-checked={isSelected}
            tabIndex={0}
            onClick={() => onSelect(track.id, track.public_url)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(track.id, track.public_url) }}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer select-none ${
              isSelected
                ? 'border-violet-600 bg-violet-50'
                : 'border-gray-200 bg-white hover:border-violet-300 hover:bg-gray-50'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isSelected ? 'bg-violet-100' : 'bg-gray-100'
            }`}>
              <Music className={`w-5 h-5 ${isSelected ? 'text-violet-600' : 'text-gray-400'}`} />
            </div>

            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${isSelected ? 'text-violet-800' : 'text-gray-800'}`}>
                {track.name}
              </p>
              {track.duration_seconds && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {Math.floor(track.duration_seconds / 60)}:{String(Math.round(track.duration_seconds % 60)).padStart(2, '0')} min
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); togglePreview(track) }}
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
      })}
    </div>
  )
}
