import type { Database } from '@/types/supabase'
import type { PermissionMap } from './types'

type BaseRole = Database['public']['Enums']['user_role_enum']

export type PermissionContext = {
  baseRole: BaseRole | string | null | undefined
  map: PermissionMap
}
