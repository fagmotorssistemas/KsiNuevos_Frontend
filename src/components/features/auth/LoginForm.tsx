'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'

export const LoginForm = () => {
  const router = useRouter()
  const { supabase } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // 1. Intentamos iniciar sesión con Supabase Auth
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (authError) {
      setIsLoading(false)
      setError(authError.message)
      return
    }

    // 2. Si las credenciales son correctas, verificamos el perfil en la base de datos
    if (data?.user) {
      try {
        // Obtenemos 'role' Y 'status'
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', data.user.id)
          .single()

        if (profileError) {
          throw new Error('No se pudo verificar el perfil del usuario.')
        }

        // 3. VERIFICACIÓN DE ESTATUS
        // Si el usuario NO está activo
        if (profile?.status !== 'activo') {
          // Cerramos la sesión inmediatamente para que no pueda entrar
          await supabase.auth.signOut()
          
          setError('Tu cuenta está inactiva. Contacta al administrador.')
          setIsLoading(false)
          return // Detenemos la ejecución aquí
        }

        // 4. Si está activo, procedemos con la redirección según el rol
        setIsLoading(false) 

        if (profile?.role === 'finanzas') {
          router.push('/wallet')
        } else {
          router.push('/leads')
        }

      } catch (err) {
        // Error al consultar el perfil
        console.error(err)
        setError('Error al verificar permisos de usuario.')
        await supabase.auth.signOut() // Por seguridad, cerramos sesión
        setIsLoading(false)
      }
    } else {
      // Caso raro donde no hay error pero no hay user data
      setIsLoading(false)
      router.push('/leads')
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {/* --- Campo de Email --- */}
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <Input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          required
          disabled={isLoading}
        />
      </div>

      {/* --- Campo de Contraseña --- */}
      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Contraseña
        </label>
        <Input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          disabled={isLoading}
        />
      </div>

      {/* --- Botón de Envío --- */}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Spinner size="sm" className="mr-2" /> : null}
        {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </Button>

      {/* --- Mensaje de Error --- */}
      {error && <p className="text-center text-sm text-red-500">{error}</p>}
    </form>
  )
}