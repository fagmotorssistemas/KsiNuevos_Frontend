'use client'

export function VendedorHeader({ nombre, count }: { nombre: string; count: number }) {
  const initials = nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-sm shrink-0">
          {initials || 'V'}
        </div>
        <div className="min-w-0">
          <p className="text-base font-extrabold text-gray-900 truncate">{nombre}</p>
          <p className="text-xs text-gray-500">{count} guiones</p>
        </div>
      </div>
    </div>
  )
}

