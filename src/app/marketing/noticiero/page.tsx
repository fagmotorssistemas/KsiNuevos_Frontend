'use client'

import { useState, useCallback } from 'react'
import { Newspaper, Loader2, Play, Megaphone, Settings } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { parseJsonOrThrow } from '@/lib/safe-fetch-json'
import type { NoticieroMode, NoticieroVehicle } from '@/lib/noticiero/types'
import { VehicleSelector } from './components/VehicleSelector'
import { CustomTopicInput } from './components/CustomTopicInput'
import { BannerTitleField } from './components/BannerTitleField'
import { NoticieroBackgroundPicker } from './components/NoticieroBackgroundPicker'
import {
  NoticieroPresenterPicker,
  type NoticieroPresenterSelection,
} from './components/NoticieroPresenterPicker'
import { NOTICIERO_AVATARS } from './config/avatars'
import { isBannerTitleValid } from '@/lib/noticiero/banner-title'
import { GenerationProgress } from './components/GenerationProgress'
import { NoticieroJobList } from './components/NoticieroJobList'
import { NoticieroPublishingSection } from './components/NoticieroPublishingSection'
import { useNoticieroPipelineTracker } from './hooks/useNoticieroPipelineTracker'

type MainTab = 'generacion' | 'publicacion'

export default function NoticieroPage() {
  const [mainTab, setMainTab] = useState<MainTab>('generacion')
  const [mode, setMode] = useState<NoticieroMode>('vehicle')
  const [vehicle, setVehicle] = useState<NoticieroVehicle | null>(null)
  const [vehicleId, setVehicleId] = useState('')
  const [customTopic, setCustomTopic] = useState('')
  const [bannerTitle, setBannerTitle] = useState('')
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [presenter, setPresenter] = useState<NoticieroPresenterSelection>(() => {
    const defaultAvatar = NOTICIERO_AVATARS[0]
    return {
      id: defaultAvatar.id,
      voice_id: defaultAvatar.voice_id,
      name: defaultAvatar.name,
    }
  })
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const [publishRefreshKey, setPublishRefreshKey] = useState(0)
  const [isStarting, setIsStarting] = useState(false)

  const bumpList = useCallback(() => {
    setListRefreshKey((k) => k + 1)
  }, [])

  const { pipelineStep, pipelineError, isRunning, startTracking } =
    useNoticieroPipelineTracker(bumpList)

  const canGenerate =
    !isRunning &&
    !isStarting &&
    (mode === 'vehicle'
      ? Boolean(vehicle) && isBannerTitleValid(bannerTitle)
      : customTopic.trim().length >= 10)

  async function handleGenerate() {
    if (mode === 'vehicle' && !vehicle) {
      toast.error('Selecciona un vehículo del inventario')
      return
    }

    setIsStarting(true)

    try {
      const bannerPayload = isBannerTitleValid(bannerTitle) ? { bannerTitle: bannerTitle.trim() } : {}

      const avatarPayload = { avatarId: presenter.id, voiceId: presenter.voice_id }

      const body =
        mode === 'vehicle'
          ? { mode: 'vehicle' as const, vehicle, backgroundUrl, ...bannerPayload, ...avatarPayload }
          : {
              mode: 'custom' as const,
              customTopic: customTopic.trim(),
              backgroundUrl,
              ...bannerPayload,
              ...avatarPayload,
            }

      const res = await fetch('/api/marketing/noticiero/pipeline/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await parseJsonOrThrow<{ jobId?: string; error?: string; message?: string }>(res)
      if (!res.ok) throw new Error(data.error ?? 'No se pudo iniciar la generación')

      if (!data.jobId) throw new Error('Respuesta inválida del servidor')

      startTracking(data.jobId)
      bumpList()

      toast.message(
        data.message ??
          'Generación iniciada en el servidor. Puedes recargar la página sin interrumpir el proceso.',
        { duration: 6000 }
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar el noticiero'
      toast.error(message)
    } finally {
      setIsStarting(false)
    }
  }

  const formDisabled = isRunning || isStarting

  return (
    <div className="space-y-8">
      <div className="flex gap-2 flex-wrap border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setMainTab('generacion')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
            mainTab === 'generacion' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Generación
        </button>
        <button
          type="button"
          onClick={() => setMainTab('publicacion')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
            mainTab === 'publicacion' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Publicación
        </button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Newspaper className="w-5 h-5 text-white" />
            </div>
            KSI NUEVOS - NEWS
          </h1>
          <p className="text-sm text-gray-500 mt-2 max-w-xl">
            Noticiero con IA: guión (Gemini), presentadora (HeyGen) y composición (Creatomate). La
            publicación en redes se programa después de aprobar el video.
          </p>
        </div>
        <Link
          href="/marketing/noticiero/configuracion"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-violet-300 hover:bg-violet-50 text-gray-700 hover:text-violet-800 text-sm font-bold rounded-xl shadow-sm transition-colors"
        >
          <Settings className="w-4 h-4" />
          Configuración
        </Link>
      </div>

      {mainTab === 'generacion' ? (
        <>
          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-gray-900">Nuevo clip</h2>

            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                disabled={formDisabled}
                onClick={() => setMode('vehicle')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                  mode === 'vehicle' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Vehículo del inventario
              </button>
              <button
                type="button"
                disabled={formDisabled}
                onClick={() => setMode('custom')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                  mode === 'custom' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tema personalizado
              </button>
            </div>

            {mode === 'vehicle' ? (
              <VehicleSelector
                selectedId={vehicleId}
                disabled={formDisabled}
                onSelect={(v) => {
                  setVehicle(v)
                  setVehicleId(v?.id ?? '')
                }}
              />
            ) : (
              <CustomTopicInput value={customTopic} onChange={setCustomTopic} disabled={formDisabled} />
            )}

            <BannerTitleField
              mode={mode}
              vehicle={vehicle}
              customTopic={customTopic}
              value={bannerTitle}
              onChange={setBannerTitle}
              disabled={formDisabled}
            />

            <NoticieroPresenterPicker
              value={presenter}
              onChange={setPresenter}
              disabled={formDisabled}
            />

            <NoticieroBackgroundPicker
              value={backgroundUrl}
              onChange={setBackgroundUrl}
              disabled={formDisabled}
            />

            <button
              type="button"
              disabled={!canGenerate}
              onClick={() => void handleGenerate()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-md shadow-violet-500/20"
            >
              {formDisabled ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Generar Noticiero
                </>
              )}
            </button>
          </section>

          <GenerationProgress currentStep={pipelineStep} error={pipelineError} />

          {isRunning && (
            <p className="text-sm text-violet-800 bg-violet-50 border border-violet-100 px-4 py-3 rounded-xl">
              El proceso corre en el servidor. Puedes recargar o cambiar de pestaña: al volver, el
              progreso se restaurará automáticamente.
            </p>
          )}

          <section className="space-y-4">
            <h2 className="text-base font-bold text-gray-900">Noticieros generados</h2>
            <p className="text-sm text-gray-500">
              Los clips quedan guardados en la base de datos del módulo. Aprueba cada uno y programa
              en la pestaña Publicación.
            </p>
            <NoticieroJobList refreshKey={listRefreshKey} publishRefreshKey={publishRefreshKey} />
          </section>
        </>
      ) : (
        <NoticieroPublishingSection
          refreshKey={publishRefreshKey}
          onPublishingMutate={() => {
            setPublishRefreshKey((k) => k + 1)
            bumpList()
          }}
        />
      )}
    </div>
  )
}
