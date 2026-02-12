import { useMemo, useCallback, useState } from "react";
import {
    TrendingUp,
    MapPin,
    Search,
    X,
    LayoutGrid,
    RefreshCcw,
    BarChart3,
    Tag,
    Car,
    Calendar,
    MapPinned,
    ArrowUpDown,
    Filter,
} from "lucide-react";
import { VehicleWithSeller } from "@/services/scraper.service";
import { PriceStatistics, PriceStatisticsModal } from "./PriceStatisticsModal";
import { FilterModal } from "./FilterModal";

interface OpportunitiesFiltersViewProps {
    vehicles: VehicleWithSeller[];
    topOpportunities: VehicleWithSeller[];
    filteredVehicles: VehicleWithSeller[];
    coastFilteredVehicles: VehicleWithSeller[];
    showTopDeals: boolean;
    regionFilter: 'all' | 'coast' | 'sierra';
    searchTerm: string;
    selectedBrand: string;
    selectedModel: string;
    selectedYear: string;
    selectedDateRange: string;
    selectedCity: string;
    sortBy: string;
    isWebhookLoading: boolean
    priceStatistics: PriceStatistics[];
    onShowTopDealsChange: (value: boolean) => void;
    onRegionFilterChange: (value: 'all' | 'coast' | 'sierra') => void;
    onSearchTermChange: (value: string) => void;
    onBrandChange: (value: string) => void;
    onModelChange: (value: string) => void;
    onYearChange: (value: string) => void;
    onDateRangeChange: (value: string) => void;
    onCityChange: (value: string) => void;
    onSortChange: (value: string) => void;
    onClearFilters: () => void;
    onScraperComplete: (() => void) | undefined;
}

export function OpportunitiesFiltersView({
    vehicles,
    filteredVehicles,
    coastFilteredVehicles,
    showTopDeals,
    regionFilter,
    searchTerm,
    selectedBrand,
    selectedModel,
    selectedYear,
    selectedDateRange,
    selectedCity,
    sortBy,
    isWebhookLoading,
    priceStatistics,
    onShowTopDealsChange,
    onRegionFilterChange,
    onSearchTermChange,
    onBrandChange,
    onModelChange,
    onYearChange,
    onDateRangeChange,
    onCityChange,
    onSortChange,
    onClearFilters,
    onScraperComplete,
}: OpportunitiesFiltersViewProps) {

    const [showStatsModal, setShowStatsModal] = useState(false);
    const [showBrandModal, setShowBrandModal] = useState(false);
    const [showModelModal, setShowModelModal] = useState(false);
    const [showYearModal, setShowYearModal] = useState(false);
    const [showCityModal, setShowCityModal] = useState(false);
    const [showDateModal, setShowDateModal] = useState(false);
    const [showSortModal, setShowSortModal] = useState(false);

    // --- LÓGICA DE DATOS ---
    const availableBrands = useMemo(() => {
        const brands = new Set<string>();
        vehicles.forEach(vehicle => {
            if (vehicle.brand && vehicle.brand.trim() !== '') {
                brands.add(vehicle.brand);
            }
        });
        return Array.from(brands).sort();
    }, [vehicles]);

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

    const availableYears = useMemo(() => {
        const years = new Set<string>();
        vehicles.forEach(vehicle => {
            if (vehicle.year && vehicle.year.trim() !== '') {
                years.add(vehicle.year);
            }
        });
        return Array.from(years).sort((a, b) => Number(b) - Number(a));
    }, [vehicles]);

    const availableCities = useMemo(() => {
        const cities = new Set<string>();
        vehicles.forEach(vehicle => {
            if (vehicle.location && vehicle.location.trim() !== '') {
                cities.add(vehicle.location);
            }
        });
        return Array.from(cities).sort();
    }, [vehicles]);

    // --- CORRECCIÓN DEL FILTRO DE FECHA ---
    const dateRangeOptions = useMemo(() => ["Hoy", "Ayer", "Última semana", "Último mes"], []);

    const handleDateRangeChange = useCallback((value: string) => {
        const mapping: Record<string, string> = {
            "Hoy": "today",
            "Ayer": "yesterday",
            "Última semana": "week",
            "Último mes": "month"
        };
        // Si el valor no está en el mapeo (ej. "Cualquier Fecha"), envía "all"
        onDateRangeChange(mapping[value] || "all");
    }, [onDateRangeChange]);

    const getDateRangeLabel = useCallback((value: string): string => {
        const mapping: Record<string, string> = {
            "today": "Hoy",
            "yesterday": "Ayer",
            "week": "Última semana",
            "month": "Último mes",
            "all": "Cualquier Fecha"
        };
        return mapping[value] || "Cualquier Fecha";
    }, []);

    const sortOptions = [
        { value: "created_at_desc", label: "Recién scrapeados" },
        { value: "publication_date_desc", label: "Fecha de publicación: más recientes" },
        { value: "price_asc", label: "Precio: menor a mayor" },
        { value: "price_desc", label: "Precio: mayor a menor" }
    ]

    const getSortLabel = (value: string): string => {
        const option = sortOptions.find(opt => opt.value === value);
        return option?.label || "Ordenar por";
    };

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
        selectedCity !== "all" ||
        sortBy !== "created_at_desc" ||
        searchTerm !== "" ||
        regionFilter !== 'all',
        [selectedBrand, selectedModel, selectedYear, selectedDateRange, selectedCity, sortBy, searchTerm, regionFilter]
    );

    const FilterButton = ({
        label,
        active,
        icon: Icon,
        onClick,
        disabled = false,
        hasSelection = false
    }: {
        label: string;
        active: boolean;
        icon: any;
        onClick: () => void;
        disabled?: boolean;
        hasSelection?: boolean
    }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                relative w-full flex items-center justify-between px-3 py-2.5 text-xs sm:text-sm 
                border rounded-xl transition-all duration-200 group
                ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-100' : 'cursor-pointer hover:shadow-md'}
                ${hasSelection
                    ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}
            `}
        >
            <div className="flex items-center gap-2 truncate">
                <Icon className={`h-4 w-4 flex-shrink-0 ${hasSelection ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className={`font-medium truncate ${hasSelection ? 'text-slate-100' : ''}`}>
                    {label}
                </span>
            </div>
            {hasSelection ? (
                <div className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
            ) : (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpDown className="h-3 w-3 text-slate-300" />
                </div>
            )}
        </button>
    );

    return (
        <div className="flex flex-col gap-4">
            {/* 1. BARRA SUPERIOR */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 bg-white rounded-t-2xl border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-[10px] sm:text-xs font-bold text-slate-600 border border-slate-200/50">
                        <LayoutGrid className="h-3 w-3" />
                        <span>TOTAL: {displayStats.total}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-full text-[10px] sm:text-xs font-bold text-emerald-700 border border-emerald-100">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>PATIO: {displayStats.enPatio}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-full text-[10px] sm:text-xs font-bold text-orange-700 border border-orange-100">
                        <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                        <span>POSIBLE FALLA MECÁNICA: {displayStats.enTaller}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 scrollbar-hide">
                    {/* <button
                        onClick={() => onShowTopDealsChange(!showTopDeals)}
                        className={`whitespace-nowrap flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showTopDeals ? "bg-orange-50 border-orange-200 text-orange-700 shadow-sm" : "bg-white border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
                    >
                        <TrendingUp className="h-3.5 w-3.5" /> Oportunidades
                    </button> */}
                    <button
                        onClick={() => onRegionFilterChange('all')}
                        className={`whitespace-nowrap flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${regionFilter === 'all' ? "bg-red-50 border-red-200 text-red-700 shadow-sm" : "bg-white border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
                    >
                        <MapPin className="h-3.5 w-3.5" /> Todos
                    </button>
                    <button
                        onClick={() => onRegionFilterChange('sierra')}
                        className={`whitespace-nowrap flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${regionFilter === 'sierra' ? "bg-red-50 border-red-200 text-red-700 shadow-sm" : "bg-white border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
                    >
                        <MapPin className="h-3.5 w-3.5" /> Solo Sierra
                    </button>
                    <div className="h-4 w-px bg-slate-200 mx-1 flex-shrink-0" />
                    <button
                        onClick={() => setShowStatsModal(true)}
                        className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                        <BarChart3 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={onScraperComplete}
                        disabled={isWebhookLoading}
                        className={`flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors ${isWebhookLoading ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                        <RefreshCcw className={`h-4 w-4 ${isWebhookLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* 2. ZONA DE CONTROL */}
            <div className="px-4 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
                <div className="relative group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, versión, características..."
                        className="w-full h-11 pl-10 pr-4 text-sm bg-white border border-slate-200 rounded-xl focus:border-slate-400 focus:ring-4 focus:ring-slate-100 outline-none transition-all shadow-sm placeholder:text-slate-400"
                        value={searchTerm}
                        onChange={(e) => onSearchTermChange(e.target.value)}
                    />
                </div>

                <div className="min-w-[180px]">
                    <button
                        onClick={() => setShowSortModal(true)}
                        className={`w-full h-11 flex items-center justify-between px-4 text-sm bg-white border rounded-xl transition-all shadow-sm ${sortBy !== "created_at_desc" ? 'border-slate-900 text-slate-900 ring-1 ring-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="truncate mr-2">{getSortLabel(sortBy)}</span>
                        <ArrowUpDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    </button>
                </div>

                {hasActiveFilters && (
                    <button
                        onClick={onClearFilters}
                        className="h-11 px-4 flex items-center gap-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl transition-all shadow-sm whitespace-nowrap"
                    >
                        <X className="h-4 w-4" />
                        <span className="hidden md:inline">Limpiar</span>
                    </button>
                )}
            </div>

            {/* 3. GRILLA DE FILTROS */}
            <div className="px-4 pb-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <FilterButton
                        label={selectedBrand === "all" ? "Marca" : selectedBrand}
                        active={selectedBrand !== "all"}
                        hasSelection={selectedBrand !== "all"}
                        icon={Tag}
                        onClick={() => setShowBrandModal(true)}
                    />
                    <FilterButton
                        label={selectedModel === "all" ? "Modelo" : selectedModel}
                        active={selectedModel !== "all"}
                        hasSelection={selectedModel !== "all"}
                        icon={Car}
                        onClick={() => setShowModelModal(true)}
                        disabled={selectedBrand === "all"}
                    />
                    <FilterButton
                        label={selectedYear === "all" ? "Año" : selectedYear}
                        active={selectedYear !== "all"}
                        hasSelection={selectedYear !== "all"}
                        icon={Calendar}
                        onClick={() => setShowYearModal(true)}
                    />
                    <FilterButton
                        label={selectedCity === "all" ? "Ciudad" : selectedCity}
                        active={selectedCity !== "all"}
                        hasSelection={selectedCity !== "all"}
                        icon={MapPinned}
                        onClick={() => setShowCityModal(true)}
                    />
                    <FilterButton
                        label={getDateRangeLabel(selectedDateRange) === "Cualquier Fecha" ? "Fecha" : getDateRangeLabel(selectedDateRange)}
                        active={selectedDateRange !== "all"}
                        hasSelection={selectedDateRange !== "all"}
                        icon={Filter}
                        onClick={() => setShowDateModal(true)}
                    />
                </div>
            </div>

            {/* MODALES */}
            <FilterModal
                isOpen={showBrandModal}
                onClose={() => setShowBrandModal(false)}
                title="Seleccionar Marca"
                description="Elige la marca del vehículo que buscas"
                icon={<Tag className="h-6 w-6 text-white" />}
                options={availableBrands}
                selectedValue={selectedBrand}
                onSelect={handleBrandChange}
                searchPlaceholder="Buscar marca (Ej: Toyota, Kia...)"
                allLabel="Todas las Marcas"
            />

            <FilterModal
                isOpen={showModelModal}
                onClose={() => setShowModelModal(false)}
                title={`Modelos de ${selectedBrand}`}
                description="Selecciona el modelo específico"
                icon={<Car className="h-6 w-6 text-white" />}
                options={availableModels}
                selectedValue={selectedModel}
                onSelect={onModelChange}
                searchPlaceholder={`Buscar modelo de ${selectedBrand}...`}
                allLabel="Todos los Modelos"
            />

            <FilterModal
                isOpen={showYearModal}
                onClose={() => setShowYearModal(false)}
                title="Seleccionar Año"
                description="Filtra vehículos por año de fabricación"
                icon={<Calendar className="h-6 w-6 text-white" />}
                options={availableYears}
                selectedValue={selectedYear}
                onSelect={onYearChange}
                searchPlaceholder="Buscar año..."
                allLabel="Todos los Años"
            />

            <FilterModal
                isOpen={showCityModal}
                onClose={() => setShowCityModal(false)}
                title="Seleccionar Ciudad"
                description="Filtra vehículos por ubicación"
                icon={<MapPinned className="h-6 w-6 text-white" />}
                options={availableCities}
                selectedValue={selectedCity}
                onSelect={onCityChange}
                searchPlaceholder="Buscar ciudad..."
                allLabel="Todas las Ciudades"
            />

            <FilterModal
                isOpen={showDateModal}
                onClose={() => setShowDateModal(false)}
                title="Filtrar por Fecha"
                description="Selecciona el rango de publicación"
                icon={<Calendar className="h-6 w-6 text-white" />}
                options={dateRangeOptions}
                selectedValue={getDateRangeLabel(selectedDateRange)}
                onSelect={handleDateRangeChange}
                searchPlaceholder="Buscar rango..."
                allLabel="Cualquier Fecha"
                showAllOption={true}
            />

            <FilterModal
                isOpen={showSortModal}
                onClose={() => setShowSortModal(false)}
                title="Ordenar Resultados"
                description="Selecciona cómo quieres ordenar los vehículos"
                icon={<ArrowUpDown className="h-6 w-6 text-white" />}
                options={sortOptions.map(opt => opt.label)}
                selectedValue={getSortLabel(sortBy)}
                onSelect={(label) => {
                    const option = sortOptions.find(opt => opt.label === label);
                    if (option) onSortChange(option.value);
                }}
                searchPlaceholder="Buscar tipo de ordenamiento..."
                allLabel="Por Defecto"
                showAllOption={false}
            />

            <PriceStatisticsModal
                priceStatistics={priceStatistics}
                isOpen={showStatsModal}
                onClose={() => setShowStatsModal(false)} />
        </div>
    );
}