import React from 'react'

/**
 * Este es el Layout para las páginas de Autenticación (Login, Register).
 * Su propósito es centrar el contenido (los formularios) en la pantalla.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // (1) Contenedor principal
    // - 'min-h-screen': Asegura que ocupe al menos toda la altura de la pantalla.
    // - 'flex items-center justify-center': Centra el contenido vertical y horizontalmente.
    // - 'bg-gray-50': Un fondo gris claro para distinguirlo de la tienda.
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      
      {/* (2) El 'children'
          Esto será reemplazado por el 'page.tsx' de login o register */}
      <div className="w-full max-w-md">
        {children}
      </div>

    </div>
  )
}