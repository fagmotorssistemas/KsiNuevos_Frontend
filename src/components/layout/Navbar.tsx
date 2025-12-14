'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import Image from 'next/image'

const MenuIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
)

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

export const Navbar = () => {
  const { user, role } = useAuth()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const getAccountLink = () => {
    switch (role) {
      case 'admin': return '/leads'
      case 'vendedor': return '/leads'
      default: return '/account/profile'
    }
  }

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white shadow-sm relative">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">

        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Logo de AzoShop"
            width={90}
            height={10}
            priority
          />
        </Link>

        {/* Acciones (solo login / panel + botón móvil) */}
        <div className="flex items-center gap-2">

          {user ? (
            <Link href={getAccountLink()}>
              <Button variant="secondary" size="sm">
                Mi Panel
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="primary" size="sm">
                Iniciar Sesión
              </Button>
            </Link>
          )}

          {/* Botón de menú móvil (si luego quieres agregar opciones) */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Abrir menú"
          >
            {isMobileMenuOpen ? (
              <CloseIcon className="h-6 w-6" />
            ) : (
              <MenuIcon className="h-6 w-6" />
            )}
          </Button>

        </div>
      </div>

      {/* Menú móvil vacío (lo dejo para que puedas agregar opciones en el futuro) */}
      {isMobileMenuOpen && (
        <div className="absolute top-16 left-0 w-full bg-white shadow-md md:hidden">
          <nav className="flex flex-col p-4 text-gray-500 text-sm">
            <p className="opacity-50">Menú vacío</p>
          </nav>
        </div>
      )}
    </nav>
  )
}
