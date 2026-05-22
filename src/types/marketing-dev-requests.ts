export type MarketingDevRequestType = 'bug' | 'feature' | 'improvement' | 'support' | 'other'

export type MarketingDevRequestPriority = 'low' | 'medium' | 'high' | 'urgent'

export type MarketingDevRequestStatus =
  | 'new'
  | 'in_review'
  | 'in_progress'
  | 'blocked'
  | 'resolved'
  | 'rejected'
  | 'cancelled'

export type MarketingDevTargetModule =
  | 'home'
  | 'ventas'
  | 'contabilidad'
  | 'taller'
  | 'legal'
  | 'marketing'
  | 'seguros'
  | 'rastreadores'
  | 'admin'
  | 'auth'
  | 'general'
  | 'other'

export type MarketingDevRequest = {
  id: string
  reference_code: string
  created_at: string
  updated_at: string
  created_by: string
  requester_name: string
  requester_email: string | null
  requester_role: string | null
  requester_phone: string | null
  target_module: MarketingDevTargetModule
  request_type: MarketingDevRequestType
  priority: MarketingDevRequestPriority
  status: MarketingDevRequestStatus
  title: string
  description: string
  steps_to_reproduce: string | null
  expected_outcome: string | null
  page_url: string | null
  environment_info: string | null
  admin_notes: string | null
  status_changed_at: string
  resolved_at: string | null
  requester?: { id: string; full_name: string | null } | null
  attachments?: MarketingDevRequestAttachment[]
}

export type MarketingDevRequestAttachment = {
  id: string
  request_id: string
  created_at: string
  created_by: string
  file_path: string
  file_name: string
  mime_type: string
  size_bytes: number
}

export type MarketingDevRequestInput = {
  target_module: MarketingDevTargetModule
  request_type: MarketingDevRequestType
  priority: MarketingDevRequestPriority
  title: string
  description: string
  steps_to_reproduce?: string | null
  expected_outcome?: string | null
  page_url?: string | null
  environment_info?: string | null
  requester_phone?: string | null
}
