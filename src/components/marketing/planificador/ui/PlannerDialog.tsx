'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { twMerge } from 'tailwind-merge'

type PlannerDialogProps = {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

const SIZE = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-3xl',
  '2xl': 'max-w-4xl',
}

export function PlannerDialog({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = 'lg',
  className,
}: PlannerDialogProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (open) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted || !open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="planner-dialog-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Cerrar"
      />
      <div
        className={twMerge(
          'relative w-full flex flex-col max-h-[92vh] sm:max-h-[88vh]',
          'bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200/80',
          'animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200',
          SIZE[size],
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start gap-4 px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          {icon && (
            <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0 pr-8">
            <h2 id="planner-dialog-title" className="text-lg font-bold text-slate-900 leading-tight">
              {title}
            </h2>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <footer className="shrink-0 px-5 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}
