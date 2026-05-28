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

/** Normaliza recomendaciones desde JSON array, jsonb o texto multilínea. */
export function parseRecommendationsList(value: unknown): string[] {
  if (value == null) return []

  if (Array.isArray(value)) {
    return value.map((s) => String(s).trim()).filter(Boolean)
  }

  if (typeof value === 'object') {
    const o = value as Record<string, unknown>
    if (Array.isArray(o.items)) return parseRecommendationsList(o.items)
    if (Array.isArray(o.recomendaciones)) return parseRecommendationsList(o.recomendaciones)
    return []
  }

  const str = String(value).trim()
  if (!str) return []

  if (str.startsWith('[') || str.startsWith('{')) {
    try {
      const parsed = JSON.parse(str) as unknown
      const fromJson = parseRecommendationsList(parsed)
      if (fromJson.length > 0) return fromJson
    } catch {
      /* texto con comillas sueltas */
    }
  }

  const quoted = [...str.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((m) =>
    m[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').trim()
  )
  if (quoted.length > 1) return quoted.filter(Boolean)

  return str
    .split(/\n+/)
    .flatMap((line) => line.split(/,(?=\s*["\w])/))
    .map((s) => s.replace(/^[\s\[\{,"]+|[\s\]\}",]+$/g, '').replace(/^\d+[\).\s]+/, '').trim())
    .filter((s) => s.length > 2)
}

/** Lista de recomendaciones — tipografía clara, sin tarjetas pesadas */
export function RecommendationsBlock({ value }: { value: string | string[] | null | undefined }) {
  const items = parseRecommendationsList(value)

  if (items.length === 0) {
    return <p className="text-sm text-slate-500">Sin recomendaciones para esta fecha.</p>
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100 overflow-hidden bg-slate-50/40">
      {items.map((text, i) => (
        <li key={`${i}-${text.slice(0, 24)}`} className="flex gap-4 px-4 py-4 bg-white first:rounded-t-2xl last:rounded-b-2xl">
          <span
            className="shrink-0 w-6 text-right text-[11px] font-bold text-slate-400 tabular-nums pt-0.5"
            aria-hidden
          >
            {i + 1}.
          </span>
          <p className="text-[15px] text-slate-700 leading-relaxed">{text}</p>
        </li>
      ))}
    </ul>
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
