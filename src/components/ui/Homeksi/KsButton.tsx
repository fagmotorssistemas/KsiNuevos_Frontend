import React from 'react';

interface KsButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'dark' | 'ghost';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const KsButton = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  isLoading = false,
  className = '', 
  ...props 
}: KsButtonProps) => {
  
  // Base: Texto negro o blanco, sin grises azulados
  const baseStyles = "relative px-8 py-3.5 rounded-xl font-bold text-sm md:text-base transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2";
  
  const variants = {
    // Rojo Marca
    primary: "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20 hover:shadow-red-600/40",
    
    // Blanco puro con texto negro y borde gris neutro
    secondary: "bg-white text-black border border-neutral-200 hover:border-red-600 hover:text-red-600 shadow-sm hover:shadow-md",
    
    // Outline blanco
    outline: "bg-transparent border-2 border-white text-white hover:bg-white hover:text-black",
    
    // Negro absoluto
    dark: "bg-black text-white hover:bg-neutral-800 shadow-lg shadow-black/20",
    
    // Ghost (Texto gris neutro a rojo)
    ghost: "bg-transparent text-neutral-600 hover:text-red-600 hover:bg-red-50"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          {/* Spinner neutro */}
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