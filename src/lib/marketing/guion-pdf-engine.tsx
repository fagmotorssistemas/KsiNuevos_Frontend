'use client'

import { pdf } from '@react-pdf/renderer'
import { GuionReelsPDFDocument } from '@/components/marketing/pdf/GuionReelsPDFDocument'
import { GUION_PDF_LOGO_DATA_URI } from '@/lib/marketing/guion-pdf-logo'
import type { GuionData } from '@/types/guion-pdf'

let engineReady = false
let warmupPromise: Promise<void> | null = null

const WARMUP_DATA: GuionData = {
  vehiculo: 'KSi NUEVOS',
  logoUrl: GUION_PDF_LOGO_DATA_URI,
  tomas: [{ numero: 1, tiempo: '0:00', descripcionToma: '—', guion: '—' }],
}

/** Precarga react-pdf + layout (plantilla) en segundo plano. */
export function warmUpGuionPdfEngine(): Promise<void> {
  if (engineReady) return Promise.resolve()
  if (warmupPromise) return warmupPromise

  warmupPromise = pdf(<GuionReelsPDFDocument data={WARMUP_DATA} />)
    .toBlob()
    .then(() => {
      engineReady = true
    })
    .catch(() => {
      engineReady = true
    })

  return warmupPromise
}

export function enrichGuionPdfData(data: GuionData): GuionData {
  return {
    ...data,
    logoUrl: data.logoUrl ?? GUION_PDF_LOGO_DATA_URI,
  }
}

/** Solo inyecta datos en la plantilla ya calentada. */
export async function generateGuionPdfBlob(data: GuionData): Promise<Blob> {
  await warmUpGuionPdfEngine()
  return pdf(<GuionReelsPDFDocument data={enrichGuionPdfData(data)} />).toBlob()
}
