'use client';
import Link from 'next/link';

interface NavbarLinksProps {
  links: { name: string; href: string }[];
}

export const NavbarLinks = ({ links }: NavbarLinksProps) => {
  return (
    <div className="hidden md:flex items-center gap-10 absolute left-1/2 -translate-x-1/2">
      {links.map((link) => (
        <Link 
          key={link.name} 
          href={link.href}
          className="text-sm font-semibold text-neutral-600 hover:text-black transition-colors relative group tracking-wide"
        >
          {link.name}
          <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full"></span>
        </Link>
      ))}
    </div>
  );
};