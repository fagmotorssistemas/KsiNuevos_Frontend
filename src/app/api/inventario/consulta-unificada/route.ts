import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { classifyConsultaQuery, runUnifiedConsulta } from '@/lib/inventario/consultaUnificada'
import { synthesizeConsultaInvestigation } from '@/lib/inventario/consultaUnificada.ai'

export const maxDuration = 90

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: { query?: string } = {}
  try {
    body = (await req.json()) as { query?: string }
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const classified = classifyConsultaQuery(body.query ?? '')
  if ('error' in classified) {
    return NextResponse.json({ error: classified.error }, { status: 400 })
  }

  try {
    const data = await runUnifiedConsulta(supabase, body.query ?? '')
    const report = data.report
    if (report) {
      try {
        report.ai = await synthesizeConsultaInvestigation(report)
      } catch (error) {
        report.ai = {
          conclusions: [],
          investigationSummary: '',
          error: error instanceof Error ? error.message : 'No se pudo generar el análisis IA',
        }
      }
    }
    return NextResponse.json({
      data: {
        ...data,
        sections: [],
        report,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo completar la consulta'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
