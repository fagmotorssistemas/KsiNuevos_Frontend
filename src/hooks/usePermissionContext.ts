'use client'

import { useMemo } from 'react'
import { useAuth } from './useAuth'
import { createPermissionContext, type PermissionContext } from '@/lib/permissions'

export function usePermissionContext(): PermissionContext {
  const { profile, permissionMap, catalogBaseRole } = useAuth()
  return useMemo(
    () => createPermissionContext(profile?.role ?? null, permissionMap, catalogBaseRole),
    [profile?.role, permissionMap, catalogBaseRole]
  )
}
