import { useMemo, useCallback, useState } from "react";
import {
    TrendingUp,
    Filter,
    MapPin,
    Search,
    ChevronDown,
    X,
    Gauge,
    LayoutGrid,
    RefreshCcw,
} from "lucide-react";
import { VehicleWithSeller } from "@/services/scraper.service";
import { PriceStatistics, PriceStatisticsModal } from "./PriceStatisticsModal";

interface OpportunitiesFiltersViewProps {
    vehicles: VehicleWithSeller[];
    topOpportunities: VehicleWithSeller[];
    filteredVehicles: VehicleWithSeller[];
    coastFilteredVehicles: VehicleWithSeller[];
    showTopDeals: boolean;
    onlyCoast: boolean;
    searchTerm: string;
    selectedBrand: string;
    selectedModel: string;
    selectedYear: string;
    selectedDateRange: string;
    isWebhookLoading: boolean
    priceStatistics: PriceStatistics[];
    onShowTopDealsChange: (value: boolean) => void;
    onOnlyCoastChange: (value: boolean) => void;
    onSearchTermChange: (value: string) => void;
    onBrandChange: (value: string) => void;
    onModelChange: (value: string) => void;
    onYearChange: (value: string) => void;
    onDateRangeChange: (value: string) => void;
    onClearFilters: () => void;
    onScraperComplete: (() => void) | undefined;
}

export function OpportunitiesFiltersView({
    vehicles, // Usar todos los vehículos base
    filteredVehicles,
    coastFilteredVehicles,
    showTopDeals,
    onlyCoast,
    searchTerm,
    selectedBrand,
    selectedModel,
    selectedYear,
    selectedDateRange,
    isWebhookLoading,
    priceStatistics,
    onShowTopDealsChange,
    onOnlyCoastChange,
    onSearchTermChange,
    onBrandChange,
    onModelChange,
    onYearChange,
    onDateRangeChange,
    onClearFilters,
    onScraperComplete,
}: OpportunitiesFiltersViewProps) {

    const [showStatsModal, setShowStatsModal] = useState(false);
    // Extraer todas las marcas únicas desde TODOS los vehículos (no filtrados)
    const availableBrands = useMemo(() => {
        const brands = new Set<string>();
        vehicles.forEach(vehicle => {
            if (vehicle.brand && vehicle.brand.trim() !== '') {
                brands.add(vehicle.brand);
            }
        });
        const sortedBrands = Array.from(brands).sort();
        console.log('Marcas disponibles:', sortedBrands); // Debug
        return sortedBrands;
    }, [vehicles]);

    // Extraer todos los modelos únicos (filtrados por marca si hay una seleccionada)
    const availableModels = useMemo(() => {
        const models = new Set<string>();
        vehicles.forEach(vehicle => {
            // Si hay una marca seleccionada, solo mostrar modelos de esa marca
            if (selectedBrand !== "all" && vehicle.brand !== selectedBrand) {
                return;
            }
            if (vehicle.model && vehicle.model.trim() !== '') {
                models.add(vehicle.model);
            }
        });
        const sortedModels = Array.from(models).sort();
        console.log('Modelos disponibles para marca', selectedBrand, ':', sortedModels); // Debug
        return sortedModels;
    }, [vehicles, selectedBrand]);

    // Extraer todos los años únicos desde TODOS los vehículos
    const availableYears = useMemo(() => {
        const years = new Set<string>();
        vehicles.forEach(vehicle => {
            if (vehicle.year && vehicle.year.trim() !== '') {
                years.add(vehicle.year);
            }
        });
        const sortedYears = Array.from(years).sort((a, b) => Number(b) - Number(a));
        console.log('Años disponibles:', sortedYears); // Debug
        return sortedYears;
    }, [vehicles]);

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
        <>
            <div className="p-4 px-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-[11px] font-bold text-slate-600 border border-slate-200/50">
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <span>TOTAL: {displayStats.total}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full text-[11px] font-bold text-emerald-700 border border-emerald-100">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>PATIO: {displayStats.enPatio}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-full text-[11px] font-bold text-orange-700 border border-orange-100">
                        <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                        <span>POSIBLE DAÑO MECÁNICO: {displayStats.enTaller}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                    <button
                        onClick={() => onShowTopDealsChange(!showTopDeals)}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${showTopDeals ? "bg-white text-orange-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                    >
                        <TrendingUp className="h-3.5 w-3.5" /> Oportunidades
                    </button>
                    <button
                        onClick={() => onOnlyCoastChange(!onlyCoast)}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${onlyCoast ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                    >
                        <MapPin className="h-3.5 w-3.5" /> Solo Costa
                    </button>
                    <button
                        onClick={onScraperComplete}
                        disabled={isWebhookLoading}
                        className={`flex items-center gap-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed py-1.5 rounded-lg text-xs font-bold transition-all text-slate-400 hover:text-red-400 hover:bg-red-50 ${isWebhookLoading ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                        <RefreshCcw className={`h-3.5 w-3.5`} />
                    </button>
                </div>
            </div>

            {/* 3. SECCIÓN: FILTROS AVANZADOS */}
            <div className="p-6 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-3 relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Filtrar resultados..."
                        className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
                        value={searchTerm}
                        onChange={(e) => onSearchTermChange(e.target.value)}
                    />
                </div>

                {[
                    { label: "Marca", value: selectedBrand, onChange: (v: any) => handleBrandChange(v), options: availableBrands, allLabel: "Todas las Marcas" },
                    { label: "Modelo", value: selectedModel, onChange: onModelChange, options: availableModels, allLabel: "Todos los Modelos", disabled: selectedBrand === "all" },
                    { label: "Año", value: selectedYear, onChange: onYearChange, options: availableYears, allLabel: "Todos los Años" }
                ].map((filter, idx) => (
                    <div key={idx} className="lg:col-span-2 relative">
                        <select
                            value={filter.value}
                            disabled={filter.disabled}
                            onChange={(e) => filter.onChange(e.target.value)}
                            className="w-full appearance-none pl-3 pr-10 py-2 text-sm border border-slate-200 rounded-xl bg-white hover:border-slate-300 outline-none focus:ring-2 focus:ring-red-500/20 cursor-pointer disabled:opacity-50 font-medium text-slate-700"
                        >
                            <option value="all">{filter.allLabel}</option>
                            {filter.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                ))}

                <div className="lg:col-span-2 relative">
                    <select
                        value={selectedDateRange}
                        onChange={(e) => onDateRangeChange(e.target.value)}
                        className="w-full appearance-none pl-3 pr-10 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-red-500/20 cursor-pointer font-medium text-slate-700"
                    >
                        <option value="all">Cualquier Fecha</option>
                        <option value="today">Hoy</option>
                        <option value="week">Última semana</option>
                        <option value="month">Último mes</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                <div className="lg:col-span-1 flex items-center justify-center">
                    {hasActiveFilters && (
                        <button onClick={onClearFilters} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Limpiar Filtros">
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>
            <PriceStatisticsModal
                priceStatistics={priceStatistics}
                isOpen={showStatsModal}
                onClose={() => setShowStatsModal(false)} />
        </>
    );
}