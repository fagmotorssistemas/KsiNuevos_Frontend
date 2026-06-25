'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
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
import { getAssignmentVehicleLabel } from '@/types/script-assignment'
type VehicleImage = { id: string; img_main_url: string | null; color: string | null }

const GUION_TIPO_ORDER = ['informativo', 'educativo', 'venta', 'frio', 'comparacion', 'objecion']

function sortScriptsForAssignment(
  scripts: ScriptRow[],
  assignmentTipo: string | null | undefined
): ScriptRow[] {
  const primary = (assignmentTipo ?? '').trim().toLowerCase()
  return [...scripts].sort((a, b) => {
    const ta = (a.guion_tipo ?? '').trim().toLowerCase()
    const tb = (b.guion_tipo ?? '').trim().toLowerCase()
    if (primary) {
      if (ta === primary && tb !== primary) return -1
      if (tb === primary && ta !== primary) return 1
    }
    const ia = GUION_TIPO_ORDER.indexOf(ta)
    const ib = GUION_TIPO_ORDER.indexOf(tb)
    const ra = ia === -1 ? 99 : ia
    const rb = ib === -1 ? 99 : ib
    if (ra !== rb) return ra - rb
    return ta.localeCompare(tb)
  })
}

function scriptTiposForAssignment(
  assignment: ScriptAssignmentRow,
  scripts: ScriptRow[]
): string[] {
  const primary = (assignment.guion_tipo ?? '').trim().toLowerCase()
  const tipos = new Set<string>()
  if (assignment.guion_tipo?.trim()) tipos.add(assignment.guion_tipo.trim())
  for (const s of scripts) {
    const t = (s.guion_tipo ?? '').trim()
    if (t) tipos.add(t)
  }
  return [...tipos].sort((a, b) => {
    const al = a.toLowerCase()
    const bl = b.toLowerCase()
    if (primary) {
      if (al === primary && bl !== primary) return -1
      if (bl === primary && al !== primary) return 1
    }
    const ia = GUION_TIPO_ORDER.indexOf(al)
    const ib = GUION_TIPO_ORDER.indexOf(bl)
    const ra = ia === -1 ? 99 : ia
    const rb = ib === -1 ? 99 : ib
    if (ra !== rb) return ra - rb
    return al.localeCompare(bl)
  })
}

function enrichScriptRow(
  script: ScriptRow & { assignment_id?: string | null },
  row: ScriptAssignmentRow,
  vehicleImages: Record<string, VehicleImage>
): ScriptRow {
  return {
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

function mergeScriptRows(existing: ScriptRow[], incoming: ScriptRow[]): ScriptRow[] {
  const byId = new Map<string, ScriptRow>()
  for (const s of existing) byId.set(s.id, s)
  for (const s of incoming) byId.set(s.id, s)
  return [...byId.values()]
}

/** Asignación marcada generada pero sin filas en video_scripts (guión borrado). */
function isMissingGeneratedScript(
  assignment: ScriptAssignmentRow,
  scripts: ScriptRow[],
  loadingScripts: boolean
): boolean {
  return (
    assignment.status === 'guion_generado' &&
    !loadingScripts &&
    scripts.length === 0
  )
}

function effectiveAssignmentStatus(
  assignment: ScriptAssignmentRow,
  scripts: ScriptRow[],
  loadingScripts: boolean
): ScriptAssignmentRow['status'] {
  if (!isMissingGeneratedScript(assignment, scripts, loadingScripts)) {
    return assignment.status
  }
  return assignment.palabras_clave.length >= 4 ? 'keywords_recibidos' : 'pendiente_keywords'
}

function guionTipoTabLabel(tipo: string | null | undefined): string {
  const t = (tipo ?? 'Guión').trim()
  if (!t) return 'Guión'
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function AssignmentScriptsTabs({
  scripts,
  activeId,
  onSelect,
}: {
  scripts: ScriptRow[]
  activeId: string
  onSelect: (id: string) => void
}) {
  if (scripts.length <= 1) return null

  return (
    <div
      className="flex flex-wrap gap-1 border-b border-gray-200"
      role="tablist"
      aria-label="Guiones de la asignación"
    >
      {scripts.map((script) => {
        const active = script.id === activeId
        return (
          <button
            key={script.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(script.id)}
            className={[
              'px-4 py-2.5 text-sm font-bold rounded-t-xl border border-b-0 transition-colors',
              active
                ? 'bg-white border-gray-200 text-violet-800 -mb-px relative z-10'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50',
            ].join(' ')}
          >
            {guionTipoTabLabel(script.guion_tipo)}
          </button>
        )
      })}
    </div>
  )
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [rows, setRows] = useState(assignments)
  const [scriptsByAssignment, setScriptsByAssignment] = useState<
    Record<string, ScriptRow[]>
  >({})
  const [scriptsLoadError, setScriptsLoadError] = useState<string | null>(null)
  const [loadingScripts, setLoadingScripts] = useState(false)
  const [vehicleImages, setVehicleImages] = useState<Record<string, VehicleImage>>({})
  const [activeScriptId, setActiveScriptId] = useState<string | null>(null)

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
      const map: Record<string, ScriptRow[]> = {}
      for (const script of data) {
        const aid = script.assignment_id
        if (!aid) continue
        const row = rows.find((r) => r.assignment_id === aid)
        if (!row) continue
        const enriched = enrichScriptRow(script, row, vehicleImages)
        if (!map[aid]) map[aid] = []
        if (!map[aid].some((s) => s.id === enriched.id)) {
          map[aid].push(enriched)
        }
      }
      for (const aid of Object.keys(map)) {
        const assignment = rows.find((r) => r.assignment_id === aid)
        map[aid] = sortScriptsForAssignment(map[aid]!, assignment?.guion_tipo)
      }
      setScriptsByAssignment(map)
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
  const selectedScripts = selectedId ? (scriptsByAssignment[selectedId] ?? []) : []
  const img = selected ? vehicleImages[selected.vehicle_id] : null

  const selectedScriptIdsKey = selectedScripts.map((s) => s.id).join(',')

  useEffect(() => {
    if (!selectedScriptIdsKey) {
      setActiveScriptId(null)
      return
    }
    const ids = selectedScriptIdsKey.split(',')
    setActiveScriptId((prev) => {
      if (prev && ids.includes(prev)) return prev
      return ids[0]!
    })
  }, [selectedId, selectedScriptIdsKey])

  const activeScript =
    selectedScripts.find((s) => s.id === activeScriptId) ?? selectedScripts[0] ?? null

  const selectedScriptMissing =
    selected != null &&
    isMissingGeneratedScript(selected, selectedScripts, loadingScripts)
  const selectedEffectiveStatus = selected
    ? effectiveAssignmentStatus(selected, selectedScripts, loadingScripts)
    : null

  const runGenerate = async (assignmentId: string, opts?: { silent?: boolean }) => {
    const res = await scriptsService.generateForAssignment(assignmentId)
    const assignment = rows.find((r) => r.assignment_id === assignmentId)
    if (assignment && res.scripts.length > 0) {
      const incoming = res.scripts.map((apiScript) =>
        mapApiScriptToRow(apiScript, assignment, vehicleImages[assignment.vehicle_id])
      )
      setScriptsByAssignment((prev) => ({
        ...prev,
        [assignmentId]: sortScriptsForAssignment(
          mergeScriptRows(prev[assignmentId] ?? [], incoming),
          assignment.guion_tipo
        ),
      }))
    }
    setRows((prev) =>
      patchAssignmentRow(prev, assignmentId, { status: 'guion_generado' })
    )
    const count = res.scripts.length
    if (!opts?.silent) {
      toast.success(count > 1 ? `${count} guiones generados` : 'Guión generado')
    }
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
    selected != null &&
    selectedEffectiveStatus !== 'guion_generado' &&
    selectedEffectiveStatus !== 'descartado' &&
    (selectedEffectiveStatus !== 'keywords_recibidos' ||
      selected.palabras_clave.length >= 4)
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
        <aside className="lg:w-[300px] xl:w-[340px] shrink-0 flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-extrabold uppercase tracking-wide text-gray-500">
              Asignaciones
            </p>
            <p className="text-sm font-bold text-gray-800 mt-0.5">{fecha}</p>
          </div>
          <div className="p-2 space-y-4">
            {groups.map((g) => (
              <div key={g.vendedorNombre}>
                <p className="px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide text-gray-500 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                  {g.vendedorNombre}
                </p>
                <ul className="space-y-1 mt-1">
                  {g.items.map((a) => {
                    const active = a.assignment_id === selectedId
                    const vehicle = getAssignmentVehicleLabel(a)
                    const scripts = scriptsByAssignment[a.assignment_id] ?? []
                    const tipos = scriptTiposForAssignment(a, scripts)
                    const displayStatus = effectiveAssignmentStatus(a, scripts, loadingScripts)
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
                            {tipos.map((tipo) => (
                              <GuionTipoBadge
                                key={tipo}
                                tipo={tipo}
                                objecionTipo={
                                  scripts.find((s) => s.guion_tipo === tipo)?.objecion_tipo
                                }
                              />
                            ))}
                            {scripts.length > 1 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                {scripts.length} guiones
                              </span>
                            )}
                            <AssignmentStatusBadge status={displayStatus} />
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

        <main className="flex-1 min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
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
                    {scriptTiposForAssignment(selected, selectedScripts).map((tipo) => (
                      <GuionTipoBadge
                        key={tipo}
                        tipo={tipo}
                        objecionTipo={
                          selectedScripts.find((s) => s.guion_tipo === tipo)?.objecion_tipo
                        }
                      />
                    ))}
                    {selectedScripts.length > 1 && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {selectedScripts.length} guiones
                      </span>
                    )}
                    <AssignmentStatusBadge status={selectedEffectiveStatus ?? selected.status} />
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-6">
                {selected.palabras_clave.length > 0 &&
                  selectedEffectiveStatus === 'guion_generado' &&
                  !selectedScriptMissing && (
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <span className="font-bold">Keywords: </span>
                      {selected.palabras_clave.join(' · ')}
                    </p>
                    {activeScript?.palabras_count != null && (
                      <p>
                        <span className="font-bold capitalize">
                          {guionTipoTabLabel(activeScript.guion_tipo)}:{' '}
                        </span>
                        {activeScript.palabras_count} palabras
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

                {activeScript ? (
                  <div className="border-t border-gray-100 pt-4 min-w-0 flex flex-col min-h-0">
                    <AssignmentScriptsTabs
                      scripts={selectedScripts}
                      activeId={activeScript.id}
                      onSelect={setActiveScriptId}
                    />
                    <div className="pt-6 min-w-0" role="tabpanel">
                      <ScriptGuionDetail
                        script={activeScript}
                        vehiculoLabel={selected ? getAssignmentVehicleLabel(selected) : undefined}
                      />
                    </div>
                  </div>
                ) : selectedScripts.length > 0 ? null : selected.status === 'guion_generado' &&
                  !selectedScriptMissing ? (
                  <div className="text-sm space-y-3">
                    {loadingScripts ? (
                      <p className="flex items-center gap-2 text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando guión…
                      </p>
                    ) : scriptsLoadError ? (
                      <p className="text-red-700 font-semibold">{scriptsLoadError}</p>
                    ) : (
                      <p className="text-gray-500">No se pudo cargar el detalle del guión.</p>
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
