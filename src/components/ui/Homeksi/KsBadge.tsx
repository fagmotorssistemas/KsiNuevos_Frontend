import React from 'react';

export type BadgeVariant = 'solid' | 'dark' | 'soft' | 'outline' | 'glass';

interface KsBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const KsBadge = ({ children, variant = 'solid', className = '' }: KsBadgeProps) => {
  const styles = {
    // Rojo sólido
    solid: "bg-red-600 text-white border border-red-600",
    
    // Negro absoluto (Reemplaza al slate azulado)
    dark: "bg-black text-white border border-black",
    
    // Suave (Fondo rojo muy claro, texto rojo)
    soft: "bg-red-50 text-red-600 border border-red-100 font-extrabold",
    
    // Borde (Gris neutro puro)
    outline: "bg-transparent text-neutral-600 border border-neutral-300",
    
    // Glass (Neutro)
    glass: "bg-white/90 backdrop-blur-md text-black border border-white/50 shadow-sm"
  };

  return (
    <span className={`inline-flex items-center justify-center px-3 py-1 text-[10px] md:text-xs font-bold tracking-wider uppercase rounded-full transition-all ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};