import { 
    MapPin, 
    Gauge, 
    Calendar, 
    MoreHorizontal,
    Share2,
    Image as ImageIcon
} from "lucide-react";
import type { InventoryCar } from "../../../hooks/useInventory";

interface InventoryCardProps {
    car: InventoryCar;
    onEdit?: (car: InventoryCar) => void;
}

export function InventoryCard({ car, onEdit }: InventoryCardProps) {
    // Formateadores
    const formatPrice = (price: number | null) => 
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price ?? 0);
    
    const formatKm = (km: number | null) => 
        km ? `${km.toLocaleString()} km` : '0 km';

    // Determinar color de estado
    const getStatusColor = (status: string | null) => {
        switch (status) {
            case 'disponible': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'reservado': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'vendido': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col h-full">
            
            {/* 1. IMAGEN (Header) */}
            <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                {car.img_main_url ? (
                    <img 
                        src={car.img_main_url} 
                        alt={`${car.brand} ${car.model}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                        <ImageIcon className="h-12 w-12 mb-2" />
                        <span className="text-xs font-medium uppercase tracking-wider">Sin foto</span>
                    </div>
                )}

                {/* Badge de Estado (Flotante) */}
                <div className="absolute top-3 left-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border shadow-sm backdrop-blur-md bg-opacity-90 ${getStatusColor(car.status)}`}>
                        {car.status || 'Desconocido'}
                    </span>
                </div>

                {/* Badge de Precio (Flotante) */}
                <div className="absolute bottom-3 right-3">
                    <span className="bg-slate-900/90 backdrop-blur text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg border border-white/10">
                        {formatPrice(car.price)}
                    </span>
                </div>
            </div>

            {/* 2. INFO (Body) */}
            <div className="p-4 flex flex-col flex-1">
                
                {/* Título y Placa */}
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg leading-tight capitalize">
                            {car.brand} {car.model}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2">
                            {car.plate_short ? `PLACA: ${car.plate_short}` : 'SIN PLACA'}
                            {car.plate && <span className="bg-slate-100 px-1 rounded text-[9px] text-slate-500">REAL</span>}
                        </p>
                    </div>
                </div>

                {/* Detalles Técnicos (Grid) */}
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 my-3 py-3 border-y border-slate-50">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{car.year}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Gauge className="h-3.5 w-3.5 text-slate-400" />
                        <span>{formatKm(car.mileage)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span className="capitalize">{car.location || 'Patio'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <div className={`h-2 w-2 rounded-full ${car.marketing_in_patio ? 'bg-purple-500' : 'bg-slate-300'}`}></div>
                        <span>{car.marketing_in_patio ? 'En Marketing' : 'Sin Mkt'}</span>
                    </div>
                </div>

                {/* Botones de Acción */}
                <div className="mt-auto flex gap-2">
                    <button 
                        onClick={() => onEdit && onEdit(car)}
                        className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold py-2.5 rounded-lg transition-colors border border-slate-200"
                    >
                        Gestionar
                    </button>
                    <button className="p-2.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg border border-transparent hover:border-brand-100 transition-all">
                        <Share2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}