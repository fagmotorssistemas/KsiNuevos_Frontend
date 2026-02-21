"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { OpportunitiesCenterView } from "./OpportunitiesCenterView";
import { OpportunitiesTableView } from "./OpportunitiesTableView";
import { ArrowLeft } from "lucide-react";
import { OpportunityScorer, ScoredVehicle } from "./opportunitiesScorer";
import { OpportunitiesWizardSelection } from "./OpportunitiesWizardSelection";
import { Pagination } from "@/shared/components/Pagination";
import type { VehicleWithSeller } from "@/services/scraper.service";
import type { Database } from "@/types/supabase";

type ScraperSeller = Database['public']['Tables']['scraper_sellers']['Row'];
type PriceStatistics = Database['public']['Tables']['scraper_vehicle_price_statistics']['Row'];

interface OpportunitiesViewProps {
    vehicles: VehicleWithSeller[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        startIndex: number;
        endIndex: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
    goToPage: (page: number) => void;
    nextPage: () => void;
    prevPage: () => void;
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

    // NUEVO: Props de filtros desde el hook
    vehicleFilters: {
        brand?: string;
        model?: string;
        motor?: string;
        year?: string;
        city?: string;
        dateRange?: string;
        regionFilter?: 'all' | 'coast' | 'sierra';
        searchTerm?: string;
        sortBy?: string;
    };
    filterOptions: {
        brands: string[];
        models: string[];
        motors: string[];
        years: string[];
        cities: string[];
    };
    updateFilter: (key: string, value: any) => void;
    updateBrand: (brand: string) => void;
    clearFilters: () => void;
}

export function OpportunitiesView({
    vehicles,
    goToPage,
    nextPage,
    pagination,
    prevPage,
    topOpportunities,
    isLoading,
    priceStatistics,
    getPriceStatisticsForVehicle,
    onScraperComplete,
    vehicleFilters,
    filterOptions,
    updateFilter,
    updateBrand,
    clearFilters,
}: OpportunitiesViewProps) {
    const hasActiveFilters = useMemo(() =>
        vehicleFilters.brand !== 'all' ||
        vehicleFilters.model !== 'all' ||
        vehicleFilters.motor !== 'all' ||
        vehicleFilters.year !== 'all' ||
        vehicleFilters.city !== 'all' ||
        vehicleFilters.dateRange !== 'all' ||
        vehicleFilters.regionFilter !== 'all' ||
        vehicleFilters.searchTerm !== '' ||
        vehicleFilters.sortBy !== 'created_at_desc',
        [vehicleFilters]
    );

    // Guardar posición antes de que cambien los datos
    const scrollPositionRef = useRef<number>(0);

    useEffect(() => {
        if (isLoading) {
            scrollPositionRef.current = window.scrollY;
        } else {
            window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
        }
    }, [isLoading]);

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-12">
            <div className="space-y-6 animate-in slide-in-from-bottom-8 fade-in duration-500">

                <OpportunitiesCenterView
                    priceStatistics={priceStatistics}
                    topOpportunities={topOpportunities}
                    vehicles={vehicles}
                    isLoading={isLoading}
                    onScraperComplete={onScraperComplete}

                    // Filtros desde el hook
                    selectedBrand={vehicleFilters.brand || 'all'}
                    selectedModel={vehicleFilters.model || 'all'}
                    selectedMotor={vehicleFilters.motor || 'all'}
                    selectedYear={vehicleFilters.year || 'all'}
                    selectedCity={vehicleFilters.city || 'all'}
                    selectedDateRange={vehicleFilters.dateRange || 'all'}
                    regionFilter={vehicleFilters.regionFilter || 'all'}
                    searchTerm={vehicleFilters.searchTerm || ''}
                    sortBy={vehicleFilters.sortBy || 'created_at_desc'}

                    // Opciones disponibles
                    availableBrands={filterOptions.brands}
                    availableModels={filterOptions.models}
                    availableMotors={filterOptions.motors}
                    availableYears={filterOptions.years}
                    availableCities={filterOptions.cities}

                    // Callbacks
                    onBrandChange={updateBrand}
                    onModelChange={(value) => updateFilter('model', value)}
                    onMotorChange={(value) => updateFilter('motor', value)}
                    onYearChange={(value) => updateFilter('year', value)}
                    onCityChange={(value) => updateFilter('city', value)}
                    onDateRangeChange={(value) => updateFilter('dateRange', value)}
                    onRegionFilterChange={(value) => updateFilter('regionFilter', value)}
                    onSearchTermChange={(value) => updateFilter('searchTerm', value)}
                    onSortChange={(value) => updateFilter('sortBy', value)}
                    onClearFilters={clearFilters}

                    // Stats
                    totalCount={pagination.totalItems}
                    enPatio={vehicles.filter(v => v.seller?.location === 'patio').length}
                    enTaller={vehicles.filter(v => v.seller?.location === 'taller').length}
                />
                <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.totalItems}
                    startIndex={pagination.startIndex}
                    endIndex={pagination.endIndex}
                    onPageChange={goToPage}
                    onNextPage={nextPage}
                    onPrevPage={prevPage}
                    hasNextPage={pagination.hasNextPage}
                    hasPrevPage={pagination.hasPrevPage}
                />
                <OpportunitiesTableView
                    vehicles={vehicles}
                    isLoading={isLoading}
                    hasActiveFilters={hasActiveFilters}
                    onClearFilters={clearFilters}
                    getPriceStatisticsForVehicle={getPriceStatisticsForVehicle}
                    onVehicleUpdate={onScraperComplete}
                />
            </div>
        </div>
    );
}