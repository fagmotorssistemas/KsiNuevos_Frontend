import { useMemo, useCallback } from "react";
import {
    TrendingUp,
    Filter,
    MapPin,
    Search,
    ChevronDown,
    X,
    Gauge,
} from "lucide-react";
import { VehicleWithSeller } from "@/services/scraper.service";

interface OpportunitiesFiltersViewProps {
    vehicles: VehicleWithSeller[];
    topOpportunities: VehicleWithSeller[];
    filteredVehicles: VehicleWithSeller[]; // Nueva prop
    coastFilteredVehicles: VehicleWithSeller[]; // Nueva prop
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

export function OpportunitiesFiltersView({
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
}: OpportunitiesFiltersViewProps) {

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

    const displayStats = useMemo(() => {
        return {
            total: filteredVehicles.length,
            enPatio: filteredVehicles.filter(v => v.seller?.location === 'patio').length,
            enTaller: filteredVehicles.filter(v => v.seller?.location === 'taller').length,
            enCliente: filteredVehicles.filter(v => v.seller?.location === 'cliente').length,
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

    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row justify-between gap-4 items-end lg:items-center">
                {/* Stats */}
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

                {/* Botones de vista */}
                <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
                    <button
                        onClick={() => onShowTopDealsChange(!showTopDeals)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border whitespace-nowrap ${showTopDeals
                            ? "bg-orange-50 border-orange-200 text-orange-700 shadow-sm"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                    >
                        <TrendingUp className="h-4 w-4" />
                        {showTopDeals ? "Viendo Top Oportunidades" : "Ver Oportunidades"}
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
        </div>
    );
}