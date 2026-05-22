'use client'

import { twMerge } from 'tailwind-merge'
import { Input } from '@/components/ui/Input'

export function DevSection({
  step,
  title,
  description,
  children,
  className,
}: {
  step?: number
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={twMerge('space-y-4', className)}>
      <div className="flex items-start gap-3">
        {step != null && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white shadow-md shadow-violet-500/25">
            {step}
          </span>
        )}
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

export function DevField({
  label,
  hint,
  required,
  children,
  className,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={twMerge('space-y-2', className)}>
      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 leading-relaxed">{hint}</p>}
    </div>
  )
}

const inputClass =
  'rounded-xl border-slate-200 h-11 text-slate-800 placeholder:text-slate-400 focus-visible:ring-violet-500/30 focus-visible:border-violet-500'

export function DevInput(
  props: React.ComponentProps<typeof Input> & { label?: string; hint?: string; required?: boolean },
) {
  const { label, hint, required, className, ...rest } = props
  const el = <Input className={twMerge(inputClass, className)} {...rest} />
  if (!label) return el
  return (
    <DevField label={label} hint={hint} required={required}>
      {el}
    </DevField>
  )
}

export function DevTextarea({
  label,
  hint,
  required,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  hint?: string
  required?: boolean
}) {
  const area = (
    <textarea
      className={twMerge(
        'flex w-full min-h-[100px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800',
        'placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 focus-visible:border-violet-500',
        'disabled:opacity-50 resize-y transition-shadow',
        className,
      )}
      {...props}
    />
  )
  if (!label) return area
  return (
    <DevField label={label} hint={hint} required={required}>
      {area}
    </DevField>
  )
}

export function DevStepBar({
  steps,
  current,
}: {
  steps: { id: number; label: string }[]
  current: number
}) {
  return (
    <nav aria-label="Progreso del formulario" className="flex items-center gap-1 sm:gap-2">
      {steps.map((s, i) => {
        const done = current > s.id
        const active = current === s.id
        return (
          <div key={s.id} className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
            <div
              className={twMerge(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all',
                done && 'bg-emerald-500 text-white shadow-sm',
                active && 'bg-violet-600 text-white ring-4 ring-violet-200',
                !done && !active && 'bg-white border-2 border-slate-200 text-slate-400',
              )}
            >
              {done ? '✓' : s.id}
            </div>
            <span
              className={twMerge(
                'hidden sm:block text-xs font-bold truncate',
                active ? 'text-violet-800' : done ? 'text-emerald-700' : 'text-slate-500',
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={twMerge(
                  'h-0.5 flex-1 mx-1 rounded-full min-w-[12px]',
                  done ? 'bg-emerald-400' : 'bg-slate-200',
                )}
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}
