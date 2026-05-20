'use client'

import { useMemo } from 'react'
import { useAuth } from './useAuth'
import { canAccessSubmodule, type PermissionContext } from '@/lib/permissions'

export function useSubmoduleAccess(submoduleSlug: string) {
  const { profile, permissionMap, isLoading } = useAuth()
  const ctx: PermissionContext = useMemo(
    () => ({ baseRole: profile?.role ?? null, map: permissionMap }),
    [profile?.role, permissionMap]
  )
  const allowed = canAccessSubmodule(ctx, submoduleSlug)
  return { isLoading, allowed, profile }
}
