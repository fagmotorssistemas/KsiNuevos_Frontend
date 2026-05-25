'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  KeyRound,
  Loader2,
  MessageSquareText,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import type { ScriptRow } from '@/components/marketing/ScriptCard'
import { AssignmentStatusBadge, GuionTipoBadge } from '@/components/marketing/badges'
import { ScriptGuionDetail } from '@/components/marketing/ScriptGuionDetail'
import {
  patchAssignmentRow,
  scriptsService,
} from '@/services/scripts.service'
import type {
  GeneratedScriptApi,
  ScriptAssignmentRow,
} from '@/types/script-assignment'
import {
  getAssignmentVehicleLabel,
  parseKeywordsInput,
} from '@/types/script-assignment'
type VehicleImage = { id: string; img_main_url: string | null; color: string | null }

function guionTipoForAssignment(
  assignment: ScriptAssignmentRow,
  scriptsByAssignment: Record<string, ScriptRow>
): string {
  const fromScript = scriptsByAssignment[assignment.assignment_id]?.guion_tipo
  return (fromScript ?? assignment.guion_tipo ?? '').trim()
}

function mapApiScriptToRow(
  script: GeneratedScriptApi,
  assignment: ScriptAssignmentRow,
  img?: VehicleImage | null
): ScriptRow {
  return {
    id: script.id,
    vendedor_id: assignment.vendedor_id,
    vendedor_nombre: assignment.vendedor_nombre,
    vehicle_id: assignment.vehicle_id,
    semana_tipo: null,
    guion_tipo: script.guion_tipo ?? assignment.guion_tipo,
    objecion_tipo: script.objecion_tipo ?? null,
    guion_titulo: script.guion_titulo ?? null,
    guion_objetivo: script.guion_objetivo ?? null,
    texto_hablado: script.texto_hablado ?? null,
    guion_escenas: script.guion_escenas,
    texto_guion: script.texto_guion ?? null,
    palabras_count: script.palabras_count ?? null,
    status: script.status ?? 'generado',
    facebook_post_id: null,
    fecha_generacion: null,
    fecha_publicacion: null,
    vehicle_data: script.vehicle ?? null,
    inventoryoracle: {
      brand: assignment.vehicle_marca,
      model: assignment.vehicle_modelo,
      year: assignment.vehicle_año,
      color: img?.color ?? null,
      img_main_url: img?.img_main_url ?? null,
    },
  }
}

function KeywordsEditor({
  assignmentId,
  initial,
  disabled,
  saving,
  onSave,
}: {
  assignmentId: string
  initial: string[]
  disabled: boolean
  saving: boolean
  onSave: (id: string, keywords: string[]) => Promise<void>
}) {
  const [text, setText] = useState(initial.join(', '))

  useEffect(() => {
    setText(initial.join(', '))
  }, [assignmentId, initial.join('|')])

  const parsed = useMemo(() => parseKeywordsInput(text), [text])
  const valid = parsed.length >= 4

  return (
    <div className="space-y-2">
      <label className="text-xs font-extrabold uppercase tracking-wide text-gray-500">
        Palabras clave (mín. 4, separadas por coma)
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled || saving}
        rows={2}
        placeholder="ej. trabajo, comodidad, 4x4, diésel"
        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-y min-h-[56px] disabled:bg-gray-50 disabled:text-gray-500"
      />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span
          className={`text-xs font-bold ${valid ? 'text-emerald-700' : 'text-amber-700'}`}
        >
          {parsed.length} / 4 palabras
        </span>
        <button
          type="button"
          disabled={disabled || saving || !valid}
          onClick={() => onSave(assignmentId, parsed)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-700 text-white text-xs font-bold hover:bg-violet-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <KeyRound className="h-3.5 w-3.5" />
          )}
          Guardar keywords
        </button>
      </div>
    </div>
  )
}

export function GuionesAssignmentsView({
  fecha,
  assignments,
  summary,
  loading,
  onReload,
}: {
  fecha: string
  assignments: ScriptAssignmentRow[]
  summary: {
    total: number
    pendiente_keywords: number
    keywords_recibidos: number
    guion_generado: number
  }
  loading: boolean
  onReload: () => void
}) {
  const { user } = useAuth()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [savingKeywordsId, setSavingKeywordsId] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [rows, setRows] = useState(assignments)
  const [scriptsByAssignment, setScriptsByAssignment] = useState<
    Record<string, ScriptRow>
  >({})
  const [scriptsLoadError, setScriptsLoadError] = useState<string | null>(null)
  const [loadingScripts, setLoadingScripts] = useState(false)
  const [vehicleImages, setVehicleImages] = useState<Record<string, VehicleImage>>({})

  useEffect(() => {
    setRows(assignments)
    setScriptsByAssignment({})
    setScriptsLoadError(null)
    setSelectedId((prev) => {
      if (prev && assignments.some((a) => a.assignment_id === prev)) return prev
      const generated = assignments.find((a) => a.status === 'guion_generado')
      return generated?.assignment_id ?? assignments[0]?.assignment_id ?? null
    })
  }, [assignments])

  const { supabase } = useAuth()

  const loadGeneratedScripts = useCallback(async () => {
    const ids = rows
      .filter((r) => r.status === 'guion_generado')
      .map((r) => r.assignment_id)
    if (ids.length === 0) {
      setScriptsLoadError(null)
      return
    }

    setLoadingScripts(true)
    setScriptsLoadError(null)
    try {
      const data = await scriptsService.fetchScriptsByAssignmentIds(ids)
      const map: Record<string, ScriptRow> = {}
      for (const script of data) {
        const aid = script.assignment_id
        if (!aid) continue
        const row = rows.find((r) => r.assignment_id === aid)
        if (!row) continue
        map[aid] = {
          ...script,
          vendedor_nombre: row.vendedor_nombre,
          inventoryoracle: script.inventoryoracle ?? {
            brand: row.vehicle_marca,
            model: row.vehicle_modelo,
            year: row.vehicle_año,
            color: vehicleImages[row.vehicle_id]?.color ?? null,
            img_main_url: vehicleImages[row.vehicle_id]?.img_main_url ?? null,
          },
        }
      }
      setScriptsByAssignment(map)
      if (Object.keys(map).length === 0) {
        setScriptsLoadError(
          'No se encontró el guión en la base de datos. Recarga la página o contacta soporte.'
        )
      }
    } catch (e) {
      setScriptsLoadError(
        e instanceof Error ? e.message : 'Error al cargar guiones generados'
      )
    } finally {
      setLoadingScripts(false)
    }
  }, [rows, vehicleImages])

  useEffect(() => {
    if (!supabase || rows.length === 0) return
    const vehicleIds = [...new Set(rows.map((r) => r.vehicle_id))]
    ;(supabase as unknown as { from: (t: string) => any })
      .from('inventoryoracle')
      .select('id, img_main_url, color')
      .in('id', vehicleIds)
      .then(({ data }: { data: VehicleImage[] | null }) => {
        const map: Record<string, VehicleImage> = {}
        for (const v of data ?? []) map[v.id] = v
        setVehicleImages(map)
      })
  }, [supabase, rows])

  useEffect(() => {
    loadGeneratedScripts()
  }, [loadGeneratedScripts])

  const groups = useMemo(() => {
    const map = new Map<string, ScriptAssignmentRow[]>()
    for (const r of rows) {
      const name = r.vendedor_nombre.trim() || 'Sin vendedor'
      map.set(name, [...(map.get(name) ?? []), r])
    }
    return Array.from(map.entries()).map(([vendedorNombre, items]) => ({
      vendedorNombre,
      items,
    }))
  }, [rows])

  const selected = rows.find((r) => r.assignment_id === selectedId) ?? null
  const selectedScript = selectedId ? scriptsByAssignment[selectedId] : null
  const img = selected ? vehicleImages[selected.vehicle_id] : null

  const handleSaveKeywords = async (assignmentId: string, keywords: string[]) => {
    setSavingKeywordsId(assignmentId)
    try {
      const res = await scriptsService.submitKeywords(
        assignmentId,
        keywords,
        user?.id
      )
      setRows((prev) =>
        patchAssignmentRow(prev, assignmentId, {
          palabras_clave: res.palabras_clave,
          status: res.status,
          guion_tipo: res.guion_tipo,
          palabras_clave_at: new Date().toISOString(),
        })
      )
      toast.success('Keywords guardadas')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar keywords')
    } finally {
      setSavingKeywordsId(null)
    }
  }

  const runGenerate = async (assignmentId: string, opts?: { silent?: boolean }) => {
    const res = await scriptsService.generateForAssignment(assignmentId)
    const assignment = rows.find((r) => r.assignment_id === assignmentId)
    const apiScript = res.scripts[0]
    if (assignment && apiScript) {
      setScriptsByAssignment((prev) => ({
        ...prev,
        [assignmentId]: mapApiScriptToRow(
          apiScript,
          assignment,
          vehicleImages[assignment.vehicle_id]
        ),
      }))
    }
    setRows((prev) =>
      patchAssignmentRow(prev, assignmentId, { status: 'guion_generado' })
    )
    if (!opts?.silent) toast.success('Guión generado')
  }

  const handleGenerate = async (assignmentId: string) => {
    setGeneratingId(assignmentId)
    try {
      await runGenerate(assignmentId)
      onReload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar guión')
    } finally {
      setGeneratingId(null)
    }
  }

  const handleGenerateAll = async () => {
    const pending = rows.filter((r) => r.status === 'keywords_recibidos')
    if (pending.length === 0) {
      toast.message('No hay assignments listos para generar (status: keywords listas)')
      return
    }
    setGeneratingAll(true)
    let ok = 0
    try {
      for (const a of pending) {
        setGeneratingId(a.assignment_id)
        await runGenerate(a.assignment_id, { silent: true })
        ok++
      }
      toast.success(`${ok} guión(es) generado(s)`)
      onReload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar guiones')
    } finally {
      setGeneratingId(null)
      setGeneratingAll(false)
    }
  }

  const canGenerate =
    selected &&
    selected.status !== 'guion_generado' &&
    selected.status !== 'descartado'
  const readyCount = rows.filter((r) => r.status === 'keywords_recibidos').length

  if (rows.length === 0 && !loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
        No hay asignaciones para el {fecha}. El cron crea vehículos de domingo a jueves
        para el día siguiente hábil.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
        <div className="flex flex-wrap gap-2 text-xs font-bold text-gray-600">
          <span className="px-2.5 py-1 rounded-lg bg-gray-100">{summary.total} total</span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800">
            {summary.pendiente_keywords} pendientes
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-violet-50 text-violet-800">
            {summary.keywords_recibidos} listas
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800">
            {summary.guion_generado} generados
          </span>
        </div>
        <button
          type="button"
          disabled={generatingAll || readyCount === 0 || loading}
          onClick={handleGenerateAll}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50"
        >
          {generatingAll ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Generar todos ({readyCount})
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 min-h-[520px]">
        <aside className="lg:w-[300px] xl:w-[340px] shrink-0 flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden max-h-[70vh] lg:max-h-[calc(100vh-12rem)]">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-extrabold uppercase tracking-wide text-gray-500">
              Asignaciones
            </p>
            <p className="text-sm font-bold text-gray-800 mt-0.5">{fecha}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {groups.map((g) => (
              <div key={g.vendedorNombre}>
                <p className="px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide text-gray-500 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                  {g.vendedorNombre}
                </p>
                <ul className="space-y-1 mt-1">
                  {g.items.map((a) => {
                    const active = a.assignment_id === selectedId
                    const vehicle = getAssignmentVehicleLabel(a)
                    return (
                      <li key={a.assignment_id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(a.assignment_id)}
                          className={[
                            'w-full text-left rounded-xl px-3 py-2.5 border transition-all',
                            active
                              ? 'border-violet-700 bg-violet-50 shadow-sm ring-1 ring-violet-700/30'
                              : 'border-transparent hover:border-gray-200 hover:bg-gray-50',
                          ].join(' ')}
                        >
                          <p className="text-sm font-extrabold text-gray-900 line-clamp-2">
                            {vehicle}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <GuionTipoBadge
                              tipo={guionTipoForAssignment(a, scriptsByAssignment)}
                              objecionTipo={
                                scriptsByAssignment[a.assignment_id]?.objecion_tipo
                              }
                            />
                            <AssignmentStatusBadge status={a.status} />
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col max-h-[70vh] lg:max-h-[calc(100vh-12rem)]">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-gray-500">
              <MessageSquareText className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-semibold">Elige una asignación</p>
            </div>
          ) : (
            <>
              <div className="shrink-0 border-b border-gray-100 p-4 sm:p-5 flex flex-wrap items-start gap-4 bg-gradient-to-r from-white to-violet-50/30">
                <div className="h-24 w-32 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                  {img?.img_main_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.img_main_url}
                      alt={getAssignmentVehicleLabel(selected)}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <MessageSquareText className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-lg font-extrabold text-gray-900">
                    {getAssignmentVehicleLabel(selected)}
                  </p>
                  <p className="text-sm text-gray-600">{selected.vendedor_nombre}</p>
                  <div className="flex flex-wrap gap-2">
                    <GuionTipoBadge
                      tipo={guionTipoForAssignment(selected, scriptsByAssignment)}
                      objecionTipo={selectedScript?.objecion_tipo}
                    />
                    <AssignmentStatusBadge status={selected.status} />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {selected.status !== 'guion_generado' && selected.status !== 'descartado' && (
                  <KeywordsEditor
                    assignmentId={selected.assignment_id}
                    initial={selected.palabras_clave}
                    disabled={false}
                    saving={savingKeywordsId === selected.assignment_id}
                    onSave={handleSaveKeywords}
                  />
                )}

                {selected.palabras_clave.length > 0 && selected.status === 'guion_generado' && (
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <span className="font-bold">Keywords: </span>
                      {selected.palabras_clave.join(' · ')}
                    </p>
                    {selectedScript?.palabras_count != null && (
                      <p>
                        <span className="font-bold">Palabras: </span>
                        {selectedScript.palabras_count}
                      </p>
                    )}
                  </div>
                )}

                {canGenerate && (
                  <button
                    type="button"
                    disabled={generatingId === selected.assignment_id}
                    onClick={() => handleGenerate(selected.assignment_id)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {generatingId === selected.assignment_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    Generar guión
                  </button>
                )}

                {selectedScript ? (
                  <div className="border-t border-gray-100 pt-6">
                    <ScriptGuionDetail script={selectedScript} />
                  </div>
                ) : selected.status === 'guion_generado' ? (
                  <div className="text-sm text-gray-500">
                    {loadingScripts ? (
                      <p className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando guión…
                      </p>
                    ) : scriptsLoadError ? (
                      <p className="text-red-700 font-semibold">{scriptsLoadError}</p>
                    ) : (
                      <p>No se pudo cargar el detalle del guión.</p>
                    )}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
