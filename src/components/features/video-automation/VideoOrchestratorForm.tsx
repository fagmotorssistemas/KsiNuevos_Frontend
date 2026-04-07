'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Upload,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Film,
  Sparkles,
  Wand2,
  X,
  Car,
} from 'lucide-react'

type Vehicle = {
  id: string
  brand: string
  model: string
  year: number
  plate: string | null
  color: string | null
  price: number | null
}

type Step = 'idle' | 'uploading_storage' | 'registering' | 'analyzing' | 'descript' | 'done' | 'error'

const STEP_LABELS: Record<Step, string> = {
  idle: 'Listo para procesar',
  uploading_storage: 'Subiendo video a Storage...',
  registering: 'Registrando trabajo...',
  analyzing: 'Gemini analizando video y datos técnicos...',
  descript: 'Descript editando video...',
  done: 'Proceso completado',
  error: 'Error en el proceso',
}

const STEP_ORDER: Step[] = ['uploading_storage', 'registering', 'analyzing', 'descript', 'done']

export function VideoOrchestratorForm({ onJobCreated }: { onJobCreated?: () => void }) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const [currentStep, setCurrentStep] = useState<Step>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')

  const searchVehicles = useCallback(async (term: string) => {
    if (term.length < 2) {
      setVehicles([])
      setShowDropdown(false)
      return
    }
    setIsSearching(true)
    const { data, error } = await supabase
      .from('inventoryoracle')
      .select('id, brand, model, year, plate, color, price')
      .or(`brand.ilike.%${term}%,model.ilike.%${term}%,plate.ilike.%${term}%`)
      .eq('status', 'disponible')
      .order('created_at', { ascending: false })
      .limit(15)

    if (!error && data) {
      setVehicles(data as Vehicle[])
      setShowDropdown(true)
    }
    setIsSearching(false)
  }, [supabase])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    searchVehicles(value)
  }

  const selectVehicle = (v: Vehicle) => {
    setSelectedVehicle(v)
    setSearchTerm(`${v.brand} ${v.model} ${v.year} ${v.plate || ''}`)
    setShowDropdown(false)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file)
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setVideoFile(file)
  }

  const resetForm = () => {
    setSelectedVehicle(null)
    setSearchTerm('')
    setVideoFile(null)
    setCurrentStep('idle')
    setErrorMessage('')
    setAiPrompt('')
  }

  const handleProcess = async () => {
    if (!selectedVehicle || !videoFile) return
    setErrorMessage('')
    setAiPrompt('')

    try {
      // Step 1: Upload to Supabase Storage
      setCurrentStep('uploading_storage')
      const timestamp = Date.now()
      const filePath = `${selectedVehicle.id}/${timestamp}_${videoFile.name}`

      const { error: uploadError } = await supabase.storage
        .from('raw_videos_dealership')
        .upload(filePath, videoFile, { cacheControl: '3600', upsert: false })

      if (uploadError) throw new Error(`Error subiendo video: ${uploadError.message}`)

      const { data: publicUrlData } = supabase.storage
        .from('raw_videos_dealership')
        .getPublicUrl(filePath)

      const rawVideoUrl = publicUrlData.publicUrl

      // Step 2: Register job
      setCurrentStep('registering')
      const uploadRes = await fetch('/api/video-automation/1-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_video_url: rawVideoUrl,
          vehicle_id: selectedVehicle.id,
        }),
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.error || 'Error al registrar job')
      }

      const { job_id } = await uploadRes.json()

      // Step 3: Gemini analysis
      setCurrentStep('analyzing')
      const analyzeRes = await fetch('/api/video-automation/2-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id }),
      })

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json()
        throw new Error(err.error || 'Error en análisis de Gemini')
      }

      const analyzeData = await analyzeRes.json()
      setAiPrompt(analyzeData.ai_generated_prompt || '')

      // Step 4: Descript trigger
      setCurrentStep('descript')
      const descriptRes = await fetch('/api/video-automation/3-descript-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id }),
      })

      if (!descriptRes.ok) {
        const err = await descriptRes.json()
        throw new Error(err.error || 'Error al enviar a Descript')
      }

      setCurrentStep('done')
      onJobCreated?.()
    } catch (err: unknown) {
      setCurrentStep('error')
      setErrorMessage(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  const isProcessing = !['idle', 'done', 'error'].includes(currentStep)
  const canSubmit = selectedVehicle && videoFile && !isProcessing

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-red-500" />
          Nueva Automatización de Video
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Selecciona un vehículo del inventario y sube el video crudo para edición automática.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Vehicle Selector */}
        <div className="relative">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Car className="w-4 h-4 inline mr-1.5 text-gray-400" />
            Vehículo del Inventario
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => vehicles.length > 0 && setShowDropdown(true)}
              placeholder="Buscar por marca, modelo o placa..."
              disabled={isProcessing}
              className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all disabled:opacity-50 disabled:bg-gray-50"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
            {selectedVehicle && !isProcessing && (
              <button
                onClick={() => { setSelectedVehicle(null); setSearchTerm(''); setVehicles([]) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>

          {showDropdown && vehicles.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  onClick={() => selectVehicle(v)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-red-50 transition-colors text-left border-b border-gray-50 last:border-0"
                >
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {v.brand} {v.model} {v.year}
                    </span>
                    {v.color && (
                      <span className="text-xs text-gray-400 ml-2">{v.color}</span>
                    )}
                  </div>
                  <div className="text-right">
                    {v.plate && (
                      <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                        {v.plate}
                      </span>
                    )}
                    {v.price && (
                      <span className="block text-xs text-green-600 font-medium mt-0.5">
                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(v.price)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedVehicle && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <span className="text-sm text-green-700">
                Seleccionado: <strong>{selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.year}</strong>
                {selectedVehicle.plate && <span className="text-green-600 ml-1">({selectedVehicle.plate})</span>}
              </span>
            </div>
          )}
        </div>

        {/* Video Dropzone */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Film className="w-4 h-4 inline mr-1.5 text-gray-400" />
            Video Crudo (MP4)
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
              ${dragActive
                ? 'border-red-400 bg-red-50'
                : videoFile
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
              }
              ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              onChange={handleFileChange}
              className="hidden"
            />
            {videoFile ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
                <p className="text-sm font-medium text-green-700">{videoFile.name}</p>
                <p className="text-xs text-green-600">
                  {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                </p>
                {!isProcessing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setVideoFile(null) }}
                    className="text-xs text-red-500 hover:underline mt-1"
                  >
                    Cambiar archivo
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-10 h-10 text-gray-400" />
                <p className="text-sm font-medium text-gray-600">
                  Arrastra tu video aquí o haz clic para seleccionar
                </p>
                <p className="text-xs text-gray-400">MP4, MOV o WebM (máx. 500MB)</p>
              </div>
            )}
          </div>
        </div>

        {/* Progress Pipeline */}
        {currentStep !== 'idle' && (
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Pipeline de Procesamiento</h3>
            <div className="space-y-3">
              {STEP_ORDER.map((step, idx) => {
                const currentIdx = STEP_ORDER.indexOf(currentStep === 'error' ? 'idle' as Step : currentStep)
                const stepIdx = idx
                const isActive = step === currentStep
                const isCompleted = currentStep !== 'error' && stepIdx < currentIdx
                const isFailed = currentStep === 'error' && step === STEP_ORDER[STEP_ORDER.indexOf(currentStep === 'error' ? STEP_ORDER[0] : currentStep)]

                return (
                  <div key={step} className="flex items-center gap-3">
                    <div className={`
                      w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all
                      ${isCompleted ? 'bg-green-500 text-white' : ''}
                      ${isActive && currentStep !== 'error' ? 'bg-red-500 text-white animate-pulse' : ''}
                      ${!isCompleted && !isActive ? 'bg-gray-200 text-gray-400' : ''}
                      ${currentStep === 'error' ? 'bg-red-100 text-red-400' : ''}
                    `}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isActive && currentStep !== 'error' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span className="text-xs font-bold">{idx + 1}</span>
                      )}
                    </div>
                    <span className={`text-sm ${isActive ? 'font-medium text-gray-900' : isCompleted ? 'text-green-700' : 'text-gray-400'}`}>
                      {STEP_LABELS[step]}
                    </span>
                  </div>
                )
              })}
            </div>

            {currentStep === 'error' && errorMessage && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            )}

            {aiPrompt && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-700 mb-1">Prompt generado por Gemini:</p>
                <p className="text-sm text-amber-900 italic">{aiPrompt}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleProcess}
            disabled={!canSubmit}
            className={`
              flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all
              ${canSubmit
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20 hover:shadow-red-600/30 hover:-translate-y-0.5'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <Wand2 className="w-4 h-4" />
            {isProcessing ? 'Procesando...' : 'Iniciar Automatización'}
          </button>

          {(currentStep === 'done' || currentStep === 'error') && (
            <button
              onClick={resetForm}
              className="px-4 py-3.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Nuevo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
