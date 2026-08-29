'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isPublicNavLinkActive } from '@/lib/nav/isPublicNavLinkActive';

interface NavbarLinksProps {
  links: { name: string; href: string }[];
}

export const NavbarLinks = ({ links }: NavbarLinksProps) => {
  const pathname = usePathname() ?? '';

  return (
    <div className="hidden lg:flex items-center gap-2 shrink-0">
      {links.map((link) => {
        const active = isPublicNavLinkActive(link.href, pathname);
        return (
          <Link
            key={link.name}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`text-sm font-semibold tracking-wide whitespace-nowrap rounded-full px-3.5 py-1.5 border transition-colors ${
              active
                ? 'border-red-600 bg-red-50 text-red-700 shadow-sm'
                : 'border-transparent text-neutral-600 hover:text-black hover:border-neutral-200'
            }`}
          >
            {link.name}
          </Link>
        );
      })}
    </div>
  );
};
