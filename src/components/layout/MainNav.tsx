"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  href: string;
  label: string;
}

export function MainNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const { profile } = useAuth();
  
  let navItems: NavItem[] = [];

  // Lógica exclusiva para Finanzas: Solo ve Cartera
  if (profile?.role === "finanzas") {
    navItems = [
      { href: "/wallet", label: "Cartera" }
    ];
  } else {
    // Lógica para los demás roles (Admin, Ventas, Marketing, etc.)
    navItems = [
      { href: "/leads", label: "Leads" },
      { href: "/showroom", label: "Showroom" },
      { href: "/agenda", label: "Agenda" },
      { href: "/inventory", label: "Inventario" },
      { href: "/requests", label: "Pedidos" },
      { href: "/tareas", label: "Tareas" },
      { href: "/finance", label: "Financiamiento" },
      // Agregamos la nueva sección de Contratos aquí
      { href: "/contracts", label: "Contratos" },
    ];

    // Admin también necesita ver Cartera (opcional, asumiendo que Admin ve todo)
    if (profile?.role === "admin") {
      navItems.push({ href: "/wallet", label: "Contabilidad" });
    }

    // Admin y Marketing ven la sección de reportes
    if (profile?.role === "admin" || profile?.role === "marketing") {
      navItems.push({
        href: "/report",
        label: profile?.role === "marketing" ? "Marketing" : "Admin",
      });
    }
  }

  return (
    <nav className={`flex items-center space-x-1 ${className}`}>
      {navItems.map((item) => {
        const isActive = pathname?.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              isActive
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