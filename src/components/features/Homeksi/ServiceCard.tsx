import React from 'react';
import { Wallet, CarFront, Tag, ChevronRight } from 'lucide-react';

interface ServiceCardProps {
  title: string;
  description: string;
  type: 'credit' | 'loan' | 'offer';
}

const iconMap = {
  credit: Wallet,
  loan: CarFront,
  offer: Tag,
};

export const ServiceCard = ({ title, description, type }: ServiceCardProps) => {
  const Icon = iconMap[type];

  return (
    // Fondo blanco, borde neutral
    <div className="group relative p-8 bg-white border border-neutral-100 rounded-[2rem] transition-all duration-500 hover:shadow-xl hover:shadow-neutral-200/50 hover:-translate-y-1 overflow-hidden">
      
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />

      <div className="w-14 h-14 bg-neutral-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-600 transition-colors duration-500">
        <Icon className="w-7 h-7 text-red-600 group-hover:text-white transition-colors duration-500" />
      </div>

      <h3 className="text-xl font-black text-black mb-3 uppercase tracking-tight">{title}</h3>
      <p className="text-neutral-500 text-sm leading-relaxed mb-6 italic">{description}</p>

      <div className="flex items-center text-red-600 font-bold text-xs uppercase tracking-widest group-hover:gap-2 transition-all">
        Saber más 
        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
      </div>

      <div className="absolute bottom-0 left-0 h-1 bg-red-600 w-0 group-hover:w-full transition-all duration-500" />
    </div>
  );
};