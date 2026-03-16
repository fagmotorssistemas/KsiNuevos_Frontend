import React from "react";
import Link from "next/link";
import { Car } from "lucide-react";
import type { InventoryCar } from "@/hooks/Homeksi/useInventoryData";
import { KsBadge } from "@/components/ui/Homeksi/KsBadge";
import { OptimizedImage } from "@/components/ui/OptimizedImage"; 

interface CarCardProps {
  car: InventoryCar;
}

export const CarCard = ({ car }: CarCardProps) => {
  // Si no hay imagen principal, no mostramos la tarjeta
  if (!car.img_main_url) {
    return null;
  }

  return (
    <Link 
      href={`/autos/${car.id}`}
      className="group bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-xl hover:shadow-neutral-200/40 transition-all duration-300 cursor-pointer flex flex-col h-full hover:-translate-y-1"
    >
      
      {/* Imagen responsive (srcset 400/800/1200), lazy loading, placeholder */}
      <div className="relative aspect-[16/10] overflow-hidden bg-neutral-100 flex items-center justify-center">
        <OptimizedImage
          src={car.img_main_url}
          alt={`${car.brand} ${car.model}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
          containerClassName="absolute inset-0"
        />

        <div className="absolute top-3 left-3 flex flex-col gap-2">
            <KsBadge variant="glass">Disponible</KsBadge>
            {car.aesthetic_condition && <KsBadge variant="dark">{car.aesthetic_condition}</KsBadge>}
        </div>
      </div>    

      {/* Info del Auto */}
      <div className="p-5 flex flex-col flex-grow justify-between">
        <div className="mb-4">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-black text-black text-lg leading-tight line-clamp-1 uppercase tracking-tight group-hover:text-red-600 transition-colors">
              {car.brand} {car.model}
            </h3>
          </div>
          <p className="text-neutral-500 text-xs font-bold uppercase tracking-wide">
            {car.year} • {car.mileage?.toLocaleString() || 0} km
          </p>
        </div>

        <div>
            <hr className="border-neutral-100 mb-4" />
            
            <div className="flex flex-col mb-1">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Precio de contado</span>
                <span className="text-xl font-black text-black">
                    ${car.price?.toLocaleString()}
                </span>
            </div>
        </div>
      </div>
    </Link>
  );
};