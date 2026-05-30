'use client'

import { useEffect, useState } from 'react'
import { Calendar, ExternalLink, FileText, Mail, Shield, User } from 'lucide-react'
import { PlannerDialog } from '@/components/marketing/planificador/ui/PlannerDialog'
import {
  PlannerModalFooter,
  PlannerTextarea,
} from '@/components/marketing/planificador/ui/PlannerForm'
import { MODULE_LABELS, STATUS_LABELS, TYPE_LABELS } from '../constants'
import type { MarketingDevRequest, MarketingDevRequestStatus } from '@/types/marketing-dev-requests'
import { StatusBadge } from './ui/StatusBadge'
import { twMerge } from 'tailwind-merge'

type Props = {
  request: MarketingDevRequest | null
  open: boolean
  onClose: () => void
  isAdmin: boolean
  getSignedUrl: (path: string) => Promise<string | null>
  onUpdateStatus: (
    id: string,
    status: MarketingDevRequestStatus,
    adminNotes?: string
  ) => Promise<{ error?: string }>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-EC', {
    dateStyle: 'long',
    timeStyle: 'short',
  })
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{title}</p>
      <div className="text-sm text-slate-800 leading-relaxed">{children}</div>
    </div>
  )
}

const ADMIN_STATUSES = Object.entries(STATUS_LABELS) as [MarketingDevRequestStatus, string][]

export function DevRequestDetailModal({
  request,
  open,
  onClose,
  isAdmin,
  getSignedUrl,
  onUpdateStatus,
}: Props) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<MarketingDevRequestStatus>('new')
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!request || !open) return
    setStatus(request.status)
    setAdminNotes(request.admin_notes ?? '')
    void (async () => {
      const map: Record<string, string> = {}
      for (const att of request.attachments ?? []) {
        const url = await getSignedUrl(att.file_path)
        if (url) map[att.id] = url
      }
      setUrls(map)
    })()
  }, [request, open, getSignedUrl])

  if (!request) return null

  const handleSaveStatus = async () => {
    setSaving(true)
    const res = await onUpdateStatus(request.id, status, adminNotes)
    setSaving(false)
    if (!res.error) onClose()
  }

  return (
    <PlannerDialog
      open={open}
      onClose={onClose}
      title={request.title}
      subtitle={request.reference_code}
      size="2xl"
      icon={<FileText className="h-5 w-5" />}
      footer={
        isAdmin ? (
          <PlannerModalFooter
            onCancel={onClose}
            onConfirm={() => void handleSaveStatus()}
            confirmLabel="Guardar cambios"
            confirmLoading={saving}
          />
        ) : (
          <PlannerModalFooter onCancel={onClose} cancelLabel="Cerrar" />
        )
      }
    >
      <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1 -mr-1">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={request.status} />
          <span className="rounded-full bg-slate-200/80 px-3 py-1 text-xs font-bold text-slate-700">
            {TYPE_LABELS[request.request_type]}
          </span>
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800">
            {MODULE_LABELS[request.target_module]}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600 rounded-xl bg-white border border-slate-100 px-3 py-2.5">
            <User className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="font-medium truncate">
              {request.requester_name}
              {request.requester_role && (
                <span className="text-slate-400 font-normal"> · {request.requester_role}</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 rounded-xl bg-white border border-slate-100 px-3 py-2.5">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <span>{formatDate(request.created_at)}</span>
          </div>
          {request.requester_email && (
            <div className="flex items-center gap-2 text-sm text-slate-600 rounded-xl bg-white border border-slate-100 px-3 py-2.5 sm:col-span-2">
              <Mail className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="truncate">{request.requester_email}</span>
            </div>
          )}
        </div>

        <DetailBlock title="Descripción">
          <p className="whitespace-pre-wrap">{request.description}</p>
        </DetailBlock>

        {(request.attachments?.length ?? 0) > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Adjuntos</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {request.attachments!.map((att) => (
                <li key={att.id}>
                  {urls[att.id] ? (
                    <a
                      href={urls[att.id]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-violet-700 hover:border-violet-300 hover:bg-violet-50/50 transition-colors"
                    >
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="truncate flex-1">{att.file_name}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  ) : (
                    <span className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                      {att.file_name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isAdmin && (
          <div className="rounded-2xl border-2 border-amber-200/80 bg-amber-50/50 p-4 space-y-4">
            <div className="flex items-center gap-2 text-amber-900">
              <Shield className="h-4 w-4" />
              <p className="text-sm font-bold">Panel administrador</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-slate-500">Estado</p>
              <div className="flex flex-wrap gap-2">
                {ADMIN_STATUSES.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatus(value)}
                    className={twMerge(
                      'rounded-full px-3 py-1.5 text-xs font-bold border-2 transition-all',
                      status === value
                        ? 'border-violet-600 bg-violet-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <PlannerTextarea
              label="Notas internas"
              hint="Solo visible para el equipo de desarrollo"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Priorizado para sprint 12, depende de API externa…"
            />
          </div>
        )}

        {!isAdmin && request.admin_notes && request.status === 'resolved' && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
            <p className="text-xs font-bold uppercase text-emerald-700 mb-1">Respuesta del equipo</p>
            <p className="text-sm text-emerald-900 whitespace-pre-wrap">{request.admin_notes}</p>
          </div>
        )}
      </div>
    </PlannerDialog>
  )
}
