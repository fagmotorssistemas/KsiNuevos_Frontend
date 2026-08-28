'use client'

import { useState } from 'react'
import { Loader2, Search, X, Car, User, Building2, Scale, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import type {
  UnifiedConsultaResult,
  UnifiedSection,
} from '@/lib/inventario/consultaUnificada.types'
import { UNIFIED_API_CATALOG } from '@/lib/inventario/consultaUnificada.catalog'

function statusClass(status: UnifiedSection['status']) {
  if (status === 'ok') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (status === 'empty') return 'bg-slate-50 text-slate-600 border-slate-200'
  if (status === 'skipped') return 'bg-amber-50 text-amber-800 border-amber-200'
  return 'bg-red-50 text-red-700 border-red-200'
}

function statusLabel(status: UnifiedSection['status']) {
  if (status === 'ok') return 'Con datos'
  if (status === 'empty') return 'Sin registros'
  if (status === 'skipped') return 'No consultado'
  return 'Error'
}

function SectionCard({ section }: { section: UnifiedSection }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">{section.title}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{section.source}</p>
        </div>
        <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusClass(section.status)}`}>
          {statusLabel(section.status)}
        </span>
      </div>
      {section.error ? <p className="mt-2 text-sm text-red-700">{section.error}</p> : null}
      {section.summary ? <p className="mt-2 text-sm text-slate-700">{section.summary}</p> : null}
      {section.facts.length > 0 ? (
        <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          {section.facts.map((fact, index) => (
            <div key={`${section.id}-${index}-${fact.label}`} className="min-w-0">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {fact.label}
                {fact.origin ? <span className="normal-case font-medium text-slate-400"> · {fact.origin}</span> : null}
              </dt>
              <dd className="text-sm text-slate-900 break-words">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {section.rows.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {section.rows.map((row, index) => (
            <li key={`${row.title}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold text-slate-900">{row.title}</p>
              {row.subtitle ? <p className="text-[11px] text-slate-500 mt-0.5">{row.subtitle}</p> : null}
              {row.facts.length > 0 ? (
                <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
                  {row.facts.map((fact, factIndex) => (
                    <div key={`${fact.label}-${factIndex}`}>
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{fact.label}</dt>
                      <dd className="text-xs text-slate-800 break-words">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {row.rawJson ? (
                <details className="mt-2">
                  <summary className="text-[11px] font-semibold text-violet-800 cursor-pointer">JSON completo del proceso</summary>
                  <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-900 text-slate-100 text-[10px] leading-relaxed p-2 max-h-56">
                    {row.rawJson}
                  </pre>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export function ConsultaUnificadaDialog({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UnifiedConsultaResult | null>(null)
  const [showCatalog, setShowCatalog] = useState(true)

  const run = async () => {
    const value = query.trim()
    if (!value) {
      toast.error('Escribe una placa, cédula o RUC')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/inventario/consulta-unificada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: value }),
      })
      const body = (await res.json()) as { data?: UnifiedConsultaResult; error?: string }
      if (!res.ok || !body.data) throw new Error(body.error || 'No se pudo consultar')
      setResult(body.data)
      setShowCatalog(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo consultar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Consulta unificada</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Placa, cédula o RUC. Junta EcuadorAPI y Consultas.ec: vehículo, propietario, SRI, juicios y multas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-white"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          className="shrink-0 flex flex-col sm:flex-row gap-2 p-4 border-b border-slate-100"
          onSubmit={(event) => {
            event.preventDefault()
            void run()
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value.toUpperCase())}
              placeholder="GSD6473 · 1710034065 · 0990480923001"
              className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? 'Consultando fuentes…' : 'Consultar'}
          </button>
        </form>

        <div className="overflow-y-auto flex-1 min-h-0 p-4 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setShowCatalog((open) => !open)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
            >
              <span className="text-sm font-bold text-slate-900">Datos que pueden traer las APIs</span>
              {showCatalog ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
            </button>
            {showCatalog ? (
              <div className="px-4 pb-4 space-y-4">
                <p className="text-xs text-slate-500">
                  Lista completa de campos documentados. En cada consulta solo se muestran una vez los que coinciden entre EcuadorAPI y Consultas.ec. Los juicios salen de Función Judicial (Consultas.ec), que EcuadorAPI no cubre.
                </p>
                {UNIFIED_API_CATALOG.map((group) => (
                  <div key={`${group.source}-${group.title}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{group.source}</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{group.title}</p>
                    {group.note ? <p className="text-[11px] text-slate-600 mt-1">{group.note}</p> : null}
                    <ul className="mt-2 space-y-2">
                      {group.items.map((item) => (
                        <li key={item.endpoint} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                          <p className="text-[11px] font-mono text-slate-700">{item.endpoint}</p>
                          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{item.fields.join(' · ')}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          {loading ? (
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              Esto puede tomar varios segundos: se consultan vehículo y propietario en paralelo.
            </p>
          ) : null}

          {result ? (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Consulta</p>
                <p className="text-sm font-bold text-slate-900 mt-1">
                  {result.kind === 'placa' ? 'Placa' : result.kind === 'cedula' ? 'Cédula' : 'RUC'} · {result.query}
                </p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-500">Propietario</p>
                    <p className="text-sm text-slate-900">{result.identity.nombre || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-500">Cédula</p>
                    <p className="text-sm text-slate-900">{result.identity.cedula || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-500">RUC</p>
                    <p className="text-sm text-slate-900">{result.identity.ruc || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-500">Placa</p>
                    <p className="text-sm text-slate-900">{result.identity.placa || '—'}</p>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  Fuentes listas: EcuadorAPI {result.sourcesReady.ecuador ? 'sí' : 'no'} · Consultas.ec{' '}
                  {result.sourcesReady.consultas ? 'sí' : 'no'}
                </p>
              </div>

              {result.ksi.length > 0 ? (
                <section className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                  <p className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
                    <Car className="h-4 w-4" />
                    En inventario KSI
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {result.ksi.map((row) => (
                      <li key={`${row.placa}-${row.idNumber}`} className="text-sm text-slate-800">
                        <span className="font-semibold">{row.placa || 'Sin placa'}</span>
                        {` · ${row.brand} ${row.model}`}
                        {row.year ? ` · ${row.year}` : ''}
                        {row.ownerName ? ` · ${row.ownerName}` : ''}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1"><Car className="h-3.5 w-4" /> Vehículo</span>
                <span className="inline-flex items-center gap-1"><User className="h-3.5 w-4" /> Persona</span>
                <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-4" /> Empresa / SRI</span>
                <span className="inline-flex items-center gap-1"><Scale className="h-3.5 w-4" /> Juicios</span>
                <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-4" /> Consume créditos de las APIs</span>
              </div>

              {result.sections.map((section) => (
                <SectionCard key={section.id} section={section} />
              ))}
            </>
          ) : !loading ? (
            <p className="text-sm text-slate-500">
              Si pones una placa, se busca el carro y luego al propietario. Si pones cédula o RUC, se desglosa la persona o empresa (identidad, SRI, juicios y multas) y se cruza con el inventario.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
