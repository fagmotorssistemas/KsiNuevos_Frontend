import { scraperService, VehicleWithSeller, WebhookResponse } from "@/services/scraper.service";
import { useMemo, useState, useCallback } from "react";
import {
    Car,
    TrendingUp,
    MapPin,
    DatabaseBackup,
    Store,
    Calendar,
    ExternalLink,
    Filter,
    X,
    Search,
    DatabaseZap,
    RefreshCcw,
    RefreshCw,
    ChevronDown,
    XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/buttontable";
import { Database } from "@/types/supabase";
import { toast } from "sonner";
import { ECUADOR_CAR_DATA } from "@/data/ecuadorCars";

type ScraperSeller = Database['public']['Tables']['scraper_sellers']['Row'];

interface OpportunitiesViewProps {
    vehicles: VehicleWithSeller[];
    topOpportunities: VehicleWithSeller[];
    sellers: ScraperSeller[];
    isLoading: boolean;
    statusFilter?: string;
    locationFilter?: string;
    stats: {
        total: number;
        nuevos: number;
        descartados: number;
        vendidos: number;
        enMantenimiento: number;
        enPatio: number;
        enTaller: number;
        enCliente: number;
    };
    onScraperComplete?: () => Promise<void>;
}

export function OpportunitiesView({
    vehicles,
    sellers,
    stats: initialStats,
    isLoading,
    statusFilter,
    locationFilter,
    topOpportunities,
    onScraperComplete
}: OpportunitiesViewProps) {

    const [onlyCoast, setOnlyCoast] = useState(true);
    const [showTopDeals, setShowTopDeals] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [scraperTerm, setScraperTerm] = useState("");
    const [isWebhookLoading, setIsWebhookLoading] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState<string>("all");
    const [selectedYear, setSelectedYear] = useState<string>("all");
    const [selectedModel, setSelectedModel] = useState<string>("all");
    const [showCarPicker, setShowCarPicker] = useState(false);
    const [pickerBrand, setPickerBrand] = useState<string | null>(null);

    const sourceVehicles = useMemo(() =>
        showTopDeals ? topOpportunities : vehicles,
        [showTopDeals, topOpportunities, vehicles]
    );

    const regex = /\b(?:babahoyo|milagro|naranjal|daule|los lojas|eloy alfaro|la troncal|el triunfo|guayaquil|esmeraldas|portoviejo|santo\s+domingo|santa\s+elena|machala|manta)\b/i;

    // Filtrar vehículos primero por costa si está activo
    const coastFilteredVehicles = useMemo(() => {
        if (!onlyCoast) return sourceVehicles;

        return sourceVehicles.filter(vehicle => {
            const sellerLocation = vehicle.seller?.location?.toLowerCase() || '';
            return !regex.test(sellerLocation);
        });
    }, [sourceVehicles, onlyCoast]);

    // Extraer todas las marcas únicas disponibles (después del filtro de costa)
    const availableBrands = useMemo(() => {
        const brands = new Set<string>();
        coastFilteredVehicles.forEach(vehicle => {
            if (vehicle.category) {
                brands.add(vehicle.category);
            }
        });
        return Array.from(brands).sort();
    }, [coastFilteredVehicles]);

    // Extraer todos los modelos únicos disponibles (filtrados por marca si hay una seleccionada)
    const availableModels = useMemo(() => {
        const models = new Set<string>();
        coastFilteredVehicles.forEach(vehicle => {
            // Si hay una marca seleccionada, solo mostrar modelos de esa marca
            if (selectedBrand !== "all" && vehicle.category !== selectedBrand) {
                return;
            }
            if (vehicle.model) {
                models.add(vehicle.model);
            }
        });
        return Array.from(models).sort();
    }, [coastFilteredVehicles, selectedBrand]);

    // Extraer todos los años únicos disponibles (después del filtro de costa)
    const availableYears = useMemo(() => {
        const years = new Set<string>();
        coastFilteredVehicles.forEach(vehicle => {
            if (vehicle.year) {
                years.add(vehicle.year);
            }
        });
        return Array.from(years).sort((a, b) => Number(b) - Number(a));
    }, [coastFilteredVehicles]);

    // Aplicar todos los filtros
    const filteredVehicles = useMemo(() => {
        return coastFilteredVehicles.filter(vehicle => {
            // Filtro de búsqueda por texto
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const titleMatch = vehicle.title?.toLowerCase().includes(searchLower);
                const descMatch = vehicle.description?.toLowerCase().includes(searchLower);
                const brandMatch = vehicle.category?.toLowerCase().includes(searchLower);
                const modelMatch = vehicle.model?.toLowerCase().includes(searchLower);

                if (!titleMatch && !descMatch && !brandMatch && !modelMatch) {
                    return false;
                }
            }

            // Filtro por marca
            if (selectedBrand !== "all" && vehicle.category !== selectedBrand) {
                return false;
            }

            // Filtro por modelo
            if (selectedModel !== "all" && vehicle.model !== selectedModel) {
                return false;
            }

            // Filtro por año
            if (selectedYear !== "all" && vehicle.year !== selectedYear) {
                return false;
            }

            return true;
        });
    }, [coastFilteredVehicles, searchTerm, selectedBrand, selectedModel, selectedYear]);

    const displayStats = useMemo(() => {
        return {
            total: filteredVehicles.length,
            enPatio: filteredVehicles.filter(v => v.location === 'patio').length,
            enTaller: filteredVehicles.filter(v => v.location === 'taller').length,
            enCliente: filteredVehicles.filter(v => v.location === 'cliente').length,
        };
    }, [filteredVehicles]);

    const displaySellers = useMemo(() => {
        if (!onlyCoast) return sellers;
        return sellers.filter(s => !regex.test(s.location?.toLowerCase() || ''));
    }, [sellers, onlyCoast]);

    const dealersCount = useMemo(() =>
        displaySellers.filter(s => s.is_dealer).length,
        [displaySellers]
    );

    const newestVehicle = useMemo(() => {
        if (filteredVehicles.length === 0) return null;
        return filteredVehicles.reduce((prev, current) => {
            const prevDate = new Date(prev.created_at || 0).getTime();
            const currentDate = new Date(current.created_at || 0).getTime();
            return currentDate > prevDate ? current : prev;
        });
    }, [filteredVehicles]);

    // Función optimizada para manejar el webhook - SE EJECUTA UNA SOLA VEZ
    const handleSubmitScraper = useCallback(async (searchValue: string) => {
        if (!searchValue.trim()) {
            toast.error("Por favor ingresa un término de búsqueda");
            return;
        }

        setIsWebhookLoading(true);

        const scraperPromise = scraperService
            .scrapMarketplace(searchValue)
            .then((response) => {
                if (!response) {
                    throw new Error("Respuesta vacía del scraper");
                }

                if (response.status === "error") {
                    throw new Error(response.message || "Error en el servidor");
                }

                if (response.status === "not found") {
                    throw new Error("NOT_FOUND");
                }

                return response;
            })
            .finally(() => {
                setIsWebhookLoading(false);
                onScraperComplete?.(); // NO bloquear la promesa
            });

        toast.promise<WebhookResponse>(scraperPromise, {
            loading: (
                <div className="flex flex-col gap-2 ml-2">
                    <div className="font-semibold text-blue-400 text-sm">
                        Analizando Marketplace...
                    </div>
                    <div className="text-xs text-gray-300">
                        Iniciando scraper y recopilando información
                    </div>
                </div>
            ),

            success: (data) => (
                <div className="flex flex-col gap-2 ml-2">
                    <div className="font-semibold text-green-400 text-sm">
                        ¡Scraper completado con éxito!
                    </div>

                    <div className="text-xs text-gray-300 space-y-1">
                        <div>Ingresados: <span className="font-semibold">{data.summary.vehicles.inserted}</span></div>
                        <div>Descartados: <span className="font-semibold">{data.summary.vehicles.failed}</span></div>
                        <div>Total: <span className="font-semibold">{data.summary.vehicles.total}</span></div>
                    </div>
                </div>
            ),

            error: (err: any) => (
                <div className="flex flex-col gap-2 ml-2">
                    <div className="font-semibold text-red-400 text-sm">
                        Error en el proceso
                    </div>
                    <div className="text-xs text-gray-300">
                        {err.message === "NOT_FOUND"
                            ? "No se encontraron resultados"
                            : err.message || "Error desconocido"}
                    </div>
                </div>
            ),

            action: {
                label: <XIcon className="h-4 w-4 text-white" />,
                onClick: () => toast.dismiss(),
            },

            actionButtonStyle: {
                backgroundColor: "transparent",
            },

            duration: 8000,
        });
    }, [onScraperComplete]);

    const handleBrandChange = useCallback((brand: string) => {
        setSelectedBrand(brand);
        setSelectedModel("all");
    }, []);

    const handleClearFilters = useCallback(() => {
        setSelectedBrand("all");
        setSelectedYear("all");
        setSelectedModel("all");
        setSearchTerm("");
        setOnlyCoast(true);
    }, []);

    const handlePickAndScrap = useCallback((brand: string, model?: string) => {
        const term = model ? `${brand} ${model}` : brand;

        setScraperTerm(term);
        setShowCarPicker(false);

        handleSubmitScraper(term);
    }, [handleSubmitScraper]);

    const hasActiveFilters = useMemo(() =>
        selectedBrand !== "all" ||
        selectedModel !== "all" ||
        selectedYear !== "all" ||
        searchTerm !== "" ||
        onlyCoast === false,
        [selectedBrand, selectedModel, selectedYear, searchTerm, onlyCoast]
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">

            {/* Header con Switch de Filtro */}
            <div className="flex flex-col md:flex-row w-full justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 w-full justify-between">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Ingresar vehículo para scrapear..."
                            className="pl-9 pr-4 py-2 text-md h-full rounded-lg focus:outline-none w-full"
                            value={scraperTerm}
                            onChange={(e) => setScraperTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isWebhookLoading) {
                                    handleSubmitScraper(scraperTerm);
                                }
                            }}
                        />
                    </div>
                    <div className="flex gap-2 justify-end items-center">
                        <div className="flex items-center gap-2 ml-auto">
                            <Button
                                variant="link-gray"
                                size="sm"
                                onClick={onScraperComplete}
                                disabled={isLoading}
                                className="flex items-center gap-2"
                            >
                                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </Button>
                            {/* <button
                                onClick={() => setShowCarPicker(!showCarPicker)}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border shadow-sm ${showCarPicker
                                    ? "bg-indigo-600 border-indigo-600 text-white"
                                    : "bg-white border-slate-200 text-slate-700"
                                    }`}
                            >
                                <Car className="h-4 w-4" />
                                <span className="whitespace-nowrap">Elegir Marca / Modelo</span>
                            </button> */}
                            <button
                                disabled={isWebhookLoading}
                                onClick={() => handleSubmitScraper(scraperTerm)}
                                className="flex items-center gap-2 px-4 py-2 disabled:opacity-50 rounded-lg text-xs font-bold transition-all border w-fit whitespace-nowrap bg-blue-600 border-blue-600 text-white shadow-sm hover:bg-blue-700"
                            >
                                {isWebhookLoading ? (
                                    <>
                                        <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                                        <p>Cargando datos del scraper, esto puede demorar unos minutos...</p>
                                    </>
                                ) : (
                                    <>
                                        <DatabaseZap className="h-3.5 w-3.5" />
                                        <p>Scrapear Datos</p>
                                    </>
                                )}
                            </button>

                        </div>
                    </div>
                </div>
            </div>

            {/* Tarjetas Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <DatabaseBackup className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase">
                            Total {onlyCoast ? '' : '(Global)'}
                        </span>
                    </div>
                    <span className="text-2xl font-bold text-slate-900">{displayStats.total}</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <Store className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase">
                            Vendedores {onlyCoast ? '' : '(Global)'}
                        </span>
                    </div>
                    <div className="flex gap-2 items-end">
                        <span className="text-2xl font-bold text-slate-900">{displaySellers.length}</span>
                        <p className="text-xs text-slate-500 mt-1">Revendedores: {dealersCount}</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden">
                    <div className="relative z-10">
                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Más Reciente</span>
                        {newestVehicle ? (
                            <div>
                                <div className="font-bold text-slate-900 text-sm truncate w-48" title={newestVehicle.title || ''}>
                                    {newestVehicle.title || 'Sin título'}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {newestVehicle.publication_date ? new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(newestVehicle.publication_date)) : 'Fecha desconocida'}
                                </div>
                            </div>
                        ) : <span className="text-slate-400 italic text-sm">Sin datos</span>}
                    </div>
                    {newestVehicle && (
                        <div className="text-right relative z-10">
                            <span className="block text-xl font-bold text-blue-600">
                                {newestVehicle.price ? `$${(newestVehicle.price / 1000).toFixed(0)}k` : 'N/A'}
                            </span>
                            <span className="block text-[10px] text-blue-400 font-medium uppercase tracking-wide">
                                {newestVehicle.status === 'PC_USED_LIKE_NEW' ? 'Usado - Como Nuevo' : newestVehicle.status === 'USED' ? 'Bueno' : newestVehicle.status === 'NEW_ITEM' ? 'Nuevo' : 'Desconocido'}
                            </span>
                        </div>
                    )}
                    <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-blue-50 to-transparent opacity-50 pointer-events-none" />
                </div>
            </div>

            {/* Sub-filtros de ubicación de inventario */}
            <div className="flex flex-col gap-4 w-full py-2">
                {/* Primera fila: Buscador y Filtros */}
                <div className="grid grid-cols-1 md:flex md:flex-wrap items-center gap-3 w-full">

                    {/* Input de búsqueda: Ancho completo en móvil, flexible en desktop */}
                    <div className="relative w-full md:flex-1 md:min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar vehículo..."
                            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Contenedor de Selects: Grid de 2 columnas en móvil, auto en desktop */}
                    <div className="grid grid-cols-2 lg:flex gap-2 w-full md:w-auto">
                        <div className="relative">
                            <select
                                value={selectedBrand}
                                onChange={(e) => handleBrandChange(e.target.value)}
                                className="w-full appearance-none pl-3 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                                <option value="all">Todas las marcas ({availableBrands.length})</option>
                                {availableBrands.map(brand => (
                                    <option key={brand} value={brand}>{brand}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>

                        <div className="relative">
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="w-full appearance-none pl-3 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white cursor-pointer hover:bg-slate-50 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
                                disabled={selectedBrand === "all"}
                            >
                                <option value="all">
                                    {selectedBrand === "all" ? "Selecciona una marca" : `Todos los modelos (${availableModels.length})`}
                                </option>
                                {selectedBrand !== "all" && availableModels.map(model => (
                                    <option key={model} value={model}>
                                        {model}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>

                        <div className="relative">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="w-full appearance-none pl-3 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                                <option value="all">Años ({availableYears.length})</option>
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Segunda fila: Estadísticas y Botones de Acción */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-100 pt-3">

                    {/* Info de Stock */}
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Resumen de inventario</div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-600">
                                Patio: <strong className="text-slate-900">{displayStats.enPatio}</strong>
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="text-xs text-slate-600">
                                Posible daño mecánico: <strong className="text-slate-900">{displayStats.enTaller}</strong>
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="text-xs text-slate-600">
                                Vendedor: <strong className="text-slate-900">{displayStats.enCliente}</strong>
                            </span>
                            <span className="text-xs text-slate-400 ml-2 italic">
                                ({filteredVehicles.length} de {sourceVehicles.length})
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border shadow-sm bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                            >
                                <X className="h-4 w-4" />
                                <span className="whitespace-nowrap">Limpiar filtros</span>
                            </button>
                        )}

                        <button
                            onClick={() => setShowTopDeals(!showTopDeals)}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border shadow-sm ${showTopDeals
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "bg-white border-slate-200 text-slate-700"
                                }`}
                        >
                            <TrendingUp className="h-4 w-4" />
                            <span className="whitespace-nowrap">{showTopDeals ? "Ver todos" : "Oportunidades"}</span>
                        </button>

                        <button
                            onClick={() => setOnlyCoast(!onlyCoast)}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${onlyCoast
                                ? 'bg-blue-500 border-blue-500 text-white'
                                : 'bg-white border-slate-200 text-slate-600'
                                }`}
                        >
                            {onlyCoast ? <X className="h-3.5 w-3.5" /> : <Filter className="h-3.5 w-3.5" />}
                            <span className="whitespace-nowrap">{onlyCoast ? "Ver todo" : "Sin Costa"}</span>
                        </button>
                    </div>
                </div>
            </div>
            {showCarPicker && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-4 animate-in fade-in slide-in-from-top-2">

                    {!pickerBrand ? (
                        <>
                            <div className="text-xs font-bold text-slate-500 uppercase mb-3">
                                Selecciona una marca
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                {Object.keys(ECUADOR_CAR_DATA).map((brand) => (
                                    <button
                                        key={brand}
                                        onClick={() => setPickerBrand(brand)}
                                        className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-indigo-50 hover:border-indigo-400 transition-all text-slate-700"
                                    >
                                        {brand}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-xs font-bold text-slate-500 uppercase">
                                    {pickerBrand} — Selecciona modelo
                                </div>
                                <button
                                    onClick={() => setPickerBrand(null)}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                                >
                                    ← Cambiar marca
                                </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                <button
                                    onClick={() => handlePickAndScrap(pickerBrand)}
                                    className="px-3 py-2 border border-indigo-500 bg-indigo-500 text-white rounded-lg text-xs font-bold hover:bg-indigo-600 transition-all"
                                >
                                    Todos los modelos
                                </button>

                                {ECUADOR_CAR_DATA[pickerBrand].map((model) => (
                                    <button
                                        key={model}
                                        onClick={() => handlePickAndScrap(pickerBrand, model)}
                                        className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-indigo-50 hover:border-indigo-400 transition-all text-slate-700"
                                    >
                                        {model}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}


            {showTopDeals && (
                <div className="px-4 py-2 bg-orange-50 border-b border-orange-200 text-orange-700 text-xs font-bold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Mostrando Top 30 Mejores Oportunidades de Compra
                </div>
            )}

            {isLoading && (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-medium animate-pulse">Analizando vehículos del scraper...</p>
                </div>
            )}

            {/* Tabla de Resultados */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {filteredVehicles.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                        <div className="bg-slate-50 p-4 rounded-full mb-3">
                            <Car className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="font-medium">No se encontraron vehículos</p>
                        <p className="text-sm text-slate-400">Prueba quitando los filtros o cambiando los criterios de búsqueda.</p>
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                                Limpiar todos los filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                    <th className="py-3 px-4">Vehículo</th>
                                    <th className="py-3 px-4">Marca</th>
                                    <th className="py-3 px-4">Precio</th>
                                    <th className="py-3 px-4">Año</th>
                                    <th className="py-3 px-4">Descripción</th>
                                    <th className="py-3 px-4 text-center">Ubicación Vendedor</th>
                                    <th className="py-3 px-4 text-center">Kilometraje</th>
                                    <th className="py-3 px-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filteredVehicles.map((vehicle) => (
                                    <tr key={vehicle.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-14 bg-slate-100 rounded-md overflow-hidden flex-shrink-0 border border-slate-200 relative flex items-center justify-center">
                                                    {vehicle.image_url ? (
                                                        <img
                                                            src={vehicle.image_url}
                                                            alt={vehicle.title || 'Vehículo'}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <Car className="h-5 w-5 text-slate-300" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-bold text-slate-900 truncate max-w-[180px]" title={vehicle.title || ''}>
                                                        {vehicle.title || 'Sin título'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-xs font-semibold">
                                                {vehicle.category || 'Sin marca'}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-xs font-semibold">
                                                {vehicle.price ? `$${vehicle.price.toLocaleString()}` : 'Precio N/A'}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-xs font-semibold">
                                                {vehicle.year ? `${vehicle.year}` : 'Sin año'}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <p className="text-xs text-slate-600 line-clamp-2 max-w-xs" title={vehicle.description || ''}>
                                                {vehicle.description || <span className="italic text-slate-400">Sin descripción</span>}
                                            </p>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                                                <MapPin className="h-3 w-3" />
                                                {vehicle.seller?.location || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center text-slate-700 font-medium">
                                            {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                {vehicle.url && (
                                                    <a
                                                        href={vehicle.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-slate-800 transition-colors"
                                                        title="Ver fuente original"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}