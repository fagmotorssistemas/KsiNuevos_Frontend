import type { Segment } from './segmenter'

/** Resumen por clip del texto transcrito (AssemblyAI → segmentos) para el prompt de Gemini. */
export function formatAssemblyTranscriptDumpForPrompt(allSegments: Segment[]): string {
  const byClip = new Map<number, Segment[]>()
  for (const s of allSegments) {
    if (s.source_kind === 'visual_only') continue
    const arr = byClip.get(s.clip_index) ?? []
    arr.push(s)
    byClip.set(s.clip_index, arr)
  }
  if (byClip.size === 0) return '(sin transcripciones de habla en el mapa)'

  const lines: string[] = []
  for (const ci of [...byClip.keys()].sort((a, b) => a - b)) {
    const segs = (byClip.get(ci) ?? []).sort((a, b) => a.start_s - b.start_s || a.segment_id.localeCompare(b.segment_id))
    const parts = segs.map((s) => `[${s.segment_id}] "${s.text}"`)
    lines.push(`Clip ${ci}: ${parts.join(' · ')}`)
  }
  return lines.join('\n')
}
