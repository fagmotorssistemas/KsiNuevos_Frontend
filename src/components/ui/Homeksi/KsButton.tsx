import React from 'react';

// 1. Agregamos 'size' a la interfaz
interface KsButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'dark' | 'ghost';
  size?: 'sm' | 'md' | 'lg'; // Nuevo prop de tamaño
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const KsButton = ({ 
  children, 
  variant = 'primary', 
  size = 'md', // 2. Por defecto es 'md' (el tamaño grande que ya tenías)
  fullWidth = false, 
  isLoading = false,
  className = '', 
  ...props 
}: KsButtonProps) => {
  
  // 3. Base: Quitamos el padding (px, py) y el text-size de aquí
  const baseStyles = "relative rounded-xl font-bold transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2";
  
  // 4. Definimos los tamaños
  const sizes = {
    // sm: El que necesitas para el Navbar (Compacto)
    sm: "px-4 py-2 text-xs md:text-sm", 
    
    // md: El estándar que usabas antes (px-8 py-3.5)
    // Así NO rompes el diseño en las otras páginas
    md: "px-8 py-3.5 text-sm md:text-base", 
    
    // lg: Por si algún día quieres uno gigante
    lg: "px-10 py-4 text-base md:text-lg"
  };

  const variants = {
    primary: "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20 hover:shadow-red-600/40",
    secondary: "bg-white text-black border border-neutral-200 hover:border-red-600 hover:text-red-600 shadow-sm hover:shadow-md",
    outline: "bg-transparent border-2 border-white text-white hover:bg-white hover:text-black",
    dark: "bg-black text-white hover:bg-neutral-800 shadow-lg shadow-black/20",
    ghost: "bg-transparent text-neutral-600 hover:text-red-600 hover:bg-red-50"
  };

  return (
    <button 
      // 5. Concatenamos sizes[size]
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Procesando...
        </>
      ) : children}
    </button>
  );
};