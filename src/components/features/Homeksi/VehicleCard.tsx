import { Car, Flame, MapPin } from "lucide-react";
import Link from "next/link";
import type { InventoryCar } from "@/hooks/Homeksi/useInventoryData";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { getVehiclePublicPath } from "@/lib/inventario/vehicle-public-slug";

interface VehicleCardProps {
  car: InventoryCar;
  featured?: boolean;
}

export const VehicleCard = ({ car, featured = false }: VehicleCardProps) => {
  const formatPrice = (price: number | null) =>
    price == null
      ? "Consultar"
      : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);

  const imageUrl = car.img_main_url;
  const place = car.registration_place || "Cuenca";

  return (
    <Link
      href={getVehiclePublicPath(car)}
      className={`bg-white overflow-hidden group flex flex-col h-full cursor-pointer transition-all duration-300 ${
        featured
          ? "rounded-3xl border border-neutral-200/80 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.28)] hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgba(15,23,42,0.32)]"
          : "rounded-2xl border border-neutral-200 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50"
      }`}
    >
      <div className={`${featured ? "h-52" : "h-48"} bg-neutral-100 overflow-hidden relative flex items-center justify-center`}>
        {imageUrl ? (
          <OptimizedImage
            src={imageUrl}
            alt={`${car.brand} ${car.model}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            containerClassName="absolute inset-0"
          />
        ) : (
          <div className="flex flex-col items-center text-neutral-400">
            <Car size={48} strokeWidth={1.5} />
            <span className="text-[10px] mt-2 font-bold uppercase tracking-widest">Sin imagen</span>
          </div>
        )}
        {featured ? (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
            <Flame className="h-3 w-3" strokeWidth={2.2} />
            Hot
          </div>
        ) : null}
      </div>

      <div className={`${featured ? "p-6" : "p-5"} flex flex-col flex-grow`}>
        <h4 className="font-bold text-lg text-black line-clamp-1 group-hover:text-red-600 transition-colors uppercase tracking-tight mb-2">
          {car.brand} {car.model}
        </h4>

        <p className="text-neutral-500 text-sm mb-4 flex items-center gap-2">
          <span className="bg-neutral-100 px-2 py-0.5 rounded text-neutral-600 font-medium text-xs">{car.year}</span>
          <span className="text-neutral-300">•</span>
          <span>{car.mileage?.toLocaleString() || 0} km</span>
        </p>

        <div className="mt-auto flex items-center justify-between">
          <span className="text-xl font-black text-black tracking-tight">{formatPrice(car.price)}</span>
          <div className="flex items-center text-xs text-neutral-400 gap-1">
            <MapPin className="w-3 h-3" />
            <span className="capitalize">{place}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};
