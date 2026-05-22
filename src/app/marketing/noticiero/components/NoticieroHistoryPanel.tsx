'use client'

import { X } from 'lucide-react'
import type { NoticieroHistory } from '@/lib/noticiero/types'
import { NOTICIERO_AVATARS } from '../config/avatars'
import { DAY_LABELS, type DayKey } from '@/lib/noticiero/auto-publish-schedule'

function avatarName(id: string): string {
  return NOTICIERO_AVATARS.find((a) => a.id === id)?.name ?? id
}

export function historyTitle(row: NoticieroHistory): string {
  if (row.content_type === 'vehicle' && row.inventoryoracle) {
    const v = row.inventoryoracle
    return `${v.brand} ${v.model}${v.year ? ` (${v.year})` : ''}`
  }
  if (row.creative_topic?.trim()) return row.creative_topic
  if (row.content_type === 'creative') return 'Tema automático (Gemini)'
  return '—'
}

interface NoticieroHistoryDetailModalProps {
  row: NoticieroHistory | null
  onClose: () => void
}

export function NoticieroHistoryDetailModal({ row, onClose }: NoticieroHistoryDetailModalProps) {
  if (!row) return null

  const dayLabel = DAY_LABELS[row.day_of_week as DayKey] ?? row.day_of_week

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold text-gray-900">Detalle de publicación</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Fecha</dt>
            <dd className="font-medium">{new Date(row.published_at).toLocaleString('es-EC')}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Día</dt>
            <dd className="font-medium">{dayLabel}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Tipo</dt>
            <dd className="font-medium">
              {row.content_type === 'vehicle' ? 'Vehículo' : 'Creativo'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Avatar</dt>
            <dd className="font-medium">{avatarName(row.avatar_id)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-500">Título</dt>
            <dd className="font-medium">{historyTitle(row)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Estado</dt>
            <dd className="font-medium capitalize">{row.status}</dd>
          </div>
          {row.error_message && (
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Error</dt>
              <dd className="text-red-600">{row.error_message}</dd>
            </div>
          )}
        </dl>

        <div>
          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Guión generado</p>
          <p className="text-sm text-gray-800 bg-gray-50 rounded-xl p-4 whitespace-pre-wrap">
            {row.generated_script || '—'}
          </p>
        </div>

        {row.final_video_url && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Video final</p>
            <video src={row.final_video_url} controls className="w-full rounded-xl max-h-64 bg-black" />
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          {row.instagram_post_id && <span>Instagram: {row.instagram_post_id}</span>}
          {row.facebook_post_id && <span>Facebook: {row.facebook_post_id}</span>}
        </div>
      </div>
    </div>
  )
}

function historyStatusClass(status: string): string {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-800'
  if (status === 'error') return 'bg-red-100 text-red-800'
  return 'bg-amber-100 text-amber-800'
}

function historyStatusLabel(status: string): string {
  if (status === 'completed') return 'Exitoso'
  if (status === 'error') return 'Error'
  return 'Pendiente'
}

interface NoticieroHistoryTableProps {
  items: NoticieroHistory[]
  onSelect: (row: NoticieroHistory) => void
}

export function NoticieroHistoryTable({ items, onSelect }: NoticieroHistoryTableProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-6 text-center">Aún no hay publicaciones automáticas.</p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase">
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Día</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Avatar</th>
            <th className="px-4 py-3">Título</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((row) => (
            <tr
              key={row.id}
              onClick={() => onSelect(row)}
              className="hover:bg-violet-50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 whitespace-nowrap">
                {new Date(row.published_at).toLocaleString('es-EC', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </td>
              <td className="px-4 py-3">
                {DAY_LABELS[row.day_of_week as DayKey] ?? row.day_of_week}
              </td>
              <td className="px-4 py-3">
                {row.content_type === 'vehicle' ? 'Vehículo' : 'Creativo'}
              </td>
              <td className="px-4 py-3">{avatarName(row.avatar_id)}</td>
              <td className="px-4 py-3 max-w-[200px] truncate">{historyTitle(row)}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${historyStatusClass(row.status)}`}
                >
                  {historyStatusLabel(row.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
