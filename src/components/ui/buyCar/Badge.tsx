import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  color?: "blue" | "green" | "gray" | 'black';
}

export const Badge = ({ children, className = "", color = "blue" }: BadgeProps) => {
  const colorClasses = {
    blue: "bg-blue-600 text-white",
    green: "bg-green-600 text-white",
    gray: "bg-gray-200 text-gray-700",
    black: "bg-black text-white",
  };

  return (
    <span className={`${colorClasses[color]} text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm ${className}`}>
      {children}
    </span>
  );
};