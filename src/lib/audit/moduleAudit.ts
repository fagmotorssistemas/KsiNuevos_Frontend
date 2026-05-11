import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/supabase'

export type AuditModule = 'taller' | 'seguros'
export type AuditAction = 'create' | 'update' | 'delete'

type Client = SupabaseClient<Database>

export async function logModuleAudit(
  supabase: Client,
  params: {
    userId: string
    module: AuditModule
    action: AuditAction
    entityType: string
    entityId?: string | null
    summary?: string
    metadata?: Json | Record<string, unknown>
  }
): Promise<void> {
  const { error } = await supabase.from('module_audit_log').insert({
    user_id: params.userId,
    module: params.module,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    summary: params.summary ?? null,
    metadata: (params.metadata ?? {}) as Json,
  })
  if (error) {
    console.error('[module_audit_log]', error.message)
  }
}
