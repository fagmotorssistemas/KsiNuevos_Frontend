"use client";

import { useMemo } from "react";
import { X, Trophy, ExternalLink, Car, DollarSign, Gauge } from "lucide-react";
import type { VehicleWithSeller } from "@/services/scraper.service";
import type { PriceStatistics } from "@/components/features/admin/opportunities/interfaces";
import { OpportunityScorer, type ScoredVehicle } from "@/components/features/admin/opportunities/opportunitiesScorer";

interface PedidosResultsModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    vehicles: VehicleWithSeller[];
    priceStatistics: PriceStatistics[];
    /** Si true, se muestra etiqueta "Mejor Oportunidad" en el vehículo con mayor score */
    showBestBadge?: boolean;
}

function buildPriceStatsMap(stats: PriceStatistics[]): Map<string, PriceStatistics> {
    const map = new Map<string, PriceStatistics>();
    stats.forEach((ps) => {
        map.set(`${ps.brand}_${ps.model}_${ps.year ?? ""}`, ps);
    });
    return map;
}

export function PedidosResultsModal({
    isOpen,
    onClose,
    title,
    vehicles,
    priceStatistics,
    showBestBadge = true,
}: PedidosResultsModalProps) {
    const priceStatsMap = useMemo(() => buildPriceStatsMap(priceStatistics), [priceStatistics]);

    const { scored, bestId } = useMemo(() => {
        const withPrice = vehicles.filter((v) => v.price && v.price > 1000);
        const scoredList: ScoredVehicle[] = withPrice.map((v) => {
            const key = `${v.brand}_${v.model}_${v.year ?? ""}`;
            return OpportunityScorer.scoreVehicle(v, priceStatsMap.get(key) ?? null);
        });
        const sorted = [...scoredList].sort((a, b) => b.opportunityScore - a.opportunityScore);
        const best = sorted[0]?.id ?? null;
        return { scored: scoredList, bestId: best };
    }, [vehicles, priceStatsMap]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {scored.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Car className="h-12 w-12 mx-auto text-slate-200 mb-3" />
                            <p className="font-medium">No hay opciones que coincidan con este pedido.</p>
                            <p className="text-sm mt-1">Ejecuta &quot;Scrapear&quot; para buscar en Marketplace.</p>
                        </div>
                    ) : (
                        scored.map((v) => (
                            <div
                                key={v.id}
                                className={`rounded-xl border p-4 transition-colors ${
                                    showBestBadge && v.id === bestId
                                        ? "border-amber-300 bg-amber-50/50"
                                        : "border-slate-200 bg-slate-50/30 hover:bg-slate-50/50"
                                }`}
                            >
                                <div className="flex gap-4">
                                    <div className="w-24 h-20 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                                        {v.image_url ? (
                                            <img
                                                src={v.image_url}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Car className="h-8 w-8 text-slate-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-bold text-slate-900">
                                                    {v.brand} {v.model}
                                                    {v.year ? ` ${v.year}` : ""}
                                                </p>
                                                {v.trim && (
                                                    <span className="text-xs text-amber-600 font-medium">{v.trim}</span>
                                                )}
                                            </div>
                                            {showBestBadge && v.id === bestId && (
                                                <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold shrink-0">
                                                    <Trophy className="h-3.5 w-3.5" />
                                                    Mejor Oportunidad
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-600">
                                            <span className="flex items-center gap-1">
                                                <DollarSign className="h-4 w-4 text-slate-400" />
                                                {v.price != null ? `$${v.price.toLocaleString()}` : "—"}
                                            </span>
                                            {v.mileage != null && (
                                                <span className="flex items-center gap-1">
                                                    <Gauge className="h-4 w-4 text-slate-400" />
                                                    {v.mileage.toLocaleString()} km
                                                </span>
                                            )}
                                        </div>
                                        <a
                                            href={v.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-red-600 hover:text-red-700"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            Ver en Marketplace
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
