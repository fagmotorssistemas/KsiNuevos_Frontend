import { useState } from "react";
import {
    Wrench,
    Store,
    User,
    MapPin,
    Clock,
    ChevronRight,
    Tag,
    TrendingDown,
    ArrowRight,
    Star
} from "lucide-react";
import { DateFormatter } from "@/utils/DateFormatter";
import { TextFormatter } from "@/utils/TextFormatter";
import { OpportunitiesVehiclePreviewModal } from "./OpportunitiesVehiclePreviewModal";
import { ScoredVehicle } from "./opportunitiesScorer";

export type VehicleViewType = "ALL" | "PATIO" | "TALLER" | "CLIENTE";

export interface OpportunitiesWizardSelectionProps {
    topOpportunities: ScoredVehicle[];
    onViewAll: () => void;
    isLoading?: boolean;
}

export const CARD_CONFIG: Record<VehicleViewType, {
    label: string;
    icon: any;
    badge: string | null;
    accentBorder: string;
    accentHover: string;
    accentShadow: string;
    accentBar: string;
    iconBg: string;
    iconColor: string;
    badgeBg: string;
    badgeColor: string;
    tagBg: string;
    tagText: string;
}> = {
    ALL: {
        label: "Mejor Oportunidad",
        icon: Star,
        badge: "Top Deal",
        accentBorder: "border-amber-200",
        accentHover: "hover:border-amber-400",
        accentShadow: "hover:shadow-amber-100",
        accentBar: "via-amber-400",
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
        badgeBg: "bg-amber-50",
        badgeColor: "text-amber-700",
        tagBg: "bg-amber-600",
        tagText: "text-white",
    },
    PATIO: {
        label: "En Patio",
        icon: Store,
        badge: "Recomendado",
        accentBorder: "border-emerald-100",
        accentHover: "hover:border-emerald-400",
        accentShadow: "hover:shadow-emerald-100",
        accentBar: "via-emerald-400",
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        badgeBg: "bg-emerald-50",
        badgeColor: "text-emerald-700",
        tagBg: "bg-emerald-600",
        tagText: "text-white",
    },
    TALLER: {
        label: "Posible Falla",
        icon: Wrench,
        badge: null,
        accentBorder: "border-orange-100",
        accentHover: "hover:border-orange-400",
        accentShadow: "hover:shadow-orange-100",
        accentBar: "via-orange-400",
        iconBg: "bg-orange-50",
        iconColor: "text-orange-600",
        badgeBg: "",
        badgeColor: "",
        tagBg: "bg-orange-500",
        tagText: "text-white",
    },
    CLIENTE: {
        label: "En Cliente",
        icon: User,
        badge: null,
        accentBorder: "border-blue-100",
        accentHover: "hover:border-blue-400",
        accentShadow: "hover:shadow-blue-100",
        accentBar: "via-blue-400",
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
        badgeBg: "",
        badgeColor: "",
        tagBg: "bg-blue-600",
        tagText: "text-white",
    },
};

function formatPrice(n: number | null | undefined) {
    if (!n) return "N/A";
    return "$" + n.toLocaleString("es-EC");
}

function getCategoryForVehicle(vehicle: ScoredVehicle, index: number): VehicleViewType {
    if (index === 0) return "ALL"; // El primero es la mejor oportunidad general
    if (vehicle.seller?.location === 'patio') return 'PATIO';
    if (vehicle.seller?.location === 'taller') return 'TALLER';
    return 'CLIENTE';
}

export function OpportunitiesWizardSelection({
    topOpportunities,
    onViewAll,
    isLoading = false
}: OpportunitiesWizardSelectionProps) {
    const [activeVehicle, setActiveVehicle] = useState<ScoredVehicle | null>(null);
    const dateFormatter = new DateFormatter(new TextFormatter());

    if (isLoading) {
        return (
            <div className="w-full">
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-1 w-6 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-xs font-bold text-red-500 tracking-widest uppercase">Marketplace</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                        Cargando oportunidades...
                    </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse">
                            <div className="h-40 bg-slate-200" />
                            <div className="p-4 space-y-3">
                                <div className="h-4 bg-slate-200 rounded w-3/4" />
                                <div className="h-3 bg-slate-200 rounded w-1/2" />
                                <div className="flex gap-2">
                                    <div className="h-6 bg-slate-200 rounded w-16" />
                                    <div className="h-6 bg-slate-200 rounded w-16" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!topOpportunities || topOpportunities.length === 0) {
        return (
            <div className="w-full text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <Store className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                <h3 className="text-lg font-bold text-slate-600">No hay oportunidades disponibles</h3>
                <p className="text-sm text-slate-400 mt-1">Intenta escanear el marketplace primero</p>
            </div>
        );
    }

    return (
        <>
            <div className="w-full animate-in fade-in zoom-in-95 duration-500">
                {/* HEADER */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="h-1 w-6 bg-red-500 rounded-full" />
                            <span className="text-xs font-bold text-red-500 tracking-widest uppercase">Marketplace</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                            Mejores oportunidades<br className="hidden sm:block" /> detectadas
                        </h2>
                        <p className="text-sm text-slate-500 mt-2">
                            Analizadas automáticamente por precio, año, kilometraje y condición
                        </p>
                    </div>

                    <button
                        onClick={onViewAll}
                        className="group flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-slate-200 hover:shadow-slate-300 active:scale-95"
                    >
                        Ver todo el inventario
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {topOpportunities.slice(0, 4).map((vehicle, i) => {
                        const category = getCategoryForVehicle(vehicle, i);
                        const cfg = CARD_CONFIG[category];
                        const Icon = cfg.icon;

                        // Calcular ahorro
                        const savings = vehicle.scoreBreakdown.priceScore > 60
                            ? Math.round(vehicle.price! * 0.15) // Estimación de ahorro
                            : 0;

                        return (
                            <button
                                key={vehicle.id}
                                onClick={() => setActiveVehicle(vehicle)}
                                style={{ animationDelay: `${i * 80}ms` }}
                                className={`
                                    group relative w-full flex flex-col items-start text-left
                                    bg-white border ${cfg.accentBorder} ${cfg.accentHover}
                                    rounded-2xl hover:shadow-xl ${cfg.accentShadow}
                                    transition-all duration-300 overflow-hidden
                                    animate-in fade-in slide-in-from-bottom-3
                                `}
                            >
                                {/* Thumbnail imagen */}
                                <div className="w-full h-40 overflow-hidden relative flex-shrink-0">
                                    {vehicle.image_url ? (
                                        <img
                                            src={vehicle.image_url}
                                            alt={`${vehicle.brand} ${vehicle.model}`}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                            <Tag className="h-10 w-10 text-slate-300" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                                    {/* Badge categoría */}
                                    <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${cfg.tagBg} ${cfg.tagText} shadow-md`}>
                                        <Icon className="h-3 w-3" />
                                        {cfg.label}
                                    </div>

                                    {/* Score badge */}
                                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-sm text-slate-700 shadow-md">
                                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                                        {Math.round(vehicle.opportunityScore)}/100
                                    </div>

                                    {/* Precio sobre imagen */}
                                    <div className="absolute bottom-3 right-3 text-right">
                                        <div className="text-white/60 text-[9px] font-bold uppercase tracking-wider leading-none mb-0.5">Precio</div>
                                        <div className="text-lg font-black text-white leading-none drop-shadow">
                                            {formatPrice(vehicle.price)}
                                        </div>
                                    </div>

                                    {/* Ciudad */}
                                    <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white/80 text-[10px] font-semibold capitalize">
                                        <MapPin className="h-2.5 w-2.5" />
                                        {vehicle.location || 'N/A'}
                                    </div>
                                </div>

                                {/* Info card */}
                                <div className="p-4 w-full">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div>
                                            <h3 className="font-black text-sm text-slate-900 leading-tight">
                                                {vehicle.brand?.toUpperCase()} {vehicle.model?.toUpperCase()}
                                            </h3>
                                            <span className="text-xs text-slate-400 font-semibold">{vehicle.year || 'N/A'}</span>
                                        </div>
                                        <div className={`p-2 rounded-xl ${cfg.iconBg} flex-shrink-0`}>
                                            <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
                                        </div>
                                    </div>

                                    {/* Mini specs */}
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {vehicle.characteristics && vehicle.characteristics.slice(0, 2).map((c, idx) => (
                                            <span key={idx} className="text-[10px] font-bold px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md border border-slate-100">
                                                {c}
                                            </span>
                                        ))}
                                        {vehicle.mileage && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md border border-slate-100">
                                                {vehicle.mileage.toLocaleString()} km
                                            </span>
                                        )}
                                    </div>

                                    {/* Savings indicator */}
                                    {savings > 0 && (
                                        <div className="mb-3 flex items-center gap-1.5 px-2 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                                            <TrendingDown className="h-3 w-3 text-emerald-600" />
                                            <span className="text-[10px] font-bold text-emerald-700">
                                                ~{formatPrice(savings)} ahorro estimado
                                            </span>
                                        </div>
                                    )}

                                    {/* Footer: tiempo + flecha */}
                                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                                            <Clock className="h-3 w-3" />
                                            {dateFormatter.formatRelativeTime(vehicle.publication_date)}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 group-hover:text-slate-700 transition-colors">
                                            Ver detalle
                                            <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </div>
                                </div>

                                {/* Barra decorativa */}
                                <div className={`absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-transparent ${cfg.accentBar} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* MODAL */}
            {activeVehicle && (
                <OpportunitiesVehiclePreviewModal
                    vehicle={activeVehicle}
                    onClose={() => setActiveVehicle(null)}
                />
            )}
        </>
    );
}