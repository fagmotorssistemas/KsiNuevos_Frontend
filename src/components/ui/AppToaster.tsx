'use client'

import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'

/** Evita actualizaciones de estado de Sonner antes de que el cliente esté montado (App Router). */
export function AppToaster() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return <Toaster theme="dark" position="top-right" />
}
