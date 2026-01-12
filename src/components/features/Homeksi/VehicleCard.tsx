import { Car, MapPin } from "lucide-react";
import Link from "next/link";
import type { Database } from "@/types/supabase";

type InventoryCar = Database['public']['Tables']['inventory']['Row'];

interface VehicleCardProps {
  car: InventoryCar;
}

export const VehicleCard = ({ car }: VehicleCardProps) => {
  const formatPrice = (price: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);

  const imageUrl = car.img_main_url 
    ? car.img_main_url 
    : "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=400";

  return (
    <Link 
      href={`/autos/${car.id}`}
      // Border neutral-200, hover shadow elegante
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-300 border border-neutral-200 group flex flex-col h-full cursor-pointer"
    >
      {/* Contenedor de Imagen con fondo gris neutro */}
      <div className="h-48 bg-neutral-100 overflow-hidden relative">
        <img 
          src={imageUrl} 
          alt={`${car.brand} ${car.model}`} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
        />
        
        {/* Badge: Negro Puro */}
        {car.status !== 'disponible' && (
          <div className="absolute top-2 right-2 bg-black text-white text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
            {car.status}
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          {/* Texto Negro, Hover Rojo */}
          <h4 className="font-bold text-lg text-black line-clamp-1 group-hover:text-red-600 transition-colors">
            {car.brand} {car.model}
          </h4>
        </div>
        
        {/* Textos secundarios en gris neutro */}
        <p className="text-neutral-500 text-sm mb-4 flex items-center gap-2">
           <span className="bg-neutral-100 px-2 py-0.5 rounded text-neutral-600 font-medium text-xs">
             {car.year}
           </span>
           <span className="text-neutral-300">•</span>
           <span>{car.mileage?.toLocaleString() || 0} km</span>
        </p>

        <div className="mt-auto flex items-center justify-between">
           {/* Precio Negro Fuerte */}
           <span className="text-xl font-black text-black tracking-tight">
             {formatPrice(car.price)}
           </span>
           
           <div className="flex items-center text-xs text-neutral-400 gap-1">
              <MapPin className="w-3 h-3" />
              <span className="capitalize">{car.location || 'Patio'}</span>
           </div>
        </div>
      </div>
    </Link>
  );
};