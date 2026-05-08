'use client'

import Link from 'next/link'
import { BarChart3 } from 'lucide-react'

export function MetricasHeaderActions() {
  return (
    <Link
      href="/marketing/metricas"
      className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
    >
      <BarChart3 className="h-4 w-4 mr-2" />
      Ir al resumen
    </Link>
  )
}
