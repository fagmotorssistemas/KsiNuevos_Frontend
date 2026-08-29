import { getOpenAiModel } from '@/lib/inventario/openaiDocumentVision'
import type { UnifiedReadableReport } from '@/lib/inventario/consultaUnificada.types'

function getOpenAiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) throw new Error('OPENAI_API_KEY no configurada')
  return key
}

export async function synthesizeConsultaInvestigation(report: UnifiedReadableReport): Promise<{
  conclusions: string[]
  investigationSummary: string
  error: string | null
}> {
  const compact = {
    titulo: report.title,
    vehiculo: report.vehicle,
    propietarios: report.owners,
    deudas: report.debts,
    citaciones_pendientes: report.pendingCitations,
    historial: report.infractionHistory,
    persona: report.person,
    actividad: report.activity,
    judiciales: {
      total: report.judicial.total,
      transito: report.judicial.transit,
      otros: report.judicial.other.map((row) => ({ tipo: row.plainAction, rol: row.role, fecha: row.date })),
      nota_rol: report.judicial.roleNote,
    },
    alertas: report.alerts,
  }

  const prompt = [
    'Eres un analista de due diligence vehicular en un concesionario de Ecuador.',
    'Redacta en español claro, para una persona no técnica.',
    'No uses nombres de campos en inglés, ni JSON, ni "fetched at", ni certificados, ni cache.',
    'Si hay dos propietarios distintos, dilo como inconsistencia a verificar. No elijas uno como verdad.',
    'En juicios, el rol "actor" NO significa que la persona sea culpable. No escribas que "tiene una demanda por" un delito.',
    'No inventes datos que no estén en el JSON.',
    'Responde SOLO JSON: { "conclusions": ["frase corta 1", "frase corta 2"], "investigation_summary": "2 a 4 párrafos con el cierre de la investigación" }',
    JSON.stringify(compact),
  ].join('\n')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getOpenAiModel(),
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const body = (await res.json()) as {
    error?: { message?: string }
    choices?: { message?: { content?: string } }[]
  }
  if (!res.ok) throw new Error(body.error?.message?.trim() || `OpenAI respondió ${res.status}`)
  const rawText = body.choices?.[0]?.message?.content?.trim()
  if (!rawText) throw new Error('OpenAI no devolvió el análisis')
  const start = rawText.indexOf('{')
  const end = rawText.lastIndexOf('}')
  const parsed = JSON.parse(start >= 0 && end > start ? rawText.slice(start, end + 1) : rawText) as {
    conclusions?: unknown
    investigation_summary?: unknown
  }
  const conclusions = Array.isArray(parsed.conclusions)
    ? parsed.conclusions.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    : []
  const investigationSummary =
    typeof parsed.investigation_summary === 'string' ? parsed.investigation_summary.trim() : ''
  return { conclusions, investigationSummary, error: null }
}
