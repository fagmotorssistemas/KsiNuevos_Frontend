'use client'

import { useAuth } from './useAuth'
import { canAccessSubmodule } from '@/lib/permissions'
import { usePermissionContext } from './usePermissionContext'

export function useSubmoduleAccess(submoduleSlug: string) {
  const { profile, isLoading } = useAuth()
  const ctx = usePermissionContext()
  const allowed = canAccessSubmodule(ctx, submoduleSlug)
  return { isLoading, allowed, profile }
}
