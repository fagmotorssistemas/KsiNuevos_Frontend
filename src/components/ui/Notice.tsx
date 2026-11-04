import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { twMerge } from 'tailwind-merge'

export type NoticeTone = 'error' | 'warning'

const TONE_CLASSES: Record<NoticeTone, { border: string; icon: string; title: string; body: string }> = {
  error: { border: 'border-red-200', icon: 'text-red-600', title: 'text-red-800', body: 'bg-red-50 text-red-600' },
  warning: { border: 'border-amber-200', icon: 'text-amber-600', title: 'text-amber-800', body: 'bg-amber-50 text-amber-700' },
}

export interface NoticeProps {
  /** `error` (rojo) para fallos del proceso; `warning` (ámbar) para avisos que no son error. */
  tone: NoticeTone
  title: string
  /** Mensaje del aviso (va dentro de un párrafo). */
  children: ReactNode
  className?: string
}

/** Tarjeta de aviso con ícono, título y mensaje: un error del proceso o un video que ya no está. */
export function Notice({ tone, title, children, className }: NoticeProps) {
  const c = TONE_CLASSES[tone]
  return (
    <div className={twMerge('bg-white rounded-2xl border p-6 shadow-sm', c.border, className)}>
      <div className="flex items-start gap-3">
        <AlertCircle className={`w-6 h-6 shrink-0 mt-0.5 ${c.icon}`} />
        <div>
          <h2 className={`text-base font-bold mb-2 ${c.title}`}>{title}</h2>
          <p className={`text-sm px-4 py-3 rounded-xl ${c.body}`}>{children}</p>
        </div>
      </div>
    </div>
  )
}
