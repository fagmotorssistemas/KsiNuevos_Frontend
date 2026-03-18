"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getVehicleTraction } from "@/services/scraper.service";
import { OpportunitiesCenterView } from "./OpportunitiesCenterView";
import { OpportunitiesTableView } from "./OpportunitiesTableView";
import { Pagination } from "@/shared/components/Pagination";
import type { OpportunitiesViewProps } from "./interfaces";

export function OpportunitiesView({
    vehicles,
    pagination,
    isLoading,
    priceStatistics,
    vehicleFilters,
    filterOptions,
    goToPage,
    nextPage,
    prevPage,
    getPriceStatisticsForVehicle,
    onScraperComplete,
    updateFilter,
    updateBrand,
    clearFilters,
}: OpportunitiesViewProps) {

    const hasActiveFilters = useMemo(() =>
        vehicleFilters.brand !== 'all' ||
        vehicleFilters.model !== 'all' ||
        vehicleFilters.motor !== 'all' ||
        (vehicleFilters.trim && vehicleFilters.trim !== 'all') ||
        vehicleFilters.year !== 'all' ||
        vehicleFilters.city !== 'all' ||
        vehicleFilters.dateRange !== 'all' ||
        vehicleFilters.regionFilter !== 'all' ||
        vehicleFilters.searchTerm !== '' ||
        vehicleFilters.traction !== 'all' ||
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
                    vehicles={vehicles}
                    isLoading={isLoading}
                    onScraperComplete={onScraperComplete}

                    // Filtros desde el hook
                    selectedBrand={vehicleFilters.brand || 'all'}
                    selectedModel={vehicleFilters.model || 'all'}
                    selectedYear={vehicleFilters.year || 'all'}
                    selectedCity={vehicleFilters.city || 'all'}
                    selectedTrim={vehicleFilters.trim || 'all'}
                    selectedDateRange={vehicleFilters.dateRange || 'all'}
                    regionFilter={vehicleFilters.regionFilter || 'all'}
                    searchTerm={vehicleFilters.searchTerm || ''}
                    selectedTraction={vehicleFilters.traction || 'all'}
                    showTractionFilter={vehicles.some(v => getVehicleTraction(v) !== null)}
                    sortBy={vehicleFilters.sortBy || 'created_at_desc'}

                    // Opciones disponibles
                    availableBrands={filterOptions.brands}
                    availableModels={filterOptions.models}
                    availableYears={filterOptions.years}
                    availableCities={filterOptions.cities}
                    availableTrims={filterOptions.trims ?? []}

                    // Callbacks
                    onBrandChange={updateBrand}
                    onModelChange={(value) => updateFilter('model', value)}
                    onMotorChange={(value) => updateFilter('motor', value)}
                    onYearChange={(value) => updateFilter('year', value)}
                    onCityChange={(value) => updateFilter('city', value)}
                    onTrimChange={(value) => updateFilter('trim', value)}
                    onDateRangeChange={(value) => updateFilter('dateRange', value)}
                    onRegionFilterChange={(value) => updateFilter('regionFilter', value)}
                    onSearchTermChange={(value) => updateFilter('searchTerm', value)}
                    onTractionChange={(value) => updateFilter('traction', value)}
                    onSortChange={(value) => updateFilter('sortBy', value)}
                    onClearFilters={clearFilters}

                    // Stats
                    totalCount={pagination.totalItems}
                    enPatio={vehicles.filter(v => v.location === 'patio').length}
                    enTaller={vehicles.filter(v => v.location === 'taller').length}
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

                {!isLoading && pagination.totalPages > 1 && (
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
                )}
            </div>
        </div>
    );
}
