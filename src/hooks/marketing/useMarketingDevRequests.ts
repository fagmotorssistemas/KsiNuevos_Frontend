'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { BUCKET } from '@/app/solicitudes-desarrollo/constants'
import { devRequestsDb } from '@/lib/marketing-dev-requests/db'
import type {
  MarketingDevRequest,
  MarketingDevRequestInput,
  MarketingDevRequestStatus,
} from '@/types/marketing-dev-requests'

const REQUEST_SELECT = `
  *,
  requester:profiles!marketing_dev_requests_created_by_fkey(id, full_name),
  attachments:marketing_dev_request_attachments(*)
`

export function useMarketingDevRequests() {
  const { supabase, user, profile } = useAuth()
  const [requests, setRequests] = useState<MarketingDevRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<MarketingDevRequestStatus | 'all'>('all')
  const [mineOnly, setMineOnly] = useState(false)
  const [search, setSearch] = useState('')

  const isAdmin = profile?.role === 'admin'

  const fetchRequests = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    let q = devRequestsDb(supabase)
      .from('marketing_dev_requests')
      .select(REQUEST_SELECT)
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      q = q.eq('status', statusFilter)
    }
    if (mineOnly && user?.id) {
      q = q.eq('created_by', user.id)
    }

    const { data, error } = await q
    if (error) {
      console.error('[dev-requests]', error)
      setRequests([])
    } else {
      setRequests((data ?? []) as unknown as MarketingDevRequest[])
    }
    setLoading(false)
  }, [supabase, statusFilter, mineOnly, user?.id])

  useEffect(() => {
    void fetchRequests()
  }, [fetchRequests])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return requests
    return requests.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.reference_code.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.requester?.full_name ?? '').toLowerCase().includes(q)
    )
  }, [requests, search])

  const createRequest = useCallback(
    async (input: MarketingDevRequestInput, files: File[]) => {
      if (!supabase || !user || !profile) return { error: 'Sin sesión' }

      const payload = {
        created_by: user.id,
        reference_code: `MDR-${Date.now().toString(36).toUpperCase().slice(-8)}`,
        requester_name: profile.full_name?.trim() || user.email?.split('@')[0] || 'Usuario',
        requester_email: user.email ?? null,
        requester_role: profile.role ?? null,
        requester_phone: null,
        target_module: input.target_module,
        request_type: input.request_type,
        priority: input.priority,
        title: input.title.trim(),
        description: input.description.trim(),
        steps_to_reproduce: null,
        expected_outcome: null,
        page_url: input.page_url?.trim() || null,
        environment_info: input.environment_info?.trim() || null,
      }

      const { data: row, error } = await devRequestsDb(supabase)
        .from('marketing_dev_requests')
        .insert(payload)
        .select('id')
        .single()

      if (error || !row) {
        return { error: error?.message ?? 'No se pudo crear la solicitud' }
      }

      const requestId = row.id as string

      for (const file of files) {
        const ext = file.name.split('.').pop() ?? 'bin'
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const path = `${user.id}/${requestId}/${safeName}`

        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        })
        if (upErr) {
          console.error('[dev-request upload]', upErr)
          continue
        }

        const { error: attErr } = await devRequestsDb(supabase).from('marketing_dev_request_attachments').insert({
          request_id: requestId,
          created_by: user.id,
          file_path: path,
          file_name: file.name,
          mime_type: file.type || 'application/octet-stream',
          size_bytes: file.size,
        })
        if (attErr) console.error('[dev-request attachment]', attErr)
      }

      await fetchRequests()
      return { id: requestId }
    },
    [supabase, user, profile, fetchRequests]
  )

  const updateStatus = useCallback(
    async (id: string, status: MarketingDevRequestStatus, adminNotes?: string) => {
      if (!supabase) return { error: 'Sin sesión' }
      const patch: Record<string, unknown> = { status }
      if (adminNotes !== undefined) patch.admin_notes = adminNotes.trim() || null

      const { error } = await devRequestsDb(supabase).from('marketing_dev_requests').update(patch).eq('id', id)
      if (error) return { error: error.message }
      await fetchRequests()
      return {}
    },
    [supabase, fetchRequests]
  )

  const getSignedUrl = useCallback(
    async (filePath: string, expiresIn = 3600) => {
      if (!supabase) return null
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, expiresIn)
      if (error) {
        console.error('[dev-request signed url]', error)
        return null
      }
      return data.signedUrl
    },
    [supabase]
  )

  return {
    requests: filtered,
    loading,
    isAdmin,
    statusFilter,
    setStatusFilter,
    mineOnly,
    setMineOnly,
    search,
    setSearch,
    createRequest,
    updateStatus,
    getSignedUrl,
    refresh: fetchRequests,
  }
}
