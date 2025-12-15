"use client";

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image' // Importamos Image
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Menu, X } from 'lucide-react'

// Sub-componentes
import { MainNav } from './MainNav'
import { UserNav } from './UserNav'

export const Navbar = () => {
  const { user } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">

        {/* --- IZQUIERDA: LOGO --- */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            {/* Usamos el componente Image de Next.js para el logo */}
            <Image
              src="/logo.png"
              alt="Logo de AzoCRM"
              width={90}  // Ajusta este ancho según tu imagen
              height={30} // Ajusta esta altura para mantener proporción
              priority    // Carga prioritaria para el logo (LCP)
              className="object-contain"
            />
          </Link>

          {/* Navegación Desktop (Solo si hay usuario) */}
          {user && (
            <div className="hidden md:block">
              <MainNav />
            </div>
          )}
        </div>

        {/* --- DERECHA: ACCIONES --- */}
        <div className="flex items-center gap-4">
          
          {user ? (
            <>
              {/* Menú de Usuario (Avatar + Dropdown) */}
              <UserNav />
              
              {/* Botón Menú Móvil */}
              <button
                className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </>
          ) : (
            <Link href="/login">
              <Button variant="primary" size="sm" className="px-6">
                Iniciar Sesión
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* --- MENÚ MÓVIL (Overlay) --- */}
      {isMobileMenuOpen && user && (
        <div className="md:hidden border-t border-slate-100 bg-white absolute w-full left-0 shadow-lg animate-in slide-in-from-top-5 duration-200">
          <div className="p-4 space-y-2">
            <Link 
                href="/leads" 
                className="block px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
            >
                Leads
            </Link>
            <Link 
                href="/agenda" 
                className="block px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
            >
                Agenda
            </Link>
            <Link 
                href="/inventory" 
                className="block px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
            >
                Inventario
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}