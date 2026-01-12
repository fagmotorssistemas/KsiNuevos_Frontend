import React from 'react';

interface KsTitleProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
  withAccent?: boolean;
  light?: boolean;
  size?: 'normal' | 'large';
}

export const KsTitle = ({ 
  title, 
  subtitle, 
  centered, 
  withAccent = true, 
  light,
  size = 'normal' 
}: KsTitleProps) => {
  return (
    <div className={`mb-8 ${centered ? 'text-center' : 'text-left'}`}>
      <h2 className={`font-black uppercase tracking-tighter leading-tight
        ${light ? 'text-white' : 'text-black'} 
        ${size === 'large' ? 'text-4xl md:text-5xl lg:text-6xl' : 'text-2xl md:text-3xl'}
      `}>
        {title}
      </h2>
      
      {withAccent && (
        <div className={`h-1.5 bg-red-600 mt-3 rounded-full ${centered ? 'mx-auto w-16' : 'w-12'}`} />
      )}
      
      {subtitle && (
        // Gris neutro para subtitulos
        <p className={`mt-4 max-w-2xl text-lg font-medium ${centered ? 'mx-auto' : ''} ${light ? 'text-neutral-300' : 'text-neutral-500'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
};