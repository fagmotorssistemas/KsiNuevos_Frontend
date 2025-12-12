import * as React from 'react'
import { twMerge } from 'tailwind-merge'

// (1) Definimos las "Props"
// Simplemente extiende todas las propiedades que un <input> HTML normal aceptaría
// (ej: type, placeholder, onChange, value, disabled, etc.)
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

// (2) El Componente de React
// Usamos React.forwardRef para poder pasar 'refs',
// lo cual es esencial para los formularios.
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        // (3) La Magia de 'twMerge'
        // Fusiona nuestros estilos base con cualquier 'className'
        // que venga en las props.
        className={twMerge(
          // --- Nuestros Estilos Base ---
          'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
          // Estilos para el placeholder
          'placeholder:text-gray-500',
          // Estilos al hacer 'focus' (click)
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black-200 focus-visible:ring-offset-2',
          // Estilos para 'disabled'
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Estilos especiales si es de tipo 'file'
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          // --- La 'className' personalizada ---
          className
        )}
        ref={ref}
        {...props} // Pasa el resto de props (onChange, value, etc.)
      />
    )
  }
)
Input.displayName = 'Input'

// (4) Exportamos el componente
export { Input }