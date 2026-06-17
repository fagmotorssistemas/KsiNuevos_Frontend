'use client'

import { useCallback, useState } from 'react'
import { downloadFinalReel, type DownloadFinalReelOptions } from '@/lib/videos/download-final-reel'

export function useVideoDownload() {
  const [isDownloading, setIsDownloading] = useState(false)

  const download = useCallback(async (options: DownloadFinalReelOptions) => {
    if (isDownloading) return
    setIsDownloading(true)
    try {
      await downloadFinalReel(options)
    } finally {
      setIsDownloading(false)
    }
  }, [isDownloading])

  return { isDownloading, download }
}
