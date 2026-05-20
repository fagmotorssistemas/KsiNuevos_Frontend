'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMarketingPlannerContext } from '@/hooks/marketing/useMarketingPlannerContext'
import type {
  DraftLinkedTask,
  PlannerPriority,
  PlannerTask,
  PlannerTaskStatus,
  PlannerVisibility,
  TaskCompletionProof,
} from '@/types/marketing-planner'
import { plannerFrom } from '@/lib/marketing-planner/db'

const TASK_SELECT = `
  *,
  owner:profiles!marketing_planner_tasks_owner_id_fkey(id, full_name),
  creator:profiles!marketing_planner_tasks_created_by_fkey(id, full_name),
  completer:profiles!marketing_planner_tasks_completed_by_fkey(id, full_name),
  linked_event:marketing_planner_events!marketing_planner_tasks_linked_event_id_fkey(id, title, start_at, end_at, color)
`

const PROOF_BUCKET = 'marketing-planner-resources'

export type PlannerTaskInput = {
  title: string
  description?: string | null
  status?: PlannerTaskStatus
  priority?: PlannerPriority
  due_at?: string | null
  category?: string
  parent_id?: string | null
  visibility?: PlannerVisibility
  linked_event_id?: string | null
  inventory_id?: string | null
  video_plan_item_id?: string | null
  owner_id?: string
  sort_order?: number
}

export type TaskFilter = 'all' | 'pending' | 'completed' | 'overdue'

export function usePlannerTasks() {
  const { supabase, user } = useAuth()
  const { matchesMemberFilter, refreshKey, bumpRefresh } = useMarketingPlannerContext()
  const [tasks, setTasks] = useState<PlannerTask[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TaskFilter>('pending')
  const [search, setSearch] = useState('')

  const fetchTasks = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const { data, error } = await plannerFrom(supabase, 'marketing_planner_tasks')
      .select(TASK_SELECT)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[planner tasks]', error)
      setTasks([])
    } else {
      const rows = (data ?? []) as PlannerTask[]
      setTasks(rows.filter((t) => matchesMemberFilter(t.owner_id, t.created_by)))
    }
    setLoading(false)
  }, [supabase, matchesMemberFilter])

  useEffect(() => {
    void fetchTasks()
  }, [fetchTasks, refreshKey])

  const tree = useMemo(() => {
    const roots = tasks.filter((t) => !t.parent_id)
    return roots.map((r) => ({
      ...r,
      subtasks: tasks.filter((s) => s.parent_id === r.id).sort((a, b) => a.sort_order - b.sort_order),
    }))
  }, [tasks])

  const filtered = useMemo(() => {
    const now = Date.now()
    const q = search.trim().toLowerCase()
    return tree.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q)) return false
      if (filter === 'pending') return t.status !== 'completed' && t.status !== 'cancelled'
      if (filter === 'completed') return t.status === 'completed'
      if (filter === 'overdue') {
        return (
          t.due_at &&
          new Date(t.due_at).getTime() < now &&
          t.status !== 'completed' &&
          t.status !== 'cancelled'
        )
      }
      return true
    })
  }, [tree, filter, search])

  const stats = useMemo(() => {
    const flat = tasks
    return {
      total: flat.length,
      pending: flat.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length,
      completed: flat.filter((t) => t.status === 'completed').length,
      overdue: flat.filter(
        (t) =>
          t.due_at &&
          new Date(t.due_at).getTime() < Date.now() &&
          t.status !== 'completed' &&
          t.status !== 'cancelled',
      ).length,
    }
  }, [tasks])

  const fetchTasksByEventId = useCallback(
    async (eventId: string) => {
      if (!supabase) return [] as PlannerTask[]
      const { data, error } = await plannerFrom(supabase, 'marketing_planner_tasks')
        .select(TASK_SELECT)
        .eq('linked_event_id', eventId)
        .order('sort_order', { ascending: true })
      if (error) {
        console.error('[planner tasks by event]', error)
        return []
      }
      return (data ?? []) as PlannerTask[]
    },
    [supabase],
  )

  const createTasksForEvent = useCallback(
    async (
      eventId: string,
      drafts: DraftLinkedTask[],
      meta: {
        owner_id: string
        visibility: PlannerVisibility
        due_at: string
        inventory_id?: string | null
      },
    ) => {
      if (!supabase || !user) return { error: 'Sin sesión' }
      const rows = drafts
        .filter((d) => d.title.trim())
        .map((d, i) => ({
          title: d.title.trim(),
          owner_id: meta.owner_id,
          created_by: user.id,
          visibility: meta.visibility,
          linked_event_id: eventId,
          priority: d.priority,
          due_at: meta.due_at,
          status: 'pending' as const,
          category: 'general',
          sort_order: i,
          inventory_id: meta.inventory_id ?? null,
        }))
      if (rows.length === 0) return { error: undefined }
      const { error } = await plannerFrom(supabase, 'marketing_planner_tasks').insert(rows)
      if (!error) bumpRefresh()
      return { error: error?.message }
    },
    [supabase, user, bumpRefresh],
  )

  const syncEventLinkedTasks = useCallback(
    async (
      eventId: string,
      drafts: DraftLinkedTask[],
      meta: {
        owner_id: string
        visibility: PlannerVisibility
        due_at: string
        inventory_id?: string | null
      },
    ) => {
      if (!supabase || !user) return { error: 'Sin sesión' }
      const existing = await fetchTasksByEventId(eventId)
      const existingIds = new Set(existing.map((t) => t.id))
      const draftDbIds = new Set(drafts.filter((d) => d.dbId).map((d) => d.dbId!))

      for (const t of existing) {
        if (!draftDbIds.has(t.id)) {
          const { error } = await plannerFrom(supabase, 'marketing_planner_tasks').delete().eq('id', t.id)
          if (error) return { error: error.message }
        }
      }

      for (let i = 0; i < drafts.length; i++) {
        const d = drafts[i]
        if (!d.title.trim()) continue
        if (d.dbId && existingIds.has(d.dbId)) {
          const { error } = await plannerFrom(supabase, 'marketing_planner_tasks')
            .update({
              title: d.title.trim(),
              priority: d.priority,
              sort_order: i,
            })
            .eq('id', d.dbId)
          if (error) return { error: error.message }
        } else if (!d.dbId) {
          const { error } = await plannerFrom(supabase, 'marketing_planner_tasks').insert({
            title: d.title.trim(),
            owner_id: meta.owner_id,
            created_by: user.id,
            visibility: meta.visibility,
            linked_event_id: eventId,
            priority: d.priority,
            due_at: meta.due_at,
            status: 'pending',
            category: 'general',
            sort_order: i,
            inventory_id: meta.inventory_id ?? null,
          })
          if (error) return { error: error.message }
        }
      }
      bumpRefresh()
      return { error: undefined }
    },
    [supabase, user, fetchTasksByEventId, bumpRefresh],
  )

  const createTask = useCallback(
    async (input: PlannerTaskInput) => {
      if (!supabase || !user) return { error: 'Sin sesión' }
      const { error } = await plannerFrom(supabase, 'marketing_planner_tasks').insert({
        ...input,
        owner_id: input.owner_id ?? user.id,
        created_by: user.id,
      })
      if (!error) bumpRefresh()
      return { error: error?.message }
    },
    [supabase, user, bumpRefresh],
  )

  const updateTask = useCallback(
    async (id: string, input: Partial<PlannerTaskInput>) => {
      if (!supabase) return { error: 'Sin sesión' }
      const patch: Record<string, unknown> = { ...input }
      if (input.status === 'completed') patch.completed_at = new Date().toISOString()
      if (input.status && input.status !== 'completed') {
        patch.completed_at = null
        patch.completion_note = null
        patch.completion_proof_url = null
        patch.completion_proof_file_path = null
        patch.completed_by = null
      }
      const { error } = await plannerFrom(supabase, 'marketing_planner_tasks').update(patch).eq('id', id)
      if (!error) bumpRefresh()
      return { error: error?.message }
    },
    [supabase, bumpRefresh],
  )

  const completeTaskWithProof = useCallback(
    async (taskId: string, proof: TaskCompletionProof) => {
      if (!supabase || !user) return { error: 'Sin sesión' }
      if (!proof.completion_note.trim()) {
        return { error: 'Describe cómo completaste la tarea' }
      }

      let filePath: string | null = null
      if (proof.completion_proof_file) {
        const f = proof.completion_proof_file
        if (f.size > 52_428_800) return { error: 'El archivo supera 50 MB' }
        const ext = f.name.split('.').pop() ?? 'bin'
        filePath = `proofs/${user.id}/${taskId}-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from(PROOF_BUCKET).upload(filePath, f, {
          cacheControl: '3600',
          upsert: false,
        })
        if (upErr) return { error: upErr.message }
      }

      const { error } = await plannerFrom(supabase, 'marketing_planner_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          completion_note: proof.completion_note.trim(),
          completion_proof_url: proof.completion_proof_url?.trim() || null,
          completion_proof_file_path: filePath,
        })
        .eq('id', taskId)

      if (!error) bumpRefresh()
      return { error: error?.message }
    },
    [supabase, user, bumpRefresh],
  )

  const reopenTask = useCallback(
    async (taskId: string) => updateTask(taskId, { status: 'pending' }),
    [updateTask],
  )

  const getProofSignedUrl = useCallback(
    async (filePath: string) => {
      if (!supabase) return null
      const { data, error } = await supabase.storage.from(PROOF_BUCKET).createSignedUrl(filePath, 3600)
      if (error) return null
      return data.signedUrl
    },
    [supabase],
  )

  const deleteTask = useCallback(
    async (id: string) => {
      if (!supabase) return { error: 'Sin sesión' }
      const { error } = await plannerFrom(supabase, 'marketing_planner_tasks').delete().eq('id', id)
      if (!error) bumpRefresh()
      return { error: error?.message }
    },
    [supabase, bumpRefresh],
  )

  return {
    tasks: filtered,
    allTasks: tasks,
    loading,
    filter,
    setFilter,
    search,
    setSearch,
    stats,
    fetchTasksByEventId,
    createTasksForEvent,
    syncEventLinkedTasks,
    createTask,
    updateTask,
    completeTaskWithProof,
    reopenTask,
    getProofSignedUrl,
    deleteTask,
    refetch: fetchTasks,
  }
}
