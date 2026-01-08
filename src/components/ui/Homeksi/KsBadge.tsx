import React from 'react';

interface KsBadgeProps {
  children: React.ReactNode;
  variant?: 'red' | 'dark' | 'glass';
}

export const KsBadge = ({ children, variant = 'red' }: KsBadgeProps) => {
  const styles = {
    red: "bg-red-600 text-white",
    dark: "bg-slate-900 text-white",
    glass: "bg-white/20 backdrop-blur-md text-white border border-white/30"
  };

  return (
    <span className={`inline-block px-4 py-1.5 text-[10px] md:text-xs font-bold tracking-widest uppercase rounded-full ${styles[variant]}`}>
      {children}
    </span>
  );
};