'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ClipboardCheck, Code2, List, PlusCircle } from 'lucide-react'
import { toast } from 'sonner'
import { twMerge } from 'tailwind-merge'
import { useMarketingDevRequests } from '@/hooks/marketing/useMarketingDevRequests'
import { DevRequestForm } from './components/DevRequestForm'
import { DevRequestList } from './components/DevRequestList'
import { DevRequestDetailModal } from './components/DevRequestDetailModal'
import { DailyTracking } from './components/DailyTracking'
import {
  clearDevRequestDraft,
  defaultForm,
  hasActiveDraft,
  loadDevRequestDraft,
  loadListPrefs,
  saveDevRequestDraft,
  saveListPrefs,
  type DevRequestPageTab,
} from './lib/draftStorage'
import type { MarketingDevRequest, MarketingDevRequestStatus } from '@/types/marketing-dev-requests'

export default function SolicitudesDesarrolloPage() {
  const {
    requests,
    loading,
    isAdmin,
    areaLabel,
    statusFilter,
    setStatusFilter,
    mineOnly,
    setMineOnly,
    search,
    setSearch,
    createRequest,
    updateStatus,
    getSignedUrl,
  } = useMarketingDevRequests()

  const prefsLoaded = useRef(false)
  const [section, setSection] = useState<'requests' | 'tracking'>('requests')
  const [tab, setTab] = useState<DevRequestPageTab>('list')
  const [selected, setSelected] = useState<MarketingDevRequest | null>(null)
  const [showDraftDot, setShowDraftDot] = useState(false)
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    if (prefsLoaded.current) return
    prefsLoaded.current = true
    const prefs = loadListPrefs()
    if (prefs) {
      if (prefs.search) setSearch(prefs.search)
      if (isAdmin && prefs.mineOnly) setMineOnly(true)
      if (prefs.statusFilter && prefs.statusFilter !== 'all') {
        setStatusFilter(prefs.statusFilter as MarketingDevRequestStatus)
      }
    }
    const draft = loadDevRequestDraft()
    if (draft?.tab === 'new') setTab('new')
    setShowDraftDot(hasActiveDraft())
  }, [setSearch, setMineOnly, setStatusFilter, isAdmin])

  const persistTab = useCallback((next: DevRequestPageTab) => {
    setTab(next)
    const draft = loadDevRequestDraft()
    if (next === 'new') {
      if (!hasActiveDraft()) {
        setFormKey((k) => k + 1)
      }
      saveDevRequestDraft(
        draft && hasActiveDraft()
          ? { ...draft, tab: 'new' }
          : {
              tab: 'new',
              step: 1,
              requestType: 'bug',
              form: defaultForm(),
              updatedAt: Date.now(),
            },
      )
    } else if (draft) {
      saveDevRequestDraft({ ...draft, tab: 'list' })
    }
    setShowDraftDot(hasActiveDraft())
  }, [])

  useEffect(() => {
    saveListPrefs({ statusFilter, mineOnly, search })
  }, [statusFilter, mineOnly, search])

  useEffect(() => {
    const draft = loadDevRequestDraft()
    if (tab === 'new' && draft) {
      saveDevRequestDraft({ ...draft, tab: 'new' })
    }
  }, [tab])

  return (
    <div className={twMerge('space-y-6 mx-auto pb-12 md:pb-16', section === 'tracking' ? 'max-w-7xl' : 'max-w-4xl')}>
      <header className="flex flex-col sm:flex-row sm:items-start gap-4 sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center text-white shadow-xl shadow-violet-500/30 shrink-0">
            {section === 'tracking' ? <ClipboardCheck className="w-7 h-7" /> : <Code2 className="w-7 h-7" />}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {section === 'tracking' ? 'Seguimiento diario de proyectos' : 'Solicitudes a Desarrollo'}
            </h1>
            <p className="text-sm text-slate-500 mt-1.5 max-w-xl leading-relaxed">
              {section === 'tracking'
                ? 'Control diario por persona y proyecto: avances, pendientes, bloqueos y próximo paso.'
                : 'Canal directo con el equipo de software: reporta fallas, pide mejoras y adjunta evidencias.'}
            </p>
          </div>
        </div>
      </header>

      <nav className="flex gap-6 border-b border-slate-200">
        {(
          [
            { id: 'requests', label: 'Solicitudes', icon: Code2 },
            { id: 'tracking', label: 'Seguimiento diario', icon: ClipboardCheck },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={twMerge(
              '-mb-px inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-bold transition-colors',
              section === id
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-slate-500 hover:text-slate-800',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {section === 'tracking' && <DailyTracking />}

      <div className={section === 'requests' ? 'space-y-6' : 'hidden'}>
        <div
          role="tablist"
          className="inline-flex p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80 w-full sm:w-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'list'}
            onClick={() => persistTab('list')}
            className={twMerge(
              'flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all',
              tab === 'list' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            <List className="h-4 w-4" />
            {isAdmin ? 'Bandeja' : areaLabel}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'new'}
            onClick={() => persistTab('new')}
            className={twMerge(
              'flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all',
              tab === 'new' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            <PlusCircle className="h-4 w-4" />
            Nueva
            {showDraftDot && tab !== 'new' && (
              <span className="h-2 w-2 rounded-full bg-amber-500" title="Borrador guardado" />
            )}
          </button>
        </div>

        <div className={tab === 'list' ? 'block pb-4' : 'hidden'}>
          <DevRequestList
            requests={requests}
            loading={loading}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            mineOnly={mineOnly}
            onMineOnly={setMineOnly}
            search={search}
            onSearch={setSearch}
            onSelect={setSelected}
            onNewClick={() => persistTab('new')}
            isAdmin={isAdmin}
            areaLabel={areaLabel}
          />
        </div>

        <div className={tab === 'new' ? 'block pb-6' : 'hidden'}>
          <DevRequestForm
            key={formKey}
            onSubmit={createRequest}
            onCancel={() => {
              clearDevRequestDraft()
              setShowDraftDot(false)
              setFormKey((k) => k + 1)
              persistTab('list')
            }}
            onSuccess={() => {
              clearDevRequestDraft()
              setShowDraftDot(false)
              setFormKey((k) => k + 1)
              persistTab('list')
            }}
            onDraftChange={() => setShowDraftDot(hasActiveDraft())}
          />
        </div>
      </div>

      <DevRequestDetailModal
        request={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        isAdmin={isAdmin}
        getSignedUrl={getSignedUrl}
        onUpdateStatus={async (id, status, adminNotes) => {
          const res = await updateStatus(id, status, adminNotes)
          if (res.error) {
            toast.error(res.error)
            return res
          }
          toast.success('Estado actualizado')
          return res
        }}
      />
    </div>
  )
}
