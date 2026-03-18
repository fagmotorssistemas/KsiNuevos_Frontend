'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase, ListChecks } from 'lucide-react';

function NavItem({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={[
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100',
      ].join(' ')}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function LegalSidebar() {
  return (
    <aside className="w-72 border-r border-slate-200 bg-white hidden md:flex flex-col">
      <div className="h-16 px-4 flex items-center border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Briefcase className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-slate-900">Legal / Cobranza</div>
            <div className="text-[11px] text-slate-500">Gestión de casos</div>
          </div>
        </div>
      </div>

      <nav className="p-3 space-y-1">
        <NavItem href="/legal/cases" label="Casos" icon={<ListChecks className="h-4 w-4" />} />
      </nav>

      <div className="mt-auto p-3 text-[10px] text-slate-400">
        Auditoría activa · Sin borrado de historial
      </div>
    </aside>
  );
}

