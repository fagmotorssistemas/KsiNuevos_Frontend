import { VehicleWithSeller } from "@/services/scraper.service";
import { useMemo, useState, useCallback } from "react";
import { Database } from "@/types/supabase";
import { OpportunitiesCenterView } from "./OpportunitiesCenterView";
import { OpportunitiesTableView } from "./OpportunitiesTableView";
import { OpportunitiesFiltersView } from "./OpportunitiesFiltersView";

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

    const sourceVehicles = useMemo(() =>
        showTopDeals ? topOpportunities : vehicles,
        [showTopDeals, topOpportunities, vehicles]
    );

    const regex = /\b(?:babahoyo|milagro|naranjal|daule|los lojas|eloy alfaro|la troncal|el triunfo|guayaquil|esmeraldas|portoviejo|santo\s+domingo|santa\s+elena|machala|manta|piñas)\b/i;

    // Filtrar vehículos primero por costa si está activo
    const coastFilteredVehicles = useMemo(() => {
        if (!onlyCoast) return sourceVehicles;

        return sourceVehicles.filter(vehicle => {
            const sellerLocation = vehicle.seller?.location?.toLowerCase() || '';
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

    const handleClearFilters = useCallback(() => {
        setSelectedBrand("all");
        setSelectedYear("all");
        setSelectedModel("all");
        setSearchTerm("");
        setOnlyCoast(true);
    }, []);

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
                showTopDeals={showTopDeals}
                onlyCoast={onlyCoast}
                searchTerm={searchTerm}
                selectedBrand={selectedBrand}
                selectedModel={selectedModel}
                selectedYear={selectedYear}
                onShowTopDealsChange={setShowTopDeals}
                onOnlyCoastChange={setOnlyCoast}
                onSearchTermChange={setSearchTerm}
                onBrandChange={setSelectedBrand}
                onModelChange={setSelectedModel}
                onYearChange={setSelectedYear}
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