import { VehicleWithSeller } from "@/services/scraper.service";
import { useMemo, useState, useCallback } from "react";
import { Database } from "@/types/supabase";
import { OpportunitiesCenterView } from "./OpportunitiesCenterView";
import { OpportunitiesTableView } from "./OpportunitiesTableView";
import { ArrowLeft, LayoutGrid, List } from "lucide-react";
import { OpportunityScorer, ScoredVehicle } from "./opportunitiesScorer";
import { OpportunitiesWizardSelection } from "./OpportunitiesWizardSelection";

type ScraperSeller = Database['public']['Tables']['scraper_sellers']['Row'];
type PriceStatistics = Database['public']['Tables']['scraper_vehicle_price_statistics']['Row'];

interface OpportunitiesViewProps {
    vehicles: VehicleWithSeller[];
    topOpportunities: VehicleWithSeller[];
    sellers: ScraperSeller[];
    isLoading: boolean;
    statusFilter?: string;
    locationFilter?: string;
    priceStatistics: PriceStatistics[];
    getPriceStatisticsForVehicle?: (brand: string, model: string, year?: string) => Promise<PriceStatistics | null>;
    stats: {
        total: number;
        nuevos: number;
        usados: number;
        usados_bueno: number;
        usados_como_nuevo: number;
        enPatio: number;
        enTaller: number;
        enCliente: number;
    };
    onScraperComplete?: () => Promise<void>;
}

export function OpportunitiesView({
    vehicles,
    topOpportunities,
    isLoading,
    priceStatistics,
    getPriceStatisticsForVehicle,
    onScraperComplete
}: OpportunitiesViewProps) {

    const [showFullInventory, setShowFullInventory] = useState(false);
    const [regionFilter, setRegionFilter] = useState<'all' | 'coast' | 'sierra'>('sierra');
    const [showTopDeals, setShowTopDeals] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBrand, setSelectedBrand] = useState<string>("all");
    const [selectedYear, setSelectedYear] = useState<string>("all");
    const [selectedModel, setSelectedModel] = useState<string>("all");
    const [selectedDateRange, setSelectedDateRange] = useState<string>("all");
    const [selectedCity, setSelectedCity] = useState("all");
    const [sortBy, setSortBy] = useState("created_at_desc");
    const [maxMileage, setMaxMileage] = useState<number | null>(null);

    // TODO: Centralize this regex or logic if used elsewhere
    const regex = /\b(?:babahoyo|milagro|naranjal|daule|los lojas|eloy alfaro|la troncal|el triunfo|guayaquil|esmeraldas|portoviejo|santo\s+domingo|santa\s+elena|machala|manta|piñas|samborondón)\b/i;

    const coastFilteredVehicles = useMemo(() => {
        return vehicles.filter(vehicle => {
            const sellerLocation = vehicle.location?.toLowerCase() || '';
            return regex.test(sellerLocation);
        });
    }, [vehicles]);

    // Calcular las mejores oportunidades usando el scoring system
    const bestOpportunities = useMemo<ScoredVehicle[]>(() => {
        if (!vehicles || vehicles.length === 0) return [];

        // Crear mapa de estadísticas de precio
        const priceStatsMap = new Map<string, PriceStatistics>();
        if (priceStatistics && priceStatistics.length > 0) {
            priceStatistics.forEach(stat => {
                const key = `${stat.brand}_${stat.model}_${stat.year || ''}`;
                priceStatsMap.set(key, stat);
            });
        }

        // Filtrar vehículos válidos (con precio, año, etc.)
        const validVehicles = vehicles.filter(v =>
            v.price &&
            v.price > 0 &&
            v.year &&
            v.brand &&
            v.model
        );

        // Obtener las mejores 4 oportunidades
        return OpportunityScorer.getTopOpportunities(validVehicles, priceStatsMap, 4);
    }, [vehicles, priceStatistics]);

    const sourceVehicles = useMemo(() =>
        showTopDeals ? topOpportunities : vehicles,
        [showTopDeals, topOpportunities, vehicles]
    );

    const handleClearFilters = () => {
        setSearchTerm("");
        setSelectedBrand("all");
        setSelectedModel("all");
        setSelectedYear("all");
        setSelectedDateRange("all");
        setSelectedCity("all");
        setRegionFilter('all');
        setMaxMileage(null);
        setSortBy("created_at_desc");
    };

    const handleQuickFilter = (type: 'low_mileage' | 'new_arrivals' | 'cheap') => {
        handleClearFilters();
        switch (type) {
            case 'low_mileage':
                setMaxMileage(50000);
                break;
            case 'new_arrivals':
                setSelectedDateRange("today"); // Or create a specific 'recent' logic
                setSortBy("created_at_desc");
                break;
            case 'cheap':
                setSortBy("price_asc");
                break;
        }
    };

    const filteredVehicles = useMemo(() => {
        return vehicles.filter(vehicle => {
            // 1. Filtro de Búsqueda
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const matchTitle = vehicle.title?.toLowerCase().includes(searchLower);
                const matchBrand = vehicle.brand?.toLowerCase().includes(searchLower);
                const matchModel = vehicle.model?.toLowerCase().includes(searchLower);
                if (!matchTitle && !matchBrand && !matchModel) return false;
            }

            // 2. Filtros de Selectores
            if (selectedBrand !== "all" && vehicle.brand !== selectedBrand) return false;
            if (selectedModel !== "all" && vehicle.model !== selectedModel) return false;
            if (selectedYear !== "all" && vehicle.year !== selectedYear) return false;
            if (selectedCity !== "all" && vehicle.location !== selectedCity) return false;

            // 3. Filtro de Kilometraje
            if (maxMileage !== null && vehicle.mileage && vehicle.mileage > maxMileage) return false;

            // 4. Filtro de Región (Costa/Sierra)
            if (regionFilter !== 'all') {
                const sellerLocation = vehicle.location?.toLowerCase() || '';
                const isCoast = regex.test(sellerLocation);

                if (regionFilter === 'coast' && !isCoast) return false;
                if (regionFilter === 'sierra' && isCoast) return false;
            }

            // 5. Filtro de Fecha
            if (selectedDateRange !== "all") {
                const date = new Date(vehicle.publication_date);
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - date.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (selectedDateRange === "today" && diffDays > 1) return false;
                if (selectedDateRange === "yesterday" && diffDays > 2) return false;
                if (selectedDateRange === "week" && diffDays > 7) return false;
                if (selectedDateRange === "month" && diffDays > 30) return false;
            }

            return true;
        }).sort((a, b) => {
            switch (sortBy) {
                case "price_asc":
                    return (a.price || 0) - (b.price || 0);
                case "price_desc":
                    return (b.price || 0) - (a.price || 0);
                case "year_desc":
                    return parseInt(b.year || "0") - parseInt(a.year || "0");
                case "year_asc":
                    return parseInt(a.year || "0") - parseInt(b.year || "0");
                case "mileage_asc":
                    return (a.mileage || 0) - (b.mileage || 0);
                case "publication_date_desc":
                    return new Date(b.publication_date || 0).getTime() - new Date(a.publication_date || 0).getTime();
                case "created_at_desc":
                    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                default:
                    return 0;
            }
        });
    }, [vehicles, searchTerm, selectedBrand, selectedModel, selectedYear, selectedCity, selectedDateRange, regionFilter, sortBy, maxMileage]);

    const hasActiveFilters =
        selectedBrand !== "all" ||
        selectedModel !== "all" ||
        selectedYear !== "all" ||
        selectedDateRange !== "all" ||
        selectedCity !== "all" ||
        searchTerm !== "" ||
        regionFilter !== 'all' ||
        maxMileage !== null;

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-12">
            {!showFullInventory ? (
                <OpportunitiesWizardSelection
                    topOpportunities={bestOpportunities}
                    onViewAll={() => setShowFullInventory(true)}
                    isLoading={isLoading}
                />
            ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-8 fade-in duration-500">
                    <div className="flex items-center justify-between gap-4">
                        <button
                            onClick={() => setShowFullInventory(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Volver al resumen
                        </button>
                    </div>

                    <OpportunitiesCenterView
                        priceStatistics={priceStatistics}
                        coastFilteredVehicles={coastFilteredVehicles}
                        topOpportunities={topOpportunities}
                        vehicles={vehicles}
                        isLoading={isLoading}
                        onScraperComplete={onScraperComplete}
                        filteredVehicles={filteredVehicles}
                        selectedCity={selectedCity}
                        sortBy={sortBy}
                        showTopDeals={showTopDeals}
                        regionFilter={regionFilter}
                        searchTerm={searchTerm}
                        selectedBrand={selectedBrand}
                        selectedModel={selectedModel}
                        selectedYear={selectedYear}
                        selectedDateRange={selectedDateRange}

                        // Existing
                        onCityChange={setSelectedCity}
                        onSortChange={setSortBy}
                        onShowTopDealsChange={setShowTopDeals}
                        onRegionFilterChange={setRegionFilter}
                        onSearchTermChange={setSearchTerm}
                        onBrandChange={setSelectedBrand}
                        onModelChange={setSelectedModel}
                        onYearChange={setSelectedYear}
                        onDateRangeChange={setSelectedDateRange}
                        onClearFilters={handleClearFilters}
                    />

                    <OpportunitiesTableView
                        vehicles={filteredVehicles}
                        isLoading={isLoading}
                        hasActiveFilters={hasActiveFilters}
                        onClearFilters={handleClearFilters}
                        getPriceStatisticsForVehicle={getPriceStatisticsForVehicle}
                    />
                </div>
            )}
        </div>
    );
}