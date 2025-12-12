'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Session, User, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { createClient } from '@/lib/supabase/client'

// (Tipos - sin cambios)
interface AuthContextType {
  supabase: SupabaseClient<Database>
  session: Session | null
  user: User | null
  profile: Profile | null
  role: Profile['role'] | null
  isLoading: boolean
}
type Profile = Database['public']['Tables']['profiles']['Row']

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [supabase] = useState(() => createClient())
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
          setIsLoading(false)
        }
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase])

  // useEffect 2: Maneja la carga del PERFIL (lento)
  useEffect(() => {
    // (¡CORRECCIÓN!) Ponemos setIsLoading(true) aquí
    // Solo cargamos si el usuario CAMBIA
    setIsLoading(true) 
    
    if (user) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('Error al obtener el perfil:', error)
            setProfile(null)
          } else {
            setProfile(data)
          }
          setIsLoading(false)
        })
    } 
    else {
      setProfile(null)
      setIsLoading(false)
    }
  }, [user, supabase])

  const value = {
    supabase,
    session,
    user,
    profile,
    role: profile?.role ?? null,
    isLoading,
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