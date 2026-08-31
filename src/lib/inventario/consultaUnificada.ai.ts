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
    tipo: report.kind,
    titulo: report.title,
    vehiculo: report.kind === 'placa' ? report.vehicle : [],
    propietarios: report.kind === 'placa' ? report.owners : null,
    deudas_de_esta_placa: report.debts,
    citaciones_pendientes_de_esta_placa: report.pendingCitations,
    deudas_del_propietario: report.ownerDebts,
    citaciones_pendientes_del_propietario: report.ownerPendingCitations,
    historial_de_esta_placa: report.infractionHistory,
    historial_del_propietario: report.ownerInfractionHistory,
    persona: report.person,
    actividad: report.activity,
    judiciales: {
      consultado: report.judicial.consulted,
      total: report.judicial.total,
      transito: report.judicial.transit,
      otros: report.judicial.other.map((row) => ({ tipo: row.plainAction, rol: row.role, fecha: row.date })),
      nota_rol: report.judicial.roleNote,
    },
    fuentes: report.sourcesNote,
    revision_manual: report.manualReview,
  }

  const prompt = [
    'Eres un analista de due diligence vehicular en un concesionario de Ecuador.',
    'Redacta en español claro, para una persona no técnica.',
    'No uses nombres de campos en inglés, ni JSON, ni "fetched at", ni certificados, ni cache.',
    'Si el tipo no es placa, no hables de vehículos registrados a su nombre ni digas que no tiene vehículos.',
    'Si hay dos propietarios distintos: advertencia. Di solo que hay que verificar el nombre del titular del vehículo. No indiques ANT, portales, notaría ni dónde hacerlo. No hables de compra bloqueada y no elijas un titular como verdadero.',
    'En juicios, el rol "actor" NO significa que la persona sea culpable. No escribas que "tiene una demanda por" un delito.',
    'Si el tipo es placa: habla solo de deudas de ESA placa (SRI, ANT y AMT Quito si aplica). No menciones EMOV, CTE ni otros GADs como fuentes de esta consulta. No atribuyas al auto multas de la cédula.',
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
