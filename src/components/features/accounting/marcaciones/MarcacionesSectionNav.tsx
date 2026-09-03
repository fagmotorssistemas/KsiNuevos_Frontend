"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Clock } from "lucide-react";

const tabs = [
    { href: "/marcaciones", label: "Marcaciones", icon: Clock, exact: true },
    { href: "/marcaciones/mes", label: "Informe del mes", icon: CalendarClock, exact: false },
] as const;

export function MarcacionesSectionNav() {
    const pathname = usePathname();

    return (
        <div className="mb-6 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {tabs.map((tab) => {
                const isActive = tab.exact
                    ? pathname === tab.href
                    : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${
                            isActive
                                ? "bg-slate-900 text-white"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </Link>
                );
            })}
        </div>
    );
}
