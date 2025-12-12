import * as React from 'react'
import { twMerge } from 'tailwind-merge'
import { cva, type VariantProps } from 'class-variance-authority'

// (1) Definimos las "Variantes" del Spinner
// Esto nos permite tener diferentes tamaños fácilmente
const spinnerVariants = cva(
  // Estilos base: animación de 'spin' y color de texto (que define el color del borde)
  'animate-spin rounded-full border-solid border-t-transparent',
  {
    variants: {
      // Diferentes tamaños
      size: {
        sm: 'h-4 w-4 border-2',
        md: 'h-8 w-8 border-4',
        lg: 'h-12 w-12 border-4',
      },
    },
    // Valor por defecto
    defaultVariants: {
      size: 'md',
    },
  }
)

// (2) Definimos las "Props"
// Extiende las props de un SVG normal y añade nuestras variantes de 'size'
export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {}

// (3) El Componente
// Lo creamos como un <div> que aplica las clases de variante
const Spinner: React.FC<SpinnerProps> = ({ className, size, ...props }) => {
  return (
    <div
      role="status" // Importante para accesibilidad (indica a lectores de pantalla que algo carga)
      className={twMerge(spinnerVariants({ size, className }))}
      {...props}
    >
      <span className="sr-only">Cargando...</span>
    </div>
  )
}

// (4) Exportamos el componente
export { Spinner }