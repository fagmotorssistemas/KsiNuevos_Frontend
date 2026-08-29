import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { EcuadorApiError, isEcuadorApiConfigured } from '@/lib/inventario/ecuador-api'
import { runAndSaveContrasteIngreso, type ContrasteIngresoResult } from '@/lib/inventario/runAndSaveContraste'

const MAX_ITEMS = 8

type IngresoItem = {
  placa?: unknown
  inventoryoracleId?: unknown
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  if (!isEcuadorApiConfigured()) {
    return NextResponse.json({ error: 'EcuadorAPI no está configurada' }, { status: 503 })
  }

  const body = (await req.json().catch(() => null)) as { items?: IngresoItem[] } | null
  const rawItems = Array.isArray(body?.items) ? body.items : []
  const items = rawItems
    .map((item) => ({
      placa: typeof item.placa === 'string' ? item.placa : '',
      inventoryoracleId: typeof item.inventoryoracleId === 'string' ? item.inventoryoracleId : null,
    }))
    .filter((item) => item.placa.trim())
    .slice(0, MAX_ITEMS)

  if (items.length === 0) {
    return NextResponse.json({ error: 'Sin placas para contrastar' }, { status: 400 })
  }

  const results: ContrasteIngresoResult[] = []
  for (const item of items) {
    try {
      results.push(
        await runAndSaveContrasteIngreso(supabase, {
          placa: item.placa,
          inventoryoracleId: item.inventoryoracleId,
          consultedBy: user.id,
        })
      )
    } catch (error) {
      if (error instanceof EcuadorApiError && (error.httpStatus === 402 || error.httpStatus === 401)) {
        return NextResponse.json(
          {
            results,
            error: error.message,
            stopped: true,
          },
          { status: error.httpStatus }
        )
      }
      const message = error instanceof EcuadorApiError ? error.message : error instanceof Error ? error.message : 'Error al consultar'
      results.push({ placa: item.placa, status: 'error', error: message })
    }
  }

  return NextResponse.json({ results })
}
