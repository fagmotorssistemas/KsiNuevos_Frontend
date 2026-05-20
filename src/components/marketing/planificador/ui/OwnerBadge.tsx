'use client'

import { User } from 'lucide-react'
import { useMarketingPlannerContext } from '@/hooks/marketing/useMarketingPlannerContext'

type Person = { id: string; full_name: string | null } | null | undefined

export function OwnerBadge({
  owner,
  creator,
  showCreatorIfDifferent,
}: {
  owner?: Person
  creator?: Person
  showCreatorIfDifferent?: boolean
}) {
  const { isAdmin } = useMarketingPlannerContext()
  if (!isAdmin) return null

  const name = owner?.full_name ?? 'Sin nombre'
  const createdByOther =
    showCreatorIfDifferent &&
    creator?.id &&
    owner?.id &&
    creator.id !== owner.id

  return (
    <span className="inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 text-[10px] font-bold uppercase tracking-wide border border-indigo-100">
      <User className="h-3 w-3 shrink-0" />
      <span className="truncate">{name}</span>
      {createdByOther && (
        <span className="text-indigo-500 font-medium normal-case tracking-normal truncate">
          · Creado por {creator?.full_name}
        </span>
      )}
    </span>
  )
}
