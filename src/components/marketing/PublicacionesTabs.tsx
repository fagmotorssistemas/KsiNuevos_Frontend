'use client'

import { Film, Sparkles } from 'lucide-react'

export type PublicacionesTab = 'videos' | 'posts'

const TABS: { id: PublicacionesTab; label: string; icon: typeof Film }[] = [
  { id: 'videos', label: 'Videos', icon: Film },
  { id: 'posts', label: 'Posts (IA)', icon: Sparkles },
]

export function PublicacionesTabs({
  tab,
  onTabChange,
}: {
  tab: PublicacionesTab
  onTabChange: (t: PublicacionesTab) => void
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl bg-slate-100/80 p-1">
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = tab === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={[
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
              active
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800',
            ].join(' ')}
          >
            <Icon className={`h-4 w-4 ${active ? 'text-violet-600' : ''}`} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
