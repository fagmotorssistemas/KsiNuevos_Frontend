'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Sparkles, Type } from 'lucide-react'
import { toast } from 'sonner'
import { buildVehicleHeadlineSync, isBannerTitleValid } from '@/lib/noticiero/banner-title'
import type { NoticieroMode, NoticieroVehicle } from '@/lib/noticiero/types'
import { parseJsonOrThrow } from '@/lib/safe-fetch-json'

interface BannerTitleFieldProps {
  mode: NoticieroMode
  vehicle: NoticieroVehicle | null
  customTopic: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function BannerTitleField({
  mode,
  vehicle,
  customTopic,
  value,
  onChange,
  disabled,
}: BannerTitleFieldProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const userEditedRef = useRef(false)

  useEffect(() => {
    userEditedRef.current = false
  }, [mode, vehicle?.id, customTopic])

  useEffect(() => {
    if (userEditedRef.current || disabled) return
    if (mode === 'vehicle' && vehicle) {
      onChange(buildVehicleHeadlineSync(vehicle))
    } else if (mode === 'custom') {
      onChange('')
    }
  }, [mode, vehicle, disabled, onChange])

  async function handleGenerateAi() {
    setIsGenerating(true)
    try {
      const body =
        mode === 'vehicle'
          ? vehicle
            ? { mode: 'vehicle' as const, vehicle, useAi: true }
            : null
          : customTopic.trim().length >= 10
            ? { mode: 'custom' as const, customTopic: customTopic.trim() }
            : null

      if (!body) {
        toast.error(
          mode === 'vehicle'
            ? 'Selecciona un vehículo primero'
            : 'Escribe al menos 10 caracteres en el tema'
        )
        return
      }

      const res = await fetch('/api/marketing/noticiero/generate-banner-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await parseJsonOrThrow<{ bannerTitle?: string; error?: string }>(res)
      if (!res.ok) throw new Error(data.error ?? 'No se pudo generar el titular')

      userEditedRef.current = true
      onChange(data.bannerTitle ?? '')
      toast.success('Titular generado con IA')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error generando titular')
    } finally {
      setIsGenerating(false)
    }
  }

  const canGenerateAi =
    mode === 'vehicle' ? Boolean(vehicle) : customTopic.trim().length >= 10

  const showHint = mode === 'custom' && !isBannerTitleValid(value) && customTopic.trim().length >= 10

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="block text-sm font-semibold text-gray-700">
          Titular del noticiero
          <span className="font-normal text-gray-500 ml-1">(franja blanca del video)</span>
        </label>
        <button
          type="button"
          disabled={disabled || isGenerating || !canGenerateAi}
          onClick={() => void handleGenerateAi()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-violet-100 text-violet-800 hover:bg-violet-200 disabled:opacity-50"
        >
          {isGenerating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          Generar con IA
        </button>
      </div>

      <div className="relative">
        <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={value}
          disabled={disabled}
          maxLength={120}
          placeholder={
            mode === 'vehicle'
              ? 'Ej: PEUGEOT 3008 2022'
              : 'Ej: PUERTAS ABIERTAS ESTE SÁBADO'
          }
          onChange={(e) => {
            userEditedRef.current = true
            onChange(e.target.value.toUpperCase())
          }}
          className="w-full pl-10 pr-4 py-2.5 text-sm font-bold tracking-wide uppercase border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 disabled:bg-gray-50"
        />
      </div>

      <p className="text-xs text-gray-500">
        {mode === 'vehicle'
          ? 'Se limpia el nombre del modelo del inventario. Puedes editarlo o regenerarlo con IA antes de generar el video.'
          : showHint
            ? 'Pulsa «Generar con IA» según el tema o escribe el titular manualmente.'
            : 'Describe el tema (mín. 10 caracteres) para poder generar el titular con IA.'}
      </p>
    </div>
  )
}
