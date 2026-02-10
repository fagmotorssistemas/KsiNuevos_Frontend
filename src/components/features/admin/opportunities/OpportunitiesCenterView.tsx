import { ECUADOR_CAR_DATA } from "@/data/ecuadorCars";
import { scraperService, VehicleWithSeller } from "@/services/scraper.service";
import {
    DatabaseZap, Search, Car, RefreshCcw, X, Sparkles, Zap
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { OpportunitiesFiltersView } from "./OpportunitiesFiltersView";
import { PriceStatistics } from "./PriceStatisticsModal";

interface OpportunitiesCenterViewProps {
    onScraperComplete?: () => void;
    isLoading?: boolean;
    topOpportunities: VehicleWithSeller[];
    vehicles: VehicleWithSeller[];
    filteredVehicles: VehicleWithSeller[];
    coastFilteredVehicles: VehicleWithSeller[];
    showTopDeals: boolean;
    onlyCoast: boolean;
    searchTerm: string;
    selectedBrand: string;
    selectedModel: string;
    selectedYear: string;
    selectedDateRange: string;
    priceStatistics: PriceStatistics[]
    onShowTopDealsChange: (value: boolean) => void;
    onOnlyCoastChange: (value: boolean) => void;
    onSearchTermChange: (value: string) => void;
    onBrandChange: (value: string) => void;
    onModelChange: (value: string) => void;
    onYearChange: (value: string) => void;
    onDateRangeChange: (value: string) => void;
    onClearFilters: () => void;
}

export const OpportunitiesCenterView = ({
    onScraperComplete,
    isLoading,
    topOpportunities,
    vehicles,
    filteredVehicles,
    coastFilteredVehicles,
    showTopDeals,
    onlyCoast,
    searchTerm,
    selectedBrand,
    selectedModel,
    selectedYear,
    selectedDateRange,
    priceStatistics,
    onShowTopDealsChange,
    onOnlyCoastChange,
    onSearchTermChange,
    onBrandChange,
    onModelChange,
    onYearChange,
    onDateRangeChange,
    onClearFilters,
}: OpportunitiesCenterViewProps) => {
    const [isWebhookLoading, setIsWebhookLoading] = useState(false);
    const [scraperTerm, setScraperTerm] = useState("");
    const [showCarPicker, setShowCarPicker] = useState(false);
    const [pickerBrand, setPickerBrand] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [currentToastId, setCurrentToastId] = useState<string | number | null>(null);
    const [catalogSearch, setCatalogSearch] = useState("");

    useEffect(() => {
        if (currentToastId && isWebhookLoading) {
            toast.loading(
                <div className="relative flex flex-col justify-center gap-3 ml-2 w-full pr-8">
                    <button onClick={() => toast.dismiss(currentToastId)} className="absolute -right-10 p-1 text-red-300 hover:opacity-50"><X className="h-4 w-4" /></button>
                    <div className="flex justify-between items-center">
                        <div className="font-semibold text-red-400 text-sm">Analizando Marketplace...</div>
                        <span className="text-[10px] font-mono text-red-300">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                </div>,
                { id: currentToastId }
            );
        }
    }, [progress, currentToastId, isWebhookLoading]);

    const handleSubmitScraper = useCallback(async (searchValue: string) => {
        if (!searchValue.trim()) { toast.error("Ingresa un término de búsqueda", { duration: 2000 }); return; }
        setIsWebhookLoading(true); setProgress(0);
        const toastId = toast.loading("Iniciando escaneo...");
        setCurrentToastId(toastId);
        const progressInterval = setInterval(() => {
            setProgress((prev) => prev >= 95 ? prev : prev + (prev < 70 ? 2 : 0.5));
        }, 1000);
        try {
            const response = await scraperService.scrapMarketplace(searchValue);
            clearInterval(progressInterval);
            if (!response || response.status !== "done") throw new Error(response?.message || "Error inesperado");
            setProgress(100);
            setTimeout(() => {
                toast.success(<div className="ml-2">¡Extracción completa! <span className="block text-[10px] opacity-70">{response.summary?.vehicles?.total || 0} vehículos encontrados</span></div>, { id: toastId, duration: Infinity });
                setIsWebhookLoading(false); setCurrentToastId(null);
                onScraperComplete?.();
            }, 1000);
        } catch (err: any) {
            clearInterval(progressInterval);
            toast.error(
                <div className="relative flex items-center gap-3 ml-2 w-full pr-8">
                    <button
                        onClick={() => toast.dismiss(toastId)}
                        className="absolute -right-10 p-1 text-red-300 hover:opacity-50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    <div className="font-semibold text-sm">
                        {err.message || "Error en el proceso"}
                    </div>
                </div>,
                { id: toastId, duration: Infinity }
            );
            setIsWebhookLoading(false); setCurrentToastId(null); setProgress(0);
        }
    }, [onScraperComplete]);

    const handlePickAndScrap = useCallback((brand: string, model?: string) => {
        const term = model ? `${brand} ${model}` : brand;
        setScraperTerm(term); setShowCarPicker(false); handleSubmitScraper(term);
    }, [handleSubmitScraper]);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
            {/* 1. SECCIÓN: HEADER & ENGINE */}
            <div className="p-6 bg-slate-50/50 border-b border-slate-100">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-slate-900 flex items-center justify-center rounded-2xl shadow-lg shadow-slate-200">
                            <DatabaseZap className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Centro de Oportunidades</h2>
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Marketplace Scraper
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full lg:w-auto">
                        <div className="relative flex-1 lg:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Escaneo rápido: Ej. Vitara 2015..."
                                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm"
                                value={scraperTerm}
                                onChange={(e) => setScraperTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !isWebhookLoading && handleSubmitScraper(scraperTerm)}
                            />
                        </div>
                        <button
                            onClick={() => setShowCarPicker(true)}
                            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-sm"
                            title="Abrir Catálogo"
                        >
                            <Car className="h-5 w-5" />
                        </button>
                        <button
                            disabled={isWebhookLoading || !scraperTerm.trim()}
                            onClick={() => handleSubmitScraper(scraperTerm)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-red-200 disabled:opacity-50"
                        >
                            {isWebhookLoading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                            <span className="hidden sm:inline">{isWebhookLoading ? `${Math.round(progress)}%` : 'Escanear'}</span>
                        </button>
                    </div>
                </div>
            </div>
            <OpportunitiesFiltersView
                vehicles={vehicles}
                topOpportunities={topOpportunities}
                filteredVehicles={filteredVehicles}
                coastFilteredVehicles={coastFilteredVehicles}
                showTopDeals={showTopDeals}
                onlyCoast={onlyCoast}
                priceStatistics={priceStatistics}
                searchTerm={searchTerm}
                selectedBrand={selectedBrand}
                selectedModel={selectedModel}
                selectedYear={selectedYear}
                selectedDateRange={selectedDateRange}
                onShowTopDealsChange={onShowTopDealsChange}
                onOnlyCoastChange={onOnlyCoastChange}
                onSearchTermChange={onSearchTermChange}
                onBrandChange={onBrandChange}
                onModelChange={onModelChange}
                onYearChange={onYearChange}
                onDateRangeChange={onDateRangeChange}
                onClearFilters={onClearFilters}
                onScraperComplete={onScraperComplete}
                isWebhookLoading={isWebhookLoading}
            />
            {/* MODAL CATÁLOGO (Refactorizado visualmente) */}
            {showCarPicker && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">

                        {/* HEADER */}
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50 to-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-200">
                                    <Car className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900">Catálogo Maestro</h3>
                                    <p className="text-sm text-slate-500">
                                        {pickerBrand ? `Selecciona el modelo de ${pickerBrand}` : 'Explora marcas disponibles'}
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

                        {/* BARRA DE BÚSQUEDA INTERNA */}
                        <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder={pickerBrand ? `Buscar modelo de ${pickerBrand}...` : "Buscar marca (Ej: Toyota, Kia...)"}
                                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all text-slate-800 font-medium"
                                    value={catalogSearch}
                                    onChange={(e) => setCatalogSearch(e.target.value)}
                                    autoFocus
                                />
                                {catalogSearch && (
                                    <button
                                        onClick={() => setCatalogSearch("")}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full text-slate-400"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* CONTENIDO SCROLLABLE */}
                        <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar">
                            {!pickerBrand ? (
                                /* LISTADO DE MARCAS FILTRADO */
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {Object.keys(ECUADOR_CAR_DATA)
                                        .filter(brand => brand.toLowerCase().includes(catalogSearch.toLowerCase()))
                                        .map((brand) => (
                                            <button
                                                key={brand}
                                                onClick={() => {
                                                    setPickerBrand(brand);
                                                    setCatalogSearch(""); // Limpiar búsqueda al entrar a modelos
                                                }}
                                                className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-700 hover:bg-white hover:border-red-500 hover:text-red-600 hover:shadow-xl hover:shadow-red-100 transition-all active:scale-95"
                                            >
                                                {brand}
                                            </button>
                                        ))}
                                </div>
                            ) : (
                                /* LISTADO DE MODELOS FILTRADO */
                                <div className="space-y-6">
                                    <button
                                        onClick={() => {
                                            setPickerBrand(null);
                                            setCatalogSearch(""); // Limpiar al volver
                                        }}
                                        className="flex items-center gap-2 text-xs font-bold text-red-500 hover:underline"
                                    >
                                        ← VOLVER A MARCAS
                                    </button>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {/* Botón de "Todo" solo si no hay búsqueda activa o si coincide */}
                                        {!catalogSearch && (
                                            <button
                                                onClick={() => handlePickAndScrap(pickerBrand)}
                                                className="p-6 bg-red-600 border border-red-500 rounded-2xl text-sm font-black text-white hover:bg-red-700 transition-all flex flex-col items-center gap-1 shadow-lg shadow-red-100"
                                            >
                                                <Sparkles className="h-4 w-4" /> TODO {pickerBrand}
                                            </button>
                                        )}

                                        {ECUADOR_CAR_DATA[pickerBrand]
                                            .filter(model => model.toLowerCase().includes(catalogSearch.toLowerCase()))
                                            .map((model) => (
                                                <button
                                                    key={model}
                                                    onClick={() => handlePickAndScrap(pickerBrand, model)}
                                                    className="p-6 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-all hover:shadow-md"
                                                >
                                                    {model}
                                                </button>
                                            ))}
                                    </div>

                                    {/* Mensaje si no hay resultados */}
                                    {ECUADOR_CAR_DATA[pickerBrand].filter(model => model.toLowerCase().includes(catalogSearch.toLowerCase())).length === 0 && (
                                        <div className="py-12 text-center text-slate-400">
                                            <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                            <p>No se encontraron modelos que coincidan con "{catalogSearch}"</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};