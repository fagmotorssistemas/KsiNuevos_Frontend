import Image from 'next/image'; // 1. Agregamos el import de Image
import Link from 'next/link';
import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LoginForm } from '@/components/features/auth/LoginForm';

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md p-6">
      <div className="flex justify-center mb-2">
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

      <CardContent className="space-y-4">
        {/* useSearchParams() requiere Suspense en Next.js */}
        <Suspense fallback={<div className="animate-pulse h-10 bg-neutral-100 rounded" />}>
          <LoginForm />
        </Suspense>

        {/* --- 2. BOTÓN DE OLVIDÉ CONTRASEÑA --- */}
        <div className="text-center">
          <Link 
            href="/forgetpassword" 
            className="text-sm text-neutral-500 hover:text-neutral-900 hover:underline transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {/* Separador visual */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-neutral-200" />
          </div>
        </div>

        {/* Botón de Registro */}
        <div className="text-center text-sm pt-2">
          ¿No tienes una cuenta?{' '}
          <Link href="/register" className="font-medium text-blue-600 hover:underline">
            Regístrate aquí
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}