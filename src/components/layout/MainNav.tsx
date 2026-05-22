"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  buildPrimaryNavItems,
  getPrimaryNavLinkSizeClasses,
  shouldCompactPrimaryNav,
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
  const compact = shouldCompactPrimaryNav(navItems.length);

  return (
    <nav
      className={`flex min-w-0 flex-1 items-center gap-2 ${className || ""}`}
    >
      {navItems.map((item) => {
        const href = resolvePrimaryNavItemHref(item, permCtx) ?? item.href;
        const isActive = pathname?.startsWith(href);

        return (
          <Link
            key={`${item.label}-${href}`}
            href={href}
            className={`shrink-0 font-medium rounded-full transition-colors whitespace-nowrap ${getPrimaryNavLinkSizeClasses(navItems.length)} ${
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
