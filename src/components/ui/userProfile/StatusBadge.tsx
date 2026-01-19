import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'info' | 'danger' | 'default' | 'dark';

interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const VARIANTS = {
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  danger: 'bg-red-100 text-red-700 border-red-200',
  default: 'bg-gray-100 text-gray-700 border-gray-200',
  dark: 'bg-neutral-900 text-white border-neutral-800'
};

export const StatusBadge = ({ children, variant = 'default', className = '' }: StatusBadgeProps) => {
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${VARIANTS[variant]} ${className}`}>
      {children}
    </span>
  );
};