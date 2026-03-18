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
    Edit3,
    Check,
    ScanSearch,
    CarFront,
    LayoutDashboard,
    Hash,
    Building2,
} from "lucide-react";
import type { VehicleImageAnalysis } from "@/types/vehicleImageAnalysis";
import { useState, useEffect, useMemo } from "react";
import { OpportunitiesCarousel } from "./OpportunitiesCarousel";
import { DateFormatter } from "@/utils/DateFormatter";
import { TextFormatter } from "@/utils/TextFormatter";
import { SoldBadge } from "./components/SoldBadge";
import { MileageBadge } from "./components/MileageBadge";
import { PriceBadge } from "./components/PriceBadge";
import { TimelineBadge } from "./components/TimelineBadge";
import { scraperService, getDerivedRegion, getDataQualityLabel } from "@/services/scraper.service";
import { extractTrim } from "./opportunitiesScorer";
import type { PriceStatistics, OpportunitiesTableViewProps } from "./interfaces";

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

// COMPONENTE ACTUALIZADO para editar motor
function MotorEditableField({
    vehicleId,
    initialMotor,
    onSave,
    onSuccess
}: {
    vehicleId: string;
    initialMotor: string | null;
    onSave?: (vehicleId: string, motor: string) => Promise<void>;
    onSuccess?: () => void; // NUEVO: callback después de guardar
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [motorValue, setMotorValue] = useState(initialMotor || '');
    const [isSaving, setIsSaving] = useState(false);

    // NUEVO: Actualizar cuando cambia el prop
    useEffect(() => {
        setMotorValue(initialMotor || '');
    }, [initialMotor]);

    const hasMotor = initialMotor !== null && initialMotor.trim() !== '';

    const handleSave = async () => {
        if (!motorValue.trim()) return;

        setIsSaving(true);
        try {
            if (onSave) {
                await onSave(vehicleId, motorValue.trim());
                if (onSuccess) {
                    onSuccess(); // Llamar callback de éxito
                }
            }
            setIsEditing(false);
        } catch (error) {
            console.error('Error guardando motor:', error);
            // Revertir al valor original si hay error
            setMotorValue(initialMotor || '');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setMotorValue(initialMotor || '');
        setIsEditing(false);
    };

    if (hasMotor && !isEditing) {
        return (
            <div className="flex items-center gap-2 group">
                <span className="text-zinc-700 font-bold text-sm">
                    {initialMotor}
                </span>
                <button
                    onClick={() => setIsEditing(true)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-100 rounded transition-all"
                    title="Editar motor"
                >
                    <Edit3 className="h-3 w-3 text-zinc-400" />
                </button>
            </div>
        );
    }

    if (isEditing || !hasMotor) {
        return (
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={motorValue}
                    onChange={(e) => setMotorValue(e.target.value)}
                    placeholder="Ej: 2.0l turbo diesel"
                    className="text-sm px-2 py-1 border border-zinc-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none w-full"
                    autoFocus={isEditing}
                    disabled={isSaving}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave();
                        if (e.key === 'Escape') handleCancel();
                    }}
                />
                <button
                    onClick={handleSave}
                    disabled={!motorValue.trim() || isSaving}
                    className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    title="Guardar"
                >
                    {isSaving ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Check className="h-3.5 w-3.5" />
                    )}
                </button>
                {hasMotor && (
                    <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="p-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                        title="Cancelar"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        );
    }

    return null;
}

const DateFormatterInstance = new DateFormatter(new TextFormatter());

export function OpportunitiesTableView({
    vehicles,
    isLoading,
    hasActiveFilters,
    onClearFilters,
    getPriceStatisticsForVehicle,
    onVehicleUpdate, // NUEVO
}: OpportunitiesTableViewProps) {
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithSeller | null>(null);
    const [vehicleStats, setVehicleStats] = useState<PriceStatistics | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // ACTUALIZADO: Función para guardar motor con recarga de datos
    const handleSaveMotor = async (vehicleId: string, motor: string) => {
        try {
            await scraperService.updateVehicleMotor(vehicleId, motor);
            console.log('✅ Motor actualizado correctamente');

            // NUEVO: Recargar datos después de guardar
            if (onVehicleUpdate) {
                onVehicleUpdate();
            }
        } catch (error) {
            console.error('❌ Error al guardar motor:', error);
            throw error; // Re-lanzar para que el componente hijo maneje el error
        }
    };

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
            // Temporal: omitimos `year` para evitar conflictos de tipo en build.
            getPriceStatisticsForVehicle(
                selectedVehicle.brand || '',
                selectedVehicle.model || ''
            )
                .then(stats => {
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
                                <th className="py-5 px-6 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Motor</th>
                                <th className="py-5 px-6 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Transmision</th>
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
                                    {/* Columna Vehículo: Imagen */}
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
                                                {/* <div className="absolute top-2 left-2">
                                                    <SoldBadge isSold={vehicle.is_sold} />
                                                </div> */}
                                                {vehicle.listing_image_urls && vehicle.listing_image_urls.length > 0 && (
                                                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                                                        +{vehicle.listing_image_urls.length}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Columna Marca/Modelo/Variante */}
                                    <td className="py-5 px-6">
                                        <div className="flex flex-col gap-1">
                                            <div className="font-black text-zinc-900 text-base md:text-lg leading-tight group-hover:text-red-600 transition-colors">
                                                {vehicle.brand?.toUpperCase()}
                                            </div>
                                            <div className="text-zinc-400 font-bold text-sm">
                                                {vehicle.model?.toUpperCase()}
                                            </div>
                                            {(() => {
                                                const trim = vehicle.trim ?? extractTrim(
                                                    [vehicle.title, vehicle.description, ...(vehicle.characteristics ?? [])].filter(Boolean).join(" ")
                                                );
                                                return trim ? (
                                                    <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 w-fit" title={vehicle.trim ? "Variante desde BD" : "Variante detectada del texto"}>
                                                        {trim}
                                                    </span>
                                                ) : null;
                                            })()}
                                        </div>
                                    </td>

                                    {/* Columna Motor - CON ACTUALIZACIÓN */}
                                    <td className="py-5 px-6" onClick={(e) => e.stopPropagation()}>
                                        <MotorEditableField
                                            vehicleId={vehicle.id}
                                            initialMotor={vehicle.motor}
                                            onSave={handleSaveMotor}
                                            onSuccess={onVehicleUpdate} // NUEVO: callback de actualización
                                        />
                                    </td>

                                    <td>
                                        <p className="text-center text-sm font-semibold text-zinc-500">
                                            {vehicle.transmission ?? 'Desconocido'}
                                        </p>
                                    </td>

                                    <td className="py-5 px-6">
                                        <div className="flex gap-2 text-[11px] font-semibold text-zinc-500 bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-100 w-fit">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span>{DateFormatterInstance.formatRelativeTime(vehicle.publication_date)}</span>
                                        </div>
                                    </td>

                                    {/* Columna Detalles (Año + Kilometraje + calidad del dato) */}
                                    <td className="py-5 px-6">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2 text-zinc-700 font-bold text-sm">
                                                <div className="text-zinc-400 font-bold text-sm">
                                                    Año:
                                                </div>
                                                <span>{vehicle.year || '----'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-zinc-600 text-sm font-semibold">
                                                <div className="text-zinc-400 font-bold text-sm">
                                                    km:
                                                </div>
                                                <span>{vehicle.mileage ? `${vehicle.mileage.toLocaleString()}` : '---'}</span>
                                            </div>
                                            <MileageBadge type={getMileageBadge(vehicle)} />
                                            {(() => {
                                                const quality = getDataQualityLabel(vehicle);
                                                const labels: Record<typeof quality, string> = { completo: 'Completo', falta_motor: 'Falta motor', falta_km: 'Falta km', incompleto: 'Incompleto' };
                                                const styles: Record<typeof quality, string> = {
                                                    completo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                                    falta_motor: 'bg-amber-50 text-amber-700 border-amber-200',
                                                    falta_km: 'bg-amber-50 text-amber-700 border-amber-200',
                                                    incompleto: 'bg-zinc-100 text-zinc-600 border-zinc-200',
                                                };
                                                return (
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border w-fit ${styles[quality]}`} title="Calidad del dato del listado">
                                                        {labels[quality]}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </td>

                                    {/* Columna Precio */}
                                    <td className="py-5 px-6">
                                        <div className="flex flex-col items-end gap-1.5">
                                            <div className="font-black text-zinc-900 tracking-tight text-xl md:text-2xl">
                                                ${vehicle.price ? vehicle.price.toLocaleString() : 'N/A'}
                                            </div>
                                            <PriceBadge type={getPriceBadge(vehicle)} />
                                        </div>
                                    </td>

                                    {/* Columna Ubicación (ciudad + región derivada) */}
                                    <td className="py-5 px-6">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-zinc-600 text-sm font-semibold">
                                                <div className="p-1.5 bg-zinc-50 rounded-lg">
                                                    <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                                                </div>
                                                <span className="capitalize">{vehicle.location || 'N/A'}</span>
                                            </div>
                                            {(vehicle.region ?? getDerivedRegion(vehicle.location)) && (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-fit ${(vehicle.region ?? getDerivedRegion(vehicle.location)) === 'costa' ? 'bg-sky-100 text-sky-700 border border-sky-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`} title={vehicle.region ? "Región desde BD" : "Región derivada de la ciudad"}>
                                                    {(vehicle.region ?? getDerivedRegion(vehicle.location)) === 'costa' ? 'Costa' : 'Sierra'}
                                                </span>
                                            )}
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
            </div >

            {
                selectedVehicle && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-6 bg-zinc-900/60 backdrop-blur-md animate-in h-[100vh] fade-in duration-300"
                        onClick={() => setSelectedVehicle(null)}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white w-full max-w-7xl h-[90vh] lg:h-[85vh] rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col lg:flex-row animate-in zoom-in-[0.98] slide-in-from-bottom-4 transition-all"
                        >
                            {/* LADO IZQUIERDO: Carousel (Asumiendo que ocupa el 50% o el espacio necesario) */}
                            <OpportunitiesCarousel vehicle={selectedVehicle} />

                            {/* LADO DERECHO: Información */}
                            <div className="flex-1 flex flex-col h-full bg-white relative">

                                {/* Header Fijo */}
                                <div className="p-6 lg:px-8 lg:pt-8 lg:pb-6 border-b border-zinc-100 flex flex-col gap-5 bg-white z-10 sticky top-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className="px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700 text-xs font-semibold uppercase tracking-wider">
                                                    {selectedVehicle.year}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 bg-zinc-50 px-2.5 py-1 rounded-md">
                                                    <Clock className="h-3.5 w-3.5 text-zinc-400" />
                                                    {DateFormatterInstance.formatRelativeTime(selectedVehicle.publication_date)}
                                                </div>
                                                <PriceBadge type={getPriceBadge(selectedVehicle)} />
                                                <SoldBadge isSold={selectedVehicle.is_sold} />
                                            </div>

                                            <div>
                                                <h2 className="text-3xl lg:text-4xl font-extrabold text-zinc-900 tracking-tight leading-none mb-1">
                                                    {selectedVehicle.brand?.toUpperCase()}{" "}
                                                    <span className="text-zinc-400 font-medium">{selectedVehicle.model?.toUpperCase()}</span>
                                                </h2>
                                                <p className="text-zinc-500 text-sm font-normal line-clamp-1 max-w-xl">
                                                    {selectedVehicle.title}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setSelectedVehicle(null)}
                                            className="p-2.5 rounded-full bg-zinc-50 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors border border-transparent hover:border-zinc-200"
                                            aria-label="Cerrar"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>

                                    {/* {vehicleStats && !loadingStats && (
                                        <div className="mt-2">
                                            {vehicleStats.min_price === vehicleStats.max_price ? (
                                                <div className="px-4 py-3 bg-zinc-50 rounded-xl flex items-center justify-center gap-2 text-center text-sm text-zinc-500">
                                                    <AlertCircle className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                                                    <span>Unidad única en el mercado actual. Promedio no disponible.</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between p-1 bg-zinc-50 rounded-2xl border border-zinc-100">
                                                    <div className="flex-1 p-3 text-center">
                                                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Valor Sugerido</span>
                                                        <div className="text-lg font-bold text-zinc-900">
                                                            ${vehicleStats.median_price ? Number(vehicleStats.median_price).toLocaleString() : 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div className="w-px h-8 bg-zinc-200"></div>
                                                    <div className="flex-1 flex justify-center items-center gap-6 p-3">
                                                        <div className="text-left">
                                                            <div className="flex items-center gap-1 mb-1">
                                                                <TrendingDown className="h-3 w-3 text-emerald-500" />
                                                                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Mínimo</span>
                                                            </div>
                                                            <div className="text-sm font-semibold text-zinc-700">
                                                                ${vehicleStats.min_price ? Number(vehicleStats.min_price).toLocaleString() : 'N/A'}
                                                            </div>
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="flex items-center gap-1 mb-1">
                                                                <TrendingUp className="h-3 w-3 text-rose-500" />
                                                                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Máximo</span>
                                                            </div>
                                                            <div className="text-sm font-semibold text-zinc-700">
                                                                ${vehicleStats.max_price ? Number(vehicleStats.max_price).toLocaleString() : 'N/A'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )} */}

                                    {/* {loadingStats && (
                                        <div className="mt-2 px-4 py-3 bg-zinc-50 rounded-xl flex items-center gap-3">
                                            <div className="w-4 h-4 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
                                            <span className="text-sm text-zinc-500">Analizando mercado...</span>
                                        </div>
                                    )}

                                    {!loadingStats && !vehicleStats && getPriceStatisticsForVehicle && (
                                        <div className="mt-2 px-4 py-3 bg-zinc-50 rounded-xl flex items-center gap-2 text-sm text-zinc-500">
                                            <TrendingUp className="h-4 w-4 text-zinc-400" />
                                            <span>Sin datos suficientes para este modelo.</span>
                                        </div>
                                    )} */}
                                </div>

                                {/* Cuerpo Scrollable */}
                                <div className="flex-1 overflow-y-auto p-6 lg:px-8 space-y-8 custom-scrollbar bg-zinc-50/30">

                                    {/* A. Precio y CTA - Destacado */}
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-1">
                                        <div>
                                            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">
                                                Precio de Venta
                                            </div>
                                            <div className="text-4xl md:text-5xl lg:text-6xl font-black text-zinc-900 tracking-tighter">
                                                ${selectedVehicle.price ? selectedVehicle.price.toLocaleString() : '---'}
                                            </div>
                                        </div>

                                        {selectedVehicle.url && (
                                            <a
                                                href={selectedVehicle.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-200 ${selectedVehicle.is_sold
                                                    ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                                                    : 'bg-zinc-900 hover:bg-black text-white shadow-[0_8px_16px_rgba(0,0,0,0.1)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 active:translate-y-0'
                                                    }`}
                                                {...(selectedVehicle.is_sold && {
                                                    onClick: (e) => e.preventDefault(),
                                                })}
                                            >
                                                {selectedVehicle.is_sold ? 'No disponible' : 'Ver en marketplace'}
                                                <ChevronRight className="h-5 w-5" />
                                            </a>
                                        )}
                                    </div>

                                    {/* B. Grid de Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                        {/* Card: Estado y Ubicación */}
                                        <div className="p-5 bg-white border border-zinc-100 rounded-2xl hover:border-zinc-200 transition-colors flex flex-col justify-center gap-3">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2 text-zinc-500">
                                                    <History className="h-4 w-4" />
                                                    <span className="text-sm font-medium">Condición</span>
                                                </div>
                                                <span className="text-sm font-semibold text-zinc-900">{displayTextCondition(selectedVehicle.condition || 'Usado')}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2 text-zinc-500">
                                                    <MapPin className="h-4 w-4" />
                                                    <span className="text-sm font-medium">Ubicación</span>
                                                </div>
                                                <span className="text-sm font-semibold text-zinc-900 capitalize truncate max-w-[120px] text-right">
                                                    {selectedVehicle.location || 'N/A'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Card: Especificaciones */}
                                        <div className="p-5 bg-white border border-zinc-100 rounded-2xl md:col-span-2">
                                            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Gauge className="h-4 w-4" />
                                                Especificaciones
                                            </h3>

                                            <div className="flex flex-col sm:flex-row gap-6">
                                                {/* Kilometraje destacado */}
                                                <div className="flex-shrink-0">
                                                    <span className="block text-xs text-zinc-500 mb-1">Kilometraje</span>
                                                    <span className="text-2xl font-bold text-zinc-900">
                                                        {selectedVehicle.mileage ? `${selectedVehicle.mileage.toLocaleString()} km` : 'N/A'}
                                                    </span>
                                                </div>

                                                {/* Etiquetas */}
                                                <div className="flex-1 flex flex-wrap gap-2 items-center">
                                                    {selectedVehicle.characteristics && selectedVehicle.characteristics.length > 0 ? (
                                                        selectedVehicle.characteristics.slice(0, 5).map((char, i) => (
                                                            <span key={i} className="text-xs font-medium px-3 py-1.5 bg-zinc-50 text-zinc-600 rounded-lg">
                                                                {char}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-sm text-zinc-400">Sin características especificadas</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card: Registro (Simplificado) */}
                                        <div className="p-5 bg-white border border-zinc-100 rounded-2xl">
                                            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <DatabaseIcon className="h-4 w-4" />
                                                Registro
                                            </h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-zinc-500">Publicación</span>
                                                    <span className="font-medium text-zinc-900">{formatAbsoluteDate(selectedVehicle.publication_date)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-zinc-500">Ingreso</span>
                                                    <span className="font-medium text-zinc-900">{formatAbsoluteDate(selectedVehicle.created_at)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card: Extras (Diseño menos agresivo que el negro anterior) */}
                                        <div className="p-5 bg-zinc-900 rounded-2xl">
                                            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-zinc-300" />
                                                Extras
                                            </h3>
                                            {selectedVehicle.extras && selectedVehicle.extras.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedVehicle.extras.map((extra, i) => (
                                                        <span key={i} className="text-xs font-medium text-zinc-300 bg-zinc-800 px-2.5 py-1 rounded-md">
                                                            {extra}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-zinc-500">No hay extras listados.</p>
                                            )}
                                        </div>

                                    </div>

                                    {/* C. Descripción */}
                                    {selectedVehicle.description && (
                                        <div className="pt-4">
                                            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <FileText className="h-4 w-4" />
                                                Descripción del anuncio
                                            </h3>
                                            <p className="text-zinc-600 text-sm leading-relaxed whitespace-pre-wrap">
                                                {selectedVehicle.description}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div >
                )
            }
        </>
    );
}