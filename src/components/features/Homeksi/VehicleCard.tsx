import { Car, MapPin } from "lucide-react";
import type { Database } from "@/types/supabase";

// Usamos el tipo directo de la base de datos
type InventoryCar = Database['public']['Tables']['inventory']['Row'];

interface VehicleCardProps {
  car: InventoryCar;
}

export const VehicleCard = ({ car }: VehicleCardProps) => {
  // Formateador de moneda
  const formatPrice = (price: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);

  // Lógica de imagen: Si no hay imagen principal, usa una por defecto
  const imageUrl = car.img_main_url 
    ? car.img_main_url 
    : "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=400"; // Placeholder elegante

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-slate-200 group flex flex-col h-full">
      {/* Contenedor de Imagen */}
      <div className="h-48 bg-slate-100 overflow-hidden relative">
        <img 
          src={imageUrl} 
          alt={`${car.brand} ${car.model}`} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
        />
        
        {/* Badge de Estado (Opcional, útil si muestras vendidos) */}
        {car.status !== 'disponible' && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-sm uppercase">
            {car.status}
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-bold text-lg text-slate-800 line-clamp-1">
            {car.brand} {car.model}
          </h4>
        </div>
        
        <p className="text-slate-500 text-sm mb-4 flex items-center gap-2">
           <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium text-xs">
             {car.year}
           </span>
           <span>•</span>
           <span>{car.mileage?.toLocaleString() || 0} km</span>
           {/* Si tienes el tipo de combustible en la DB úsalo, si no, puedes quitarlo o dejarlo estático */}
           {/* <span>• Gasolina</span> */}
        </p>

        <div className="mt-auto flex items-center justify-between">
           <span className="text-xl font-black text-slate-900">
             {formatPrice(car.price)}
           </span>
           
           {/* Ubicación pequeña */}
           <div className="flex items-center text-xs text-slate-400 gap-1">
              <MapPin className="w-3 h-3" />
              <span className="capitalize">{car.location || 'Patio'}</span>
           </div>
        </div>
      </div>
    </div>
  );
};