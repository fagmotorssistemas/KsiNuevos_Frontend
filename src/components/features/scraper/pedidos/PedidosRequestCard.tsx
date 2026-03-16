"use client";

import { useState } from "react";
import { Calendar, User, DollarSign, RefreshCw, Eye, Loader2 } from "lucide-react";
import type { VehicleRequest } from "@/components/features/requests/constants";
import { getPriorityColor, getStatusColor } from "@/components/features/requests/constants";

interface PedidosRequestCardProps {
    request: VehicleRequest;
    optionsCount: number;
    onScrapear: (request: VehicleRequest) => Promise<void>;
    onVerOpciones: (request: VehicleRequest) => void;
}

export function PedidosRequestCard({
    request,
    optionsCount,
    onScrapear,
    onVerOpciones,
}: PedidosRequestCardProps) {
    const [scraping, setScraping] = useState(false);

    const handleScrapear = async () => {
        setScraping(true);
        try {
            await onScrapear(request);
        } finally {
            setScraping(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-50 flex justify-between items-start bg-slate-50/30">
                <div>
                    <h3 className="font-bold text-slate-900 text-lg">{request.brand} {request.model}</h3>
                    <div className="flex items-center gap-2 mt-1.5 text-xs">
                        <span className={`px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${getPriorityColor(request.priority ?? "baja")}`}>
                            {request.priority ?? "baja"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full border font-medium capitalize ${getStatusColor(request.status)}`}>
                            {request.status}
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-xs text-slate-400 block mb-0.5">Presupuesto</span>
                    <span className="font-mono font-bold text-slate-700 text-lg">
                        {request.budget_max != null ? `$${request.budget_max.toLocaleString()}` : "—"}
                    </span>
                </div>
            </div>

            <div className="p-4 space-y-3 flex-1">
                <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>{request.year_min ?? "?"} – {request.year_max ?? "?"}</span>
                    </div>
                    {request.client_name && (
                        <div className="flex items-center gap-2 col-span-2">
                            <User className="h-4 w-4 text-slate-400" />
                            <span className="font-medium">Cliente: {request.client_name}</span>
                        </div>
                    )}
                </div>
                {request.notes && (
                    <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100 line-clamp-2">
                        {request.notes}
                    </p>
                )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <button
                    onClick={handleScrapear}
                    disabled={scraping}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {scraping ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4" />
                    )}
                    {scraping ? "Scrapeando…" : "Scrapear"}
                </button>
                {optionsCount > 0 && (
                    <button
                        onClick={() => onVerOpciones(request)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
                    >
                        <Eye className="h-4 w-4" />
                        Ver opciones ({optionsCount})
                    </button>
                )}
                {request.profiles?.full_name && (
                    <span className="text-[10px] text-slate-400 ml-auto">
                        Por: {request.profiles.full_name.split(" ")[0]}
                    </span>
                )}
            </div>
        </div>
    );
}
