"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { href: "/leads", label: "Leads" },
    { href: "/showroom", label: "Showroom" },
    { href: "/agenda", label: "Agenda" },
    { href: "/inventory", label: "Inventario" },
    { href: "/requests", label: "Pedidos" },
    { href: "/tareas", label: "Tareas" },
    { href: "/finance", label: "Financiamiento" },
    

];

export function MainNav({ className }: { className?: string }) {
    const pathname = usePathname();

    return (
        <nav className={`flex items-center space-x-1 ${className}`}>
            {navItems.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${isActive
                                ? "bg-slate-900 text-white shadow-sm"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            }`}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}