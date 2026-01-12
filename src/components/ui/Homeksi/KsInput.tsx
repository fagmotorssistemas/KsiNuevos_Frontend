import React from 'react';

interface KsInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  label?: string;
  error?: string;
}

export const KsInput = ({ icon, label, error, className = '', ...props }: KsInputProps) => {
  return (
    <div className="w-full">
      {label && (
        // Texto gris oscuro neutro, casi negro
        <label className="block text-sm font-bold text-neutral-800 mb-1.5 ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        <input
          // Border neutral, texto negro, placeholder gris neutro
          className={`w-full px-5 py-3.5 bg-white border rounded-xl outline-none transition-all duration-300 font-medium text-black placeholder:text-neutral-400
            ${error 
              ? 'border-red-300 focus:border-red-500 bg-red-50/10' 
              : 'border-neutral-200 focus:border-red-600 focus:shadow-[0_0_0_4px_rgba(220,38,38,0.1)]'
            } 
            ${className}`}
          {...props}
        />
        {icon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-red-600 transition-colors pointer-events-none">
            {icon}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500 font-medium ml-1">{error}</p>
      )}
    </div>
  );
};