import React from 'react';

interface KsButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'dark';
  fullWidth?: boolean;
}

export const KsButton = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}: KsButtonProps) => {
  
  const baseStyles = "px-8 py-3 rounded-xl font-bold transition-all duration-300 active:scale-95 disabled:opacity-50";
  
  const variants = {
    primary: "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200",
    secondary: "bg-white text-slate-900 hover:bg-red-600 hover:text-white shadow-xl",
    outline: "bg-transparent border-2 border-white text-white hover:bg-white hover:text-slate-900",
    dark: "bg-slate-900 text-white hover:bg-red-600 shadow-xl",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};