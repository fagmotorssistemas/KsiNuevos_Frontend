import { AlertTriangle, CheckCircle2 } from 'lucide-react'

type Props = {
  labels: string[]
  className?: string
}

export function PendingDocumentsNotice({ labels, className = '' }: Props) {
  if (labels.length === 0) {
    return (
      <div
        className={`flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 ${className}`}
        role="status"
      >
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700 mt-0.5" />
        <p className="text-sm font-semibold text-emerald-900">No hay documentos pendientes</p>
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 ${className}`}
      role="status"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-950">
            {labels.length} documento{labels.length === 1 ? '' : 's'} pendiente
            {labels.length === 1 ? '' : 's'}
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {labels.map((label) => (
              <li
                key={label}
                className="inline-flex rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[11px] font-medium text-amber-900"
              >
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
