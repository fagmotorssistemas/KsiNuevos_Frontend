import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { RegisterForm } from '@/components/features/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <Card className="w-full max-w-md p-6">
      {/* Logo */}
      <div className="flex justify-center ">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Logo de KSI-NUEVOS"
            width={90}
            height={5}
            priority
          />
        </Link>
      </div>

      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Crear una Cuenta</CardTitle>
      </CardHeader>

      <CardContent>
        <RegisterForm />

        <div className="mt-4 text-center text-sm">
          ¿Ya tienes una cuenta?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Inicia sesión aquí
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
