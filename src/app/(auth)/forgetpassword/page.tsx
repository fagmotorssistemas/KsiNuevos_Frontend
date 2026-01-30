import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ForgotPasswordForm } from '../ForgotPasswordForm';

export default function ForgetPasswordPage() {
  return (
    <Card className="w-full max-w-md p-6">
      {/* 1. LOGO */}
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

      {/* 2. TÍTULO */}
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Recuperar acceso</CardTitle>
        <p className="text-sm text-neutral-500 mt-2">
          Ingresa tu correo y te enviaremos las instrucciones.
        </p>
      </CardHeader>

      {/* 3. CONTENIDO (EL FORMULARIO) */}
      <CardContent className="space-y-4">
        
        {/* Aquí va la lógica que creamos en el Paso 1 */}
        <ForgotPasswordForm />

        {/* Separador visual */}
        <div className="relative pt-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-neutral-200" />
          </div>
        </div>

        {/* Botón para volver al Login */}
        <div className="text-center text-sm pt-2">
          ¿Ya te acordaste?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Inicia Sesión
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}