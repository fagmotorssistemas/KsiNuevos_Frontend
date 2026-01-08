import React from 'react';

interface KsInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const KsInput = ({ icon, className = '', ...props }: KsInputProps) => {
  return (
    <div className="relative w-full group">
      <input
        className={`w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm 
                   focus:border-red-600 focus:ring-0 outline-none transition-all text-slate-900 
                   placeholder:text-slate-400 ${className}`}
        {...props}
      />
      {icon && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors">
          {icon}
        </div>
      )}
    </div>
  );
};