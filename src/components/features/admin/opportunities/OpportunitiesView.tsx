import { VehicleWithSeller } from "@/services/scraper.service";
import { useMemo, useState, useCallback } from "react";
import { Database } from "@/types/supabase";
import { OpportunitiesCenterView } from "./OpportunitiesCenterView";
import { OpportunitiesTableView } from "./OpportunitiesTableView";

type ScraperSeller = Database['public']['Tables']['scraper_sellers']['Row'];

interface OpportunitiesViewProps {
    vehicles: VehicleWithSeller[];
    topOpportunities: VehicleWithSeller[];
    sellers: ScraperSeller[];
    isLoading: boolean;
    statusFilter?: string;
    locationFilter?: string;
    priceStatistics: any
    getPriceStatisticsForVehicle?: (brand: string, model: string, year?: string) => Promise<any>;
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

    const [onlyCoast, setOnlyCoast] = useState(true);
    const [showTopDeals, setShowTopDeals] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBrand, setSelectedBrand] = useState<string>("all");
    const [selectedYear, setSelectedYear] = useState<string>("all");
    const [selectedModel, setSelectedModel] = useState<string>("all");
    const [selectedDateRange, setSelectedDateRange] = useState<string>("all");
    const [selectedCity, setSelectedCity] = useState("all");
    const [sortBy, setSortBy] = useState("created_at_desc");

    const sourceVehicles = useMemo(() =>
        showTopDeals ? topOpportunities : vehicles,
        [showTopDeals, topOpportunities, vehicles]
    );

    const regex = /\b(?:babahoyo|milagro|naranjal|daule|los lojas|eloy alfaro|la troncal|el triunfo|guayaquil|esmeraldas|portoviejo|santo\s+domingo|santa\s+elena|machala|manta|piñas)\b/i;

    // Filtrar vehículos primero por costa si está activo
    const coastFilteredVehicles = useMemo(() => {
        if (!onlyCoast) return sourceVehicles;

        return sourceVehicles.filter(vehicle => {
            const sellerLocation = vehicle.location?.toLowerCase() || '';
            return !regex.test(sellerLocation);
        });
    }, [sourceVehicles, onlyCoast]);

    // Aplicar todos los filtros
    // Aplicar todos los filtros
    const filteredVehicles = useMemo(() => {
        const filtered = coastFilteredVehicles.filter(vehicle => {
            // Filtro de búsqueda por texto
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const titleMatch = vehicle.title?.toLowerCase().includes(searchLower);
                const descMatch = vehicle.description?.toLowerCase().includes(searchLower);
                const brandMatch = vehicle.brand?.toLowerCase().includes(searchLower);
                const modelMatch = vehicle.model?.toLowerCase().includes(searchLower);

                if (!titleMatch && !descMatch && !brandMatch && !modelMatch) {
                    return false;
                }
            }

            // Filtro por marca
            if (selectedBrand !== "all" && vehicle.brand !== selectedBrand) {
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

            // Filtro por ciudad
            if (selectedCity !== "all" && vehicle.location !== selectedCity) {
                return false;
            }

            // Filtro por rango de fecha
            if (selectedDateRange !== "all") {
                const publicationDate = new Date(vehicle.publication_date);
                const now = new Date();
                const diffInMs = now.getTime() - publicationDate.getTime();
                const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

                switch (selectedDateRange) {
                    case "today":
                        if (diffInDays > 0) return false;
                        break;
                    case "yesterday":
                        if (diffInDays !== 1) return false;
                        break;
                    case "week":
                        if (diffInDays > 7) return false;
                        break;
                    case "month":
                        if (diffInDays > 30) return false;
                        break;
                    case "3months":
                        if (diffInDays > 90) return false;
                        break;
                }
            }

            return true;
        });

        // Aplicar ordenamiento
        const sorted = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case "publication_date_desc":
                    return new Date(b.publication_date).getTime() - new Date(a.publication_date).getTime();
                case "publication_date_asc":
                    return new Date(a.publication_date).getTime() - new Date(b.publication_date).getTime();
                case "price_asc":
                    return (a.price || 0) - (b.price || 0);
                case "price_desc":
                    return (b.price || 0) - (a.price || 0);
                case "created_at_desc":
                    return new Date(b.created_at || b.publication_date).getTime() - new Date(a.created_at || a.publication_date).getTime();
                case "created_at_asc":
                    return new Date(a.created_at || a.publication_date).getTime() - new Date(b.created_at || b.publication_date).getTime();
                default:
                    return 0;
            }
        });

        return sorted;
    }, [coastFilteredVehicles, searchTerm, selectedBrand, selectedModel, selectedYear, selectedDateRange, selectedCity, sortBy]);
    const handleClearFilters = useCallback(() => {
        setSelectedBrand("all");
        setSelectedYear("all");
        setSelectedModel("all");
        setSearchTerm("");
        setOnlyCoast(true);
        setSelectedDateRange("all");
        setSelectedCity("all");
        setSortBy("created_at_desc");
    }, []);

    const hasActiveFilters = useMemo(() =>
        selectedBrand !== "all" ||
        selectedModel !== "all" ||
        selectedYear !== "all" ||
        selectedDateRange !== "all" ||
        selectedCity !== "all" ||
        searchTerm !== "" ||
        onlyCoast === false,
        [selectedBrand, selectedModel, selectedYear, selectedDateRange, selectedCity, searchTerm, onlyCoast]
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-12">
            {/* Sección 1: Centro de Oportunidades */}
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
                onlyCoast={onlyCoast}
                searchTerm={searchTerm}
                selectedBrand={selectedBrand}
                selectedModel={selectedModel}
                selectedYear={selectedYear}
                selectedDateRange={selectedDateRange}
                onCityChange={setSelectedCity}
                onSortChange={setSortBy}
                onShowTopDealsChange={setShowTopDeals}
                onOnlyCoastChange={setOnlyCoast}
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
    );
}