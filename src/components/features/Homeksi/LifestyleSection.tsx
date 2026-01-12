"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

const CAR_TYPES = [
  { label: 'Sedán', value: 'Sedan', img: '/CarImages/Sedan.png' },
  { label: 'SUV', value: 'SUV', img: '/CarImages/Suv.png' },
  { label: 'Pick-up', value: 'Pickup', img: '/CarImages/Pickup.png' },
  { label: 'Hatchback', value: 'Hatchback', img: '/CarImages/hatchback.png' },
  { label: 'Deportivo', value: 'Deportivo', img: '/CarImages/Deportivo.png' },
  { label: 'Coupé', value: 'Coupe', img: '/CarImages/Coupe.png' },
  { label: 'Minivan', value: 'Minivan', img: '/CarImages/Minivan.png' },
  { label: 'Camioneta', value: 'Camioneta', img: '/CarImages/Camioneta.png' },
  { label: 'Doble Cabina', value: 'Doble Cabina', img: '/CarImages/DobleCabina.png' }
];

export const LifestyleSection = () => {
  const router = useRouter();

  const handleCategoryClick = (categoryValue: string) => {
    const params = new URLSearchParams();
    params.set('category', categoryValue);
    router.push(`/buyCar?${params.toString()}`);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
      {CAR_TYPES.map((type) => (
        <button 
          key={type.label}
          onClick={() => handleCategoryClick(type.value)}
          // Borde neutral-100, hover rojo
          className="p-6 bg-white border border-neutral-200 rounded-2xl flex flex-col items-center justify-center hover:border-red-600 hover:shadow-lg hover:shadow-red-600/10 transition-all duration-300 group"
        >
          <div className="h-16 w-full mb-3 flex items-center justify-center">
            <img 
              src={type.img} 
              alt={type.label} 
              className="h-full w-auto object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" 
            />
          </div>
          
          <span className="font-bold text-sm text-neutral-600 group-hover:text-red-600 transition-colors uppercase tracking-wider">
            {type.label}
          </span>
        </button>
      ))}
    </div>
  );
};