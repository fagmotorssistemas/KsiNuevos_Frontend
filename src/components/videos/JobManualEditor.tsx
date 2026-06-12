'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Clapperboard, Loader2, Pencil, RotateCcw, Save, X } from 'lucide-react'
import type { SequenceItem, SubtitleBlock } from '@/lib/videos/segmenter'
import type { GeminiSegmentAnalysisResult } from '@/lib/videos/types'
import { MusicSelector } from './MusicSelector'
import { MusicTrimStartField } from './MusicTrimStartField'

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

type SubtitleSaveUi = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  jobId: string
  onSaved: () => void
}

function subtitleRowsSignature(rows: SubtitleBlock[]): string {
  return JSON.stringify(
    rows.map((r) => ({
      time: r.time,
      duration: r.duration,
      text: r.text,
    }))
  )
}

const SUBTITLE_AUTOSAVE_MS = 600

export function JobManualEditor({ jobId, onSaved }: Props) {
  const onSavedRef = useRef(onSaved)
  useEffect(() => {
    onSavedRef.current = onSaved
  }, [onSaved])

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
  const [changeMusicOnRerender, setChangeMusicOnRerender] = useState(false)
  const [rerenderMusicId, setRerenderMusicId] = useState<string | null>(null)
  const [rerenderMusicUrl, setRerenderMusicUrl] = useState<string | null>(null)
  const [rerenderMusicDurationSec, setRerenderMusicDurationSec] = useState<number | null>(null)
  const [rerenderMusicTrimMode, setRerenderMusicTrimMode] = useState<'smart' | 'manual'>('smart')
  const [rerenderMusicTrimStartSec, setRerenderMusicTrimStartSec] = useState(0)
  const [subtitleSaveUi, setSubtitleSaveUi] = useState<SubtitleSaveUi>('idle')
  const subtitleRowsRef = useRef<SubtitleBlock[]>([])
  const lastPersistedSubtitleSig = useRef('')

  useEffect(() => {
    subtitleRowsRef.current = subtitleRows
  }, [subtitleRows])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/videos/jobs/${jobId}/editor-state`)
      const data = (await res.json()) as EditorStateResponse & { error?: string }
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar el editor')
      const normalized = data.subtitle_blocks_effective.map((b) => ({
        time: b.time,
        duration: b.duration,
        text: b.text,
      }))
      lastPersistedSubtitleSig.current = subtitleRowsSignature(normalized)
      setSubtitleRows(normalized)
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

  /** Persiste subtítulos actuales (ref) en Supabase. `notifyParent` tras restaurar o acciones explícitas. */
  const persistSubtitlesToServer = useCallback(
    async (notifyParent: boolean) => {
      const rows = subtitleRowsRef.current
      if (rows.length === 0) return
      setSaving(true)
      setSubtitleSaveUi('saving')
      setError(null)
      try {
        const res = await fetch(`/api/videos/jobs/${jobId}/editor-state`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subtitle_blocks_override: rows }),
        })
        const j = (await res.json()) as { error?: string }
        if (!res.ok) throw new Error(j.error || 'Error al guardar subtítulos')
        lastPersistedSubtitleSig.current = subtitleRowsSignature(rows)
        setOverrideActive(true)
        setSubtitleSaveUi('saved')
        if (notifyParent) void onSavedRef.current()
      } catch (e) {
        setSubtitleSaveUi('error')
        setError(e instanceof Error ? e.message : 'Error')
      } finally {
        setSaving(false)
      }
    },
    [jobId]
  )

  useEffect(() => {
    if (!open || loading) return
    if (subtitleRows.length === 0) return
    const sig = subtitleRowsSignature(subtitleRows)
    if (sig === lastPersistedSubtitleSig.current) return
    const t = window.setTimeout(() => {
      void persistSubtitlesToServer(false)
    }, SUBTITLE_AUTOSAVE_MS)
    return () => window.clearTimeout(t)
  }, [subtitleRows, open, loading, persistSubtitlesToServer])

  useEffect(() => {
    if (subtitleSaveUi !== 'saved') return
    const t = window.setTimeout(() => setSubtitleSaveUi('idle'), 2200)
    return () => window.clearTimeout(t)
  }, [subtitleSaveUi])

  async function restoreSubtitlesFromTranscript() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/videos/jobs/${jobId}/editor-state`, {
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
      const res = await fetch(`/api/videos/jobs/${jobId}/editor-state`, {
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
      const res = await fetch(`/api/videos/jobs/${jobId}/rerender`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gemini_analysis: parsed,
          ...(subtitleRows.length > 0 ? { subtitle_blocks_override: subtitleRows } : {}),
          ...(changeMusicOnRerender && rerenderMusicId ? { music_track_id: rerenderMusicId } : {}),
          ...(changeMusicOnRerender
            ? {
                music_trim_start_sec:
                  rerenderMusicTrimMode === 'manual' ? rerenderMusicTrimStartSec : null,
              }
            : {}),
        }),
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
      const res = await fetch(`/api/videos/jobs/${jobId}/rerender`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          {
            ...(subtitleRows.length > 0 ? { subtitle_blocks_override: subtitleRows } : {}),
            ...(changeMusicOnRerender && rerenderMusicId ? { music_track_id: rerenderMusicId } : {}),
            ...(changeMusicOnRerender
              ? {
                  music_trim_start_sec:
                    rerenderMusicTrimMode === 'manual' ? rerenderMusicTrimStartSec : null,
                }
              : {}),
          }
        ),
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
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
      >
        <Pencil className="w-4 h-4" />
        Edición manual
      </button>

      <p className="text-xs text-gray-500 mt-2 max-w-prose leading-relaxed">
        Abre el modal para editar subtítulos, cortes y volver a renderizar el video con la configuración actual.
      </p>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-base font-bold text-gray-900">Edición manual del job</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ajusta subtítulos, cortes y relanza render sin rehacer transcripción ni análisis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 inline-flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
                aria-label="Cerrar editor manual"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-78px)]">
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
                          : 'Texto generado automáticamente; los cambios se guardan solos al poco tiempo de editar.'}
                      </p>
                      <p className="text-[11px] text-gray-500 flex flex-wrap items-center gap-2">
                        {subtitleSaveUi === 'saving' && (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-600" />
                            Guardando subtítulos…
                          </>
                        )}
                        {subtitleSaveUi === 'saved' && (
                          <span className="text-emerald-600 font-medium">Subtítulos guardados en el servidor.</span>
                        )}
                        {subtitleSaveUi === 'error' && (
                          <span className="text-red-600 font-medium">No se pudo guardar; revisa el mensaje de error arriba.</span>
                        )}
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
                        dispara re-render y también envía los subtítulos actuales de la pestaña Subtítulos para no perder
                        ediciones.
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
                <div className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-3">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={changeMusicOnRerender}
                      onChange={(e) => {
                        const on = e.target.checked
                        setChangeMusicOnRerender(on)
                        if (!on) {
                          setRerenderMusicId(null)
                          setRerenderMusicUrl(null)
                          setRerenderMusicDurationSec(null)
                          setRerenderMusicTrimMode('smart')
                          setRerenderMusicTrimStartSec(0)
                        }
                      }}
                    />
                    Cambiar música en el próximo re-render
                  </label>
                  {changeMusicOnRerender && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-gray-500">
                        Selecciona un track. Se re-renderiza el mismo job con la nueva música, sin rehacer transcripción ni análisis.
                      </p>
                      <MusicSelector
                        selectedId={rerenderMusicId}
                        onSelect={(track) => {
                          setRerenderMusicId(track.id)
                          setRerenderMusicUrl(track.public_url)
                          const dur = track.duration_seconds
                          if (typeof dur === 'number' && Number.isFinite(dur) && dur > 0) {
                            setRerenderMusicDurationSec(dur)
                            setRerenderMusicTrimStartSec((prev) => Math.max(0, Math.min(prev, Math.max(0, dur - 1))))
                          } else {
                            setRerenderMusicDurationSec(null)
                            setRerenderMusicTrimStartSec(0)
                          }
                        }}
                      />
                      {rerenderMusicId && (
                        <div className="space-y-2">
                          <p className="text-[11px] text-emerald-700">
                            Nuevo track listo para aplicar en re-render.
                          </p>
                          <div className="rounded-lg border border-violet-200/70 bg-white p-3 space-y-2">
                            <p className="text-xs font-semibold text-gray-800">Inicio de la música para este re-render</p>
                            <label className="flex items-start gap-2.5 cursor-pointer">
                              <input
                                type="radio"
                                name="rerender-music-trim-mode"
                                className="mt-1"
                                checked={rerenderMusicTrimMode === 'smart'}
                                onChange={() => setRerenderMusicTrimMode('smart')}
                              />
                              <span className="text-xs text-gray-700">
                                <span className="font-medium">Automático</span>
                                <span className="text-gray-500"> — Busca una parte más fuerte de la canción.</span>
                              </span>
                            </label>
                            <label className="flex items-start gap-2.5 cursor-pointer">
                              <input
                                type="radio"
                                name="rerender-music-trim-mode"
                                className="mt-1"
                                checked={rerenderMusicTrimMode === 'manual'}
                                onChange={() => setRerenderMusicTrimMode('manual')}
                              />
                              <span className="text-xs text-gray-700">
                                <span className="font-medium">Manual</span>
                                <span className="text-gray-500"> — Tú eliges desde qué segundo iniciar.</span>
                              </span>
                            </label>

                            {rerenderMusicTrimMode === 'manual' && (
                              <div className="space-y-2 rounded-lg border border-violet-200/70 bg-violet-50/40 p-2.5">
                                <MusicTrimStartField
                                  valueSec={rerenderMusicTrimStartSec}
                                  maxSec={Math.max(0, (rerenderMusicDurationSec ?? 300) - 1)}
                                  disabled={rerenderMusicDurationSec == null}
                                  onChangeSec={setRerenderMusicTrimStartSec}
                                  labelClassName="text-[11px] font-medium text-gray-700"
                                  inputClassName="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-center font-mono tabular-nums"
                                />
                                {rerenderMusicUrl && (
                                  <audio
                                    controls
                                    src={rerenderMusicUrl}
                                    className="w-full"
                                    onCanPlay={(e) => {
                                      const el = e.currentTarget
                                      const t = Math.max(0, rerenderMusicTrimStartSec)
                                      if (Math.abs(el.currentTime - t) > 0.25) {
                                        try {
                                          el.currentTime = t
                                        } catch {
                                          // Algunos navegadores bloquean seek temprano.
                                        }
                                      }
                                    }}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={rendering || loading || (changeMusicOnRerender && !rerenderMusicId)}
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
                  Los subtítulos se guardan solos al editar. Los cortes siguen requiriendo «Guardar cortes». Este botón
                  envía a Creatomate el análisis en BD y, si hay filas de subtítulos cargadas, también las persiste antes
                  del render. Si activas “Cambiar música”, también actualiza la pista de fondo del job.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
