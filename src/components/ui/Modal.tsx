'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { twMerge } from 'tailwind-merge'

// (1) Definimos las "Props"
interface ModalProps {
  children: React.ReactNode // Lo que va dentro del modal
  isOpen: boolean // La página nos dice si debe estar abierto
  onClose: () => void // La función que llamamos cuando el modal quiere cerrarse
  className?: string // Para estilos personalizados en el panel del modal
}

// (2) El Componente
export const Modal: React.FC<ModalProps> = ({
  children,
  isOpen,
  onClose,
  className,
}) => {
  // (3) Estado para 'Client-Side Rendering'
  // Necesitamos estar seguros de que estamos en el navegador
  // antes de intentar crear un portal.
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    // Cuando el modal se monta, bloqueamos el scroll del body
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    // Función de limpieza
    return () => {
      document.body.style.overflow = 'auto'
      setIsMounted(false)
    }
  }, [isOpen])

  // (4) Lógica para cerrar
  // Cierra el modal si el usuario presiona la tecla 'Escape'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // (5) Si no está abierto, o si aún no estamos en el navegador, no renderiza nada.
  if (!isMounted || !isOpen) {
    return null
  }

  // (6) El Portal
  // Esto "teletransporta" nuestro JSX al final del <body>
  return createPortal(
    // --- A. El Fondo Oscuro (Backdrop) ---
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/10 backdrop-blur-sm transition-opacity duration-300"
      onClick={onClose} // Cierra el modal si se hace clic en el fondo
    >

      <div
        className={twMerge(
          // Estilos base del panel
          'relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl transition-all duration-300',
          // 'className' personalizada
          className
        )}
        onClick={(e) => e.stopPropagation()} // Evita que el clic en el modal cierre el modal
      >
        {/* --- C. Botón de Cierre (Opcional pero recomendado) --- */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 h-6 w-6 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          aria-label="Cerrar modal"
        >
          {/* Un ícono simple de 'X' */}
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* --- D. El Contenido --- */}
        {children}
      </div>
    </div>,
    document.body // El destino de nuestro portal
  )
}