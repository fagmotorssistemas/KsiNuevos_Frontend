import React from "react";

export const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        className={`flex w-full outline-none transition-all duration-200 ${className}`}
        {...props}
    />
);

export const TextArea = ({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
        className={`flex w-full outline-none transition-all duration-200 ${className}`}
        {...props}
    />
);

export const Button = ({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button
        className={`inline-flex items-center justify-center font-medium transition-all disabled:opacity-50 disabled:pointer-events-none ${className}`}
        {...props}
    >
        {children}
    </button>
);