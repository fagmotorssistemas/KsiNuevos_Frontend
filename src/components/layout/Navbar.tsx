'use client'

import { useState, useEffect } from 'react' // (¡AÑADIDO!)
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { Button } from '@/components/ui/Button'
import Image from 'next/image'

// (Iconos: MenuIcon, CloseIcon, ShoppingCartIcon - sin cambios)
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
const ShoppingCartIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
)

const navLinks = [
  { name: 'Inicio', href: '/' },
  { name: 'Tienda', href: '/store' },
]

export const Navbar = () => {
  const { user, role } = useAuth()
  const { itemCount } = useCart()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // (¡AQUÍ ESTÁ LA CORRECCIÓN!)
  // 1. Creamos un estado 'isMounted' (montado)
  const [isMounted, setIsMounted] = useState(false)

  // 2. Usamos useEffect para cambiar 'isMounted' a 'true'
  //    SOLO después de que el componente se haya montado en el cliente.
  useEffect(() => {
    setIsMounted(true)
  }, []) // El array vacío [] asegura que se ejecute solo una vez

  const getAccountLink = () => {
    // ... (lógica de getAccountLink sin cambios)
    switch (role) {
      case 'admin': return '/admin/dashboard'
      case 'business_owner': return '/business/dashboard'
      case 'customer': return '/account/profile'
      case 'delivery_person': return '/delivery/dashboard'
      default: return '/account/profile'
    }
  }

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white shadow-sm relative">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        
        {/* --- 1. Logo (Sin cambios) --- */}
        <Link href="/" className="flex items-center">
          <Image
            src="/AzoShopLogo.svg"
            alt="Logo de AzoShop"
            width={90}
            height={10}
            priority
          />
        </Link>

        {/* --- 2. Navegación Central (Sin cambios) --- */}
        <div className="hidden md:flex gap-6 absolute left-1/2 -translate-x-1/2">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`text-md font-medium transition-colors hover:text-black-600 ${
              pathname === link.href
                ? 'text-black-600 underline decoration-black-600 underline-offset-4'
                : 'text-gray-600'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* --- 3. Acciones (Lado Derecho) --- */}
        <div className="flex items-center gap-2">
          
          {/* --- Botón de Carrito --- */}
          <Link href="/cart">
            <Button variant="ghost" size="icon" aria-label="Carrito de compras" className="relative">
              <ShoppingCartIcon className="h-6 w-6" />
              
              {/* (¡AQUÍ ESTÁ LA CORRECCIÓN!) */}
              {/* 3. Añadimos 'isMounted &&' a la condición */}
              {/* Esto asegura que el <span> SÓLO se renderice en el cliente, */}
              {/* evitando el desajuste con el servidor. */}
              {isMounted && itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>

          {/* --- Botón de Autenticación (Sin cambios) --- */}
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

          {/* --- Botón de Hamburguesa (Sin cambios) --- */}
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

      {/* --- Menú Desplegable Móvil (Sin cambios) --- */}
      {isMobileMenuOpen && (
        <div className="absolute top-16 left-0 w-full bg-white shadow-md md:hidden">
          <nav className="flex flex-col p-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`py-2 text-gray-700 ${
                  pathname === link.href ? 'font-bold text-blue-600' : ''
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </nav>
  )
}