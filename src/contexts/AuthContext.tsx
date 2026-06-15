'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { Session, User, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { createClient } from '@/lib/supabase/client'
import {
  fetchPermissionMapWithTimeout,
  hasPermission as hasPermissionFn,
  type PermissionAction,
  type PermissionMap,
} from '@/lib/permissions'

interface AuthContextType {
  supabase: SupabaseClient<Database>
  session: Session | null
  user: User | null
  profile: Profile | null
  role: Profile['role'] | null
  isLoading: boolean
  /** Mapa de permisos efectivos (RPC); vacío hasta cargar sesión */
  permissionMap: PermissionMap
  permissionsLoading: boolean
  refreshPermissions: () => Promise<void>
  hasPermission: (submoduleSlug: string, action: PermissionAction) => boolean
}
type Profile = Database['public']['Tables']['profiles']['Row']
const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [supabase] = useState(() => createClient())
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [permissionMap, setPermissionMap] = useState<PermissionMap>({})
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const loadedProfileUserIdRef = useRef<string | null>(null)

  // useEffect 1: Sesión inicial + cambios de auth
  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      setSession(session)
      setUser(session?.user ?? null)
      if (!session?.user) setIsLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (event === 'SIGNED_OUT') {
        setProfile(null)
        setPermissionMap({})
        setIsLoading(false)
      }
    })

    return () => {
      cancelled = true
      authListener.subscription.unsubscribe()
    }
  }, [supabase])

  // useEffect 2: Carga el perfil y suscribe cambios en tiempo real
  useEffect(() => {
    if (!user) {
      loadedProfileUserIdRef.current = null
      setProfile(null)
      setPermissionMap({})
      setIsLoading(false)
      return
    }

    const userId = user.id
    let cancelled = false
    const isNewUser = loadedProfileUserIdRef.current !== userId

    if (isNewUser) {
      setIsLoading(true)
      if (loadedProfileUserIdRef.current !== null) {
        setProfile(null)
        setPermissionMap({})
      }
    }

    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .then(async ({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Error al obtener el perfil:', error)
          loadedProfileUserIdRef.current = null
          setProfile(null)
          setPermissionMap({})
        } else {
          loadedProfileUserIdRef.current = userId
          setProfile(data)
          setPermissionsLoading(true)
          try {
            setPermissionMap(await fetchPermissionMapWithTimeout(supabase))
          } catch (e) {
            console.error('Error al cargar permisos:', e)
            setPermissionMap({})
          } finally {
            setPermissionsLoading(false)
          }
        }
        setIsLoading(false)
      })

    // Suscripción en tiempo real: si el rol u otro campo del perfil cambia
    // en la BD (ej. admin cambia el rol del usuario), el menú se actualiza al instante
    const refreshPerms = async () => {
      setPermissionsLoading(true)
      try {
        setPermissionMap(await fetchPermissionMapWithTimeout(supabase))
      } catch (e) {
        console.error('Error al refrescar permisos:', e)
      } finally {
        setPermissionsLoading(false)
      }
    }

    const channel = supabase
      .channel(`profile-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        async (payload) => {
          setProfile(payload.new as Profile)
          await refreshPerms()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_roles',
          filter: `profile_id=eq.${userId}`,
        },
        async () => {
          await refreshPerms()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_permissions',
          filter: `profile_id=eq.${userId}`,
        },
        async () => {
          await refreshPerms()
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [user?.id, supabase])

  const refreshPermissions = useCallback(async () => {
    if (!user) {
      setPermissionMap({})
      return
    }
    setPermissionsLoading(true)
    try {
      setPermissionMap(await fetchPermissionMapWithTimeout(supabase))
    } catch (e) {
      console.error('Error al refrescar permisos:', e)
    } finally {
      setPermissionsLoading(false)
    }
  }, [user, supabase])

  const hasPermission = useCallback(
    (submoduleSlug: string, action: PermissionAction) =>
      hasPermissionFn({ baseRole: profile?.role ?? null, map: permissionMap }, submoduleSlug, action),
    [profile?.role, permissionMap]
  )

  const value = {
    supabase,
    session,
    user,
    profile,
    role: profile?.role ?? null,
    isLoading,
    permissionMap,
    permissionsLoading,
    refreshPermissions,
    hasPermission,
  }

  // (¡LA CORRECCIÓN MÁS IMPORTANTE!)
  // Quitamos '!isLoading &&' para que los hijos
  // (como CartProvider) NUNCA se desmonten.
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// (Hook 'useAuth' sin cambios)
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}