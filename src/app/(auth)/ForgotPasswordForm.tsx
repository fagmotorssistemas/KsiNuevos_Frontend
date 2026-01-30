'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth' // Asegúrate que la ruta a tu hook sea correcta
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import Link from 'next/link'

export const ForgotPasswordForm = () => {
  const { supabase } = useAuth()
  
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleResetRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // IMPORTANTE: Asegúrate que esta URL coincida con la ruta donde el usuario 
    // pondrá su nueva contraseña.
    const redirectTo = `${window.location.origin}/actualizar-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo,
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      setSuccess(true)
      setIsLoading(false)
    }
  }

  // Si el correo se envió con éxito, mostramos este mensaje
  if (success) {
    return (
      <div className="text-center space-y-4 p-4 bg-green-50 rounded-lg border border-green-100 animate-in fade-in zoom-in duration-300">
        <h3 className="text-green-800 font-bold text-lg">¡Correo enviado!</h3>
        <p className="text-green-700 text-sm">
          Revisa tu bandeja de entrada en <strong>{email}</strong>.
        </p>
        <Link href="/login" className="text-sm font-bold text-green-800 underline mt-4 block">
          Volver a Iniciar Sesión
        </Link>
      </div>
    )
  }

  // Si no, mostramos el formulario
  return (
    <form onSubmit={handleResetRequest} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Email registrado</label>
        <Input 
          type="email" 
          placeholder="ejemplo@correo.com"
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          disabled={isLoading}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Spinner size="sm" className="mr-2" /> : 'Enviar enlace'}
      </Button>
      
      {error && (
        <div className="p-3 bg-red-50 text-red-500 text-sm rounded-md border border-red-100">
          {error}
        </div>
      )}
    </form>
  )
}