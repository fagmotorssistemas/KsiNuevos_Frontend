import React from 'react';

interface KsTitleProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
  withAccent?: boolean;
  light?: boolean;
}

export const KsTitle = ({ title, subtitle, centered, withAccent, light }: KsTitleProps) => {
  return (
    <div className={`mb-10 ${centered ? 'text-center' : 'text-left'}`}>
      <h2 className={`text-3xl md:text-4xl font-black uppercase tracking-tighter ${light ? 'text-white' : 'text-slate-900'}`}>
        {title}
      </h2>
      {withAccent && (
        <div className={`h-1 w-12 bg-red-600 mt-2 ${centered ? 'mx-auto' : ''}`} />
      )}
      {subtitle && (
        <p className={`mt-4 text-lg ${light ? 'text-slate-300' : 'text-slate-500'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
};