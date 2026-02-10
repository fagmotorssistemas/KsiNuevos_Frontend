import { ECUADOR_CAR_DATA } from "@/data/ecuadorCars";
import { scraperService, VehicleWithSeller } from "@/services/scraper.service";
import {
    DatabaseZap, RefreshCw, Search, Car, RefreshCcw, X, Sparkles, Zap,
    TrendingUp, Filter, MapPin, ChevronDown, Gauge
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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

    // Extraer todas las marcas únicas disponibles
    const availableBrands = useMemo(() => {
        const brands = new Set<string>();
        vehicles.forEach(vehicle => {
            if (vehicle.brand && vehicle.brand.trim() !== '') {
                brands.add(vehicle.brand);
            }
        });
        return Array.from(brands).sort();
    }, [vehicles]);

    // Extraer todos los modelos únicos disponibles
    const availableModels = useMemo(() => {
        const models = new Set<string>();
        vehicles.forEach(vehicle => {
            if (selectedBrand !== "all" && vehicle.brand !== selectedBrand) {
                return;
            }
            if (vehicle.model && vehicle.model.trim() !== '') {
                models.add(vehicle.model);
            }
        });
        return Array.from(models).sort();
    }, [vehicles, selectedBrand]);

    // Extraer todos los años únicos disponibles
    const availableYears = useMemo(() => {
        const years = new Set<string>();
        vehicles.forEach(vehicle => {
            if (vehicle.year && vehicle.year.trim() !== '') {
                years.add(vehicle.year);
            }
        });
        return Array.from(years).sort((a, b) => Number(b) - Number(a));
    }, [vehicles]);

    const displayStats = useMemo(() => {
        return {
            total: filteredVehicles.length,
            enPatio: filteredVehicles.filter(v => v.seller?.location === 'patio').length,
            enTaller: filteredVehicles.filter(v => v.seller?.location === 'taller').length,
        };
    }, [filteredVehicles]);

    const handleBrandChange = useCallback((brand: string) => {
        onBrandChange(brand);
        onModelChange("all");
    }, [onBrandChange, onModelChange]);

    const hasActiveFilters = useMemo(() =>
        selectedBrand !== "all" ||
        selectedModel !== "all" ||
        selectedYear !== "all" ||
        selectedDateRange !== "all" ||
        searchTerm !== "" ||
        onlyCoast === false,
        [selectedBrand, selectedModel, selectedYear, selectedDateRange, searchTerm, onlyCoast]
    );

    // Actualizar el toast cuando cambia el progreso
    useEffect(() => {
        if (currentToastId && isWebhookLoading) {
            toast.loading(
                <div className="relative flex flex-col justify-center gap-3 ml-2 w-full pr-8">
                    <button
                        onClick={() => toast.dismiss(currentToastId)}
                        className="absolute -right-10 p-1 rounded-md hover:opacity-50 text-red-300 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    <div className="flex justify-between items-center">
                        <div className="font-semibold text-red-400 text-sm">Analizando Marketplace...</div>
                        <span className="text-[10px] font-mono text-red-300">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-red-500 h-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="text-[10px] text-gray-400 italic">
                        {progress < 30 && "Iniciando motores de búsqueda..."}
                        {progress >= 30 && progress < 70 && "Recopilando datos de vendedores..."}
                        {progress >= 70 && progress < 100 && "Analizando mejores precios en la región..."}
                        {progress === 100 && "Finalizando proceso..."}
                    </div>
                </div>,
                { id: currentToastId }
            );
        }
    }, [progress, currentToastId, isWebhookLoading]);

    const handleSubmitScraper = useCallback(async (searchValue: string) => {
        if (!searchValue.trim()) {
            toast.error("Por favor ingresa un término de búsqueda");
            return;
        }

        setIsWebhookLoading(true);
        setProgress(0);

        const toastId = toast.loading(
            <div className="relative flex flex-col gap-3 ml-2 w-full pr-8">
                <button
                    onClick={() => toast.dismiss(toastId)}
                    className="absolute -right-10 p-1 rounded-md hover:opacity-50 text-red-300 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
                <div className="flex justify-between items-center">
                    <div className="font-semibold text-red-400 text-sm">Analizando Marketplace...</div>
                    <span className="text-[10px] font-mono text-red-300">0%</span>
                </div>
                <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full transition-all duration-500" style={{ width: '0%' }} />
                </div>
                <div className="text-[10px] text-gray-400 italic">Iniciando motores de búsqueda...</div>
            </div>
        );

        setCurrentToastId(toastId);

        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 95) return prev;
                const increment = prev < 70 ? 2 : 0.5;
                return prev + increment;
            });
        }, 1000);

        try {
            const response = await scraperService.scrapMarketplace(searchValue);
            clearInterval(progressInterval);

            if (!response) {
                throw new Error("No se recibió respuesta del servidor");
            }

            if (response.status === "error") {
                throw new Error(response.message || "Error desconocido en el servidor");
            }

            if (response.status === "not found") {
                throw new Error("No se encontraron resultados para la búsqueda");
            }

            if (response.status !== "done") {
                throw new Error(response.message || "Respuesta inesperada del servidor");
            }

            setProgress(100);

            setTimeout(() => {
                toast.success(
                    <div className="relative flex flex-col justify-center gap-1 ml-2 pr-8">
                        <button
                            onClick={() => toast.dismiss(toastId)}
                            className="absolute -right-10 p-1 rounded-md hover:opacity-50 text-red-300 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        <div className="font-semibold text-green-600 text-sm">¡Extracción completa!</div>
                        <div className="text-xs text-gray-500">
                            {response.message && <div className="mb-1">{response.message}</div>}
                            Se han procesado <span className="font-bold text-gray-200">{response.summary?.vehicles?.total || 0}</span> vehículos.
                        </div>
                    </div>,
                    { id: toastId, duration: Infinity }
                );

                setIsWebhookLoading(false);
                setCurrentToastId(null);

                setTimeout(() => {
                    onScraperComplete?.();
                    setProgress(0);
                }, 500);
            }, 1000);

        } catch (err: any) {
            clearInterval(progressInterval);

            toast.error(
                <div className="relative flex flex-col justify-center gap-1 ml-2 pr-8">
                    <button
                        onClick={() => toast.dismiss(toastId)}
                        className="absolute -right-10 p-1 rounded-md hover:opacity-50 text-red-300 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    <div className="font-semibold text-red-600 text-sm">Error en el proceso</div>
                    <div className="text-xs text-red-400/80">{err.message || "Error desconocido"}</div>
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

    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
            {/* Header con título y botón actualizar */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-sm">
                        <DatabaseZap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Centro de Oportunidades</h2>
                        <p className="text-xs text-slate-500">Escanea Marketplace y filtra resultados</p>
                    </div>
                </div>

                <button
                    onClick={onScraperComplete}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-white text-sm font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Actualizar
                </button>
            </div>

            <div className="h-px bg-slate-100 w-full" />

            {/* Sección de Scraper */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Zap className="h-4 w-4 text-red-500" />
                    <span>Escanear Marketplace</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Ej: Toyota Fortuner 2020..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50/50"
                            value={scraperTerm}
                            onChange={(e) => setScraperTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isWebhookLoading) {
                                    handleSubmitScraper(scraperTerm);
                                }
                            }}
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowCarPicker(!showCarPicker)}
                            disabled={isWebhookLoading}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            <Car className="h-4 w-4" />
                            Catálogo
                        </button>

                        <button
                            disabled={isWebhookLoading || !scraperTerm.trim()}
                            onClick={() => handleSubmitScraper(scraperTerm)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isWebhookLoading ? (
                                <>
                                    <RefreshCcw className="h-4 w-4 animate-spin" />
                                    {Math.round(progress)}%
                                </>
                            ) : (
                                <>
                                    <DatabaseZap className="h-4 w-4" />
                                    Escanear
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Barra de progreso cuando está cargando */}
                {isWebhookLoading && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs font-medium text-slate-600">
                            <span>Progreso</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-red-500 to-orange-500 h-full transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="h-px bg-slate-100 w-full" />

            {/* Stats y botones de vista */}
            <div className="flex flex-col lg:flex-row justify-between gap-4 items-end lg:items-center">
                <div className="flex flex-wrap gap-2 text-sm w-full lg:w-auto">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-600">
                        <Gauge className="h-4 w-4 text-slate-400" />
                        <span>Total: <strong className="text-slate-900">{displayStats.total}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-lg text-green-700">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span>Patio: <strong>{displayStats.enPatio}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg text-amber-700">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>Posible daño: <strong>{displayStats.enTaller}</strong></span>
                    </div>
                </div>

                <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
                    <button
                        onClick={() => onShowTopDealsChange(!showTopDeals)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border whitespace-nowrap ${showTopDeals
                            ? "bg-orange-50 border-orange-200 text-orange-700 shadow-sm"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                    >
                        <TrendingUp className="h-4 w-4" />
                        {showTopDeals ? "Top Oportunidades" : "Ver Oportunidades"}
                    </button>

                    <button
                        onClick={() => onOnlyCoastChange(!onlyCoast)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border whitespace-nowrap ${onlyCoast
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                    >
                        {onlyCoast ? <Filter className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                        {onlyCoast ? "Sin Sierra/Oriente" : "Todo el País"}
                    </button>
                </div>
            </div>

            <div className="h-px bg-slate-100 w-full" />

            {/* Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                {/* Búsqueda */}
                <div className="lg:col-span-3 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Filtrar resultados..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50/50"
                        value={searchTerm}
                        onChange={(e) => onSearchTermChange(e.target.value)}
                    />
                </div>

                {/* Marca */}
                <div className="lg:col-span-2 relative">
                    <select
                        value={selectedBrand}
                        onChange={(e) => handleBrandChange(e.target.value)}
                        className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none bg-white cursor-pointer hover:bg-slate-50 text-slate-700 font-medium"
                    >
                        <option value="all">Marca: Todas</option>
                        {availableBrands.map(brand => (
                            <option key={brand} value={brand}>{brand}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                {/* Modelo */}
                <div className="lg:col-span-2 relative">
                    <select
                        value={selectedModel}
                        onChange={(e) => onModelChange(e.target.value)}
                        className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none bg-white cursor-pointer hover:bg-slate-50 text-slate-700 font-medium disabled:bg-slate-50 disabled:text-slate-400"
                        disabled={selectedBrand === "all"}
                    >
                        <option value="all">
                            {selectedBrand === "all" ? "Modelo: -" : "Modelo: Todos"}
                        </option>
                        {selectedBrand !== "all" && availableModels.map(model => (
                            <option key={model} value={model}>{model}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                {/* Año */}
                <div className="lg:col-span-2 relative">
                    <select
                        value={selectedYear}
                        onChange={(e) => onYearChange(e.target.value)}
                        className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none bg-white cursor-pointer hover:bg-slate-50 text-slate-700 font-medium"
                    >
                        <option value="all">Año: Todos</option>
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                {/* Fecha de publicación */}
                <div className="lg:col-span-2 relative">
                    <select
                        value={selectedDateRange}
                        onChange={(e) => onDateRangeChange(e.target.value)}
                        className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none bg-white cursor-pointer hover:bg-slate-50 text-slate-700 font-medium"
                    >
                        <option value="all">Publicado: Cualquiera</option>
                        <option value="today">Hoy</option>
                        <option value="week">Última semana</option>
                        <option value="month">Último mes</option>
                        <option value="3months">Últimos 3 meses</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                {/* Limpiar filtros */}
                <div className="lg:col-span-1 flex justify-end">
                    {hasActiveFilters && (
                        <button
                            onClick={onClearFilters}
                            className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1 font-medium transition-colors px-3 py-2 hover:bg-red-50 rounded-lg"
                        >
                            <X className="h-4 w-4" />
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            {/* Modal del catálogo */}
            {showCarPicker && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200 p-4"
                    onClick={() => setShowCarPicker(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col max-h-[90vh]"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <Car className="h-6 w-6 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Catálogo de Vehículos</h3>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        {pickerBrand ? `Modelos de ${pickerBrand}` : 'Selecciona una marca para comenzar'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCarPicker(false)}
                                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-6 bg-slate-50">
                            {!pickerBrand ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Marcas Disponibles</h4>
                                        <span className="text-xs text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
                                            {Object.keys(ECUADOR_CAR_DATA).length} marcas
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {Object.keys(ECUADOR_CAR_DATA).map((brand) => (
                                            <button
                                                key={brand}
                                                onClick={() => setPickerBrand(brand)}
                                                className="group relative px-5 py-4 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold hover:border-red-500 hover:shadow-lg hover:shadow-red-100 transition-all text-slate-700 hover:text-red-600 hover:scale-[1.02] active:scale-[0.98]"
                                            >
                                                <span className="relative z-10">{brand}</span>
                                                <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between sticky top-0 bg-slate-50 z-10 pb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-bold shadow-sm">
                                                {pickerBrand}
                                            </span>
                                            <span className="text-slate-400">→</span>
                                            <span className="text-sm text-slate-600 font-medium">Selecciona un modelo</span>
                                        </div>
                                        <button
                                            onClick={() => setPickerBrand(null)}
                                            className="flex items-center gap-1 text-sm text-slate-600 hover:text-red-600 font-semibold hover:underline transition-colors"
                                        >
                                            ← Cambiar marca
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        <button
                                            onClick={() => handlePickAndScrap(pickerBrand)}
                                            className="group relative px-5 py-4 border-2 border-dashed border-red-400 bg-gradient-to-br from-red-50 to-orange-50 text-red-700 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-red-100 transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                                        >
                                            <div className="relative z-10">
                                                <div className="text-xs opacity-70 mb-1">Ver todos</div>
                                                <div>{pickerBrand}</div>
                                            </div>
                                            <Sparkles className="absolute top-2 right-2 h-4 w-4 text-red-400 opacity-50" />
                                        </button>

                                        {ECUADOR_CAR_DATA[pickerBrand].map((model) => (
                                            <button
                                                key={model}
                                                onClick={() => handlePickAndScrap(pickerBrand, model)}
                                                className="px-5 py-4 bg-white border-2 border-slate-200 rounded-xl text-sm font-semibold hover:border-slate-400 hover:shadow-md transition-all text-slate-700 hover:text-slate-900 hover:scale-[1.02] active:scale-[0.98]"
                                            >
                                                {model}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};