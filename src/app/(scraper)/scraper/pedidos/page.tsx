"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { ShieldAlert, ClipboardList, Loader2 } from "lucide-react";
import { scraperService } from "@/services/scraper.service";
import { PedidosRequestCard } from "@/components/features/scraper/pedidos/PedidosRequestCard";
import { PedidosResultsModal } from "@/components/features/scraper/pedidos/PedidosResultsModal";
import type { VehicleRequest } from "@/components/features/requests/constants";
import type { VehicleWithSeller } from "@/services/scraper.service";
import type { PriceStatistics } from "@/components/features/admin/opportunities/interfaces";
import { toast } from "sonner";

export default function ScraperPedidosPage() {
    const { profile, isLoading: isAuthLoading } = useAuth();
    const supabase = createClient();

    const [requests, setRequests] = useState<VehicleRequest[]>([]);
    const [priceStatistics, setPriceStatistics] = useState<PriceStatistics[]>([]);
    const [optionsCounts, setOptionsCounts] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(true);
    const [countsLoading, setCountsLoading] = useState(true);

    const [resultsModalOpen, setResultsModalOpen] = useState(false);
    const [resultsTitle, setResultsTitle] = useState("");
    const [resultsVehicles, setResultsVehicles] = useState<VehicleWithSeller[]>([]);
    const [resultsShowBestBadge, setResultsShowBestBadge] = useState(true);

    const fetchApprovedRequests = useCallback(async () => {
        const { data, error } = await supabase
            .from("vehicle_requests")
            .select("*, profiles:requested_by(full_name)")
            .eq("status", "aprobado")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error cargando pedidos aprobados:", error);
            setRequests([]);
            return;
        }
        setRequests((data as VehicleRequest[]) ?? []);
    }, [supabase]);

    const fetchPriceStatistics = useCallback(async () => {
        const data = await scraperService.getPriceStatistics();
        setPriceStatistics(data);
    }, []);

    const fetchOptionsCounts = useCallback(async (reqs: VehicleRequest[]) => {
        if (reqs.length === 0) {
            setOptionsCounts({});
            setCountsLoading(false);
            return;
        }
        setCountsLoading(true);
        const counts: Record<number, number> = {};
        await Promise.all(
            reqs.map(async (r) => {
                const vehicles = await scraperService.getVehiclesMatchingRequest({
                    brand: r.brand,
                    model: r.model,
                    year_min: r.year_min ?? undefined,
                    year_max: r.year_max ?? undefined,
                });
                counts[r.id] = vehicles.length;
            })
        );
        setOptionsCounts(counts);
        setCountsLoading(false);
    }, []);

    useEffect(() => {
        if (!profile) return;
        setLoading(true);
        Promise.all([fetchApprovedRequests(), fetchPriceStatistics()]).finally(() => setLoading(false));
    }, [profile, fetchApprovedRequests, fetchPriceStatistics]);

    useEffect(() => {
        if (requests.length === 0) {
            setCountsLoading(false);
            return;
        }
        fetchOptionsCounts(requests);
    }, [requests, fetchOptionsCounts]);

    const handleScrapear = useCallback(
        async (request: VehicleRequest) => {
            const term = scraperService.buildSearchTermForRequest({
                brand: request.brand,
                model: request.model,
                year_min: request.year_min ?? undefined,
                year_max: request.year_max ?? undefined,
            });
            toast.info(`Buscando "${term}" en Marketplace…`);
            const res = await scraperService.scrapMarketplace(term);
            if (!res) {
                toast.error("No se pudo completar el scrape.");
                return;
            }
            if (res.status === "error") {
                toast.error(res.message ?? "Error en el scrape", { duration: 6000 });
                return;
            }
            toast.success(
                res.resumen
                    ? `${res.resumen.listings_nuevos_guardados ?? 0} nuevos, ${res.resumen.total_vehiculos_actualizados ?? 0} actualizados`
                    : "Scrape completado"
            );
            const vehicles = await scraperService.getVehiclesMatchingRequest({
                brand: request.brand,
                model: request.model,
                year_min: request.year_min ?? undefined,
                year_max: request.year_max ?? undefined,
            });
            setResultsTitle(`Opciones: ${request.brand} ${request.model}`);
            setResultsVehicles(vehicles);
            setResultsShowBestBadge(true);
            setResultsModalOpen(true);
            setOptionsCounts((prev) => ({ ...prev, [request.id]: vehicles.length }));
        },
        []
    );

    const handleVerOpciones = useCallback(
        async (request: VehicleRequest) => {
            const vehicles = await scraperService.getVehiclesMatchingRequest({
                brand: request.brand,
                model: request.model,
                year_min: request.year_min ?? undefined,
                year_max: request.year_max ?? undefined,
            });
            setResultsTitle(`Opciones scrapeadas: ${request.brand} ${request.model}`);
            setResultsVehicles(vehicles);
            setResultsShowBestBadge(true);
            setResultsModalOpen(true);
        },
        []
    );

    if (!isAuthLoading && (!profile || (profile.role !== "admin" && profile.role !== "vendedor" && profile.role !== "marketing"))) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-50 text-slate-600">
                <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
                <h1 className="text-xl font-bold">Acceso restringido</h1>
                <p>No tienes permisos para ver el módulo Scraper.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pedidos</h1>
                <p className="text-slate-500 mt-1">
                    Pedidos aprobados. Scrapea cada uno en Marketplace y revisa las opciones acumuladas.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                </div>
            ) : requests.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <ClipboardList className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <h3 className="text-slate-700 font-semibold">No hay pedidos aprobados</h3>
                    <p className="text-slate-500 text-sm mt-1">
                        Los pedidos con estado &quot;aprobado&quot; aparecerán aquí para scrapear y ver opciones.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {requests.map((req) => (
                        <PedidosRequestCard
                            key={req.id}
                            request={req}
                            optionsCount={countsLoading ? 0 : optionsCounts[req.id] ?? 0}
                            onScrapear={handleScrapear}
                            onVerOpciones={handleVerOpciones}
                        />
                    ))}
                </div>
            )}

            <PedidosResultsModal
                isOpen={resultsModalOpen}
                onClose={() => setResultsModalOpen(false)}
                title={resultsTitle}
                vehicles={resultsVehicles}
                priceStatistics={priceStatistics}
                showBestBadge={resultsShowBestBadge}
            />
        </div>
    );
}
