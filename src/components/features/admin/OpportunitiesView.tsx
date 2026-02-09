import { scraperService, VehicleWithSeller, WebhookResponse } from "@/services/scraper.service";
import { useMemo, useState, useCallback } from "react";
import {
    Car,
    TrendingUp,
    MapPin,
    ExternalLink,
    Filter,
    X,
    Search,
    DatabaseZap,
    RefreshCcw,
    RefreshCw,
    ChevronDown,
    XIcon,
    AlertCircle,
    Gauge,
    Calendar,
    DollarSign
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
                    <div className="font-semibold text-red-400 text-sm">
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
        <div className="space-y-8 animate-in fade-in duration-700 pb-12">

            {/* --- SECCIÓN 1: HEADER DE ACCIÓN (Scraping) --- */}
            <div className="bg-white text-black rounded-2xl p-6 shadow-xl">

                {/* Decoración de fondo */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <DatabaseZap className="h-6 w-6 text-red-400" />
                                Centro de Oportunidades
                            </h2>
                            <p className="text-slate-400 text-sm mt-1">
                                Escanea Marketplace en tiempo real o gestiona el inventario existente.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="link-gray"
                                size="sm"
                                onClick={onScraperComplete}
                                disabled={isLoading}
                                className="bg-black rounded-2xl shadow-xl text-white hover:bg-gray-500 hover:text-white relative"
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                Actualizar
                            </Button>
                        </div>
                    </div>

                    {/* Barra de Búsqueda Principal (Scraper) */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-4xl">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-red-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Ej: Toyota Fortuner 2020..."
                                className="w-full pl-12 pr-4 py-3 bg-white border border-black rounded-xl focus:ring-2 focus:ring-black-500 focus:border-transparent outline-none text-black placeholder-slate-500 transition-all shadow-inner"
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
                                className="px-4 py-3 rounded-xl bg-black hover:bg-slate-600 text-white font-medium transition-all border border-slate-600 flex items-center gap-2 whitespace-nowrap shadow-sm hover:shadow-md"
                            >
                                <Car className="h-5 w-5" />
                                <span className="hidden sm:inline">Catálogo</span>
                            </button>

                            <button
                                disabled={isWebhookLoading}
                                onClick={() => handleSubmitScraper(scraperTerm)}
                                className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all flex items-center gap-2 whitespace-nowrap shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isWebhookLoading ? (
                                    <>
                                        <RefreshCcw className="h-5 w-5 animate-spin" />
                                        <span>Procesando...</span>
                                    </>
                                ) : (
                                    <>
                                        <DatabaseZap className="h-5 w-5" />
                                        <span>Escanear</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SECCIÓN 2: BARRA DE HERRAMIENTAS Y FILTROS LOCALES --- */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row justify-between gap-4 items-end lg:items-center">

                    {/* Contadores / Estado */}
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
                            <span>Taller: <strong>{displayStats.enTaller}</strong></span>
                        </div>
                    </div>

                    {/* Filtros Activos Toggle */}
                    <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
                        <button
                            onClick={() => setShowTopDeals(!showTopDeals)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border whitespace-nowrap ${showTopDeals
                                ? "bg-orange-50 border-orange-200 text-orange-700 shadow-sm"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                        >
                            <TrendingUp className="h-4 w-4" />
                            {showTopDeals ? "Viendo Top Oportunidades" : "Ver Oportunidades"}
                        </button>

                        <button
                            onClick={() => setOnlyCoast(!onlyCoast)}
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

                {/* Filtros Dropdowns y Buscador Local */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                    {/* Buscador Local */}
                    <div className="lg:col-span-3 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filtrar resultados..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50/50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Selects */}
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

                    <div className="lg:col-span-2 relative">
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
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

                    <div className="lg:col-span-2 relative">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none bg-white cursor-pointer hover:bg-slate-50 text-slate-700 font-medium"
                        >
                            <option value="all">Año: Todos</option>
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Botón Limpiar */}
                    <div className="lg:col-span-3 flex justify-end">
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1 font-medium transition-colors px-3 py-2 hover:bg-red-50 rounded-lg"
                            >
                                <X className="h-4 w-4" />
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* --- SECCIÓN 3: RESULTADOS (LOADING & TABLA) --- */}

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-slate-100 border-t-red-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Car className="h-6 w-6 text-red-500/50" />
                        </div>
                    </div>
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-slate-800">Cargando inventario</h3>
                        <p className="text-slate-400 text-sm">Sincronizando con la base de datos...</p>
                    </div>
                </div>
            ) : filteredVehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-slate-300">
                    <div className="p-4 bg-slate-50 rounded-full mb-4">
                        <Search className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No se encontraron vehículos</h3>
                    <p className="text-slate-500 max-w-md text-center mt-2">
                        No hay resultados que coincidan con tus filtros actuales. Intenta limpiar los filtros o realiza un nuevo escaneo.
                    </p>
                    {hasActiveFilters && (
                        <button
                            onClick={handleClearFilters}
                            className="mt-6 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                        >
                            Restablecer búsqueda
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden flex flex-col">
                    {/* Header de tabla con degradado sutil */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-4 px-6 w-[350px]">Vehículo</th>
                                    <th className="py-4 px-6">Detalles</th>
                                    <th className="py-4 px-6">Precio</th>
                                    <th className="py-4 px-6">Ubicación</th>
                                    <th className="py-4 px-6 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filteredVehicles.map((vehicle) => (
                                    <tr
                                        key={vehicle.id}
                                        className="hover:bg-slate-50 transition-colors group relative"
                                    >
                                        <td className="py-4 px-6">
                                            <div className="flex gap-4">
                                                {/* Imagen con fallback elegante */}
                                                <div className="h-20 w-28 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200 relative">
                                                    {vehicle.image_url ? (
                                                        <img
                                                            src={vehicle.image_url}
                                                            alt={vehicle.title || 'Vehículo'}
                                                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = ""; // Fallback logic si falla la img
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                                ((e.target as HTMLImageElement).nextSibling as HTMLElement).style.display = 'flex';
                                                            }}
                                                        />
                                                    ) : null}
                                                    {/* Fallback de icono si no hay imagen o falla */}
                                                    <div className={`absolute inset-0 flex items-center justify-center bg-slate-100 ${vehicle.image_url ? 'hidden' : 'flex'}`}>
                                                        <Car className="h-8 w-8 text-slate-300" />
                                                    </div>
                                                </div>

                                                <div className="flex flex-col justify-center gap-1">
                                                    <div className="font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-red-600 transition-colors">
                                                        {vehicle.title || 'Vehículo sin título'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <span className="font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                                            {vehicle.category || 'N/A'}
                                                        </span>
                                                        <span>•</span>
                                                        <span>{vehicle.model || 'Modelo N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2 text-slate-700 font-medium">
                                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                    {vehicle.year || '----'}
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Gauge className="h-3.5 w-3.5 text-slate-400" />
                                                    {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : '---'}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-1 font-bold text-lg text-slate-900">
                                                <span className="text-slate-400 text-sm font-normal">$</span>
                                                {vehicle.price ? vehicle.price.toLocaleString() : 'N/A'}
                                            </div>
                                            {vehicle.price && vehicle.price < 15000 && (
                                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-block mt-1">
                                                    Oportunidad
                                                </span>
                                            )}
                                        </td>

                                        <td className="py-4 px-6">
                                            <div className="flex flex-col items-start gap-1">
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-xs font-bold border border-red-100">
                                                    <MapPin className="h-3 w-3" />
                                                    {vehicle.seller?.location || 'Ubicación desc.'}
                                                </div>
                                                {/* <span className="text-[10px] text-slate-400 pl-1">
                                                    {vehicle.seller?.is_dealer ? 'Revendedor' : 'Particular'}
                                                </span> */}
                                            </div>
                                        </td>

                                        <td className="py-4 px-6 text-center">
                                            <div className="flex items-center justify-center">
                                                {vehicle.url ? (
                                                    <a
                                                        href={vehicle.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                                                        title="Ver en Marketplace"
                                                    >
                                                        <ExternalLink className="h-5 w-5" />
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-300 cursor-not-allowed">
                                                        <AlertCircle className="h-5 w-5" />
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer de la tabla con conteo */}
                    <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 text-xs text-slate-500 flex justify-between items-center">
                        <span>Mostrando {filteredVehicles.length} vehículos</span>
                        <span>Datos actualizados en tiempo real</span>
                    </div>
                </div>
            )}

            {/* --- MODAL: CAR PICKER --- */}
            {showCarPicker && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setShowCarPicker(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white w-[95%] max-w-4xl rounded-2xl shadow-2xl border border-slate-200 p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col max-h-[85vh]"
                    >
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">
                                    Catálogo de Vehículos
                                </h3>
                                <p className="text-sm text-slate-500">Selecciona una marca y modelo para escanear.</p>
                            </div>
                            <button
                                onClick={() => setShowCarPicker(false)}
                                className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                            {!pickerBrand ? (
                                <>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                                        Marcas Disponibles
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {Object.keys(ECUADOR_CAR_DATA).map((brand) => (
                                            <button
                                                key={brand}
                                                onClick={() => setPickerBrand(brand)}
                                                className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all text-slate-700 shadow-sm"
                                            >
                                                {brand}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-4 sticky top-0 bg-white z-10 py-2">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">{pickerBrand}</span>
                                            <span className="text-xs text-slate-400">Selecciona el modelo</span>
                                        </div>
                                        <button
                                            onClick={() => setPickerBrand(null)}
                                            className="text-xs text-red-600 hover:text-red-800 font-medium hover:underline"
                                        >
                                            ← Volver a marcas
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        <button
                                            onClick={() => handlePickAndScrap(pickerBrand)}
                                            className="px-4 py-3 border-2 border-dashed border-red-300 bg-red-50 text-red-700 rounded-xl text-sm font-bold hover:bg-red-100 transition-all"
                                        >
                                            Todos los {pickerBrand}
                                        </button>

                                        {ECUADOR_CAR_DATA[pickerBrand].map((model) => (
                                            <button
                                                key={model}
                                                onClick={() => handlePickAndScrap(pickerBrand, model)}
                                                className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-600 shadow-sm"
                                            >
                                                {model}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}