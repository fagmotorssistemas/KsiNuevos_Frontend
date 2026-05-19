'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { Session, User, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { createClient } from '@/lib/supabase/client'
import {
  fetchPermissionMap,
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

  // useEffect 1: Maneja SÓLO la autenticación (rápido)
  useEffect(() => {
    // (¡CORRECCIÓN!) No ponemos setIsLoading(true) aquí
    // para evitar el parpadeo

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (event === 'SIGNED_OUT') {
          setProfile(null)
          setPermissionMap({})
          setIsLoading(false)
        }
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase])

  // useEffect 2: Carga el perfil y suscribe cambios en tiempo real
  useEffect(() => {
    setIsLoading(true)

    if (!user) {
      setProfile(null)
      setPermissionMap({})
      setIsLoading(false)
      return
    }

    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(async ({ data, error }) => {
        if (error) {
          console.error('Error al obtener el perfil:', error)
          setProfile(null)
          setPermissionMap({})
        } else {
          setProfile(data)
          setPermissionsLoading(true)
          try {
            setPermissionMap(await fetchPermissionMap(supabase))
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
    const channel = supabase
      .channel(`profile-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        async (payload) => {
          setProfile(payload.new as Profile)
          setPermissionsLoading(true)
          try {
            setPermissionMap(await fetchPermissionMap(supabase))
          } catch (e) {
            console.error('Error al refrescar permisos:', e)
          } finally {
            setPermissionsLoading(false)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase])

  const refreshPermissions = useCallback(async () => {
    if (!user) {
      setPermissionMap({})
      return
    }
    setPermissionsLoading(true)
    try {
      setPermissionMap(await fetchPermissionMap(supabase))
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