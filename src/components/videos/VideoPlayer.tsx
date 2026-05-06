'use client'

import { useRef, useState } from 'react'
import { Play, Pause, Download, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface VideoPlayerProps {
  url: string
  duration?: number | null
}

export function VideoPlayer({ url, duration }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  function togglePlay() {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  async function handleDownload() {
    const link = document.createElement('a')
    link.href = url
    link.download = `reel-v2-${Date.now()}.mp4`
    link.click()
  }

  async function handleCopyUrl() {
    await navigator.clipboard.writeText(url)
    toast.success('URL copiada al portapapeles')
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Player vertical 9:16 */}
      <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl" style={{ width: 270, height: 480 }}>
        <video
          ref={videoRef}
          src={url}
          className="w-full h-full object-cover"
          onEnded={() => setIsPlaying(false)}
          playsInline
          loop
        />
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
        >
          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            {isPlaying
              ? <Pause className="w-6 h-6 text-violet-700" />
              : <Play className="w-6 h-6 text-violet-700 ml-0.5" />
            }
          </div>
        </button>
        {duration && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-semibold rounded-full px-2 py-0.5">
            {Math.round(duration)}s
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-md"
        >
          <Download className="w-4 h-4" />
          Descargar
        </button>
        <button
          type="button"
          onClick={handleCopyUrl}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
        >
          <Copy className="w-4 h-4" />
          Copiar URL
        </button>
      </div>
    </div>
  )
}
