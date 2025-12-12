'use client'

import * as React from 'react'
// (1) Importamos las herramientas
import { cva, type VariantProps } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'

// (2) Definimos las "Variantes" del botón
// Aquí es donde vive todo el diseño.
// Definimos los estilos base y luego las variantes
const buttonVariants = cva(
  // Estilos base aplicados a TODOS los botones
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      // Diferentes tipos de botones (variante de estilo)
      variant: {
        // CAMBIADO: De azul a negro/gris oscuro
        primary: 'bg-gray-900 text-white hover:bg-gray-700',
        // CAMBIADO: Destructive ahora en rojo
        destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-400',
        // CAMBIADO: Borde gris claro a borde negro/oscuro
        outline: 'border border-gray-900 text-gray-900 hover:bg-gray-100',
        // AJUSTADO: Se mantiene gris, pero se asegura texto oscuro
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        // AJUSTADO: Se asegura texto oscuro
        ghost: 'text-gray-900 hover:bg-gray-100',
        // CAMBIADO: De azul a negro
        link: 'text-gray-900 underline-offset-4 hover:underline',
      },
      // Diferentes tamaños
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10', // Para botones que solo tienen un ícono
      },
    },
    // Valores por defecto si no se especifica
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

// (3) Definimos las "Props" del componente
// Queremos que nuestro botón acepte todas las props de un <button> normal
// Y ADEMÁS, las variantes que acabamos de definir (variant y size)
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

// (4) El Componente de React
// Usamos React.forwardRef para que sea un componente más robusto
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        // (5) La Magia
        // twMerge + cva:
        // 1. 'cva' genera las clases correctas (ej: "bg-gray-900 h-9 px-3...")
        // 2. 'twMerge' fusiona esas clases con cualquier 'className'
        //    que el programador haya pasado como prop.
        className={twMerge(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props} // Pasa el resto de props (ej: 'onClick', 'disabled')
      />
    )
  }
)
Button.displayName = 'Button'

// (6) Exportamos el componente y las variantes
export { Button, buttonVariants }