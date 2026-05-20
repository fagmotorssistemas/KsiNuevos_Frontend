export type PlannerTab = 'overview' | 'calendar' | 'tasks' | 'resources'

export type CalendarView = 'day' | 'week' | 'month'

export type PlannerEventType = 'event' | 'meeting' | 'task_reminder' | 'content'

export type PlannerEventStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export type PlannerVisibility = 'personal' | 'team'

export type PlannerTaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export type PlannerPriority = 'baja' | 'media' | 'alta'

export type PlannerResourceCategory =
  | 'document'
  | 'image'
  | 'video'
  | 'brand'
  | 'template'
  | 'other'

export type PlannerEvent = {
  id: string
  owner_id: string
  created_by: string
  title: string
  description: string | null
  event_type: PlannerEventType
  start_at: string
  end_at: string
  all_day: boolean
  location: string | null
  color: string
  status: PlannerEventStatus
  visibility: PlannerVisibility
  inventory_id: string | null
  video_plan_item_id: string | null
  recurrence_rule: Record<string, unknown> | null
  recurrence_parent_id: string | null
  created_at: string
  updated_at: string
  owner?: { id: string; full_name: string | null }
  creator?: { id: string; full_name: string | null }
  inventory?: { id: string; brand: string | null; model: string | null; year: number | null } | null
  event_vehicles?: PlannerEventVehicleLink[]
}

export type PlannerEventVehicleLink = {
  inventory_id: string
  inventory: {
    id: string
    brand: string | null
    model: string | null
    year: number | null
    version?: string | null
    price?: number | null
  } | null
}

export type PlannerTask = {
  id: string
  owner_id: string
  created_by: string
  parent_id: string | null
  title: string
  description: string | null
  status: PlannerTaskStatus
  priority: PlannerPriority
  due_at: string | null
  completed_at: string | null
  category: string
  sort_order: number
  visibility: PlannerVisibility
  linked_event_id: string | null
  inventory_id: string | null
  video_plan_item_id: string | null
  created_at: string
  updated_at: string
  completion_note: string | null
  completion_proof_url: string | null
  completion_proof_file_path: string | null
  completed_by: string | null
  owner?: { id: string; full_name: string | null }
  creator?: { id: string; full_name: string | null }
  completer?: { id: string; full_name: string | null }
  linked_event?: {
    id: string
    title: string
    start_at: string
    end_at: string
    color: string
  } | null
  subtasks?: PlannerTask[]
}

/** Borrador de tarea al crear/editar un evento (antes de guardar en BD). */
export type DraftLinkedTask = {
  localId: string
  title: string
  priority: PlannerPriority
  /** Si existe, la tarea ya está en BD vinculada al evento. */
  dbId?: string
}

export type TaskCompletionProof = {
  completion_note: string
  completion_proof_url?: string | null
  completion_proof_file?: File | null
}

export type PlannerResource = {
  id: string
  owner_id: string
  created_by: string
  title: string
  description: string | null
  category: PlannerResourceCategory
  tags: string[]
  file_path: string
  file_name: string
  file_size: number
  mime_type: string | null
  visibility: PlannerVisibility
  created_at: string
  updated_at: string
  owner?: { id: string; full_name: string | null }
  creator?: { id: string; full_name: string | null }
}

export type MarketingTeamMember = {
  id: string
  full_name: string | null
  role: string
}

export type AdminMemberFilter = 'all' | string

export const PLANNER_EVENT_COLORS: Record<PlannerEventType, string> = {
  event: '#8b5cf6',
  meeting: '#3b82f6',
  task_reminder: '#f59e0b',
  content: '#10b981',
}

export const PLANNER_TASK_CATEGORIES = [
  'general',
  'contenido',
  'redes',
  'campañas',
  'producción',
  'administrativo',
] as const
