'use client'

import { useState } from 'react'
// import { createClient } from '@/lib/supabase/client' // (¡ELIMINADO!)
import { useAuth } from '@/hooks/useAuth' // (¡NUEVO!)
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'

export const RegisterForm = () => {
  // (¡CORRECCIÓN!)
  // Obtenemos la instancia de 'supabase' desde el AuthContext
  const { supabase } = useAuth()
  
  // (1) Estados del formulario (sin cambios)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false) // (2) Estado de éxito

  // (3) Función para manejar el registro (¡ACTUALIZADO!)
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setIsSuccess(false)

    // (4) Llamada a Supabase Auth (ahora usa la instancia 'supabase' del hook)
    const { data, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        // (Esta lógica de 'data' está perfecta)
        data: {
          full_name: fullName,
          phone: phone,
          role: 'customer',
        },
      },
    })

    setIsLoading(false)

    // (5) Manejo de la respuesta (sin cambios)
    if (authError) {
      setError(authError.message)
    } else {
      // ¡Éxito!
      setIsSuccess(true)
    }
  }

  // (6) Mensaje de éxito (sin cambios)
  if (isSuccess) {
    return (
      <div className="rounded-md border border-green-300 bg-green-50 p-4 text-center text-green-800">
        <h3 className="font-bold">¡Registro Exitoso!</h3>
        <p className="mt-2 text-sm">
          Hemos enviado un enlace de confirmación a tu correo electrónico.
          Por favor, revisa tu bandeja de entrada para activar tu cuenta.
        </p>
      </div>
    )
  }

  // (7) Renderizado del formulario (sin cambios)
  return (
    <form onSubmit={handleRegister} className="space-y-4">
      {/* --- Campo de Nombre Completo --- */}
      <div>
        <label
          htmlFor="fullName"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Nombre Completo
        </label>
        <Input
          type="text"
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Tu nombre y apellido"
          required
          disabled={isLoading}
        />
      </div>

      {/* --- Campo de Teléfono --- */}
      <div>
        <label
          htmlFor="phone"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Teléfono 
        </label>
        <Input
          type="tel"
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Ej: 0991234567"
          disabled={isLoading}
        />
      </div>

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
          placeholder="•••••••• (mín. 6 caracteres)"
          required
          minLength={6}
          disabled={isLoading}
        />
      </div>

      {/* --- Botón de Envío --- */}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Spinner size="sm" className="mr-2" /> : null}
        {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
      </Button>

      {/* --- Mensaje de Error --- */}
      {error && <p className="text-center text-sm text-red-500">{error}</p>}
    </form>
  )
}