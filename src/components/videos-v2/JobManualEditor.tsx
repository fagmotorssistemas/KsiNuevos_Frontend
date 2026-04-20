'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clapperboard, Loader2, Pencil, RotateCcw, Save } from 'lucide-react'
import type { SequenceItem, SubtitleBlock } from '@/lib/videos-v2/segmenter'
import type { GeminiSegmentAnalysisResult } from '@/lib/videos-v2/types'

type EditorStateResponse = {
  gemini_analysis: GeminiSegmentAnalysisResult
  subtitle_blocks_auto: SubtitleBlock[]
  subtitle_blocks_effective: SubtitleBlock[]
  subtitle_override_active: boolean
  segment_trim_bounds: {
    segment_id: string
    clip_index: number
    min_start_s: number
    max_end_s: number
  }[]
}

type Tab = 'subtitles' | 'clips' | 'json'

interface Props {
  jobId: string
  onSaved: () => void
}

export function JobManualEditor({ jobId, onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('subtitles')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subtitleRows, setSubtitleRows] = useState<SubtitleBlock[]>([])
  const [sequenceRows, setSequenceRows] = useState<SequenceItem[]>([])
  const [bounds, setBounds] = useState<EditorStateResponse['segment_trim_bounds']>([])
  const [overrideActive, setOverrideActive] = useState(false)
  const [rerenderJson, setRerenderJson] = useState('')
  const [saving, setSaving] = useState(false)
  const [rendering, setRendering] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/videos-v2/jobs/${jobId}/editor-state`)
      const data = (await res.json()) as EditorStateResponse & { error?: string }
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar el editor')
      setSubtitleRows(
        data.subtitle_blocks_effective.map((b) => ({
          time: b.time,
          duration: b.duration,
          text: b.text,
        }))
      )
      setSequenceRows(
        data.gemini_analysis.sequence.map((s) => ({
          ...s,
        }))
      )
      setBounds(data.segment_trim_bounds)
      setOverrideActive(data.subtitle_override_active)
      setRerenderJson(JSON.stringify(data.gemini_analysis, null, 2))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  async function saveSubtitles() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/videos-v2/jobs/${jobId}/editor-state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtitle_blocks_override: subtitleRows }),
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(j.error || 'Error al guardar subtítulos')
      setOverrideActive(true)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function restoreSubtitlesFromTranscript() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/videos-v2/jobs/${jobId}/editor-state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtitle_blocks_override: null }),
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(j.error || 'Error')
      setOverrideActive(false)
      await load()
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function saveClips() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/videos-v2/jobs/${jobId}/editor-state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence: sequenceRows }),
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(j.error || 'Error al guardar cortes')
      await load()
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function saveJsonAndReload() {
    setSaving(true)
    setError(null)
    try {
      const parsed = JSON.parse(rerenderJson) as GeminiSegmentAnalysisResult
      const res = await fetch(`/api/videos-v2/jobs/${jobId}/rerender`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gemini_analysis: parsed }),
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(j.error || 'JSON inválido o error al guardar')
      onSaved()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function rerenderOnly() {
    setRendering(true)
    setError(null)
    try {
      const res = await fetch(`/api/videos-v2/jobs/${jobId}/rerender`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(j.error || 'No se pudo iniciar el render')
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setRendering(false)
    }
  }

  function boundFor(segId: string) {
    return bounds.find((b) => b.segment_id === segId)
  }

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900"
      >
        <Pencil className="w-4 h-4" />
        {open ? 'Ocultar editor manual' : 'Editor manual (subtítulos y cortes)'}
      </button>

      <p className="text-xs text-gray-500 mt-2 max-w-prose leading-relaxed">
        Corrige texto de subtítulos (AssemblyAI) y los tiempos de cada corte dentro de los límites del mapa de segmentos.
        Si el color del resultado se ve lavado respecto al clip original, suele deberse a vídeo HDR (p. ej. .MOV de iPhone):
        prueba a subir una copia en <strong>MP4 H.264 SDR (Rec.709)</strong> y vuelve a procesar.
        Luego usa <strong>Re-renderizar</strong> para enviar otra vez a Creatomate. Abrir el mismo proyecto en el sitio web
        de Creatomate no lo expone la API; alternativas serían integrar su{' '}
        <a
          href="https://github.com/Creatomate/creatomate-preview"
          className="text-violet-600 underline"
          target="_blank"
          rel="noreferrer"
        >
          Preview SDK
        </a>{' '}
        en tu app si necesitas un timeline visual propio.
      </p>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['subtitles', 'clips', 'json'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  tab === t ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t === 'subtitles' ? 'Subtítulos' : t === 'clips' ? 'Cortes (duración)' : 'JSON avanzado'}
              </button>
            ))}
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
            </div>
          ) : (
            <>
              {tab === 'subtitles' && (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  <p className="text-xs text-gray-600">
                    {overrideActive
                      ? 'Usando subtítulos guardados manualmente. «Restaurar» vuelve al texto calculado desde AssemblyAI.'
                      : 'Texto generado automáticamente; al guardar se fija tu versión para los próximos renders.'}
                  </p>
                  {subtitleRows.map((row, idx) => (
                    <div
                      key={`${row.time}-${idx}`}
                      className="grid grid-cols-1 sm:grid-cols-[88px_88px_1fr] gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100"
                    >
                      <label className="text-[10px] font-bold text-gray-400 uppercase">
                        Inicio (s)
                        <input
                          type="number"
                          step="0.01"
                          readOnly
                          value={row.time}
                          className="mt-0.5 w-full text-xs border rounded-md px-2 py-1 bg-gray-100 text-gray-600"
                        />
                      </label>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">
                        Duración (s)
                        <input
                          type="number"
                          step="0.05"
                          min={0.12}
                          value={row.duration}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            setSubtitleRows((rows) =>
                              rows.map((r, i) =>
                                i === idx ? { ...r, duration: Number.isFinite(v) ? v : r.duration } : r
                              )
                            )
                          }}
                          className="mt-0.5 w-full text-xs border rounded-md px-2 py-1"
                        />
                      </label>
                      <label className="text-[10px] font-bold text-gray-400 uppercase sm:col-span-1 col-span-full">
                        Texto
                        <textarea
                          value={row.text}
                          onChange={(e) =>
                            setSubtitleRows((rows) =>
                              rows.map((r, i) => (i === idx ? { ...r, text: e.target.value } : r))
                            )
                          }
                          rows={2}
                          className="mt-0.5 w-full text-sm border rounded-md px-2 py-1.5"
                        />
                      </label>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveSubtitles()}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Guardar subtítulos
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void restoreSubtitlesFromTranscript()}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-200 text-gray-800 text-xs font-semibold hover:bg-gray-300 disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restaurar desde transcripción
                    </button>
                  </div>
                </div>
              )}

              {tab === 'clips' && (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  <p className="text-xs text-gray-600">
                    Ajusta inicio/fin de cada corte en segundos (se recortan automáticamente al rango del segmento en
                    AssemblyAI).
                  </p>
                  {sequenceRows.map((row, idx) => {
                    const b = boundFor(row.segment_id)
                    return (
                      <div
                        key={`${row.segment_id}-${idx}`}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs"
                      >
                        <div className="font-mono text-violet-700 font-bold">
                          {row.segment_id} · clip {row.clip_index}
                        </div>
                        <label className="block">
                          trim_start
                          <input
                            type="number"
                            step="0.05"
                            value={row.trim_start}
                            onChange={(e) => {
                              const v = Number(e.target.value)
                              setSequenceRows((rows) =>
                                rows.map((r, i) =>
                                  i === idx ? { ...r, trim_start: Number.isFinite(v) ? v : r.trim_start } : r
                                )
                              )
                            }}
                            className="mt-0.5 w-full border rounded-md px-2 py-1"
                          />
                          {b && (
                            <span className="text-[10px] text-gray-400">
                              min {b.min_start_s.toFixed(2)} — max {b.max_end_s.toFixed(2)}
                            </span>
                          )}
                        </label>
                        <label className="block">
                          trim_end
                          <input
                            type="number"
                            step="0.05"
                            value={row.trim_end}
                            onChange={(e) => {
                              const v = Number(e.target.value)
                              setSequenceRows((rows) =>
                                rows.map((r, i) =>
                                  i === idx ? { ...r, trim_end: Number.isFinite(v) ? v : r.trim_end } : r
                                )
                              )
                            }}
                            className="mt-0.5 w-full border rounded-md px-2 py-1"
                          />
                        </label>
                        <div className="text-gray-500 flex items-end">
                          duración actual: {(row.trim_end - row.trim_start).toFixed(2)}s
                        </div>
                      </div>
                    )
                  })}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveClips()}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Guardar cortes
                  </button>
                </div>
              )}

              {tab === 'json' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">
                    Edición cruda de <code className="bg-gray-100 px-1 rounded">gemini_analysis</code>. «Aplicar JSON»
                    solo valida y persiste vía re-render (usa el mismo flujo que antes).
                  </p>
                  <textarea
                    value={rerenderJson}
                    onChange={(e) => setRerenderJson(e.target.value)}
                    spellCheck={false}
                    className="w-full min-h-[200px] text-xs font-mono bg-gray-900 text-green-100 rounded-xl p-4 border border-gray-700"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveJsonAndReload()}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800 text-white text-xs font-semibold hover:bg-gray-900 disabled:opacity-50"
                  >
                    Aplicar JSON (dispara re-render)
                  </button>
                </div>
              )}
            </>
          )}

          <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-2 items-center">
            <button
              type="button"
              disabled={rendering || loading}
              onClick={() => void rerenderOnly()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {rendering ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Clapperboard className="w-4 h-4" />
              )}
              Re-renderizar video (Creatomate)
            </button>
            <span className="text-[11px] text-gray-500">
              Guarda antes los cambios en cada pestaña; este botón solo envía el estado actual del job a Creatomate.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
