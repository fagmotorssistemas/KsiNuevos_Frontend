'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMarketingPlannerContext } from '@/hooks/marketing/useMarketingPlannerContext'
import type {
  PlannerResource,
  PlannerResourceCategory,
  PlannerVisibility,
} from '@/types/marketing-planner'
import { plannerFrom } from '@/lib/marketing-planner/db'

const BUCKET = 'marketing-planner-resources'
const MAX_BYTES = 52_428_800

const RESOURCE_SELECT = `
  *,
  owner:profiles!marketing_planner_resources_owner_id_fkey(id, full_name),
  creator:profiles!marketing_planner_resources_created_by_fkey(id, full_name)
`

export type PlannerResourceInput = {
  title: string
  description?: string | null
  category?: PlannerResourceCategory
  tags?: string[]
  visibility?: PlannerVisibility
  owner_id?: string
}

export function usePlannerResources() {
  const { supabase, user } = useAuth()
  const { matchesMemberFilter, refreshKey, bumpRefresh } = useMarketingPlannerContext()
  const [resources, setResources] = useState<PlannerResource[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<PlannerResourceCategory | 'all'>('all')

  const fetchResources = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const { data, error } = await plannerFrom(supabase, 'marketing_planner_resources')
      .select(RESOURCE_SELECT)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[planner resources]', error)
      setResources([])
    } else {
      const rows = (data ?? []) as PlannerResource[]
      setResources(rows.filter((r) => matchesMemberFilter(r.owner_id, r.created_by)))
    }
    setLoading(false)
  }, [supabase, matchesMemberFilter])

  useEffect(() => {
    void fetchResources()
  }, [fetchResources, refreshKey])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return resources.filter((r) => {
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false
      if (!q) return true
      return (
        r.title.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q)) ||
        r.file_name.toLowerCase().includes(q)
      )
    })
  }, [resources, search, categoryFilter])

  const uploadResource = useCallback(
    async (file: File, meta: PlannerResourceInput) => {
      if (!supabase || !user) return { error: 'Sin sesión' }
      if (file.size > MAX_BYTES) return { error: 'El archivo supera 50 MB' }

      const ext = file.name.split('.').pop() ?? 'bin'
      const prefix = meta.visibility === 'team' ? 'team' : 'personal'
      const path = `${prefix}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })
      if (upErr) return { error: upErr.message }

      const { error: dbErr } = await plannerFrom(supabase, 'marketing_planner_resources').insert({
        title: meta.title || file.name,
        description: meta.description ?? null,
        category: meta.category ?? 'other',
        tags: meta.tags ?? [],
        visibility: meta.visibility ?? 'personal',
        owner_id: meta.owner_id ?? user.id,
        created_by: user.id,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
      })

      if (dbErr) {
        await supabase.storage.from(BUCKET).remove([path])
        return { error: dbErr.message }
      }
      bumpRefresh()
      return { error: undefined }
    },
    [supabase, user, bumpRefresh],
  )

  const deleteResource = useCallback(
    async (resource: PlannerResource) => {
      if (!supabase) return { error: 'Sin sesión' }
      await supabase.storage.from(BUCKET).remove([resource.file_path])
      const { error } = await plannerFrom(supabase, 'marketing_planner_resources').delete().eq('id', resource.id)
      if (!error) bumpRefresh()
      return { error: error?.message }
    },
    [supabase, bumpRefresh],
  )

  const getSignedUrl = useCallback(
    async (filePath: string, expiresIn = 3600) => {
      if (!supabase) return null
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, expiresIn)
      if (error) return null
      return data.signedUrl
    },
    [supabase],
  )

  return {
    resources: filtered,
    loading,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    uploadResource,
    deleteResource,
    getSignedUrl,
    refetch: fetchResources,
  }
}
