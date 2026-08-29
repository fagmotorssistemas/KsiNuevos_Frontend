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
    router.push(`/usados/cuenca?${params.toString()}`);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-neutral-200 border border-neutral-200">
      {CAR_TYPES.map((type) => (
        <button
          key={type.label}
          type="button"
          onClick={() => handleCategoryClick(type.value)}
          className="bg-white px-4 py-8 flex flex-col items-center justify-center transition-colors duration-300 hover:bg-neutral-50 group"
        >
          <div className="h-14 w-full mb-4 flex items-center justify-center">
            <img
              src={type.img}
              alt=""
              className="h-full w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity duration-300"
            />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-700 group-hover:text-red-700">
            {type.label}
          </span>
        </button>
      ))}
    </div>
  );
};
