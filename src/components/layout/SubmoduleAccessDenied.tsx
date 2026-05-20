'use client'

import { ShieldAlert } from 'lucide-react'

export function SubmoduleAccessDenied({ moduleLabel }: { moduleLabel: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-50 text-slate-600">
      <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
      <h1 className="text-xl font-bold">Acceso restringido</h1>
      <p>No tienes permiso para entrar a {moduleLabel}.</p>
    </div>
  )
}
