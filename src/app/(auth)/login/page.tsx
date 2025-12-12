import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoginForm } from '@/components/features/auth/LoginForm'

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md p-6">
      <div className="flex justify-center ">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Logo de KSI-NUEVOS"
            width={90}
            height={20}
            priority
          />
        </Link>
      </div>

      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
      </CardHeader>

      <CardContent>
        <LoginForm />

        <div className="mt-4 text-center text-sm">
          ¿No tienes una cuenta?{' '}
          <Link href="/register" className="font-medium text-blue-600 hover:underline">
            Regístrate aquí
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
