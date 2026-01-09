import React from "react";
import Link from "next/link"; // Importamos Link para la navegación
import type { InventoryCar } from "@/hooks/Homeksi/useInventoryData";
import { Badge } from "@/components/ui/buyCar/Badge";
import { useCreditCalculator } from "@/hooks/Homeksi/useCreditCalculator"; 

interface CarCardProps {
  car: InventoryCar;
}

export const CarCard = ({ car }: CarCardProps) => {
  
  const credit = useCreditCalculator(car.price || 0);

  return (
    // 1. CAMBIO: Reemplazamos el <div> contenedor por un <Link>
    // Esto hace que toda la tarjeta funcione como un enlace
    <Link 
      href={`/autos/${car.id}`} // <--- Aquí apunta a la carpeta dinámica que creamos
      className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer flex flex-col h-full"
    >
      
      {/* Imagen */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        <img
          src={car.img_main_url || "https://via.placeholder.com/800x500?text=No+Image"}
          alt={`${car.brand} ${car.model}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
            <Badge color="black">Disponible</Badge>
            {car.condition && <Badge color="blue">{car.condition}</Badge>}
        </div>
      </div>    

      {/* Info del Auto */}
      <div className="p-4 flex flex-col flex-grow justify-between">
        <div className="mb-4">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2">
              {car.brand} {car.model}
            </h3>
          </div>
          <p className="text-gray-500 text-sm">
            {car.year} • {car.mileage?.toLocaleString() || 0} km
          </p>
        </div>

        <div>
            <hr className="border-gray-100 mb-3" />
            
            <div className="flex flex-col mb-3">
                <span className="text-xs text-gray-500 font-medium">Precio de contado</span>
                <span className="text-xl font-bold text-gray-900">
                ${car.price?.toLocaleString() || 0}
                </span>
            </div>
            
            {/* Sección de Crédito */}
            <div className="bg-blue-50 rounded-lg p-3 flex justify-between items-center group-hover:bg-blue-100 transition-colors border border-blue-100">
                
                <div className="flex flex-col">
                    <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wide">
                        Crédito {credit.termMonths} meses aprox
                    </span>
                    <span className="text-lg font-black text-blue-900">
                        ${Math.round(credit.monthlyPayment).toLocaleString()}
                        <span className="text-xs font-normal text-blue-600">/mes</span>
                    </span>
                </div>

                <div className="text-right pl-3 border-l border-blue-200">
                   <span className="text-[10px] text-slate-500 block mb-0.5">Entrada (60%)</span>
                   <span className="text-sm font-bold text-slate-700">
                       ${Math.round(credit.downPaymentAmount).toLocaleString()}
                   </span>
                </div>
            </div>

        </div>
      </div>
    </Link>
  );
};