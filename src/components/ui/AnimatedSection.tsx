'use client'

import { motion } from 'framer-motion'
import React from 'react'

interface AnimatedSectionProps {
  children: React.ReactNode
  className?: string
}

/**
 * Un componente 'wrapper' que aplica una animación de 'fade-in'
 * cuando el elemento entra en la vista.
 */
export const AnimatedSection = ({
  children,
  className,
}: AnimatedSectionProps) => {
  return (
    <motion.section
      className={className}
      // Configuración de la animación
      initial={{ opacity: 0, y: 50 }} // Inicia invisible y 50px abajo
      whileInView={{ opacity: 1, y: 0 }} // Se vuelve visible y sube a su posición
      viewport={{ once: true, amount: 0.3 }} // Se activa 1 vez, al ver el 30%
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {children}
    </motion.section>
  )
}