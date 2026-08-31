'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type StatusBody = {
  estado?: string
  captchaListo?: boolean
  error?: string
}

function SatjeCaptchaPopup() {
  const params = useSearchParams()
  const consultaId = params.get('id')?.trim() || ''
  const [note, setNote] = useState('Validando sesión…')
  const [blocked, setBlocked] = useState<string | null>(null)

  useEffect(() => {
    if (!consultaId) {
      setBlocked('Falta el id de la consulta.')
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = async () => {
      try {
        const res = await fetch(`/api/satje/${encodeURIComponent(consultaId)}`)
        const body = (await res.json()) as StatusBody
        if (cancelled) return
        if (res.status === 401) {
          setBlocked('Inicia sesión en KSI para resolver el CAPTCHA.')
          return
        }
        if (res.status === 403) {
          setBlocked(body.error || 'Sin permiso para consultar SATJE.')
          return
        }
        if (res.status === 404) {
          setBlocked(body.error || 'Consulta no encontrada.')
          return
        }
        const estado = body.estado || ''
        if (estado === 'completada' || estado === 'error') {
          setBlocked(
            estado === 'completada'
              ? 'Esta consulta ya terminó. Puedes cerrar esta pestaña.'
              : 'Esta consulta quedó en error. Puedes cerrar esta pestaña.'
          )
          return
        }
        if (estado === 'esperando_captcha' && body.captchaListo) {
          window.location.replace(`/api/satje/${encodeURIComponent(consultaId)}/captcha`)
          return
        }
        setNote(
          estado === 'esperando_captcha'
            ? 'Esperando el CAPTCHA…'
            : 'Preparando consulta…'
        )
        timer = setTimeout(() => {
          void tick()
        }, 1000)
      } catch {
        if (cancelled) return
        timer = setTimeout(() => {
          void tick()
        }, 1000)
      }
    }

    void tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [consultaId])

  if (blocked) {
    return <p className="p-4 text-sm text-slate-700">{blocked}</p>
  }

  return (
    <div className="h-screen flex items-center justify-center bg-slate-950 text-white">
      <p className="px-4 text-sm text-slate-200">{note}</p>
    </div>
  )
}

export default function SatjeCaptchaPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-slate-600">Cargando…</p>}>
      <SatjeCaptchaPopup />
    </Suspense>
  )
}
