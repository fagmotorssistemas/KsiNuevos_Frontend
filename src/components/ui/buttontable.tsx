import React from "react";
import { Loader2 } from "lucide-react";
import { twMerge } from "tailwind-merge";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "link-gray" | "link-color" | "danger";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
    color?: string; // Para compatibilidad con tu código anterior
}

export const Button = ({
    children,
    className,
    variant = "primary",
    size = "md",
    isLoading,
    color, // Lo ignoramos visualmente o lo mapeamos a variant
    ...props
}: ButtonProps) => {
    // Mapeo simple por si pasas "color" en vez de "variant"
    const finalVariant = color === "link-gray" ? "link-gray" :
        color === "link-color" ? "link-color" :
            variant;

    const baseStyles = "inline-flex items-center justify-center rounded-lg font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-sm",
        secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-200 shadow-sm",
        "link-gray": "text-slate-600 hover:text-slate-900 bg-transparent hover:bg-slate-50 shadow-none border-none",
        "link-color": "text-indigo-600 hover:text-indigo-700 bg-transparent hover:bg-indigo-50 shadow-none border-none",
        danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm",
    };

    const sizes = {
        sm: "px-3 py-2 text-sm",
        md: "px-4 py-2.5 text-sm",
        lg: "px-5 py-3 text-base",
    };

    return (
        <button
            className={twMerge(baseStyles, variants[finalVariant as keyof typeof variants], sizes[size], className)}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {children}
        </button>
    );
};