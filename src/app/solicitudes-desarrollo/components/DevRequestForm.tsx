'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowLeft, ArrowRight, CheckCircle2, Send } from 'lucide-react'
import { toast } from 'sonner'
import {
  MAX_FILE_BYTES,
  MAX_FILES,
  PRIORITY_OPTIONS,
  REQUEST_TYPE_OPTIONS,
  TARGET_MODULE_OPTIONS,
} from '../constants'
import {
  clearDevRequestDraft,
  defaultForm,
  getEnvironmentInfo,
  loadDevRequestDraft,
  saveDevRequestDraft,
} from '../lib/draftStorage'
import type { MarketingDevRequestInput, MarketingDevRequestType } from '@/types/marketing-dev-requests'
import { DevInput, DevSection, DevStepBar, DevTextarea } from './ui/DevFormPrimitives'
import { TypeOptionCards } from './ui/TypeOptionCards'
import { ModuleOptionGrid } from './ui/ModuleOptionGrid'
import { PrioritySegment } from './ui/PrioritySegment'
import { FileDropzone } from './ui/FileDropzone'

const STEPS = [
  { id: 1, label: 'Clasificar' },
  { id: 2, label: 'Describir y enviar' },
]

type Props = {
  onSubmit: (input: MarketingDevRequestInput, files: File[]) => Promise<{ error?: string; id?: string }>
  onCancel: () => void
  onSuccess?: () => void
  onDraftChange?: () => void
}

function readInitialState(pathname: string) {
  const draft = loadDevRequestDraft()
  if (draft?.tab === 'new') {
    return {
      step: Math.min(Math.max(draft.step, 1), 2),
      requestType: draft.requestType,
      form: { ...defaultForm(pathname), ...draft.form, page_url: pathname },
    }
  }
  return {
    step: 1,
    requestType: 'bug' as MarketingDevRequestType,
    form: defaultForm(pathname),
  }
}

export function DevRequestForm({ onSubmit, onCancel, onSuccess, onDraftChange }: Props) {
  const pathname = usePathname()
  const initial = useRef(readInitialState(pathname))
  const skipPersistRef = useRef(false)
  const [step, setStep] = useState(initial.current.step)
  const [submitting, setSubmitting] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [requestType, setRequestType] = useState<MarketingDevRequestType>(initial.current.requestType)
  const [form, setForm] = useState<MarketingDevRequestInput>(initial.current.form)

  const persistDraft = useCallback(() => {
    if (skipPersistRef.current) return
    saveDevRequestDraft({
      tab: 'new',
      step,
      requestType,
      form: { ...form, page_url: pathname },
      updatedAt: Date.now(),
    })
  }, [step, requestType, form, pathname])

  useEffect(() => {
    persistDraft()
    onDraftChange?.()
  }, [persistDraft, onDraftChange])

  useEffect(() => {
    const onHide = () => persistDraft()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
    }
  }, [persistDraft])

  const goNext = () => {
    if (step !== 1) return
    setStep(2)
  }

  const handleSubmit = async () => {
    if (form.title.trim().length < 3) {
      toast.error('Escribe un título de al menos 3 caracteres')
      setStep(2)
      return
    }
    if (form.description.trim().length < 10) {
      toast.error('La descripción necesita un poco más de detalle')
      setStep(2)
      return
    }
    setSubmitting(true)
    const res = await onSubmit(
      {
        ...form,
        request_type: requestType,
        page_url: pathname,
        environment_info: getEnvironmentInfo() ?? form.environment_info,
      },
      files,
    )
    setSubmitting(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    skipPersistRef.current = true
    clearDevRequestDraft()
    setStep(1)
    setFiles([])
    setRequestType('bug')
    setForm(defaultForm(pathname))
    toast.success('¡Listo! Tu solicitud ya está en cola de desarrollo')
    onSuccess?.()
  }

  const handleCancel = () => {
    clearDevRequestDraft()
    onCancel()
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden mb-2">
      <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-6 py-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-500/20">
            <Send className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Nueva solicitud</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Tu progreso se guarda automáticamente si cambias de pestaña o app.
            </p>
          </div>
        </div>
        <DevStepBar steps={STEPS} current={step} />
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        {step === 1 && (
          <>
            <DevSection step={1} title="¿Qué tipo de solicitud es?" description="Elige la opción que mejor describa tu necesidad.">
              <TypeOptionCards
                options={REQUEST_TYPE_OPTIONS}
                value={requestType}
                onChange={(v) => {
                  setRequestType(v)
                  setForm((f) => ({ ...f, request_type: v }))
                }}
              />
            </DevSection>

            <DevSection title="¿En qué módulo ocurre?" description="Selecciona el área del sistema relacionada.">
              <ModuleOptionGrid
                options={TARGET_MODULE_OPTIONS}
                value={form.target_module}
                onChange={(v) => setForm((f) => ({ ...f, target_module: v }))}
              />
            </DevSection>

            <DevSection title="Prioridad sugerida" description="Nos ayuda a ordenar el trabajo; el equipo puede ajustarla.">
              <PrioritySegment
                options={PRIORITY_OPTIONS}
                value={form.priority}
                onChange={(v) => setForm((f) => ({ ...f, priority: v }))}
              />
            </DevSection>
          </>
        )}

        {step === 2 && (
          <>
            <DevInput
              label="Título resumido"
              hint="Una frase clara: qué falla o qué necesitas"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ej: Exportar PDF en métricas no responde"
              maxLength={200}
            />

            <DevTextarea
              label="Descripción detallada"
              hint="Cuéntanos el contexto, qué intentabas hacer y qué impacto tiene"
              required
              className="min-h-[160px]"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Mientras revisaba las métricas de campaña, al pulsar exportar PDF la pantalla se queda cargando y nunca descarga el archivo…"
            />

            <DevSection title="Evidencias (opcional)" description="Capturas o archivos ayudan a resolver más rápido">
              <FileDropzone
                files={files}
                onChange={setFiles}
                maxFiles={MAX_FILES}
                maxBytes={MAX_FILE_BYTES}
                onError={(msg) => toast.error(msg)}
              />
            </DevSection>

            <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-900">
                Al enviar se registrará tu nombre, correo, rol y la fecha. Recibirás un código{' '}
                <strong className="font-mono">DEV-…</strong> para dar seguimiento.
              </p>
            </div>
          </>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2 border-t border-slate-100">
          {step === 1 ? (
            <button
              type="button"
              onClick={handleCancel}
              className="sm:flex-none px-5 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Atrás
            </button>
          )}

          <div className="flex-1" />

          {step === 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Continuar
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 min-w-[160px]"
            >
              {submitting ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar solicitud
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
