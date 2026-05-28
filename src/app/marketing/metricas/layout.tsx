import { PropsWithChildren } from 'react'

import { MetricasNav } from './nav'
import { MetricasHeaderActions } from './header-actions'

export default function MarketingMetricasLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Métricas KSI Nuevos</h1>
          <p className="text-sm text-gray-500 mt-2">
            Contactos reales, inversión en Meta Ads y rendimiento orgánico — en un solo panel.
          </p>
        </div>
        <MetricasHeaderActions />
      </div>

      <MetricasNav />

      <div>{children}</div>
    </div>
  )
}

