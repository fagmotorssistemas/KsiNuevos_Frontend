import Link from 'next/link'
import React from 'react'
import { Instagram } from 'lucide-react' // Importamos el ícono

export const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="container mx-auto px-4 py-8 md:px-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          
          {/* --- 1. Copyright --- */}
          <div className="text-sm text-gray-600">
            © {currentYear} AzoShop. Todos los derechos reservados.
          </div>

          {/* --- 2. Correo e Instagram --- */}
          <div className="flex items-center gap-4">
            <a
              href="mailto:soporte@azoshopec.com"
              className="text-sm text-gray-600 hover:text-blue-600 hover:underline"
            >
              soporte@azoshopec.com
            </a>
            <Link
              href="https://www.instagram.com/azoshop.ec" // 👉 cambia aquí por tu perfil exacto
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-pink-600 transition-colors"
            >
              <Instagram size={20} />
            </Link>
          </div>

        </div>
      </div>
    </footer>
  )
}
