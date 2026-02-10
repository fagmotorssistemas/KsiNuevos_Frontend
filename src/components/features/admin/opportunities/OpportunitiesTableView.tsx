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
    Database,
    Eye,
} from "lucide-react";
import { useState } from "react";
import { OpportunitiesCarousel } from "./OpportunitiesCarousel";

interface OpportunitiesTableViewProps {
    vehicles: VehicleWithSeller[];
    isLoading: boolean;
    hasActiveFilters: boolean;
    onClearFilters: () => void;
}

// --- UTILIDADES ---
const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatRelativeTime(dateString: string | null | undefined): string {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        let formatted: string;
        if (diffInSeconds < 60) formatted = rtf.format(-Math.floor(diffInSeconds), 'second');
        else if (diffInSeconds < 3600) formatted = rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
        else if (diffInSeconds < 86400) formatted = rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
        else if (diffInSeconds < 604800) formatted = rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
        else if (diffInSeconds < 2592000) formatted = rtf.format(-Math.floor(diffInSeconds / 604800), 'week');
        else if (diffInSeconds < 31536000) formatted = rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
        else formatted = rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
        return capitalize(formatted);
    } catch {
        return "Fecha no disponible";
    }
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

export function OpportunitiesTableView({
    vehicles,
    isLoading,
    hasActiveFilters,
    onClearFilters,
}: OpportunitiesTableViewProps) {
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithSeller | null>(null);

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
                                <th className="py-5 px-6 text-[11px] font-bold text-zinc-400 uppercase tracking-widest w-[380px]">Vehículo</th>
                                <th className="py-5 px-6 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Características</th>
                                <th className="py-5 px-6 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Precio</th>
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
                                    <td className="py-4 px-6">
                                        <div className="flex gap-4 items-center">
                                            <div className="h-16 w-24 bg-zinc-100 rounded-xl overflow-hidden flex-shrink-0 border border-zinc-200 relative shadow-sm">
                                                {vehicle.image_url ? (
                                                    <img
                                                        src={vehicle.image_url}
                                                        alt={vehicle.title || 'Vehículo'}
                                                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                            ((e.target as HTMLImageElement).nextSibling as HTMLElement).style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <div className={`absolute inset-0 flex items-center justify-center bg-zinc-100 ${vehicle.image_url ? 'hidden' : 'flex'}`}>
                                                    <Car className="h-6 w-6 text-zinc-300" />
                                                </div>
                                                {/* Badge contador de fotos extra */}
                                                {vehicle.listing_image_urls && vehicle.listing_image_urls.length > 0 && (
                                                    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm leading-none">
                                                        +{vehicle.listing_image_urls.length}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-0.5">
                                                <div className="font-bold text-zinc-800 text-base line-clamp-1 group-hover:text-red-600 transition-colors">
                                                    {vehicle.brand?.toUpperCase()} <span className="text-zinc-400 font-medium">{vehicle.model?.toUpperCase()}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                                    <Clock className="h-3 w-3" />
                                                    <span>{formatRelativeTime(vehicle.publication_date)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="py-4 px-6">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-zinc-600 font-semibold text-xs bg-zinc-100 w-fit px-2 py-1 rounded-md">
                                                <Calendar className="h-3 w-3 text-zinc-500" />
                                                {vehicle.year || '----'}
                                            </div>
                                            <div className="flex items-center gap-2 text-zinc-500 text-xs px-1">
                                                <Gauge className="h-3 w-3 text-zinc-400" />
                                                {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : '---'}
                                            </div>
                                        </div>
                                    </td>

                                    <td className="py-4 px-6">
                                        <span className="font-black text-zinc-900 tracking-tight text-lg">
                                            ${vehicle.price ? vehicle.price.toLocaleString() : 'N/A'}
                                        </span>
                                    </td>

                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-1.5 text-zinc-600 text-xs font-medium">
                                            <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                                            {vehicle.location || 'N/A'}
                                        </div>
                                    </td>

                                    <td className="py-4 px-6">
                                        <div className="flex items-center justify-center gap-2">
                                            {/* Botón de Vista Previa (Modal) */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedVehicle(vehicle);
                                                }}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 group/icon"
                                                title="Ver detalles"
                                            >
                                                <Eye className="h-5 w-5 transition-transform group-hover/icon:scale-110" />
                                            </button>

                                            {/* Enlace Externo */}
                                            <a
                                                href={vehicle.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()} // Evita que se abra el modal al querer ir al link
                                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-100 group/link"
                                                title="Abrir en Marketplace"
                                            >
                                                <ExternalLink className="h-5 w-5 transition-transform group-link:scale-110" />
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="bg-zinc-50 border-t border-zinc-200 px-8 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex justify-between items-center">
                    <span>{vehicles.length} Resultados encontrados</span>
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
                            <div className="p-6 lg:p-8 pb-4 border-b border-zinc-100 flex items-start justify-between gap-4 bg-white z-10">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2.5 py-1 rounded-md bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-wider">
                                            {selectedVehicle.year}
                                        </span>
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-100">
                                            <Clock className="h-3 w-3" />
                                            {formatRelativeTime(selectedVehicle.publication_date)}
                                        </div>
                                    </div>
                                    <h2 className="text-2xl lg:text-4xl font-black text-zinc-900 tracking-tight leading-none">
                                        {selectedVehicle.brand?.toUpperCase()}{" "}
                                        <span className="text-zinc-400">{selectedVehicle.model?.toUpperCase()}</span>
                                    </h2>
                                    <p className="text-zinc-500 text-sm font-medium mt-1 line-clamp-1">{selectedVehicle.title}</p>
                                </div>

                                <button
                                    onClick={() => setSelectedVehicle(null)}
                                    className="p-2.5 rounded-full bg-zinc-50 hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors border border-transparent hover:border-red-100"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Cuerpo Scrollable */}
                            <div className="flex-1 overflow-y-auto p-6 lg:p-8 pt-6 space-y-5 custom-scrollbar">

                                {/* A. Precio y CTA */}
                                <div className="flex flex-col sm:flex-row items-end justify-between gap-4 p-5 bg-gradient-to-br from-zinc-50 to-white rounded-2xl border border-zinc-100 shadow-sm">
                                    <div>
                                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Precio de Venta</div>
                                        <div className="text-4xl lg:text-5xl font-black text-zinc-900 tracking-tighter">
                                            ${selectedVehicle.price ? selectedVehicle.price.toLocaleString() : '---'}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        {selectedVehicle.url && (
                                            <a
                                                href={selectedVehicle.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 sm:flex-none px-6 py-3.5 bg-zinc-900 hover:bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-zinc-200 hover:shadow-red-200"
                                            >
                                                Ver en marketplace
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* B. Grid de Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                    {/* Card: Estado */}
                                    <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                                        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <History className="h-3.5 w-3.5 text-zinc-400" /> Estado
                                        </h3>
                                        <ul className="space-y-3">
                                            <li className="flex justify-between text-sm">
                                                <span className="text-zinc-500 font-medium">Condición</span>
                                                <span className="font-bold text-zinc-900">{displayTextCondition(selectedVehicle.condition || 'Usado')}</span>
                                            </li>
                                            <li className="flex justify-between text-sm">
                                                <span className="text-zinc-500 font-medium">Ubicación</span>
                                                <span className="font-bold text-zinc-900 capitalize">{selectedVehicle.location || 'N/A'}</span>
                                            </li>
                                            {selectedVehicle.seller?.is_dealer && (
                                                <li className="flex justify-between text-sm">
                                                    <span className="text-zinc-500 font-medium">Tipo</span>
                                                    <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded-md uppercase tracking-wide border border-red-100">Concesionario</span>
                                                </li>
                                            )}
                                        </ul>
                                    </div>

                                    {/* Card: Specs */}
                                    <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                                        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Gauge className="h-3.5 w-3.5 text-zinc-400" /> Specs
                                        </h3>
                                        <div className="mb-4 pb-3 border-b border-zinc-50 flex justify-between items-center">
                                            <span className="text-sm text-zinc-500 font-medium">Kilometraje</span>
                                            <span className="text-lg font-bold text-zinc-900">{selectedVehicle.mileage ? selectedVehicle.mileage.toLocaleString() + ' km' : 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedVehicle.characteristics && selectedVehicle.characteristics.length > 0 ? (
                                                selectedVehicle.characteristics.slice(0, 4).map((char, i) => (
                                                    <span key={i} className="text-[10px] font-bold px-2 py-1 bg-zinc-50 text-zinc-600 rounded border border-zinc-100">{char}</span>
                                                ))
                                            ) : <span className="text-xs text-zinc-400 italic">Sin datos</span>}
                                        </div>
                                    </div>

                                    {/* Card: Registro */}
                                    <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                                        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Database className="h-3.5 w-3.5 text-zinc-400" /> Registro
                                        </h3>
                                        <ul className="space-y-3.5">
                                            <TimelineBadge
                                                label="Publicado"
                                                value={formatAbsoluteDate(selectedVehicle.publication_date)}
                                                icon={Eye}
                                            />
                                            <TimelineBadge
                                                label="Añadido al sistema"
                                                value={formatAbsoluteDate(selectedVehicle.created_at)}
                                                icon={Database}
                                                accent
                                            />
                                        </ul>
                                    </div>

                                    {/* Card: Extras */}
                                    <div className="p-5 bg-zinc-900 rounded-2xl shadow-lg shadow-zinc-200 text-white">
                                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Sparkles className="h-3.5 w-3.5 text-red-400" /> Extras Destacados
                                        </h3>
                                        {selectedVehicle.extras && selectedVehicle.extras.length > 0 ? (
                                            <div className="flex flex-wrap gap-x-6 gap-y-2">
                                                {selectedVehicle.extras.map((extra, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                                                        <TagIcon className="h-3 w-3 text-red-400" />
                                                        {extra}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-zinc-600 italic">No se especifican extras adicionales.</p>
                                        )}
                                    </div>
                                </div>

                                {/* C. Descripción */}
                                <div className="pt-4 border-t border-zinc-100">
                                    <h3 className="text-[11px] font-bold text-zinc-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-zinc-400" /> Nota del Vendedor
                                    </h3>
                                    <p className="text-zinc-600 text-sm leading-7 whitespace-pre-wrap">
                                        {selectedVehicle.description || "Sin descripción detallada disponible."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}