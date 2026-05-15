'use client'

import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react'
import type { NoticieroPipelineStep } from '@/lib/noticiero/types'

const STEPS: { key: NoticieroPipelineStep; label: string; hint?: string }[] = [
  { key: 'script', label: 'Generando guión con IA...' },
  {
    key: 'avatar',
    label: 'Creando avatar con HeyGen...',
    hint: 'Este paso puede tardar entre 1 y 3 minutos',
  },
  { key: 'video', label: 'Componiendo video con Creatomate...' },
  { key: 'social', label: 'Subiendo a redes sociales...' },
]

const ORDER: NoticieroPipelineStep[] = ['script', 'avatar', 'video', 'social', 'done']

function stepIndex(step: NoticieroPipelineStep): number {
  if (step === 'idle' || step === 'error') return -1
  return ORDER.indexOf(step)
}

interface GenerationProgressProps {
  currentStep: NoticieroPipelineStep
  error?: string | null
}

export function GenerationProgress({ currentStep, error }: GenerationProgressProps) {
  if (currentStep === 'idle') return null

  const activeIdx = stepIndex(currentStep)
  const isError = currentStep === 'error' || Boolean(error)
  const allDone = currentStep === 'done'

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
      <h2 className="text-base font-bold text-gray-900">Progreso de generación</h2>

      <ul className="space-y-4">
        {STEPS.map((step, i) => {
          const done = allDone || activeIdx > i
          const active = !allDone && !isError && activeIdx === i
          const failed = isError && activeIdx === i

          return (
            <li key={step.key} className="flex items-start gap-3">
              {failed ? (
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              ) : done ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : active ? (
                <Loader2 className="w-5 h-5 text-violet-600 animate-spin shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
              )}
              <div>
                <p
                  className={`text-sm font-medium ${
                    done
                      ? 'text-emerald-700'
                      : active
                        ? 'text-violet-700'
                        : failed
                          ? 'text-red-700'
                          : 'text-gray-500'
                  }`}
                >
                  {done ? step.label.replace('...', '') : step.label}
                </p>
                {step.hint && active && (
                  <p className="text-xs text-violet-600 mt-1">{step.hint}</p>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
      )}
    </div>
  )
}
