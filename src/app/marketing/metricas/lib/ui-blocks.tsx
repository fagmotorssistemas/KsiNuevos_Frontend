import type { ReactNode } from 'react'

import { categoryBadge, type VehicleCategory } from './inventory-metrics'

export function CategoryChip({ category }: { category: VehicleCategory | '—' }) {
  if (category === '—') {
    return <span className="text-xs font-bold text-gray-400">—</span>
  }
  const s = categoryBadge(category)
  const emoji =
    category === 'URGENTE' ? '🔴' : category === 'RESCATE' ? '🟠' : category === 'ROTACION' ? '🟡' : '🟢'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold ring-1 ring-inset ${s.bg} ${s.text}`}
    >
      <span aria-hidden>{emoji}</span>
      {s.label}
    </span>
  )
}

/** Texto largo en párrafos */
export function ParagraphBlock({ text }: { text: string }) {
  const parts = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  return (
    <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
      {parts.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  )
}

/** Lista numerada desde texto multilinea o array */
export function RecommendationsBlock({ value }: { value: string | string[] | null | undefined }) {
  if (value == null) return <p className="text-sm text-gray-500">Sin recomendaciones para esta fecha.</p>
  const items = Array.isArray(value)
    ? value.map((s) => String(s).trim()).filter(Boolean)
    : String(value)
        .split('\n')
        .map((s) => s.replace(/^\d+[\).\s]+/, '').trim())
        .filter(Boolean)

  if (items.length === 0) return <p className="text-sm text-gray-500">Sin recomendaciones para esta fecha.</p>

  return (
    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 leading-relaxed">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ol>
  )
}

export function SectionCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h2 className="text-base font-extrabold text-gray-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}
