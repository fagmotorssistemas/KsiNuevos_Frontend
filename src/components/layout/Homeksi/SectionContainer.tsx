import React from 'react';

interface SectionContainerProps {
  children: React.ReactNode;
  className?: string;
  bgVariant?: 'white' | 'gray' | 'dark' | 'none';
}

export const SectionContainer = ({ 
  children, 
  className = '', 
  bgVariant = 'white' // Por defecto blanco como pediste
}: SectionContainerProps) => {
  
  const bgStyles = {
    white: "bg-white text-black", // Fondo blanco, texto base negro
    gray: "bg-neutral-50 text-black", 
    dark: "bg-black text-white",
    none: ""
  };

  return (
    <section className={`py-16 md:py-24 px-6 ${bgStyles[bgVariant]} ${className}`}>
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </section>
  );
};