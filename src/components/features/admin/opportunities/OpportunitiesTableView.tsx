import { VehicleWithSeller } from "@/services/scraper.service";
import {
    Car,
    MapPin,
    ExternalLink,
    Search,
    AlertCircle,
    Gauge,
    Calendar,
    Clock,
} from "lucide-react";

interface OpportunitiesTableViewProps {
    vehicles: VehicleWithSeller[];
    isLoading: boolean;
    hasActiveFilters: boolean;
    onClearFilters: () => void;
}

// Instancia única del formateador (fuera del componente para evitar recreación)
const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

// Función para capitalizar la primera letra
function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Función optimizada para formatear fecha relativa
function formatRelativeTime(dateString: string): string {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        let formatted: string;

        // Seleccionar la unidad apropiada
        if (diffInSeconds < 60) {
            formatted = rtf.format(-Math.floor(diffInSeconds), 'second');
        } else if (diffInSeconds < 3600) {
            formatted = rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
        } else if (diffInSeconds < 86400) {
            formatted = rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
        } else if (diffInSeconds < 604800) {
            formatted = rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
        } else if (diffInSeconds < 2592000) {
            formatted = rtf.format(-Math.floor(diffInSeconds / 604800), 'week');
        } else if (diffInSeconds < 31536000) {
            formatted = rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
        } else {
            formatted = rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
        }

        return capitalize(formatted);
    } catch {
        return "Fecha no disponible";
    }
}

export function OpportunitiesTableView({
    vehicles,
    isLoading,
    hasActiveFilters,
    onClearFilters,
}: OpportunitiesTableViewProps) {

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 space-y-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-slate-100 border-t-red-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Car className="h-6 w-6 text-red-500/50" />
                    </div>
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-slate-800">Cargando inventario</h3>
                    <p className="text-slate-400 text-sm">Sincronizando con la base de datos...</p>
                </div>
            </div>
        );
    }

    if (vehicles.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-slate-300">
                <div className="p-4 bg-slate-50 rounded-full mb-4">
                    <Search className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">No se encontraron vehículos</h3>
                <p className="text-slate-500 max-w-md text-center mt-2">
                    No hay resultados que coincidan con tus filtros actuales. Intenta limpiar los filtros o realiza un nuevo escaneo.
                </p>
                {hasActiveFilters && (
                    <button
                        onClick={onClearFilters}
                        className="mt-6 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                    >
                        Restablecer búsqueda
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-4 px-6 w-[350px]">Vehículo</th>
                            <th className="py-4 px-6">Detalles</th>
                            <th className="py-4 px-6">Precio</th>
                            <th className="py-4 px-6">Ubicación</th>
                            <th className="py-4 px-6 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {vehicles.map((vehicle) => (
                            <tr
                                key={vehicle.id}
                                className="hover:bg-slate-50 transition-colors group relative"
                            >
                                <td className="py-4 px-6">
                                    <div className="flex gap-4">
                                        <div className="h-20 w-28 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200 relative">
                                            {vehicle.image_url ? (
                                                <img
                                                    src={vehicle.image_url}
                                                    alt={vehicle.title || 'Vehículo'}
                                                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = "";
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                        ((e.target as HTMLImageElement).nextSibling as HTMLElement).style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div className={`absolute inset-0 flex items-center justify-center bg-slate-100 ${vehicle.image_url ? 'hidden' : 'flex'}`}>
                                                <Car className="h-8 w-8 text-slate-300" />
                                            </div>
                                        </div>

                                        <div className="flex flex-col justify-center gap-1">
                                            <div className="font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-red-600 transition-colors">
                                                {vehicle.category?.toUpperCase()} {vehicle.model?.toUpperCase()}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <Clock className="h-3 w-3 text-slate-400" />
                                                <span>{formatRelativeTime(vehicle.publication_date)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                {/* <td>
                                    <div className="flex flex-col justify-center gap-1">
                                        <div className="font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-red-600 transition-colors">
                                            {vehicle.category?.toUpperCase()} {vehicle.model?.toUpperCase()}
                                        </div>
                                    </div>
                                </td> */}

                                <td className="py-4 px-6">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2 text-slate-700 font-medium">
                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                            {vehicle.year || '----'}
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Gauge className="h-3.5 w-3.5 text-slate-400" />
                                            {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : '---'}
                                        </div>
                                    </div>
                                </td>

                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-1 font-bold text-lg text-slate-900">
                                        <span className="text-slate-400 text-sm font-normal">$</span>
                                        {vehicle.price ? vehicle.price.toLocaleString() : 'N/A'}
                                    </div>
                                </td>

                                <td className="py-4 px-6">
                                    <div className="flex flex-col items-start gap-1">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-xs font-bold border border-red-100">
                                            <MapPin className="h-3 w-3" />
                                            {vehicle.location || 'Ubicación desc.'}
                                        </div>
                                    </div>
                                </td>

                                <td className="py-4 px-6 text-center">
                                    <div className="flex items-center justify-center">
                                        {vehicle.url ? (
                                            <a
                                                href={vehicle.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                                                title="Ver en Marketplace"
                                            >
                                                <ExternalLink className="h-5 w-5" />
                                            </a>
                                        ) : (
                                            <span className="text-slate-300 cursor-not-allowed">
                                                <AlertCircle className="h-5 w-5" />
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 text-xs text-slate-500 flex justify-between items-center">
                <span>Mostrando {vehicles.length} vehículos</span>
                <span>Datos actualizados en tiempo real</span>
            </div>
        </div>
    );
}