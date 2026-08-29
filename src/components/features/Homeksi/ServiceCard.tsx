import React from 'react';
import Link from 'next/link';
import { ArrowLeftRight, Handshake, Trophy } from 'lucide-react';

interface ServiceCardProps {
  title: string;
  description: string;
  kicker: string;
  type: 'sales' | 'consign' | 'tradein';
  href?: string;
}

const iconMap = {
  sales: Trophy,
  consign: Handshake,
  tradein: ArrowLeftRight,
};

export const ServiceCard = ({ title, description, kicker, type, href }: ServiceCardProps) => {
  const Icon = iconMap[type];
  const className =
    "group relative z-0 block overflow-hidden bg-white p-7 transition-transform duration-300 hover:z-10 hover:scale-[1.04]";
  const content = (
    <>
      <div className="mb-5 flex h-11 w-11 items-center justify-center bg-neutral-50 text-neutral-800">
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-700">{kicker}</p>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-neutral-800">{title}</h3>
      <p className="text-sm leading-relaxed text-neutral-500">{description}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
};
