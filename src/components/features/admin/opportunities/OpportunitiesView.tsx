import { VehicleWithSeller } from "@/services/scraper.service";
import { useMemo, useState, useCallback } from "react";
import { Database } from "@/types/supabase";
import { OpportunitiesCenterView } from "./OpportunitiesCenterView";
import { OpportunitiesFiltersView } from "./OpportunitiesFiltersView";
import { OpportunitiesTableView } from "./OpportunitiesTableView";

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
    topOpportunities,
    isLoading,
    onScraperComplete
}: OpportunitiesViewProps) {

    const [onlyCoast, setOnlyCoast] = useState(true);
    const [showTopDeals, setShowTopDeals] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBrand, setSelectedBrand] = useState<string>("all");
    const [selectedYear, setSelectedYear] = useState<string>("all");
    const [selectedModel, setSelectedModel] = useState<string>("all");
    const [selectedDateRange, setSelectedDateRange] = useState<string>("all");

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
    const filteredVehicles = useMemo(() => {
        return coastFilteredVehicles.filter(vehicle => {
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
    }, [coastFilteredVehicles, searchTerm, selectedBrand, selectedModel, selectedYear, selectedDateRange]);

    const handleClearFilters = useCallback(() => {
        setSelectedBrand("all");
        setSelectedYear("all");
        setSelectedModel("all");
        setSearchTerm("");
        setOnlyCoast(true);
        setSelectedDateRange("all");
    }, []);

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
        <div className="space-y-8 animate-in fade-in duration-700 pb-12">
            {/* Sección 1: Centro de Oportunidades */}
            <OpportunitiesCenterView 
                topOpportunities={topOpportunities} 
                vehicles={vehicles} 
                isLoading={isLoading} 
                onScraperComplete={onScraperComplete} 
            />

            {/* Sección 2: Filtros */}
            <OpportunitiesFiltersView
                vehicles={vehicles}
                topOpportunities={topOpportunities}
                filteredVehicles={filteredVehicles}
                coastFilteredVehicles={coastFilteredVehicles}
                showTopDeals={showTopDeals}
                onlyCoast={onlyCoast}
                searchTerm={searchTerm}
                selectedBrand={selectedBrand}
                selectedModel={selectedModel}
                selectedYear={selectedYear}
                selectedDateRange={selectedDateRange}
                onShowTopDealsChange={setShowTopDeals}
                onOnlyCoastChange={setOnlyCoast}
                onSearchTermChange={setSearchTerm}
                onBrandChange={setSelectedBrand}
                onModelChange={setSelectedModel}
                onYearChange={setSelectedYear}
                onDateRangeChange={setSelectedDateRange}
                onClearFilters={handleClearFilters}
            />

            {/* Sección 3: Tabla de resultados */}
            <OpportunitiesTableView
                vehicles={filteredVehicles}
                isLoading={isLoading}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={handleClearFilters}
            />
        </div>
    );
}