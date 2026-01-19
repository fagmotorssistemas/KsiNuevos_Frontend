'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { twMerge } from 'tailwind-merge'

interface ProfileModalProps {
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  title?: string // (Nuevo) Para ponerle título al modal automáticamente
  className?: string
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  children,
  isOpen,
  onClose,
  title,
  className,
}) => {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Bloqueo del scroll del body
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!isMounted || !isOpen) return null

  return createPortal(
    // CAMBIO 1: Fondo oscuro (bg-black/50) para mejor contraste
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-300 p-4"
      onClick={onClose}
    >
      <div
        className={twMerge(
          // Estilos base: blanco, bordes redondeados, sombra suave
          'relative w-full max-w-md rounded-2xl bg-white shadow-2xl transition-all duration-300 transform scale-100 opacity-100',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* --- Header del Modal --- */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-bold text-gray-900">
            {title || 'Detalle'}
          </h3>
          
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* --- Cuerpo del Modal --- */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}