"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  buildPrimaryNavItems,
  resolvePrimaryNavItemHref,
  type PermissionContext,
} from "@/lib/permissions";

export function MainNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const { profile, permissionMap } = useAuth();

  const permCtx: PermissionContext = useMemo(
    () => ({ baseRole: profile?.role ?? null, map: permissionMap }),
    [profile?.role, permissionMap]
  );

  const navItems = useMemo(() => buildPrimaryNavItems(permCtx), [permCtx]);

  return (
    <nav className={`flex items-center space-x-1 ${className || ""}`}>
      {navItems.map((item) => {
        const href = resolvePrimaryNavItemHref(item, permCtx) ?? item.href;
        const isActive = pathname?.startsWith(href);

        return (
          <Link
            key={`${item.label}-${href}`}
            href={href}
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
