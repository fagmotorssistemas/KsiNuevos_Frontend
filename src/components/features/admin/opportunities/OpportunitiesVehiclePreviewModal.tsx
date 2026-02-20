import {
    X, MapPin, Clock, ChevronRight, Tag, Gauge,
    TrendingUp, FileText, CheckCircle2, Sparkles, Star, Eye,
    Database as DatabaseIcon, Zap
} from "lucide-react";
import { DateFormatter } from "@/utils/DateFormatter";
import { TextFormatter } from "@/utils/TextFormatter";
import { ScoredVehicle } from "./opportunitiesScorer";
import { CARD_CONFIG } from "./OpportunitiesWizardSelection";
import { OpportunitiesCarousel } from "./OpportunitiesCarousel";

const currencyFormatter = new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
    } catch {
        return "N/A";
    }
}

const displayTextCondition = (condition: string | null | undefined) => {
    if (!condition) return "Usado";
    switch (condition) {
        case "PC_USED_LIKE_NEW": return "Como nuevo";
        case "PC_USED_GOOD": return "Buen estado";
        case "USED": return "Usado";
        case "NEW_ITEM": return "Nuevo";
        case "DAMAGED": return "Averiado / Para reparar";
        default: return condition;
    }
};

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

export function OpportunitiesVehiclePreviewModal({
    vehicle,
    onClose,
}: {
    vehicle: ScoredVehicle;
    onClose: () => void;
}) {
    const dateFormatter = new DateFormatter(new TextFormatter());

    const category = vehicle.seller?.location === 'patio' ? 'PATIO'
        : vehicle.seller?.location === 'taller' ? 'TALLER'
            : 'CLIENTE';
    const cfg = CARD_CONFIG[category];
    const Icon = cfg.icon;

    // Estimación visual de ahorro
    const priceScore = vehicle.scoreBreakdown.priceScore;
    const isGoodDeal = priceScore > 75;
    const estimatedDiscountPct = isGoodDeal ? Math.round((priceScore - 70) * 0.8) : 0;
    const estimatedMarketPrice = vehicle.price! / (1 - (estimatedDiscountPct / 100));
    const savings = estimatedMarketPrice - vehicle.price!;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-6 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[28px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-6 duration-300"
            >
                <div className="relative h-56 sm:h-72 flex-shrink-0 overflow-hidden">
                    <OpportunitiesCarousel fullWidth vehicle={vehicle} />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent pointer-events-none" />

                    {/* Top bar */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
                        {/* ... resto igual ... */}
                    </div>

                    {/* Title + Price */}
                    <div className="absolute bottom-4 left-5 right-5 z-20">
                        {/* ... resto igual ... */}
                    </div>
                </div>


                <div className="flex-1 overflow-y-auto">

                    {/* Score breakdown
                    <div className="px-6 pt-6 pb-5 border-b border-zinc-100 bg-slate-50/50">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Análisis de Oportunidad</h3>
                            {vehicle.tags && vehicle.tags.length > 0 && (
                                <div className="flex gap-2">
                                    {vehicle.tags.slice(0, 2).map((tag, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                            <Zap className="h-2.5 w-2.5" /> {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-y-4 gap-x-2">
                            <ScoreItem value={vehicle.scoreBreakdown.priceScore} label="Precio" color="blue" />
                            <ScoreItem value={vehicle.scoreBreakdown.mileageScore} label="Uso/Año" color="emerald" />
                            <ScoreItem value={vehicle.scoreBreakdown.conditionScore} label="Estado" color="purple" />
                            <ScoreItem value={vehicle.scoreBreakdown.marketScore} label="Liquidez" color="orange" />
                            <ScoreItem value={vehicle.scoreBreakdown.recencyScore} label="Novedad" color="red" />
                        </div>
                    </div> */}

                    {/* Savings indicator */}
                    {isGoodDeal && (
                        <div className="px-6 py-4 border-b border-zinc-100">
                            <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                                <div>
                                    <div className="text-sm font-bold text-emerald-700">Precio Destacado</div>
                                    <div className="text-xs text-emerald-600 mt-0.5">
                                        Estimamos un ahorro de ~{formatPrice(savings)} vs mercado.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <Gauge className="h-3.5 w-3.5" /> Datos Clave
                            </h3>
                            <div className="space-y-3">
                                <DetailRow label="Kilometraje" value={vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} km` : 'N/A'} />
                                <DetailRow label="Año Modelo" value={vehicle.year || 'N/A'} />
                                <DetailRow label="Combustible" value={vehicle.characteristics?.find(c => c.match(/gasolina|diesel|hibrido/i)) || 'N/A'} />
                            </div>
                        </div>

                        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" /> Ubicación
                            </h3>
                            <ul className="space-y-2.5">
                                <DetailRow label="Condición" value={displayTextCondition(vehicle.condition)} isBadge />
                                <DetailRow label="Ciudad" value={vehicle.location || 'N/A'} />
                            </ul>
                        </div>

                        {/* Descripción */}
                        <div className="sm:col-span-2 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5" /> Descripción del Vendedor
                            </h3>
                            <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap mb-4">
                                {vehicle.description || vehicle.title || "Sin descripción disponible."}
                            </p>
                            {vehicle.characteristics && vehicle.characteristics.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-3 border-t border-zinc-200/50">
                                    {vehicle.characteristics.map((c, i) => (
                                        <span key={i} className="text-[10px] font-semibold px-2 py-1 bg-white text-zinc-500 rounded border border-zinc-200">
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Timeline */}
                        <div className="sm:col-span-2 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                            <div className="flex items-center gap-6 overflow-x-auto pb-1">
                                <TimelineBadge label="Publicado" value={formatAbsoluteDate(vehicle.publication_date)} icon={Eye} />
                                <TimelineBadge label="Detectado" value={formatAbsoluteDate(vehicle.created_at)} icon={DatabaseIcon} accent />
                            </div>
                        </div>
                    </div>

                    {/* CTA footer */}
                    <div className="px-6 pb-6 pt-2">
                        <a
                            href={vehicle.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3.5 bg-zinc-900 hover:bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-zinc-900/10 hover:shadow-red-600/20 transform active:scale-[0.99]"
                        >
                            Ver en marketplace
                            <ChevronRight className="h-4 w-4" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ScoreItem({ value, label, color }: { value: number, label: string, color: string }) {
    const colorClasses: Record<string, string> = {
        blue: 'text-blue-600', emerald: 'text-emerald-600', purple: 'text-purple-600', orange: 'text-orange-600', red: 'text-red-600'
    };
    return (
        <div className={`text-center p-2 rounded-xl bg-white border border-slate-100 shadow-sm ${label === 'Novedad' ? 'col-span-3 sm:col-span-1' : ''}`}>
            <div className={`text-xl font-black ${colorClasses[color] || 'text-slate-700'}`}>
                {Math.round(value)}
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">{label}</div>
        </div>
    );
}

function DetailRow({ label, value, isBadge }: { label: string, value: string, isBadge?: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-semibold">{label}</span>
            {isBadge ? (
                <span className="font-bold text-zinc-800 bg-white px-2.5 py-1 rounded-lg border border-zinc-200 text-xs capitalize">{value}</span>
            ) : (
                <span className="text-sm font-black text-zinc-800 capitalize">{value}</span>
            )}
        </div>
    );
}