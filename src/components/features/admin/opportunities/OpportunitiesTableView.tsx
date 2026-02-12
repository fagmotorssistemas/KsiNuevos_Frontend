import { VehicleWithSeller } from "@/services/scraper.service";
import {
    Car,
    MapPin,
    ExternalLink,
    Search,
    Gauge,
    Calendar,
    Clock,
    X,
    FileText,
    Sparkles,
    Tag as TagIcon,
    History,
    Database as DatabaseIcon,
    Eye,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    DollarSign,
    AlertCircle,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { OpportunitiesCarousel } from "./OpportunitiesCarousel";
import { DateFormatter } from "@/utils/DateFormatter";
import { TextFormatter } from "@/utils/TextFormatter";
import { Database } from "@/types/supabase";

type PriceStatistics = Database['public']['Tables']['scraper_vehicle_price_statistics']['Row'];

interface OpportunitiesTableViewProps {
    vehicles: VehicleWithSeller[];
    isLoading: boolean;
    hasActiveFilters: boolean;
    onClearFilters: () => void;
    getPriceStatisticsForVehicle?: (brand: string, model: string, year?: string) => Promise<PriceStatistics | null>;
}

function formatAbsoluteDate(dateString: string | null | undefined): string {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch {
        return "N/A";
    }
}

const displayTextCondition = (condition: string) => {
    switch (condition) {
        case "PC_USED_LIKE_NEW": return "Como nuevo";
        case "PC_USED_GOOD": return "Buen estado";
        case "USED": return "Usado";
        case "NEW_ITEM": return "Nuevo";
        default: return condition;
    }
};

// --- PRICE BADGE ---
function PriceBadge({ type }: { type: 'min' | 'max' | null }) {
    if (!type) return null;

    if (type === 'min') {
        return (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wide">
                <TrendingDown className="h-2.5 w-2.5" />
                Menor precio
            </div>
        );
    }

    return (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold uppercase tracking-wide">
            <TrendingUp className="h-2.5 w-2.5" />
            Mayor precio
        </div>
    );
}

function MileageBadge({ type }: { type: 'min' | 'max' | null }) {
    if (!type) return null;

    if (type === 'min') {
        return (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wide">
                <TrendingDown className="h-2.5 w-2.5" />
                Menor kilometraje
            </div>
        );
    }

    return (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-bold uppercase tracking-wide">
            <TrendingUp className="h-2.5 w-2.5" />
            Mayor kilometraje
        </div>
    );
}
// --- TIMELINE BADGE ---
function TimelineBadge({ label, value, icon: Icon, accent = false }: {
    label: string;
    value: string;
    icon: React.ElementType;
    accent?: boolean;
}) {
    return (
        <li className="flex items-start gap-3">
            <div className={`mt-0.5 p-1.5 rounded-md shrink-0 ${accent ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-500'}`}>
                <Icon className="h-3 w-3" />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</span>
                <span className="text-xs font-semibold text-zinc-900 mt-0.5">{value}</span>
            </div>
        </li>
    );
}

const DateFormatterInstance = new DateFormatter(new TextFormatter());

export function OpportunitiesTableView({
    vehicles,
    isLoading,
    hasActiveFilters,
    onClearFilters,
    getPriceStatisticsForVehicle,
}: OpportunitiesTableViewProps) {
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithSeller | null>(null);
    const [vehicleStats, setVehicleStats] = useState<PriceStatistics | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // Calcular min/max por marca+modelo dentro del listado actual
    const priceRangeByModel = useMemo(() => {
        const map = new Map<string, { min: number; max: number; minId: string; maxId: string }>();

        vehicles.forEach((v) => {

            if (!v.price || !v.brand || !v.model || !v.year) return;
            const year = v.year;
            const key = `${v.brand.toLowerCase()}__${v.model.toLowerCase()}__${year}`;
            const existing = map.get(key);

            if (!existing) {
                map.set(key, { min: v.price, max: v.price, minId: v.id, maxId: v.id });
            } else {
                if (v.price < existing.min) {
                    existing.min = v.price;
                    existing.minId = v.id;
                }
                if (v.price > existing.max) {
                    existing.max = v.price;
                    existing.maxId = v.id;
                }
            }
        });

        return map;
    }, [vehicles]);

    const mileageRangeByModel = useMemo(() => {
        const map = new Map<string, { min: number; max: number; minId: string; maxId: string }>();

        vehicles.forEach((v) => {
            if (!v.mileage || !v.brand || !v.model) return;
            const year = v.year ?? 'unknown';
            const key = `${v.brand.toLowerCase()}__${v.model.toLowerCase()}__${year}`;
            const existing = map.get(key);

            if (!existing) {
                map.set(key, { min: v.mileage, max: v.mileage, minId: v.id, maxId: v.id });
            } else {
                if (v.mileage < existing.min) {
                    existing.min = v.mileage;
                    existing.minId = v.id;
                }
                if (v.mileage > existing.max) {
                    existing.max = v.mileage;
                    existing.maxId = v.id;
                }
            }
        });

        return map;
    }, [vehicles]);

    const getMileageBadge = (vehicle: VehicleWithSeller): 'min' | 'max' | null => {
        if (!vehicle.mileage || !vehicle.brand || !vehicle.model) return null;
        const year = vehicle.year ?? 'unknown';
        const key = `${vehicle.brand.toLowerCase()}__${vehicle.model.toLowerCase()}__${year}`;
        const range = mileageRangeByModel.get(key);
        if (!range || range.min === range.max) return null;
        if (vehicle.id === range.minId) return 'min';
        if (vehicle.id === range.maxId) return 'max';
        return null;
    };

    const getPriceBadge = (vehicle: VehicleWithSeller): 'min' | 'max' | null => {
        if (!vehicle.price || !vehicle.brand || !vehicle.model || !vehicle.year) return null;
        const year = vehicle.year;
        const key = `${vehicle.brand.toLowerCase()}__${vehicle.model.toLowerCase()}__${year}`
        const range = priceRangeByModel.get(key);
        if (!range || range.min === range.max) return null;
        if (vehicle.id === range.minId) return 'min';
        if (vehicle.id === range.maxId) return 'max';
        return null;
    };

    // Cargar estadísticas cuando se selecciona un vehículo
    useEffect(() => {
        if (selectedVehicle && getPriceStatisticsForVehicle) {
            setLoadingStats(true);
            console.log('🔍 Buscando estadísticas para:', {
                brand: selectedVehicle.brand,
                model: selectedVehicle.model,
                year: selectedVehicle.year
            });

            getPriceStatisticsForVehicle(
                selectedVehicle.brand || '',
                selectedVehicle.model || '',
                selectedVehicle.year || undefined
            )
                .then(stats => {
                    console.log('✅ Estadísticas recibidas:', stats);
                    setVehicleStats(stats);
                })
                .catch(err => {
                    console.error('❌ Error cargando estadísticas:', err);
                    setVehicleStats(null);
                })
                .finally(() => setLoadingStats(false));
        } else {
            setVehicleStats(null);
            if (!getPriceStatisticsForVehicle) {
                console.warn('⚠️ getPriceStatisticsForVehicle no está definida');
            }
        }
    }, [selectedVehicle, getPriceStatisticsForVehicle]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 space-y-6 bg-white rounded-3xl border border-zinc-100 shadow-sm">
                <div className="relative">
                    <div className="w-16 h-16 border-[3px] border-zinc-100 border-t-red-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Car className="h-6 w-6 text-zinc-400" />
                    </div>
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-zinc-900">Actualizando catálogo</h3>
                    <p className="text-zinc-500 text-sm mt-1">Sincronizando mejores ofertas...</p>
                </div>
            </div>
        );
    }

    if (vehicles.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 bg-zinc-50/50 rounded-3xl border-2 border-dashed border-zinc-200">
                <div className="p-5 bg-white shadow-sm border border-zinc-100 rounded-2xl mb-5">
                    <Search className="h-8 w-8 text-zinc-400" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900">Sin resultados</h3>
                <p className="text-zinc-500 max-w-md text-center mt-2 mb-6">
                    No encontramos vehículos con esos criterios específicos.
                </p>
                {hasActiveFilters && (
                    <button
                        onClick={onClearFilters}
                        className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-all shadow-lg shadow-zinc-200"
                    >
                        Limpiar filtros
                    </button>
                )}
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-3xl border border-zinc-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50/80 border-b border-zinc-100">
                                <th className="py-5 px-6 text-[11px] font-bold text-zinc-400 uppercase tracking-widest w-[200px]">Vehículo</th>
                                <th className="py-5 px-6 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Marca / Modelo</th>
                                <th className="py-5 px-6 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Publicado</th>
                                <th className="py-5 px-6 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Detalles</th>
                                <th className="py-5 px-6 text-[11px] font-bold text-zinc-400 uppercase tracking-widest text-right">Precio</th>
                                <th className="py-5 px-6 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Ubicación</th>
                                <th className="py-5 px-6 text-[11px] font-bold text-zinc-400 uppercase tracking-widest text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50 text-sm">
                            {vehicles.map((vehicle) => (
                                <tr
                                    key={vehicle.id}
                                    onClick={() => setSelectedVehicle(vehicle)}
                                    className="hover:bg-red-50/40 transition-all group cursor-pointer"
                                >
                                    {/* Columna Vehículo: Imagen + Timestamp */}
                                    <td className="py-5 px-6">
                                        <div className="flex gap-4 items-center">
                                            <div className="h-20 w-32 bg-zinc-100 rounded-xl overflow-hidden flex-shrink-0 border border-zinc-200 relative shadow-sm">
                                                {vehicle.image_url ? (
                                                    <img
                                                        src={vehicle.image_url}
                                                        alt={vehicle.title || 'Vehículo'}
                                                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                            ((e.target as HTMLImageElement).nextSibling as HTMLElement).style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <div className={`absolute inset-0 flex items-center justify-center bg-zinc-100 ${vehicle.image_url ? 'hidden' : 'flex'}`}>
                                                    <Car className="h-7 w-7 text-zinc-300" />
                                                </div>
                                                {vehicle.listing_image_urls && vehicle.listing_image_urls.length > 0 && (
                                                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                                                        +{vehicle.listing_image_urls.length}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Columna Marca/Modelo */}
                                    <td className="py-5 px-6">
                                        <div className="flex flex-col gap-1">
                                            <div className="font-black text-zinc-900 text-lg leading-tight group-hover:text-red-600 transition-colors">
                                                {vehicle.brand?.toUpperCase()}
                                            </div>
                                            <div className="text-zinc-400 font-bold text-sm">
                                                {vehicle.model?.toUpperCase()}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className="flex gap-2 text-[11px] font-semibold text-zinc-500 bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-100 w-fit">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span>{DateFormatterInstance.formatRelativeTime(vehicle.publication_date)}</span>
                                        </div>
                                    </td>

                                    {/* Columna Detalles (Año + Kilometraje) */}
                                    <td className="py-5 px-6">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2 text-zinc-700 font-bold text-sm">
                                                <div className="p-1.5 bg-zinc-900 rounded-lg">
                                                    <Calendar className="h-3.5 w-3.5 text-white" />
                                                </div>
                                                <span>{vehicle.year || '----'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-zinc-600 text-sm font-semibold">
                                                <div className="p-1.5 bg-zinc-100 rounded-lg">
                                                    <Gauge className="h-3.5 w-3.5 text-zinc-500" />
                                                </div>
                                                <span>{vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : '---'}</span>
                                            </div>
                                            <MileageBadge type={getMileageBadge(vehicle)} />
                                        </div>
                                    </td>

                                    {/* Columna Precio */}
                                    <td className="py-5 px-6">
                                        <div className="flex flex-col items-end gap-1.5">
                                            <div className="font-black text-zinc-900 tracking-tight text-2xl">
                                                ${vehicle.price ? vehicle.price.toLocaleString() : 'N/A'}
                                            </div>
                                            <PriceBadge type={getPriceBadge(vehicle)} />
                                        </div>
                                    </td>

                                    {/* Columna Ubicación */}
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-2 text-zinc-600 text-sm font-semibold">
                                            <div className="p-1.5 bg-zinc-50 rounded-lg">
                                                <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                                            </div>
                                            <span className="capitalize">{vehicle.location || 'N/A'}</span>
                                        </div>
                                    </td>

                                    {/* Columna Acciones */}
                                    <td className="py-5 px-6">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedVehicle(vehicle);
                                                }}
                                                className="p-2.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-zinc-200 hover:border-red-200 group/icon shadow-sm"
                                                title="Ver detalles"
                                            >
                                                <Eye className="h-5 w-5 transition-transform group-hover/icon:scale-110" />
                                            </button>

                                            <a
                                                href={vehicle.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-2.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-zinc-200 hover:border-emerald-200 group/link shadow-sm"
                                                title="Abrir en Marketplace"
                                            >
                                                <ExternalLink className="h-5 w-5 transition-transform group-hover/link:scale-110" />
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="bg-gradient-to-r from-zinc-50 to-zinc-100/50 border-t border-zinc-200 px-8 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 flex justify-between items-center">
                    <span className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-red-600"></div>
                        {vehicles.length} {vehicles.length === 1 ? 'Resultado' : 'Resultados'}
                    </span>
                    <span className="text-zinc-400 text-[10px]">Actualizado recientemente</span>
                </div>
            </div>

            {/* --- MODAL SPLIT VIEW --- */}
            {selectedVehicle && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-6 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setSelectedVehicle(null)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white w-full max-w-7xl h-[90vh] lg:h-[85vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col lg:flex-row animate-in zoom-in-95 slide-in-from-bottom-8"
                    >
                        {/* LADO IZQUIERDO: Carousel */}
                        <OpportunitiesCarousel vehicle={selectedVehicle} />

                        {/* LADO DERECHO: Información */}
                        <div className="flex-1 flex flex-col h-full bg-white relative">

                            {/* Header Fijo */}
                            <div className="p-6 lg:p-8 pb-5 border-b border-zinc-100 flex flex-col gap-4 bg-gradient-to-b from-white to-zinc-50/30 z-10">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-bold uppercase tracking-wider shadow-sm">
                                                {selectedVehicle.year}
                                            </span>
                                            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider bg-white px-3 py-1.5 rounded-lg border border-zinc-200 shadow-sm">
                                                <Clock className="h-3.5 w-3.5" />
                                                {DateFormatterInstance.formatRelativeTime(selectedVehicle.publication_date)}
                                            </div>
                                            <PriceBadge type={getPriceBadge(selectedVehicle)} />

                                        </div>
                                        <h2 className="text-3xl lg:text-4xl font-black text-zinc-900 tracking-tight leading-none mb-2">
                                            {selectedVehicle.brand?.toUpperCase()}{" "}
                                            <span className="text-zinc-400">{selectedVehicle.model?.toUpperCase()}</span>
                                        </h2>
                                        <p className="text-zinc-500 text-sm font-medium line-clamp-2 max-w-2xl">{selectedVehicle.title}</p>
                                    </div>

                                    <button
                                        onClick={() => setSelectedVehicle(null)}
                                        className="p-3 rounded-xl bg-zinc-100 hover:bg-red-50 text-zinc-500 hover:text-red-600 transition-all border border-zinc-200 hover:border-red-200 shadow-sm"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Price Statistics Bar */}
                                {vehicleStats && !loadingStats && (
                                    <>
                                        {vehicleStats.min_price === vehicleStats.max_price ? (
                                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-3 text-center">
                                                <AlertCircle className="h-5 w-5 text-slate-400 flex-shrink-0" />
                                                <p className="text-sm font-medium text-slate-500">
                                                    Unidad única detectada: No hay suficientes carros para promediar un precio.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="p-1 bg-blue-100 rounded-md">
                                                            <DollarSign className="h-3 w-3 text-blue-600" />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Precio Sugerido</span>
                                                    </div>
                                                    <div className="text-xl font-black text-blue-700">
                                                        ${vehicleStats.median_price ? Number(vehicleStats.median_price).toLocaleString() : 'N/A'}
                                                    </div>
                                                </div>

                                                <div className="p-3 bg-green-50 border border-green-100 rounded-xl">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="p-1 bg-green-100 rounded-md">
                                                            <TrendingDown className="h-3 w-3 text-green-600" />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Más Barato</span>
                                                    </div>
                                                    <div className="text-xl font-black text-green-700">
                                                        ${vehicleStats.min_price ? Number(vehicleStats.min_price).toLocaleString() : 'N/A'}
                                                    </div>
                                                </div>

                                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="p-1 bg-red-100 rounded-md">
                                                            <TrendingUp className="h-3 w-3 text-red-600" />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Más Caro</span>
                                                    </div>
                                                    <div className="text-xl font-black text-red-700">
                                                        ${vehicleStats.max_price ? Number(vehicleStats.max_price).toLocaleString() : 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {loadingStats && (
                                    <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"></div>
                                            <span className="text-xs text-zinc-500 font-semibold">Cargando estadísticas de mercado...</span>
                                        </div>
                                    </div>
                                )}

                                {!loadingStats && !vehicleStats && getPriceStatisticsForVehicle && (
                                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-amber-100 rounded-md">
                                                <TrendingUp className="h-4 w-4 text-amber-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-amber-700 font-semibold">
                                                    No hay estadísticas disponibles para este modelo
                                                </p>
                                                <p className="text-[10px] text-amber-600 mt-0.5">
                                                    {selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.year}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Cuerpo Scrollable */}
                            <div className="flex-1 overflow-y-auto p-6 lg:p-8 pt-6 space-y-6 custom-scrollbar">

                                {/* A. Precio y CTA */}
                                <div className="flex flex-col sm:flex-row items-end justify-between gap-4 p-6 bg-gradient-to-br from-zinc-50 via-white to-zinc-50/50 rounded-2xl border border-zinc-200 shadow-sm">
                                    <div>
                                        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <TagIcon className="h-3.5 w-3.5" />
                                            Precio de Venta
                                        </div>
                                        <div className="text-5xl lg:text-6xl font-black text-zinc-900 tracking-tighter">
                                            ${selectedVehicle.price ? selectedVehicle.price.toLocaleString() : '---'}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        {selectedVehicle.url && (
                                            <a
                                                href={selectedVehicle.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 sm:flex-none px-6 py-4 bg-zinc-900 hover:bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-zinc-900/10 hover:shadow-red-600/20 hover:scale-[1.02] active:scale-[0.98]"
                                            >
                                                Ver en marketplace
                                                <ChevronRight className="h-5 w-5" />
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* B. Grid de Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                    {/* Card: Estado */}
                                    <div className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.04)] transition-shadow">
                                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                                            <div className="p-1.5 bg-zinc-100 rounded-lg">
                                                <History className="h-4 w-4 text-zinc-500" />
                                            </div>
                                            Estado
                                        </h3>
                                        <ul className="space-y-4">
                                            <li className="flex justify-between items-center text-sm pb-3 border-b border-zinc-100">
                                                <span className="text-zinc-500 font-semibold">Condición</span>
                                                <span className="font-bold text-zinc-900 bg-zinc-50 px-3 py-1.5 rounded-lg">{displayTextCondition(selectedVehicle.condition || 'Usado')}</span>
                                            </li>
                                            <li className="flex justify-between items-center text-sm pb-3 border-b border-zinc-100">
                                                <span className="text-zinc-500 font-semibold">Ubicación</span>
                                                <span className="font-bold text-zinc-900 capitalize flex items-center gap-1.5">
                                                    <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                                                    {selectedVehicle.location || 'N/A'}
                                                </span>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Card: Specs */}
                                    <div className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.04)] transition-shadow">
                                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                                            <div className="p-1.5 bg-zinc-100 rounded-lg">
                                                <Gauge className="h-4 w-4 text-zinc-500" />
                                            </div>
                                            Especificaciones
                                        </h3>
                                        <div className="mb-5 pb-4 border-b border-zinc-100 flex justify-between items-center">
                                            <span className="text-sm text-zinc-500 font-semibold">Kilometraje</span>
                                            <span className="text-xl font-black text-zinc-900 bg-zinc-50 px-3 py-1.5 rounded-lg">
                                                {selectedVehicle.mileage ? selectedVehicle.mileage.toLocaleString() + ' km' : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedVehicle.characteristics && selectedVehicle.characteristics.length > 0 ? (
                                                selectedVehicle.characteristics.slice(0, 4).map((char, i) => (
                                                    <span key={i} className="text-xs font-bold px-3 py-1.5 bg-zinc-50 text-zinc-700 rounded-lg border border-zinc-200 hover:bg-zinc-100 transition-colors">
                                                        {char}
                                                    </span>
                                                ))
                                            ) : <span className="text-xs text-zinc-400 italic">Sin datos disponibles</span>}
                                        </div>
                                    </div>

                                    {/* Card: Registro */}
                                    <div className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.04)] transition-shadow">
                                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                                            <div className="p-1.5 bg-zinc-100 rounded-lg">
                                                <DatabaseIcon className="h-4 w-4 text-zinc-500" />
                                            </div>
                                            Línea de tiempo
                                        </h3>
                                        <ul className="space-y-4">
                                            <TimelineBadge
                                                label="Publicado"
                                                value={formatAbsoluteDate(selectedVehicle.publication_date)}
                                                icon={Eye}
                                            />
                                            <TimelineBadge
                                                label="Añadido al sistema"
                                                value={formatAbsoluteDate(selectedVehicle.created_at)}
                                                icon={DatabaseIcon}
                                                accent
                                            />
                                        </ul>
                                    </div>

                                    {/* Card: Extras */}
                                    <div className="p-6 bg-zinc-900 rounded-2xl shadow-lg shadow-zinc-900/20 text-white hover:shadow-xl hover:shadow-zinc-900/30 transition-shadow">
                                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <div className="p-1.5 bg-zinc-800 rounded-lg">
                                                <Sparkles className="h-4 w-4 text-red-400" />
                                            </div>
                                            Extras Destacados
                                        </h3>
                                        {selectedVehicle.extras && selectedVehicle.extras.length > 0 ? (
                                            <div className="flex flex-wrap gap-3">
                                                {selectedVehicle.extras.map((extra, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-sm font-semibold text-zinc-100 bg-zinc-800 px-3 py-2 rounded-lg border border-zinc-700">
                                                        <TagIcon className="h-3.5 w-3.5 text-red-400" />
                                                        {extra}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-zinc-400 italic">No se especifican extras adicionales.</p>
                                        )}
                                    </div>
                                </div>

                                {/* C. Descripción */}
                                <div className="pt-2 border-t border-zinc-100">
                                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <div className="p-1.5 bg-zinc-100 rounded-lg">
                                            <FileText className="h-4 w-4 text-zinc-500" />
                                        </div>
                                        Nota del Vendedor
                                    </h3>
                                    <div className="p-5 bg-zinc-50/50 rounded-xl border border-zinc-100">
                                        <p className="text-zinc-600 text-sm leading-relaxed whitespace-pre-wrap">
                                            {selectedVehicle.description || "Sin descripción detallada disponible."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}