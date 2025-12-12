'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './useAuth'

export const useRequireRole = (
  role: 'customer' | 'admin' | 'business_owner' | 'delivery_person'
) => {
  const { user, role: userRole, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // (¡LA CORRECCIÓN CLAVE!)
    // 1. Si estamos cargando, no hacemos NADA.
    //    Simplemente esperamos a que el AuthContext termine.
    if (isLoading) {
      return
    }

    // 2. Ahora que no estamos cargando, SÍ podemos chequear.
    //    Si NO hay usuario, redirigir a login.
    if (!user) {
      router.push('/login')
      return
    }

    // 3. Si el rol NO coincide, redirigir al inicio.
    if (userRole !== role) {
      router.push('/')
      return
    }
    
  }, [user, userRole, isLoading, role, router]) // (Añadimos 'isLoading' a la lista)

  // Devolvemos 'isLoading' para que el LAYOUT
  // que usa este hook pueda mostrar un Spinner mientras esperamos.
  return { isLoading, user }
}