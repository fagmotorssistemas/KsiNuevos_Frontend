"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  ADMIN_PRIMARY_NAV,
  mayAccessGpsRoutes,
  mayAccessLegalRoutes,
  mayAccessMarketingRoutes,
  mayAccessSegurosAppRoutes,
  mayAccessTallerRoutes,
  type PermissionContext,
} from "@/lib/permissions";

interface NavItem {
  href: string;
  label: string;
}

export function MainNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const { profile, permissionMap, hasPermission } = useAuth();
  const roleNorm = (profile?.role ?? "").toString().toLowerCase();

  const permCtx: PermissionContext = useMemo(
    () => ({ baseRole: profile?.role ?? null, map: permissionMap }),
    [profile?.role, permissionMap]
  );

  let navItems: NavItem[] = [];

  if (roleNorm === "admin") {
    navItems = [...ADMIN_PRIMARY_NAV];
  } else if (roleNorm === "taller") {
    if (mayAccessTallerRoutes(permCtx)) {
      navItems = [{ href: "/taller/dashboard", label: "Taller" }];
    }
  } else if (roleNorm === "marketing") {
    if (mayAccessMarketingRoutes(permCtx)) {
      navItems = [
        { href: "/marketing", label: "Marketing" },
        { href: "/scraper", label: "Scraper" },
        { href: "/report", label: "Monitoreo" },
      ];
    }
  } else if (roleNorm === "finanzas") {
    if (hasPermission("cartera-clientes", "read")) {
      navItems.push({ href: "/wallet", label: "Cartera" });
    }
    if (hasPermission("inventario-finanzas", "read")) {
      navItems.push({ href: "/inventario", label: "Inventario" });
    }
    if (mayAccessLegalRoutes(permCtx)) {
      navItems.push({ href: "/legal/cases", label: "Gestión Legal" });
    }
  } else if (roleNorm === "contable") {
    if (hasPermission("cartera-clientes", "read")) {
      navItems.push({ href: "/wallet", label: "Contabilidad" });
    }
    if (mayAccessTallerRoutes(permCtx)) {
      navItems.push({ href: "/taller/dashboard", label: "Taller" });
    }
    if (mayAccessSegurosAppRoutes(permCtx)) {
      navItems.push({ href: "/seguros", label: "Seguros" });
    }
  } else if (roleNorm === "abogado" || roleNorm === "abogada") {
    if (hasPermission("cartera-clientes", "read")) {
      navItems.push({ href: "/wallet", label: "Cartera" });
    }
    if (mayAccessLegalRoutes(permCtx)) {
      navItems.push({ href: "/legal/cases", label: "Gestión Legal" });
    }
  } else {
    if (hasPermission("leads-pipeline", "read") || profile?.role === "vendedor") {
      navItems.push({ href: "/leads", label: "Ventas" });
    }

    if (hasPermission("cartera-clientes", "read")) {
      navItems.push({ href: "/wallet", label: "Contabilidad" });
    }
    if (mayAccessLegalRoutes(permCtx)) {
      navItems.push({ href: "/legal/cases", label: "Gestión Legal" });
    }
    if (mayAccessTallerRoutes(permCtx)) {
      navItems.push({ href: "/taller/dashboard", label: "Taller" });
    }
    if (mayAccessMarketingRoutes(permCtx)) {
      navItems.push({ href: "/marketing", label: "Marketing" });
    }
    if (mayAccessGpsRoutes(permCtx)) {
      navItems.push({ href: "/rastreadores", label: "Rastreadores" });
    }
    if (mayAccessSegurosAppRoutes(permCtx)) {
      navItems.push({ href: "/seguros", label: "Seguros" });
    }
    if (mayAccessMarketingRoutes(permCtx)) {
      navItems.push({ href: "/scraper", label: "Scraper" });
      navItems.push({ href: "/report", label: "Monitoreo" });
    }
    if (hasPermission("permisos-roles", "read")) {
      navItems.push({ href: "/admin/permisos", label: "Permisos" });
    }
  }

  return (
    <nav className={`flex items-center space-x-1 ${className || ""}`}>
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
