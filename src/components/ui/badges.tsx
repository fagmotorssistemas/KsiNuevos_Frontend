import React from "react";
import { LucideIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";

interface BadgeProps {
    children: React.ReactNode;
    color?: "success" | "error" | "warning" | "brand" | "gray" | "primary";
    size?: "sm" | "md";
    iconLeading?: LucideIcon;
    className?: string;
}

export const BadgeWithIcon = ({
    children,
    color = "gray",
    size = "sm",
    iconLeading: Icon,
    className,
}: BadgeProps) => {
    const colors = {
        success: "bg-green-50 text-green-700 ring-green-600/20",
        error: "bg-red-50 text-red-700 ring-red-600/10",
        warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
        brand: "bg-indigo-50 text-indigo-700 ring-indigo-700/10",
        primary: "bg-blue-50 text-blue-700 ring-blue-700/10",
        gray: "bg-slate-50 text-slate-700 ring-slate-500/10",
    };

    const sizes = {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-sm",
    };

    return (
        <span className={twMerge(
            "inline-flex items-center font-medium rounded-full ring-1 ring-inset",
            colors[color],
            sizes[size],
            className
        )}>
            {Icon && <Icon className="mr-1.5 h-3 w-3" />}
            {children}
        </span>
    );
};