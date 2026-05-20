'use client'

import { ChevronDown } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import { Input } from '@/components/ui/Input'

const fieldInput =
  'rounded-xl border-slate-200 h-11 text-slate-800 focus-visible:ring-violet-500/25 focus-visible:border-violet-500'

export function PlannerField({
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
    <div className={twMerge('space-y-1.5', className)}>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export function PlannerInput(
  props: React.ComponentProps<typeof Input> & { label?: string; hint?: string; required?: boolean },
) {
  const { label, hint, required, className, ...rest } = props
  const input = <Input className={twMerge(fieldInput, className)} {...rest} />
  if (!label) return input
  return (
    <PlannerField label={label} hint={hint} required={required}>
      {input}
    </PlannerField>
  )
}

export function PlannerTextarea({
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
        'flex w-full min-h-[88px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800',
        'placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/25 focus-visible:border-violet-500',
        'disabled:opacity-50 resize-y',
        className,
      )}
      {...props}
    />
  )
  if (!label) return area
  return (
    <PlannerField label={label} hint={hint} required={required}>
      {area}
    </PlannerField>
  )
}

export function PlannerSelect({
  label,
  hint,
  required,
  options,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  hint?: string
  required?: boolean
  options: { value: string; label: string }[]
}) {
  const select = (
    <div className="relative">
      <select
        className={twMerge(
          'flex h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm font-medium text-slate-800',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/25 focus-visible:border-violet-500',
          'disabled:opacity-50 cursor-pointer',
          className,
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
    </div>
  )
  if (!label) return select
  return (
    <PlannerField label={label} hint={hint} required={required}>
      {select}
    </PlannerField>
  )
}

export function PlannerCheckbox({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-3 cursor-pointer rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50/80 transition-colors"
    >
      <span
        className={twMerge(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
          checked ? 'bg-violet-600 border-violet-600' : 'border-slate-300 bg-white',
        )}
      >
        {checked && (
          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <input
        id={id}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  )
}

export function PlannerModalFooter({
  onCancel,
  onConfirm,
  cancelLabel = 'Cancelar',
  confirmLabel = 'Guardar',
  confirmDisabled,
  confirmLoading,
  confirmVariant = 'primary',
  extra,
}: {
  onCancel: () => void
  onConfirm?: () => void
  cancelLabel?: string
  confirmLabel?: string
  confirmDisabled?: boolean
  confirmLoading?: boolean
  confirmVariant?: 'primary' | 'danger'
  extra?: React.ReactNode
}) {
  return (
    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:items-center sm:justify-between">
      {extra && <div className="sm:mr-auto">{extra}</div>}
      <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-white bg-white transition-colors"
        >
          {cancelLabel}
        </button>
        {onConfirm && (
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled || confirmLoading}
            className={twMerge(
              'flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors inline-flex items-center justify-center gap-2 min-w-[120px]',
              confirmVariant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 disabled:opacity-50'
                : 'bg-slate-900 hover:bg-slate-800 disabled:opacity-50',
            )}
          >
            {confirmLoading && (
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        )}
      </div>
    </div>
  )
}
