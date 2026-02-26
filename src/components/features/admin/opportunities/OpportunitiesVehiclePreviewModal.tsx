import {
    X, MapPin, ChevronRight, Gauge,
    FileText, CheckCircle2, Star, Eye,
    Database as DatabaseIcon, Trophy, Users, ThumbsUp,
    AlertCircle,
    Store,
    User,
    Wrench,
    ImageOff,
    ScanSearch,
    CarFront,
    LayoutDashboard,
    Hash,
    Building2,
    User as UserIcon,
} from "lucide-react";
import { useState } from "react";
import { VehicleWithSeller } from "@/services/scraper.service";
import { VehicleViewType } from "./interfaces";
import type { VehicleImageAnalysis } from "@/types/vehicleImageAnalysis";
import { OpportunitiesCarousel } from "./OpportunitiesCarousel";
import { ScoredVehicle } from "./opportunitiesScorer";

// ─── CARD_CONFIG (sin cambios) ────────────────────────────────────────────────

export const CARD_CONFIG: Record<VehicleViewType, {
    label: string; icon: any; badge: string | null;
    accentBorder: string; accentHover: string; accentShadow: string; accentBar: string;
    iconBg: string; iconColor: string; badgeBg: string; badgeColor: string;
    tagBg: string; tagText: string;
}> = {
    ALL: {
        label: "Mejor Oportunidad", icon: Star, badge: "Top Deal",
        accentBorder: "border-amber-200", accentHover: "hover:border-amber-400",
        accentShadow: "hover:shadow-amber-100", accentBar: "via-amber-400",
        iconBg: "bg-amber-50", iconColor: "text-amber-600",
        badgeBg: "bg-amber-50", badgeColor: "text-amber-700",
        tagBg: "bg-amber-600", tagText: "text-white",
    },
    PATIO: {
        label: "En Patio", icon: Store, badge: "Recomendado",
        accentBorder: "border-emerald-100", accentHover: "hover:border-emerald-400",
        accentShadow: "hover:shadow-emerald-100", accentBar: "via-emerald-400",
        iconBg: "bg-emerald-50", iconColor: "text-emerald-600",
        badgeBg: "bg-emerald-50", badgeColor: "text-emerald-700",
        tagBg: "bg-emerald-600", tagText: "text-white",
    },
    TALLER: {
        label: "Posible Falla", icon: Wrench, badge: null,
        accentBorder: "border-orange-100", accentHover: "hover:border-orange-400",
        accentShadow: "hover:shadow-orange-100", accentBar: "via-orange-400",
        iconBg: "bg-orange-50", iconColor: "text-orange-600",
        badgeBg: "", badgeColor: "", tagBg: "bg-orange-500", tagText: "text-white",
    },
    CLIENTE: {
        label: "En Cliente", icon: User, badge: null,
        accentBorder: "border-blue-100", accentHover: "hover:border-blue-400",
        accentShadow: "hover:shadow-blue-100", accentBar: "via-blue-400",
        iconBg: "bg-blue-50", iconColor: "text-blue-600",
        badgeBg: "", badgeColor: "", tagBg: "bg-blue-600", tagText: "text-white",
    },
};

// ─── Análisis de imágenes (Vision) ────────────────────────────────────────────

function ImageAnalysisSection({ analysis }: { analysis: VehicleImageAnalysis }) {
    const cabinaLabels: Record<string, string> = {
        una_cabina: "Una cabina",
        doble_cabina: "Doble cabina",
        no_aplica: "N/A",
    };
    const vendedorLabels: Record<string, string> = {
        concesionaria: "Concesionaria",
        particular: "Particular",
        indeterminado: "Indeterminado",
    };
    const boolLabel = (v: boolean | null) => v === true ? "Sí" : v === false ? "No" : "—";

    return (
        <div className="p-5 bg-white border border-zinc-200 shadow-sm rounded-2xl">
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <ScanSearch className="h-3.5 w-3.5" /> Análisis por imágenes
            </h3>
            <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {analysis.cabina && (
                        <div className="bg-zinc-50 rounded-xl px-3 py-2 border border-zinc-100">
                            <p className="text-[9px] font-bold text-zinc-400 uppercase">Cabina</p>
                            <p className="text-xs font-semibold text-zinc-800 mt-0.5">{cabinaLabels[analysis.cabina] ?? analysis.cabina}</p>
                        </div>
                    )}
                    {analysis.marca_coincide_con_titulo !== null && (
                        <div className="bg-zinc-50 rounded-xl px-3 py-2 border border-zinc-100">
                            <p className="text-[9px] font-bold text-zinc-400 uppercase">Marca = título</p>
                            <p className="text-xs font-semibold text-zinc-800 mt-0.5">{analysis.marca_coincide_con_titulo ? "Sí" : "No"}</p>
                        </div>
                    )}
                    {analysis.placa_matricula && (
                        <div className="bg-zinc-50 rounded-xl px-3 py-2 border border-zinc-100 flex items-center gap-1.5">
                            <Hash className="h-3.5 w-3.5 text-zinc-400" />
                            <div>
                                <p className="text-[9px] font-bold text-zinc-400 uppercase">Placa</p>
                                <p className="text-xs font-bold text-zinc-800 mt-0.5">{analysis.placa_matricula}</p>
                            </div>
                        </div>
                    )}
                    {analysis.tipo_vendedor && (
                        <div className="bg-zinc-50 rounded-xl px-3 py-2 border border-zinc-100 flex items-center gap-1.5">
                            {analysis.tipo_vendedor === "concesionaria" ? <Building2 className="h-3.5 w-3.5 text-zinc-400" /> : <UserIcon className="h-3.5 w-3.5 text-zinc-400" />}
                            <div>
                                <p className="text-[9px] font-bold text-zinc-400 uppercase">Vendedor</p>
                                <p className="text-xs font-semibold text-zinc-800 mt-0.5">{vendedorLabels[analysis.tipo_vendedor] ?? analysis.tipo_vendedor}</p>
                            </div>
                        </div>
                    )}
                </div>
                {analysis.exterior && (
                    <div className="border border-zinc-100 rounded-xl overflow-hidden">
                        <div className="px-3 py-2 bg-zinc-50 border-b border-zinc-100 flex items-center gap-2">
                            <CarFront className="h-3.5 w-3.5 text-zinc-500" />
                            <span className="text-[10px] font-bold text-zinc-600 uppercase">Exterior</span>
                        </div>
                        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                            <DetailRow label="Golpes/abolladuras" value={boolLabel(analysis.exterior.golpes_abolladuras_raspones)} />
                            <DetailRow label="Dif. tono paneles" value={boolLabel(analysis.exterior.diferencias_tono_paneles)} />
                            <DetailRow label="Desalineación" value={boolLabel(analysis.exterior.desalineacion_puertas_capot_maletero)} />
                            <DetailRow label="Oxidación" value={boolLabel(analysis.exterior.oxidacion_visible)} />
                            <DetailRow label="Faros opacos/rotos" value={boolLabel(analysis.exterior.faros_opacos_o_rotos)} />
                            <DetailRow label="Llantas desgaste irreg." value={boolLabel(analysis.exterior.llantas_desgaste_irregular)} />
                            {analysis.exterior.llantas_vida_util && <DetailRow label="Vida útil llantas" value={analysis.exterior.llantas_vida_util} />}
                            {analysis.exterior.notas && <div className="col-span-full text-zinc-500 mt-1">{analysis.exterior.notas}</div>}
                        </div>
                    </div>
                )}
                {analysis.interior && (
                    <div className="border border-zinc-100 rounded-xl overflow-hidden">
                        <div className="px-3 py-2 bg-zinc-50 border-b border-zinc-100 flex items-center gap-2">
                            <LayoutDashboard className="h-3.5 w-3.5 text-zinc-500" />
                            <span className="text-[10px] font-bold text-zinc-600 uppercase">Interior</span>
                        </div>
                        <div className="p-3 space-y-2 text-[11px]">
                            {analysis.interior.desgaste_volante_palanca_pedales && <DetailRow label="Desgaste volante/palanca/pedales" value={analysis.interior.desgaste_volante_palanca_pedales} />}
                            <DetailRow label="Asientos rotos/gastados" value={boolLabel(analysis.interior.asientos_rotos_o_gastados)} />
                            <DetailRow label="Humedad/inundación" value={boolLabel(analysis.interior.senales_humedad_inundacion)} />
                            {analysis.interior.luces_warning_tablero && analysis.interior.luces_warning_tablero.length > 0 && (
                                <DetailRow label="Luces warning" value={analysis.interior.luces_warning_tablero.join(", ")} />
                            )}
                            {analysis.interior.notas && <div className="text-zinc-500 mt-1">{analysis.interior.notas}</div>}
                        </div>
                    </div>
                )}
                {analysis.resumen && (
                    <p className="text-xs text-zinc-600 leading-relaxed border-t border-zinc-100 pt-3">{analysis.resumen}</p>
                )}
            </div>
        </div>
    );
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat("es-EC", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
});

function formatPrice(n: number | null | undefined) {
    if (!n) return "N/A";
    return currencyFormatter.format(n);
}

function formatAbsoluteDate(dateString: string | null | undefined): string {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch { return "N/A"; }
}

const displayTextCondition = (condition: string | null | undefined) => {
    if (!condition) return "Usado";
    const map: Record<string, string> = {
        PC_USED_LIKE_NEW: "Como nuevo", PC_USED_GOOD: "Buen estado",
        USED: "Usado", NEW_ITEM: "Nuevo", DAMAGED: "Averiado / Para reparar",
    };
    return map[condition] ?? condition;
};

// ─── Sub-componentes pequeños ─────────────────────────────────────────────────

function TimelineBadge({ label, value, icon: Icon, accent = false }: {
    label: string; value: string; icon: React.ElementType; accent?: boolean;
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

function DetailRow({ label, value, isBadge }: { label: string; value: string; isBadge?: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-semibold">{label}</span>
            {isBadge
                ? <span className="font-bold text-zinc-800 bg-white px-2.5 py-1 rounded-lg border border-zinc-200 text-xs capitalize">{value}</span>
                : <span className="text-sm font-black text-zinc-800 capitalize">{value}</span>
            }
        </div>
    );
}

// ─── Imagen con fallback robusto ──────────────────────────────────────────────

/**
 * Intenta mostrar la primera imagen disponible de una lista.
 * Si todas fallan muestra un placeholder.
 */
function VehicleImage({
    urls,
    alt,
    className,
    placeholderClassName,
}: {
    urls: (string | null | undefined)[];
    alt: string;
    className?: string;
    placeholderClassName?: string;
}) {
    const [idx, setIdx] = useState(0);
    const validUrls = urls.filter(Boolean) as string[];

    if (!validUrls.length) {
        return (
            <div className={`flex items-center justify-center bg-zinc-800 ${placeholderClassName}`}>
                <ImageOff className="h-6 w-6 text-zinc-600" />
            </div>
        );
    }

    return (
        <img
            src={validUrls[idx]}
            alt={alt}
            className={className}
            onError={() => {
                if (idx < validUrls.length - 1) {
                    setIdx(idx + 1); // intenta con la siguiente URL
                }
            }}
        />
    );
}

// ─── Helpers de comparación ───────────────────────────────────────────────────

function getGroupAvgPrice(group: VehicleWithSeller[]): number {
    const priced = group.filter(v => v.price);
    if (!priced.length) return 0;
    return priced.reduce((sum, v) => sum + v.price!, 0) / priced.length;
}

function buildWinReasons(winner: ScoredVehicle, group: VehicleWithSeller[]): { positive: string[]; negative: string[] } {
    const positive: string[] = [];
    const negative: string[] = [];
    const avgPrice = getGroupAvgPrice(group);
    const others = group.filter(v => v.id !== winner.id);

    if (winner.price && avgPrice > 0) {
        const diffPct = ((avgPrice - winner.price) / avgPrice) * 100;
        if (diffPct > 15) positive.push(`Precio ${Math.round(diffPct)}% más bajo que el promedio del grupo (${formatPrice(avgPrice)} promedio)`);
        else if (diffPct > 5) positive.push(`Precio ligeramente por debajo del promedio del grupo (${formatPrice(avgPrice)})`);
        else if (diffPct < -10) negative.push(`Su precio está por encima del promedio (${formatPrice(avgPrice)}), pero compensado por otras ventajas`);
    }

    if (winner.mileage != null && others.length > 0) {
        const othersWithKm = others.filter(v => v.mileage != null);
        if (othersWithKm.length > 0) {
            const avgKm = othersWithKm.reduce((sum, v) => sum + v.mileage!, 0) / othersWithKm.length;
            const kmDiff = avgKm - winner.mileage;
            if (kmDiff > 15000) positive.push(`${Math.round(kmDiff / 1000)}k km menos que el promedio del grupo (${Math.round(avgKm / 1000)}k km promedio)`);
            else if (kmDiff < -15000) negative.push(`Tiene más km que el promedio del grupo (${Math.round(avgKm / 1000)}k km promedio)`);
        }
    }

    const text = [winner.title, winner.description, ...(winner.extras ?? []), ...(winner.characteristics ?? [])].join(' ').toLowerCase();
    const positiveSignals: Record<string, string> = {
        'único dueño': 'Único dueño declarado', 'unico dueño': 'Único dueño declarado',
        'mantenimientos al día': 'Mantenimientos al día', 'como nuevo': 'Descrito como "como nuevo"',
        'factura': 'Incluye factura', 'sin choques': 'Sin choques reportados',
        'garaje': 'Guardado en garaje', 'full equipo': 'Full equipo',
    };
    const negativeSignals: Record<string, string> = {
        'chocado': 'Menciona que fue chocado', 'accidentado': 'Menciona accidente',
        'para repuestos': 'Se ofrece para repuestos', 'motor dañado': 'Motor con daño reportado',
    };

    Object.entries(positiveSignals).forEach(([k, v]) => { if (text.includes(k)) positive.push(v); });
    Object.entries(negativeSignals).forEach(([k, v]) => { if (text.includes(k)) negative.push(v); });

    const imgCount = winner.listing_image_urls?.length ?? 0;

    if (winner.parsedEngineCC) {
        if (winner.parsedEngineCC >= 3.0) positive.push(`Motor ${winner.parsedEngineCC}L (alta cilindrada)`);
        else if (winner.parsedEngineCC >= 2.0) positive.push(`Motor ${winner.parsedEngineCC}L`);
    }

    if (winner.transmission?.toLowerCase().match(/autom[aá]tic[ao]|automatic|cvt|dsg/))
        positive.push('Transmisión automática (mayor demanda de reventa)');

    if (positive.length === 0) positive.push('Mejor puntaje combinado entre precio, kilometraje y estado');

    return { positive, negative };
}

// ─── Mini-modal de vehículo descartado ───────────────────────────────────────

function DiscardedMiniModal({ vehicle, avgPrice, onClose }: {
    vehicle: VehicleWithSeller; avgPrice: number; onClose: () => void;
}) {
    const priceVsAvg = vehicle.price && avgPrice > 0
        ? ((vehicle.price - avgPrice) / avgPrice) * 100 : null;

    const imgUrls = [
        ...(vehicle.listing_image_urls ?? []),
        vehicle.image_url,
    ];

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
            >
                {/* Imagen */}
                <div className="relative h-48 bg-zinc-900 overflow-hidden">
                    <VehicleImage
                        urls={imgUrls}
                        alt={vehicle.title ?? `${vehicle.brand} ${vehicle.model}`}
                        className="w-full h-full object-cover"
                        placeholderClassName="w-full h-full"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 to-transparent pointer-events-none" />

                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                        <div>
                            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider mb-0.5">Precio</p>
                            <p className="text-white font-black text-xl leading-none">{formatPrice(vehicle.price)}</p>
                        </div>
                        {priceVsAvg !== null && (
                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${priceVsAvg > 0 ? 'bg-red-500/90 text-white' : 'bg-emerald-500/90 text-white'}`}>
                                {priceVsAvg > 0 ? '+' : ''}{Math.round(priceVsAvg)}% vs prom.
                            </span>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    <div>
                        <p className="font-black text-zinc-900 text-base">
                            {vehicle.brand?.toUpperCase()} {vehicle.model?.toUpperCase()}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{vehicle.title}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {vehicle.mileage != null && (
                            <div className="bg-zinc-50 rounded-xl px-3 py-2 border border-zinc-100">
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Kilometraje</p>
                                <p className="text-xs font-black text-zinc-800 mt-0.5">{vehicle.mileage.toLocaleString()} km</p>
                            </div>
                        )}
                        {vehicle.year && (
                            <div className="bg-zinc-50 rounded-xl px-3 py-2 border border-zinc-100">
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Año</p>
                                <p className="text-xs font-black text-zinc-800 mt-0.5">{vehicle.year}</p>
                            </div>
                        )}
                        {vehicle.transmission && (
                            <div className="bg-zinc-50 rounded-xl px-3 py-2 border border-zinc-100">
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Transmisión</p>
                                <p className="text-xs font-black text-zinc-800 mt-0.5">{vehicle.transmission}</p>
                            </div>
                        )}
                        {vehicle.location && (
                            <div className="bg-zinc-50 rounded-xl px-3 py-2 border border-zinc-100">
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Ciudad</p>
                                <p className="text-xs font-black text-zinc-800 mt-0.5">{vehicle.location}</p>
                            </div>
                        )}
                    </div>

                    {vehicle.description && (
                        <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-3">{vehicle.description}</p>
                    )}

                    <a
                        href={vehicle.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs transition-colors"
                    >
                        Ver en marketplace <ChevronRight className="h-3.5 w-3.5" />
                    </a>
                </div>
            </div>
        </div>
    );
}

// ─── Tarjeta pequeña de vehículo descartado ───────────────────────────────────

function DiscardedCard({ vehicle, winnerVehicle, avgPrice, rank }: {
    vehicle: VehicleWithSeller; winnerVehicle: VehicleWithSeller; avgPrice: number; rank: number;
}) {
    const [open, setOpen] = useState(false);

    // 1. Calculamos la diferencia de precio contra el ganador
    const diffVsWinner = (vehicle.price && winnerVehicle?.price)
        ? vehicle.price - winnerVehicle.price
        : null;

    // Prioridad: todas las fotos del listing, luego image_url
    const imgUrls = [
        ...(vehicle.listing_image_urls ?? []),
        vehicle.image_url,
    ];

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="group relative flex flex-col text-left w-full rounded-xl border border-zinc-700 hover:border-zinc-400 bg-zinc-900 overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-zinc-950/50 active:scale-[0.97] cursor-pointer"
            >
                {/* ── Imagen ── */}
                <div className="relative w-full h-[88px] bg-zinc-800 overflow-hidden flex-shrink-0">
                    <VehicleImage
                        urls={imgUrls}
                        alt={vehicle.title ?? `${vehicle.brand} ${vehicle.model}`}
                        className="w-full h-full object-cover opacity-75 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                        placeholderClassName="w-full h-full"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent pointer-events-none" />

                    {/* Número de posición */}
                    <div className="absolute top-1.5 left-1.5 w-[18px] h-[18px] rounded-full bg-zinc-900/90 border border-zinc-700 text-zinc-500 text-[8px] font-black flex items-center justify-center">
                        {rank}
                    </div>

                    {/* Precio + diferencia vs Ganador */}
                    <div className="absolute bottom-1.5 left-2 right-2 flex items-end justify-between gap-1">
                        <span className="text-white font-black text-[10px] leading-none drop-shadow truncate">
                            {formatPrice(vehicle.price)}
                        </span>

                        {/* 2. Renderizamos el badge con formato de moneda */}
                        {diffVsWinner !== null && (
                            <span className={`text-[8px] font-black px-1 py-0.5 rounded flex-shrink-0 ${diffVsWinner > 0 ? 'bg-red-600 text-white' :
                                diffVsWinner < 0 ? 'bg-emerald-600 text-white' :
                                    'bg-zinc-600 text-white'
                                }`}>
                                {diffVsWinner > 0 ? '+' : diffVsWinner < 0 ? '-' : ''}
                                {diffVsWinner !== 0 ? formatPrice(Math.abs(diffVsWinner)) : 'Igual'}
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Info ── */}
                <div className="px-2 py-1.5">
                    <p className="text-[9px] font-black text-zinc-300 leading-tight truncate">
                        {vehicle.brand} {vehicle.model}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {vehicle.year && <span className="text-[8px] font-semibold text-zinc-500">{vehicle.year}</span>}
                        {vehicle.mileage != null && (
                            <span className="text-[8px] font-semibold text-zinc-500">
                                {Math.round(vehicle.mileage / 1000)}k km
                            </span>
                        )}
                    </div>
                </div>
            </button>

            {open && (
                <DiscardedMiniModal
                    vehicle={vehicle}
                    avgPrice={avgPrice}
                    onClose={() => setOpen(false)}
                />
            )}
        </>
    );
}
export function OpportunitiesVehiclePreviewModal({
    vehicle,
    groupVehicles = [],
    onClose,
}: {
    vehicle: ScoredVehicle;
    groupVehicles?: VehicleWithSeller[];
    onClose: () => void;
}) {

    const priceScore = vehicle.scoreBreakdown.priceScore;
    const isGoodDeal = priceScore > 75;
    const estimatedDiscountPct = isGoodDeal ? Math.round((priceScore - 70) * 0.8) : 0;
    const estimatedMarketPrice = vehicle.price! / (1 - (estimatedDiscountPct / 100));
    const savings = estimatedMarketPrice - vehicle.price!;

    const avgPrice = getGroupAvgPrice(groupVehicles);
    const discardedVehicles = groupVehicles.filter(v => v.id !== vehicle.id);
    const hasGroup = discardedVehicles.length > 0;
    const winReasons = hasGroup ? buildWinReasons(vehicle, groupVehicles) : null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                className="bg-white w-full max-w-4xl h-full max-h-[90vh] rounded-3xl shadow-2xl shadow-zinc-950/50 overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-6 duration-300 ring-1 ring-white/10"
            >
                {/* ══════════════════════════════════════════════════
            BLOQUE SUPERIOR FIJO (Header separado + Carousel)
        ══════════════════════════════════════════════════ */}
                <div className="flex-shrink-0 bg-zinc-950 flex flex-col relative z-20">

                    {/* --- HEADER SÓLIDO (Fuera del carrusel, ya no tapa nada) --- */}
                    <div className="flex items-center justify-between px-5 py-4 bg-zinc-950 border-b border-zinc-800/50">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 text-zinc-950 text-[10px] font-black rounded-full shadow-lg shadow-amber-500/10">
                                    <Trophy className="h-3 w-3" /> MEJOR DEL GRUPO
                                </div>
                            </div>
                            <span className="text-white font-black text-2xl tracking-tight">
                                {formatPrice(vehicle.price)}
                            </span>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2.5 rounded-full bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                            aria-label="Cerrar"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* --- CAROUSEL PRINCIPAL --- */}
                    <div className="relative h-52 sm:h-64 w-full bg-zinc-900 overflow-hidden">
                        <OpportunitiesCarousel fullWidth vehicle={vehicle} />

                        {/* Gradiente inferior para asentar el texto */}
                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />

                        {/* Título sobre el carousel (sólo en la parte inferior) */}
                        <div className="absolute bottom-4 left-5 right-5 z-10 pointer-events-none">
                            <h2 className="text-white font-black text-xl sm:text-2xl leading-tight drop-shadow-lg">
                                {vehicle.brand?.toUpperCase()} {vehicle.model?.toUpperCase()} <span className="text-zinc-400 font-bold">{vehicle.year}</span>
                            </h2>
                            <p className="text-zinc-300 text-sm font-medium line-clamp-1 mt-1 drop-shadow-md">
                                {vehicle.title}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════
            CONTENIDO SCROLLABLE
        ══════════════════════════════════════════════════ */}
                <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">

                    {/* --- TIRA DE VEHÍCULOS COMPARADOS --- */}
                    {hasGroup && (
                        <div className="bg-zinc-950 border-t border-zinc-800/80 px-5 py-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Users className="h-3.5 w-3.5 text-zinc-500" />
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                        Comparado vs {discardedVehicles.length} del grupo
                                    </span>
                                </div>
                                <div className="text-[10px] font-medium text-zinc-400 bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800">
                                    Promedio: <span className="font-bold text-zinc-300">{formatPrice(avgPrice)}</span>
                                </div>
                            </div>

                            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-5 px-5 
                                    [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
                                {discardedVehicles.slice(0, 10).map((v, i) => (
                                    <div key={v.id} className="flex-none w-[80%] sm:w-60 snap-start">
                                        <DiscardedCard vehicle={v} winnerVehicle={vehicle} avgPrice={avgPrice} rank={i + 2} />
                                    </div>
                                ))}
                            </div>

                            {discardedVehicles.length > 10 && (
                                <p className="text-[10px] text-zinc-500 text-right mt-1.5 font-medium">
                                    +{discardedVehicles.length - 10} más en el grupo
                                </p>
                            )}
                        </div>
                    )}

                    {/* --- CONTENIDO BLANCO --- */}
                    <div className="p-5 sm:p-6 space-y-5 sm:space-y-6">

                        {/* --- SECCIÓN DE AHORRO Y RAZONES --- */}
                        {(isGoodDeal || (hasGroup && winReasons)) && (
                            <div className="flex flex-col gap-4">
                                {isGoodDeal && (
                                    <div className="flex items-start sm:items-center gap-3 p-4 bg-emerald-50/50 border border-emerald-100/80 rounded-2xl">
                                        <div className="p-2 bg-emerald-100 rounded-full text-emerald-600 flex-shrink-0 mt-0.5 sm:mt-0">
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-emerald-800">Excelente oportunidad de precio</div>
                                            <div className="text-xs text-emerald-600/90 mt-0.5 font-medium">
                                                Ahorro estimado de <span className="font-bold">{formatPrice(savings)}</span> frente al mercado.
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {hasGroup && winReasons && (
                                    <div className="p-5 bg-zinc-50 border border-zinc-100 rounded-2xl">
                                        <h3 className="text-xs font-bold text-zinc-800 mb-4 flex items-center gap-2">
                                            <div className="p-1.5 bg-amber-100 rounded-md text-amber-600">
                                                <Trophy className="h-3.5 w-3.5" />
                                            </div>
                                            Por qué destaca entre {groupVehicles.length} opciones
                                        </h3>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {winReasons.positive.length > 0 && (
                                                <div className="space-y-2.5">
                                                    {winReasons.positive.map((reason, i) => (
                                                        <div key={i} className="flex items-start gap-2.5 text-sm text-zinc-600">
                                                            <ThumbsUp className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
                                                            <span className="leading-snug">{reason}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {winReasons.negative.length > 0 && (
                                                <div className="space-y-2.5">
                                                    {winReasons.negative.map((reason, i) => (
                                                        <div key={i} className="flex items-start gap-2.5 text-sm text-zinc-600">
                                                            <AlertCircle className="h-4 w-4 mt-0.5 text-amber-500 flex-shrink-0" />
                                                            <span className="leading-snug">{reason}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- DATOS CLAVE Y UBICACIÓN --- */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-5 bg-white border border-zinc-200 shadow-sm rounded-2xl">
                                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                                    <Gauge className="h-3.5 w-3.5" /> Especificaciones
                                </h3>
                                <div className="space-y-3.5">
                                    <DetailRow label="Kilometraje" value={vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} km` : 'N/A'} />
                                    <DetailRow label="Año Modelo" value={vehicle.year || 'N/A'} />
                                    <DetailRow
                                        label="Combustible"
                                        value={vehicle.characteristics?.find(c => c.match(/gasolina|diesel|hibrido/i)) || vehicle.parsedFuelType || 'N/A'}
                                    />
                                    {vehicle.parsedEngineCC && <DetailRow label="Motor" value={`${vehicle.parsedEngineCC}L`} />}
                                    {vehicle.transmission && <DetailRow label="Transmisión" value={vehicle.transmission} />}
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="p-5 bg-white border border-zinc-200 shadow-sm rounded-2xl flex-1">
                                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                                        <MapPin className="h-3.5 w-3.5" /> Detalles y Ubicación
                                    </h3>
                                    <div className="space-y-3.5">
                                        <DetailRow label="Condición" value={displayTextCondition(vehicle.condition)} isBadge />
                                        <DetailRow label="Ciudad" value={vehicle.location || 'N/A'} />
                                    </div>
                                </div>

                                {/* Timeline compacto */}
                                <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl">
                                    <div className="flex flex-wrap gap-4">
                                        <TimelineBadge label="Publicado" value={formatAbsoluteDate(vehicle.publication_date)} icon={Eye} />
                                        <TimelineBadge label="Detectado" value={formatAbsoluteDate(vehicle.created_at)} icon={DatabaseIcon} accent />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- ANÁLISIS DE IMÁGENES (Vision) --- */}
                        {vehicle.image_analysis && (
                            <ImageAnalysisSection analysis={vehicle.image_analysis as unknown as VehicleImageAnalysis} />
                        )}

                        {/* --- DESCRIPCIÓN --- */}
                        <div className="p-5 bg-white border border-zinc-200 shadow-sm rounded-2xl">
                            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5" /> Nota del Vendedor
                            </h3>
                            <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
                                {vehicle.description || vehicle.title || "Sin descripción detallada por parte del vendedor."}
                            </p>
                            {vehicle.characteristics && vehicle.characteristics.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-zinc-100">
                                    {vehicle.characteristics.map((c, i) => (
                                        <span key={i} className="text-[10px] font-semibold px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded-md">
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- FOOTER FLOTANTE (Call to Action) --- */}
                    <div className="sticky bottom-0 left-0 right-0 p-4 sm:p-5 bg-white/80 backdrop-blur-md border-t border-zinc-100 shadow-[0_-10px_30px_rgba(0,0,0,0.02)] mt-auto">
                        <a
                            href={vehicle.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 bg-zinc-950 hover:bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-zinc-950/20 hover:shadow-red-600/30 transform active:scale-[0.98]"
                        >
                            Ver en Marketplace
                            <ChevronRight className="h-5 w-5" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}