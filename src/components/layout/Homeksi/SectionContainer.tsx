import React from 'react';

interface SectionContainerProps {
  children: React.ReactNode;
  className?: string;
  bgVariant?: 'white' | 'gray' | 'dark' | 'none';
}

export const SectionContainer = ({ 
  children, 
  className = '', 
  bgVariant = 'none' 
}: SectionContainerProps) => {
  
  const bgStyles = {
    white: "bg-white",
    gray: "bg-slate-50",
    dark: "bg-slate-900 text-white",
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