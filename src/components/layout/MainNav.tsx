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

if (profile?.role === "taller") {
  navItems = [
    { href: "/taller/dashboard", label: "Taller" },
  ];
} else if (profile?.role === "finanzas") {
  navItems = [
    { href: "/inventario", label: "Acceso Limitado" }, 
  ];
} else if (profile?.role === "contable") {
  navItems = [
    { href: "/wallet", label: "Contabilidad" },
  ];
} else if (profile?.role === "abogado") {
  navItems = [
    { href: "/wallet", label: "Cartera" },
    { href: "/legal/cases", label: "Gestión Legal" },
  ];
  
} else {
  navItems = [
    { href: "/leads", label: "Ventas" },
  ];


    // Admin
    if (profile?.role === "admin") {
      navItems.push({ href: "/wallet", label: "Contabilidad" });
      navItems.push({ href: "/legal/cases", label: "Gestión Legal" });
      navItems.push({ href: "/taller/dashboard", label: "Taller" });
      navItems.push({ href: "/marketing", label: "Marketing" });
    }

    if (profile?.role === "marketing") {
      navItems.push({ href: "/marketing", label: "Marketing" });
    }

    // Admin y Vendedores: Rastreadores
    if (profile?.role === "admin" || profile?.role === "vendedor") {
      navItems.push({ href: "/rastreadores", label: "Rastreadores" });
    }

    // Solo admin: Seguros
    if (profile?.role === "admin") {
      navItems.push({ href: "/seguros", label: "Seguros" });
    }



    // Admin y Marketing ven la sección de reportes y Scraper
    if (profile?.role === "admin" || profile?.role === "marketing") {
      navItems.push({
        href: "/scraper",
        label: "Scraper",
      });
      navItems.push({
        href: "/report",
        label: "Monitoreo",
      });
    }
  }

  return (
    <nav className={`flex items-center space-x-1 ${className || ''}`}>
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