import { scraperService, VehicleWithSeller } from "@/services/scraper.service";
import {
    DatabaseZap, Search, Car, RefreshCcw, X, Zap, ChevronDown, ChevronUp, Sparkles
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { OpportunitiesFiltersView } from "./OpportunitiesFiltersView";
import { PriceStatistics } from "./PriceStatisticsModal";
import { ECUADOR_CAR_DATA } from "@/data/ecuadorCars";

interface OpportunitiesCenterViewProps {
    onScraperComplete?: () => void;
    isLoading?: boolean;
    topOpportunities: VehicleWithSeller[];
    vehicles: VehicleWithSeller[];

    // Filtros actuales
    selectedBrand: string;
    selectedModel: string;
    selectedYear: string;
    selectedCity: string;
    selectedDateRange: string;
    regionFilter: 'all' | 'coast' | 'sierra';
    searchTerm: string;
    sortBy: string;

    // Opciones disponibles
    availableBrands: string[];
    availableModels: string[];
    availableYears: string[];
    availableCities: string[];

    // Stats
    totalCount: number;
    enPatio: number;
    enTaller: number;

    priceStatistics: PriceStatistics[];

    // Callbacks
    onBrandChange: (value: string) => void;
    onModelChange: (value: string) => void;
    onYearChange: (value: string) => void;
    onCityChange: (value: string) => void;
    onDateRangeChange: (value: string) => void;
    onRegionFilterChange: (value: 'all' | 'coast' | 'sierra') => void;
    onSearchTermChange: (value: string) => void;
    onSortChange: (value: string) => void;
    onClearFilters: () => void;
}

export const OpportunitiesCenterView = ({
    onScraperComplete,
    isLoading,
    vehicles,
    selectedBrand,
    selectedModel,
    selectedYear,
    selectedCity,
    selectedDateRange,
    regionFilter,
    searchTerm,
    sortBy,
    availableBrands,
    availableModels,
    availableYears,
    availableCities,
    totalCount,
    enPatio,
    enTaller,
    priceStatistics,
    onBrandChange,
    onModelChange,
    onYearChange,
    onCityChange,
    onDateRangeChange,
    onRegionFilterChange,
    onSearchTermChange,
    onSortChange,
    onClearFilters,
}: OpportunitiesCenterViewProps) => {
    const [isWebhookLoading, setIsWebhookLoading] = useState(false);
    const [scraperTerm, setScraperTerm] = useState("");
    const [showCarPicker, setShowCarPicker] = useState(false);
    const [showScannerModal, setShowScannerModal] = useState(false);
    const [pickerBrand, setPickerBrand] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [currentToastId, setCurrentToastId] = useState<string | number | null>(null);
    const [catalogSearch, setCatalogSearch] = useState("");
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

    useEffect(() => {
        if (currentToastId && isWebhookLoading) {
            toast.loading(
                <div className="relative flex flex-col justify-center gap-3 ml-2 w-full pr-8">
                    <button onClick={() => toast.dismiss(currentToastId)} className="absolute -right-10 p-1 text-red-300 hover:opacity-50">
                        <X className="h-4 w-4" />
                    </button>
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
        if (!searchValue.trim()) {
            toast.error("Ingresa un término de búsqueda", { duration: 2000 });
            return;
        }

        setIsWebhookLoading(true);
        setProgress(0);
        const toastId = toast.loading("Iniciando escaneo...");
        setCurrentToastId(toastId);

        const progressInterval = setInterval(() => {
            setProgress((prev) => prev >= 95 ? prev : prev + (prev < 70 ? 2 : 0.5));
        }, 1000);

        try {
            const response = await scraperService.scrapMarketplace(searchValue);
            clearInterval(progressInterval);

            if (!response || response.status !== "done") {
                throw new Error(response?.message || "Error inesperado");
            }

            setProgress(100);
            setTimeout(() => {
                toast.success(
                    <div className="ml-2">
                        ¡Extracción completa!
                        <span className="block text-[10px] opacity-70">
                            {response.summary?.vehicles?.total || 0} vehículos encontrados
                        </span>
                    </div>,
                    { id: toastId, duration: Infinity }
                );
                setIsWebhookLoading(false);
                setCurrentToastId(null);
                setShowScannerModal(false);
                onScraperComplete?.();
            }, 1000);
        } catch (err: any) {
            clearInterval(progressInterval);
            toast.error(
                <div className="relative flex items-center gap-3 ml-2 w-full pr-8">
                    <button
                        onClick={() => toast.dismiss(toastId)}
                        className="absolute -right-30 p-1 text-red-300 hover:opacity-50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    <div className="font-semibold text-sm">
                        {err.message || "Error en el proceso"}
                    </div>
                </div>,
                { id: toastId, duration: Infinity }
            );
            setIsWebhookLoading(false);
            setCurrentToastId(null);
            setProgress(0);
        }
    }, [onScraperComplete]);

    const handlePickAndScrap = useCallback((brand: string, model?: string) => {
        const term = model ? `${brand} ${model}` : brand;
        setScraperTerm(term);
        setShowCarPicker(false);
        handleSubmitScraper(term);
    }, [handleSubmitScraper]);

    // Contadores de filtros
    const brandFilteredCount = vehicles.filter(v => v.brand === selectedBrand).length;
    const modelFilteredCount = vehicles.filter(v =>
        v.brand === selectedBrand && v.model === selectedModel
    ).length;

    return (
        <div className="flex flex-col w-full gap-4 mb-4">
            {/* FILA PRINCIPAL */}
            <div className="flex justify-between w-full gap-4 items-stretch">
                <button
                    onClick={() => setShowScannerModal(true)}
                    className="flex-1 min-w-0 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-4 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 hover:to-slate-50 transition-all group"
                >
                    <div className="flex items-center gap-3 mr-4">
                        <div className="h-10 w-10 bg-slate-900 flex items-center justify-center rounded-xl shadow-md group-hover:bg-slate-800 transition-colors">
                            <DatabaseZap className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-left">
                            <h2 className="text-lg font-black text-slate-900 tracking-tight">Escanear</h2>
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Marketplace Scraper
                            </div>
                        </div>
                    </div>
                    <Zap className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </button>

                <button
                    onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                    className="flex-shrink-0 w-32 flex flex-col items-center justify-center gap-1.5 px-5 rounded-2xl border shadow-lg transition-all p-4 bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 hover:to-slate-50 border-slate-200"
                >
                    <div className="flex justify-center items-center gap-3">
                        <span className="hidden whitespace-nowrap text-xs font-semibold text-slate-500 sm:inline">Filtros</span>
                        {isFiltersExpanded ? (
                            <ChevronUp className="h-5 w-5 text-slate-400" />
                        ) : (
                            <ChevronDown className="h-5 w-5 text-slate-400" />
                        )}
                    </div>
                </button>
            </div>

            {/* PANEL DE FILTROS */}
            <div className={`transition-all duration-300 ease-in-out ${isFiltersExpanded ? 'max-h-[1500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                    <OpportunitiesFiltersView
                        totalCount={totalCount}
                        enPatio={enPatio}
                        enTaller={enTaller}
                        enCliente={0}
                        selectedBrand={selectedBrand}
                        selectedModel={selectedModel}
                        selectedYear={selectedYear}
                        selectedDateRange={selectedDateRange}
                        selectedCity={selectedCity}
                        regionFilter={regionFilter}
                        searchTerm={searchTerm}
                        sortBy={sortBy}
                        availableBrands={availableBrands}
                        availableModels={availableModels}
                        availableYears={availableYears}
                        availableCities={availableCities}
                        brandFilteredCount={brandFilteredCount}
                        modelFilteredCount={modelFilteredCount}
                        onRegionFilterChange={onRegionFilterChange}
                        onSearchTermChange={onSearchTermChange}
                        onBrandChange={onBrandChange}
                        onModelChange={onModelChange}
                        onYearChange={onYearChange}
                        onDateRangeChange={onDateRangeChange}
                        onCityChange={onCityChange}
                        onSortChange={onSortChange}
                        onClearFilters={onClearFilters}
                        onScraperComplete={onScraperComplete}
                        isWebhookLoading={isWebhookLoading}
                        priceStatistics={priceStatistics}
                    />
                </div>
            </div>

            {/* MODAL DE SCANNER */}
            {showScannerModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50 to-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-900 rounded-2xl shadow-lg">
                                    <DatabaseZap className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900">Centro de Oportunidades</h3>
                                    <p className="text-sm text-slate-500">Escanea vehículos en Marketplace</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowScannerModal(false)}
                                className="p-3 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="h-6 w-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 bg-slate-50/50">
                            <div className="flex items-center gap-2 w-full">
                                <div className="relative flex-1 min-w-0">
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
                                    disabled={isWebhookLoading}
                                    onClick={() => setShowCarPicker(true)}
                                    className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-sm flex-shrink-0 disabled:opacity-50"
                                    title="Abrir Catálogo"
                                >
                                    <Car className="h-5 w-5" />
                                </button>
                                <button
                                    disabled={isWebhookLoading || !scraperTerm.trim()}
                                    onClick={() => handleSubmitScraper(scraperTerm)}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-red-200 disabled:opacity-50 flex-shrink-0"
                                >
                                    {isWebhookLoading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                                    <span>{isWebhookLoading ? `${Math.round(progress)}%` : 'Escanear'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CATÁLOGO */}
            {showCarPicker && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
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
                                onClick={() => { setShowCarPicker(false); setPickerBrand(null); setCatalogSearch(""); }}
                                className="p-3 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="h-6 w-6 text-slate-400" />
                            </button>
                        </div>
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
                                    <button onClick={() => setCatalogSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full text-slate-400">
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar">
                            {!pickerBrand ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {Object.keys(ECUADOR_CAR_DATA)
                                        .filter(brand => brand.toLowerCase().includes(catalogSearch.toLowerCase()))
                                        .map((brand) => (
                                            <button key={brand} onClick={() => { setPickerBrand(brand); setCatalogSearch(""); }}
                                                className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-700 hover:bg-white hover:border-red-500 hover:text-red-600 hover:shadow-xl hover:shadow-red-100 transition-all active:scale-95">
                                                {brand}
                                            </button>
                                        ))}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <button onClick={() => { setPickerBrand(null); setCatalogSearch(""); }} className="flex items-center gap-2 text-xs font-bold text-red-500 hover:underline">
                                        ← VOLVER A MARCAS
                                    </button>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {!catalogSearch && (
                                            <button onClick={() => handlePickAndScrap(pickerBrand)}
                                                className="p-6 bg-red-600 border border-red-500 rounded-2xl text-sm font-black text-white hover:bg-red-700 transition-all flex flex-col items-center gap-1 shadow-lg shadow-red-100">
                                                <Sparkles className="h-4 w-4" /> TODO {pickerBrand}
                                            </button>
                                        )}
                                        {ECUADOR_CAR_DATA[pickerBrand]
                                            .filter(model => model.toLowerCase().includes(catalogSearch.toLowerCase()))
                                            .map((model) => (
                                                <button key={model} onClick={() => handlePickAndScrap(pickerBrand, model)}
                                                    className="p-6 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-all hover:shadow-md">
                                                    {model}
                                                </button>
                                            ))}
                                    </div>
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