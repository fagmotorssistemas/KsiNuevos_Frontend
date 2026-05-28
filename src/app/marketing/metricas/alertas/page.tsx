'use client'

import { MetaAdAlertsSections } from '@/app/marketing/metricas/alertas/MetaAdAlertsSections'

export default function MetricasAlertasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900">Alertas Meta Ads</h2>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Historial de pausas automáticas (cron en el servidor). Solo lectura — no pausas desde aquí.
        </p>
      </div>
      <MetaAdAlertsSections />
    </div>
  )
}
