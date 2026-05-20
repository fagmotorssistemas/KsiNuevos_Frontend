// src/components/features/auth/LoginForm.tsx
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import {
  fetchPermissionMapWithTimeout,
  isAppAdminRole,
  isRouteAllowed,
  resolveDefaultDashboardHref,
  type PermissionContext,
  type PermissionMap,
} from '@/lib/permissions'

function resolvePostLoginHref(
  role: string | null,
  permissionMap: PermissionMap,
  redirectTo: string | null
): string {
  const permCtx: PermissionContext = {
    baseRole: role,
    map: permissionMap,
  }

  if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
    const mayUseRedirect =
      role === 'cliente'
        ? redirectTo === '/perfil' || redirectTo.startsWith('/perfil/')
        : isAppAdminRole(permCtx) || isRouteAllowed(redirectTo, permCtx)
    if (mayUseRedirect) return redirectTo
  }

  return resolveDefaultDashboardHref(permCtx)
}

function navigateAfterLogin(href: string) {
  window.location.assign(href)
}

export const LoginForm = () => {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect')
  const {
    supabase,
    user,
    profile,
    permissionMap,
    isLoading: authLoading,
    permissionsLoading,
  } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sesión activa en /login → ir al módulo correspondiente (evita quedar en spinner)
  useEffect(() => {
    if (authLoading || permissionsLoading || !user || !profile) return
    if (profile.status !== 'activo') return

    const href = resolvePostLoginHref(profile.role, permissionMap, redirectTo)
    navigateAfterLogin(href)
  }, [authLoading, permissionsLoading, user, profile, permissionMap, redirectTo])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setIsLoading(false)
      setError('Credenciales inválidas.')
      return
    }

    if (!data.user) {
      setIsLoading(false)
      setError('No se pudo iniciar sesión. Intenta de nuevo.')
      return
    }

    try {
      const { data: profileRow, error: profileError } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profileRow) throw new Error('Error al cargar perfil.')

      if (profileRow.status !== 'activo') {
        await supabase.auth.signOut()
        throw new Error('Tu cuenta está desactivada.')
      }

      const map = await fetchPermissionMapWithTimeout(supabase)
      const href = resolvePostLoginHref(profileRow.role, map, redirectTo)
      navigateAfterLogin(href)
    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Error interno.'
      setError(message)
      await supabase.auth.signOut()
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Contraseña</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Spinner size="sm" className="mr-2" /> : 'Iniciar Sesión'}
      </Button>

      {error && <p className="text-center text-sm text-red-500">{error}</p>}
    </form>
  )
}
