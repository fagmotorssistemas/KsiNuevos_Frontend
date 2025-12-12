'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
// import { supabase } from '@/lib/supabase' // (¡ELIMINADO!)
// import { createClient } from '@/lib/supabase/client' // (¡ELIMINADO!)
import { useAuth } from '@/hooks/useAuth' // (¡AÑADIDO!)
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'

export const LoginForm = () => {
  const router = useRouter()
  
  // (¡CORRECCIÓN!)
  // Obtenemos la instancia de 'supabase' desde el AuthContext
  const { supabase } = useAuth()

  // (3) Estados del formulario (sin cambios)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // (4) Función para manejar el envío (¡ACTUALIZADO!)
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // (5) Llamada a Supabase Auth (ahora usa la instancia 'supabase' del hook)
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    setIsLoading(false)

    // (6) Manejo de la respuesta (sin cambios)
    if (authError) {
      setError(authError.message)
    } else {
      // ¡Éxito!
      router.push('/leads')
    }
  }

  // (Renderizado - sin cambios)
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