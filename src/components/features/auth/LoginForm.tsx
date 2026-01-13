// src/components/features/auth/LoginForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth' // Usamos tu hook
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'

export const LoginForm = () => {
  const router = useRouter()
  const { supabase } = useAuth() // Instancia desde el contexto

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // 1. Login con Supabase
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setIsLoading(false)
      setError('Credenciales inválidas.')
      return
    }

    if (data.user) {
      try {
        // 2. Verificar Rol en Base de Datos
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', data.user.id)
          .single()

        if (profileError || !profile) throw new Error('Error al cargar perfil.')

        // 3. Verificar si está activo
        if (profile.status !== 'activo') {
          await supabase.auth.signOut()
          throw new Error('Tu cuenta está desactivada.')
        }

        // 4. LÓGICA DE REDIRECCIONAMIENTO
        router.refresh() // Actualiza el Header para mostrar el avatar

        switch (profile.role) {
          case 'cliente':
            router.push('/') // Al Home Público
            break
          case 'vendedor':
          case 'admin':
          case "marketing":
            router.push('/leads') // Al CRM
            break
          case 'finanzas':
            router.push('/wallet') // A Finanzas
            break
          default:
            router.push('/') // Por seguridad, al home
        }

      } catch (err: any) {
        console.error(err)
        setError(err.message || 'Error interno.')
        await supabase.auth.signOut()
        setIsLoading(false)
      }
      // Nota: No ponemos setIsLoading(false) si redirigimos para evitar parpadeos
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {/* ... Tus inputs de Email y Password ... */}
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