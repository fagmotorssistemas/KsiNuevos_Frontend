"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
    DatabaseZap,
    Search,
    Car,
    RefreshCcw,
    X,
    Zap,
    Sparkles,
} from "lucide-react";
import { scraperService } from "@/services/scraper.service";
import { ECUADOR_CAR_DATA } from "@/data/ecuadorCars";

interface ManualScraperViewProps {
    onScraperComplete?: () => void | Promise<void>;
}

export function ManualScraperView({ onScraperComplete }: ManualScraperViewProps) {
    const [isWebhookLoading, setIsWebhookLoading] = useState(false);
    const [scraperTerm, setScraperTerm] = useState("");
    const [progress, setProgress] = useState(0);
    const [currentToastId, setCurrentToastId] = useState<string | number | null>(null);
    const [showCarPicker, setShowCarPicker] = useState(false);
    const [pickerBrand, setPickerBrand] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState("");

    useEffect(() => {
        if (!currentToastId || !isWebhookLoading) return;
        toast.loading(
            <div className="relative flex flex-col gap-3 ml-2 w-full pr-8">
                <button
                    onClick={() => toast.dismiss(currentToastId)}
                    className="absolute right-0 p-1 text-red-300 hover:opacity-50"
                >
                    <X className="h-4 w-4" />
                </button>
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-red-400 text-sm">Analizando Marketplace...</span>
                    <span className="text-[10px] font-mono text-red-300">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                    <div
                        className="bg-red-500 h-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>,
            { id: currentToastId }
        );
    }, [progress, currentToastId, isWebhookLoading]);

    const handleSubmitScraper = useCallback(
        async (searchValue: string) => {
            if (!searchValue.trim()) {
                toast.error("Ingresa un término de búsqueda", { duration: 2000 });
                return;
            }
            setIsWebhookLoading(true);
            setProgress(0);
            const toastId = toast.loading("Iniciando escaneo...");
            setCurrentToastId(toastId);

            const interval = setInterval(() => {
                setProgress((p) => (p >= 95 ? p : p + (p < 70 ? 2 : 0.5)));
            }, 1000);

            try {
                const response = await scraperService.scrapMarketplace(searchValue);
                clearInterval(interval);
                if (!response || response.status !== "done")
                    throw new Error(response?.message ?? "Estamos extrayendo los vehículos, espere un momento");
                setProgress(100);
                setTimeout(() => {
                    const r = response.resumen;
                    toast.success(
                        <div className="ml-2 space-y-1.5 min-w-[220px]">
                            <p className="font-semibold">¡Extracción completa!</p>
                            {r && (
                                <ul className="text-[11px] opacity-90 space-y-0.5">
                                    <li>
                                        <strong>{r.total_scrapeados}</strong> total scrapeados
                                    </li>
                                    <li className="text-green-600 dark:text-green-400">
                                        <strong>{r.listings_nuevos_guardados}</strong> vehículos nuevos guardados
                                    </li>
                                    <li className="text-blue-600 dark:text-blue-400">
                                        <strong>{r.total_vehiculos_actualizados}</strong> vehículos actualizados
                                    </li>
                                </ul>
                            )}
                        </div>,
                        { id: toastId, duration: 6000 }
                    );
                    setIsWebhookLoading(false);
                    setCurrentToastId(null);
                    onScraperComplete?.();
                }, 1000);
            } catch (err: unknown) {
                clearInterval(interval);
                const message = err instanceof Error ? err.message : "Error en el proceso";
                toast.error(
                    <div className="relative flex items-center gap-3 ml-2 w-full pr-8">
                        <span className="font-semibold text-sm">{message}</span>
                    </div>,
                    { id: toastId, duration: 5000 }
                );
                setIsWebhookLoading(false);
                setCurrentToastId(null);
                setProgress(0);
            }
        },
        [onScraperComplete]
    );

    const handlePickAndScrap = useCallback(
        (brand: string, model?: string) => {
            const term = model ? `${brand} ${model}` : brand;
            setScraperTerm(term);
            setShowCarPicker(false);
            setPickerBrand(null);
            setCatalogSearch("");
            handleSubmitScraper(term);
        },
        [handleSubmitScraper]
    );

    return (
        <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-amber-500 rounded-2xl shadow-lg">
                            <DatabaseZap className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Escaneo manual</h2>
                            <p className="text-sm text-slate-500">
                                Busca en Marketplace por marca, modelo o término libre. Los resultados se guardan en el inventario.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                        <div className="relative flex-1 min-w-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Ej. Vitara 2015, Toyota Corolla, Chevrolet Onix..."
                                className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all shadow-sm"
                                value={scraperTerm}
                                onChange={(e) => setScraperTerm(e.target.value)}
                                onKeyDown={(e) =>
                                    e.key === "Enter" && !isWebhookLoading && handleSubmitScraper(scraperTerm)
                                }
                            />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => setShowCarPicker(true)}
                                className="p-3 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 text-slate-600 transition-all shadow-sm flex-shrink-0 disabled:opacity-50"
                                title="Abrir catálogo por marca y modelo"
                            >
                                <Car className="h-5 w-5" />
                            </button>
                            <button
                                type="button"
                                disabled={isWebhookLoading || !scraperTerm.trim()}
                                onClick={() => handleSubmitScraper(scraperTerm)}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-amber-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isWebhookLoading ? (
                                    <RefreshCcw className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Zap className="h-4 w-4" />
                                )}
                                <span>{isWebhookLoading ? `${Math.round(progress)}%` : "Escanear"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal catálogo */}
            {showCarPicker && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50 to-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-500 rounded-xl shadow-lg">
                                    <Car className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Catálogo</h3>
                                    <p className="text-sm text-slate-500">
                                        {pickerBrand
                                            ? `Selecciona el modelo de ${pickerBrand}`
                                            : "Elige una marca para escanear"}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowCarPicker(false);
                                    setPickerBrand(null);
                                    setCatalogSearch("");
                                }}
                                className="p-3 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="h-6 w-6 text-slate-400" />
                            </button>
                        </div>
                        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={
                                        pickerBrand
                                            ? `Buscar modelo de ${pickerBrand}...`
                                            : "Buscar marca (Ej: Toyota, Kia...)"
                                    }
                                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 font-medium"
                                    value={catalogSearch}
                                    onChange={(e) => setCatalogSearch(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {!pickerBrand ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {Object.keys(ECUADOR_CAR_DATA)
                                        .filter((b) => b.toLowerCase().includes(catalogSearch.toLowerCase()))
                                        .map((b) => (
                                            <button
                                                key={b}
                                                type="button"
                                                onClick={() => {
                                                    setPickerBrand(b);
                                                    setCatalogSearch("");
                                                }}
                                                className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 hover:bg-white hover:border-amber-400 hover:text-amber-700 transition-all active:scale-[0.98]"
                                            >
                                                {b}
                                            </button>
                                        ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPickerBrand(null);
                                            setCatalogSearch("");
                                        }}
                                        className="flex items-center gap-2 text-sm font-bold text-amber-600 hover:underline"
                                    >
                                        ← Volver a marcas
                                    </button>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {!catalogSearch && (
                                            <button
                                                type="button"
                                                onClick={() => handlePickAndScrap(pickerBrand)}
                                                className="p-4 bg-amber-500 border border-amber-600 rounded-xl text-sm font-bold text-white hover:bg-amber-600 transition-all flex flex-col items-center gap-1"
                                            >
                                                <Sparkles className="h-4 w-4" /> Todo {pickerBrand}
                                            </button>
                                        )}
                                        {ECUADOR_CAR_DATA[pickerBrand]
                                            ?.filter((m) =>
                                                m.toLowerCase().includes(catalogSearch.toLowerCase())
                                            )
                                            .map((m) => (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => handlePickAndScrap(pickerBrand, m)}
                                                    className="p-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-all hover:shadow-md"
                                                >
                                                    {m}
                                                </button>
                                            ))}
                                    </div>
                                    {ECUADOR_CAR_DATA[pickerBrand]?.filter((m) =>
                                        m.toLowerCase().includes(catalogSearch.toLowerCase())
                                    ).length === 0 && (
                                        <div className="py-12 text-center text-slate-400">
                                            <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                            <p>No hay modelos que coincidan con &quot;{catalogSearch}&quot;</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
