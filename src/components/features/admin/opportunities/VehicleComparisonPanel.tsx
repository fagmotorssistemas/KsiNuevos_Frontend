"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Trophy, Star, Gauge, Fuel, Car, Zap, TrendingDown,
    ChevronRight, MapPin, Clock, Flame, Leaf, Layers, AlertCircle,
} from "lucide-react";
import { OpportunityScorer } from "./opportunitiesScorer";
import type { ScoredVehicle } from "./opportunitiesScorer";
import { OpportunitiesVehiclePreviewModal } from "./OpportunitiesVehiclePreviewModal";
import { DateFormatter } from "@/utils/DateFormatter";
import { TextFormatter } from "@/utils/TextFormatter";
import { scraperService, VehicleWithSeller } from "@/services/scraper.service";
import type { VehicleComparisonPanelProps } from "./interfaces";

// ─── Helpers visuales ─────────────────────────────────────────────────────────

function fmtPrice(n: number | null | undefined) {
    if (!n) return "N/A";
    return "$" + n.toLocaleString("es-EC");
}

function ScoreMeter({ score }: { score: number }) {
    const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-400" : "bg-orange-400";
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
            </div>
            <span className="text-[10px] font-black text-slate-500 tabular-nums w-7 text-right">
                {Math.round(score)}
            </span>
        </div>
    );
}

const FUEL_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
    gasolina: { icon: Fuel, color: "text-slate-500", bg: "bg-slate-100" },
    diesel: { icon: Flame, color: "text-orange-600", bg: "bg-orange-50" },
    hibrido: { icon: Leaf, color: "text-emerald-600", bg: "bg-emerald-50" },
    electrico: { icon: Zap, color: "text-blue-600", bg: "bg-blue-50" },
    glp: { icon: Fuel, color: "text-violet-600", bg: "bg-violet-50" },
};

const LIMITS = [3, 6, 10];

type CabinaFilter = "all" | "doble_cabina" | "una_cabina";

const CABINA_TABS: { key: CabinaFilter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "doble_cabina", label: "Doble Cabina" },
    { key: "una_cabina", label: "Una Cabina" },
];

// ─── Extractores desde texto ──────────────────────────────────────────────────

function getFullText(v: VehicleWithSeller): string {
    return [v.title, v.description, v.motor, ...(v.extras ?? []), ...(v.characteristics ?? []), ...(v.tags ?? [])]
        .filter(Boolean).join(" ").toLowerCase();
}

function extractFuelType(v: VehicleWithSeller): string {
    const text = getFullText(v);
    if (/\b(el[eé]ctrico|ev\b|bev\b|100%\s*el[eé]ctrico)\b/.test(text)) return "electrico";
    if (/\b(h[ií]brido|hybrid|phev|mhev|hev)\b/.test(text)) return "hibrido";
    if (/\b(diesel|di[eé]sel|tdi|cdi|dci|bluemotion)\b/.test(text)) return "diesel";
    if (/\b(glp|gnv|gas natural|gas licuado)\b/.test(text)) return "glp";
    if (/\b(gasolina|nafta|flex|gasoline)\b/.test(text)) return "gasolina";
    if (v.motor && /\d[\.,]\d/.test(v.motor)) return "gasolina";
    return "";
}

function extractTraction(v: VehicleWithSeller): string {
    const text = getFullText(v);
    if (/\b(awd|all[\s-]?wheel[\s-]?drive)\b/.test(text)) return "awd";
    if (/\b(4x4|4wd|4×4|cuatro[\s-]?por[\s-]?cuatro)\b/.test(text)) return "4x4";
    if (/\b(fwd|front[\s-]?wheel[\s-]?drive|tracción\s*delantera)\b/.test(text)) return "fwd";
    if (/\b(rwd|rear[\s-]?wheel[\s-]?drive|tracción\s*trasera|propulsión)\b/.test(text)) return "rwd";
    return "";
}

function extractBodyType(v: VehicleWithSeller): string {
    const text = getFullText(v);
    if (/\b(suv|crossover|todoterreno|todo\s*terreno)\b/.test(text)) return "suv";
    if (/\b(pick[\s-]?up|pickup|camioneta\s*doble\s*cabina|doble\s*cab)\b/.test(text)) return "pickup";
    if (/\b(hatchback|hatch|5\s*puertas)\b/.test(text)) return "hatchback";
    if (/\b(coup[eé]|2\s*puertas)\b/.test(text)) return "coupe";
    if (/\b(van|minivan|monovolumen|furgoneta)\b/.test(text)) return "van";
    if (/\b(convertible|cabrio|cabriolet|descapotable)\b/.test(text)) return "convertible";
    if (/\b(sed[aá]n|sedan|4\s*puertas)\b/.test(text)) return "sedan";
    return "";
}

function extractTrim(v: VehicleWithSeller): string {
    const text = v.title?.toLowerCase() ?? "";
    const TRIM_PATTERNS = [
        /\b(full\s*equipo|full)\b/, /\b(touring|tourer)\b/, /\b(limited|ltz|ltz\+)\b/,
        /\b(platinum|premium|prestige|exclusive)\b/, /\b(sport|sport\+|s-line|m-sport|m sport)\b/,
        /\b(lx|ex[-\s]?l?|ex-t)\b/, /\b(xlt|xle|xse|xsr)\b/, /\b(se|sel|sei)\b/,
        /\b(lariat|king\s*ranch|raptor|fx4)\b/, /\b(active|advance|highline|trendline)\b/,
        /\b(luxury|executive|comfort)\b/, /\b(base|standard|entry)\b/,
        /\b(gls|glx|gts|gt[i]?)\b/, /\b(rs|ss|zr[12]|z71)\b/,
    ];
    for (const pattern of TRIM_PATTERNS) {
        const match = text.match(pattern);
        if (match) return match[1].trim().replace(/\s+/g, "-");
    }
    return "";
}

// ─── Agrupación ───────────────────────────────────────────────────────────────

function getMileageBucket(mileage: number | null | undefined): string {
    if (mileage == null) return "unknown";
    const step = 50_000;
    const floor = Math.floor(mileage / step) * step;
    return `${floor}-${floor + step}`;
}

function normalize(value: string | null | undefined): string {
    if (!value) return "";
    return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function getBaseKey(v: VehicleWithSeller): string {
    return `${normalize(v.brand)}__${normalize(v.model)}__${v.year ?? "sin-año"}`;
}

function getDetailedKey(v: VehicleWithSeller): string {
    return [
        getBaseKey(v),
        extractTrim(v),
        extractFuelType(v),
        extractTraction(v),
        extractBodyType(v),
        normalize(v.transmission),
        getMileageBucket(v.mileage),
    ].join("|");
}

// ─── Scoring dentro del sub-grupo ─────────────────────────────────────────────

function scoreInGroup(v: VehicleWithSeller, groupAvgPrice: number): number {
    let score = 0;
    if (v.price && groupAvgPrice > 0) score += ((groupAvgPrice - v.price) / groupAvgPrice) * 40;
    if (v.mileage != null) score += Math.max(0, 1 - v.mileage / 300_000) * 30;
    if (v.motor) {
        const match = v.motor.match(/(\d+[\.,]\d+)/);
        if (match) {
            const cc = parseFloat(match[1].replace(",", "."));
            if (cc >= 2.0) score += 5;
            if (cc >= 3.0) score += 5;
        }
    }
    const text = getFullText(v);
    ["único dueño", "mantenimientos al día", "como nuevo", "garaje", "full equipo", "factura", "sin choques"]
        .forEach(w => { if (text.includes(w)) score += 3; });
    ["chocado", "sin papeles", "remato urgente", "para repuestos", "motor dañado", "accidentado"]
        .forEach(w => { if (text.includes(w)) score -= 15; });
    return score;
}

function getBestFromGroup(group: VehicleWithSeller[]): VehicleWithSeller {
    const priced = group.filter(v => v.price);
    const avgPrice = priced.length ? priced.reduce((sum, v) => sum + v.price!, 0) / priced.length : 0;
    let best = group[0];
    let bestScore = -Infinity;
    group.forEach(v => {
        const s = scoreInGroup(v, avgPrice);
        if (s > bestScore) { bestScore = s; best = v; }
    });
    return best;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
    priceStatistics: VehicleComparisonPanelProps["priceStatistics"];
    limit?: number;
}

export function VehicleComparisonPanel({ priceStatistics, limit: initialLimit = 6 }: Props) {
    const [activeVehicle, setActiveVehicle] = useState<{
        vehicle: ScoredVehicle;
        group: VehicleWithSeller[];
    } | null>(null);
    const [limit, setLimit] = useState(initialLimit);
    const [cabinaFilter, setCabinaFilter] = useState<CabinaFilter>("all");
    const [rawVehicles, setRawVehicles] = useState<VehicleWithSeller[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const dateFormatter = new DateFormatter(new TextFormatter());

    const groupMapRef = useRef(new Map<string, VehicleWithSeller[]>());

    useEffect(() => {
        setIsLoading(true);
        setError(null);
        scraperService
            .getVehiclesForOpportunities()
            .then(data => setRawVehicles(data))
            .catch(err => {
                console.error("[VehicleComparisonPanel] Error:", err);
                setError("Error al cargar oportunidades");
            })
            .finally(() => setIsLoading(false));
    }, []);

    const priceStatsMap = useMemo(() => {
        const map = new Map<string, typeof priceStatistics[0]>();
        priceStatistics.forEach(ps => {
            map.set(`${ps.brand}_${ps.model}_${ps.year ?? ""}`, ps);
        });
        return map;
    }, [priceStatistics]);

    const bestPerGroup = useMemo(() => {
        if (!rawVehicles.length) return [];

        const baseGroups = new Map<string, VehicleWithSeller[]>();
        rawVehicles.forEach(v => {
            const key = getBaseKey(v);
            if (!baseGroups.has(key)) baseGroups.set(key, []);
            baseGroups.get(key)!.push(v);
        });

        const eligibleBaseGroups = new Map<string, VehicleWithSeller[]>();
        baseGroups.forEach((group, key) => {
            if (group.length >= 5) eligibleBaseGroups.set(key, group);
        });

        if (!eligibleBaseGroups.size) return [];

        if (process.env.NODE_ENV === "development") {
            console.group("[VehicleComparisonPanel] Pipeline");
            console.log(`Total: ${rawVehicles.length} | Grupos base elegibles (5+): ${eligibleBaseGroups.size}`);
            eligibleBaseGroups.forEach((g, k) => console.log(`  ${k}: ${g.length} vehículos`));
            console.groupEnd();
        }

        const bests: VehicleWithSeller[] = [];
        const groupMap = new Map<string, VehicleWithSeller[]>();

        eligibleBaseGroups.forEach((baseGroup, _baseKey) => {
            const subGroups = new Map<string, VehicleWithSeller[]>();
            baseGroup.forEach(v => {
                const key = getDetailedKey(v);
                if (!subGroups.has(key)) subGroups.set(key, []);
                subGroups.get(key)!.push(v);
            });

            const candidates: VehicleWithSeller[] = [];
            subGroups.forEach(subGroup => candidates.push(getBestFromGroup(subGroup)));

            const priced = baseGroup.filter(v => v.price);
            const baseAvgPrice = priced.length
                ? priced.reduce((sum, v) => sum + v.price!, 0) / priced.length
                : 0;

            let overallBest = candidates[0];
            let bestScore = -Infinity;
            candidates.forEach(c => {
                const s = scoreInGroup(c, baseAvgPrice);
                if (s > bestScore) { bestScore = s; overallBest = c; }
            });

            groupMap.set(overallBest.id, baseGroup);
            bests.push(overallBest);
        });

        groupMapRef.current = groupMap;
        return bests;
    }, [rawVehicles]);

    const opportunitiesResult = useMemo(() => {
        if (!bestPerGroup.length) return null;
        return OpportunityScorer.getTopOpportunities(bestPerGroup, priceStatsMap, limit);
    }, [bestPerGroup, priceStatsMap, limit]);

    const topVehicles = useMemo(() => {
        if (!opportunitiesResult) return [];
        if (cabinaFilter === "doble_cabina") return opportunitiesResult.dobleCabina;
        if (cabinaFilter === "una_cabina") return opportunitiesResult.unaCabina;
        return opportunitiesResult.all;
    }, [opportunitiesResult, cabinaFilter]);

    const cabinaCounts = useMemo(() => ({
        all: opportunitiesResult?.all.length ?? 0,
        doble_cabina: opportunitiesResult?.dobleCabina.length ?? 0,
        una_cabina: opportunitiesResult?.unaCabina.length ?? 0,
    }), [opportunitiesResult]);

    // ── Loading ──
    if (isLoading) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-slate-200 animate-pulse" />
                    <div className="h-6 w-48 bg-slate-200 rounded-lg animate-pulse" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="rounded-xl border border-slate-100 overflow-hidden animate-pulse">
                            <div className="h-36 bg-slate-200" />
                            <div className="p-4 space-y-2">
                                <div className="h-4 bg-slate-200 rounded w-3/4" />
                                <div className="h-3 bg-slate-200 rounded w-1/2" />
                                <div className="h-3 bg-slate-200 rounded w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── Error ──
    if (error) {
        return (
            <div className="rounded-2xl border-2 border-dashed border-red-200 bg-red-50 p-10 text-center">
                <AlertCircle className="h-10 w-10 mx-auto text-red-300 mb-3" />
                <p className="text-red-500 font-semibold text-sm">{error}</p>
            </div>
        );
    }

    // ── Empty ──
    if (!opportunitiesResult?.all.length) {
        return (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                <Trophy className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-semibold text-sm">
                    {rawVehicles.length === 0
                        ? "No existen vehículos suficientes para filtrar las mejores oportunidades"
                        : "No se pudieron determinar oportunidades con los datos actuales"}
                </p>
                <p className="text-slate-400 text-xs mt-1">
                    Se necesitan mínimo 5 vehículos del mismo modelo y año para comparar
                </p>
            </div>
        );
    }

    // ── Content ──
    return (
        <>
            <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-6 pt-5 pb-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-white">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-xl">
                                <Trophy className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-slate-900">Mejores Oportunidades</h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Mejor deal por modelo · {rawVehicles.length} vehículos analizados · {bestPerGroup.length} grupos
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                            {LIMITS.map(l => (
                                <button
                                    key={l}
                                    onClick={() => setLimit(l)}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${limit === l ? "bg-white shadow text-slate-900" : "text-slate-400 hover:text-slate-700"}`}
                                >
                                    Top {l}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Cabina tabs */}
                    <div className="flex items-center gap-1 mt-4">
                        {CABINA_TABS.map(tab => {
                            const count = cabinaCounts[tab.key];
                            const isActive = cabinaFilter === tab.key;
                            const isDisabled = count === 0 && tab.key !== "all";
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => !isDisabled && setCabinaFilter(tab.key)}
                                    disabled={isDisabled}
                                    className={`
                                        flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                                        ${isActive
                                            ? "bg-amber-500 text-white shadow-sm"
                                            : isDisabled
                                                ? "text-slate-300 cursor-not-allowed"
                                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}
                                    `}
                                >
                                    {tab.label}
                                    {count > 0 && (
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"}`}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Empty filter state */}
                {topVehicles.length === 0 ? (
                    <div className="p-10 text-center">
                        <Car className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-400 text-sm font-semibold">
                            No hay vehículos de {cabinaFilter === "doble_cabina" ? "doble cabina" : "una cabina"} disponibles
                        </p>
                    </div>
                ) : (
                    /* Grid de cards */
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {topVehicles.map((v, i) => {
                            const fuelKey = v.parsedFuelType ? normalize(v.parsedFuelType) : "";
                            const fuelCfg = FUEL_CONFIG[fuelKey] ?? null;
                            const FuelIcon = fuelCfg?.icon ?? Fuel;
                            const isTop = i === 0;
                            const group = groupMapRef.current.get(v.id) ?? [];

                            return (
                                <button
                                    key={v.id}
                                    onClick={() => setActiveVehicle({ vehicle: v, group })}
                                    style={{ animationDelay: `${i * 60}ms` }}
                                    className={`
                                        group relative flex flex-col text-left w-full
                                        bg-white rounded-xl border transition-all duration-300
                                        hover:shadow-lg active:scale-[0.99]
                                        animate-in fade-in slide-in-from-bottom-3
                                        ${isTop
                                            ? "border-amber-300 hover:border-amber-400 hover:shadow-amber-100"
                                            : "border-slate-200 hover:border-slate-300"}
                                        overflow-hidden
                                    `}
                                >
                                    {isTop && (
                                        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded-full shadow-md">
                                            <Trophy className="h-2.5 w-2.5" /> #1 MEJOR DEAL
                                        </div>
                                    )}

                                    {/* Imagen */}
                                    <div className="relative w-full h-36 flex-shrink-0 overflow-hidden bg-slate-100">
                                        {v.image_url ? (
                                            <img
                                                src={v.image_url}
                                                alt={`${v.brand} ${v.model}`}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Car className="h-10 w-10 text-slate-300" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-white/90 backdrop-blur-sm text-[10px] font-black text-slate-700 rounded-full shadow">
                                            <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                                            {Math.round(v.opportunityScore)}/100
                                        </div>
                                        <div className="absolute bottom-2 right-3 text-right">
                                            <div className="text-white/60 text-[8px] font-bold uppercase tracking-wider leading-none mb-0.5">Precio</div>
                                            <div className="text-white font-black text-base leading-none drop-shadow">{fmtPrice(v.price)}</div>
                                        </div>
                                        <div className="absolute bottom-2.5 left-3 flex items-center gap-1 text-white/80 text-[10px] font-semibold capitalize">
                                            <MapPin className="h-2.5 w-2.5" />
                                            {v.location ?? "N/A"}
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className="p-3.5 flex flex-col gap-2.5 flex-1">
                                        <div>
                                            <h3 className="font-black text-sm text-slate-900 leading-tight">
                                                {v.brand?.toUpperCase()} {v.model?.toUpperCase()}
                                            </h3>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-xs font-bold text-slate-400">{v.year ?? "N/A"}</span>
                                                {v.parsedCabina && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-md border border-amber-100">
                                                        {v.parsedCabina === "doble_cabina" ? "Doble Cabina" : "Una Cabina"}
                                                    </span>
                                                )}
                                                {group.length > 1 && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100">
                                                        1 de {group.length}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-1">
                                            {fuelCfg && (
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${fuelCfg.bg} ${fuelCfg.color}`}>
                                                    <FuelIcon className="h-2.5 w-2.5" />
                                                    {v.parsedFuelType}
                                                </span>
                                            )}
                                            {v.parsedTraction && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-600">
                                                    <Layers className="h-2.5 w-2.5" />
                                                    {v.parsedTraction}
                                                </span>
                                            )}
                                            {v.parsedBodyType && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-50 text-violet-600">
                                                    <Car className="h-2.5 w-2.5" />
                                                    {v.parsedBodyType}
                                                </span>
                                            )}
                                            {v.mileage != null && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-100">
                                                    <Gauge className="h-2.5 w-2.5" />
                                                    {v.mileage.toLocaleString()} km
                                                </span>
                                            )}
                                            {v.transmission && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600">
                                                    {v.transmission}
                                                </span>
                                            )}
                                        </div>

                                        {v.tags && v.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {v.tags.slice(0, 2).map(tag => (
                                                    <span key={tag} className="text-[9px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 uppercase tracking-wide">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="space-y-0.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Score</span>
                                                {v.scoreBreakdown.priceScore > 85 && (
                                                    <TrendingDown className="h-2.5 w-2.5 text-emerald-500" />
                                                )}
                                            </div>
                                            <ScoreMeter score={v.opportunityScore} />
                                        </div>

                                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                                                <Clock className="h-2.5 w-2.5" />
                                                {dateFormatter.formatRelativeTime(v.publication_date)}
                                            </div>
                                            <div className="flex items-center gap-0.5 text-[10px] font-bold text-slate-400 group-hover:text-slate-700 transition-colors">
                                                Ver detalle
                                                <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-transparent ${isTop ? "via-amber-400" : "via-slate-300"} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {activeVehicle && (
                <OpportunitiesVehiclePreviewModal
                    vehicle={activeVehicle.vehicle}
                    groupVehicles={activeVehicle.group}
                    onClose={() => setActiveVehicle(null)}
                />
            )}
        </>
    );
}