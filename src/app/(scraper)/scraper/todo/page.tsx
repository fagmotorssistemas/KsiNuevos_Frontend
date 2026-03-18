"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert } from "lucide-react";
import { useScraperData } from "@/hooks/useScraperData";
import { getVehicleTraction } from "@/services/scraper.service";
import { OpportunitiesCenterView } from "@/components/features/admin/opportunities/OpportunitiesCenterView";
import { OpportunitiesTableView } from "@/components/features/admin/opportunities/OpportunitiesTableView";
import { Pagination } from "@/shared/components/Pagination";

export default function ScraperTodoPage() {
    const { profile, isLoading: isAuthLoading } = useAuth();
    const {
        vehicles,
        isLoading: isScraperLoading,
        priceStatistics,
        getPriceStatisticsForVehicle,
        pagination,
        goToPage,
        nextPage,
        prevPage,
        vehicleFilters,
        filterOptions,
        updateFilter,
        updateBrand,
        clearFilters,
        refreshAll,
    } = useScraperData();

    useEffect(() => {
        if (typeof window === "undefined") return;

        const container = document.querySelector<HTMLElement>("[data-scraper-scroll-container]");
        if (container) {
            container.scrollTo({ top: 0, left: 0, behavior: "auto" });
        } else {
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        }
    }, []);

    const hasActiveFilters = useMemo(
        () =>
            vehicleFilters.brand !== "all" ||
            vehicleFilters.model !== "all" ||
            vehicleFilters.motor !== "all" ||
            (vehicleFilters as { trim?: string }).trim !== "all" ||
            vehicleFilters.year !== "all" ||
            vehicleFilters.city !== "all" ||
            vehicleFilters.dateRange !== "all" ||
            vehicleFilters.regionFilter !== "all" ||
            vehicleFilters.searchTerm !== "" ||
            vehicleFilters.traction !== "all" ||
            vehicleFilters.sortBy !== "created_at_desc",
        [vehicleFilters]
    );

    if (!isAuthLoading && (!profile || (profile.role !== "admin" && profile.role !== "vendedor" && profile.role !== "marketing"))) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-50 text-slate-600">
                <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
                <h1 className="text-xl font-bold">Acceso restringido</h1>
                <p>No tienes permisos para ver el módulo Scraper.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6">
            <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Todo el inventario</h1>
                <p className="text-sm md:text-base text-slate-500 mt-1">
                    Todo lo scrapeado. Usa los filtros de arriba para marca, modelo, año, ciudad, fecha y orden.
                </p>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2 inline-block">
                    Los datos actuales provienen de búsquedas en Cuenca. El filtro por región (costa/sierra) se enriquecerá cuando se agreguen más ciudades al scraping.
                </p>
            </div>

            <OpportunitiesCenterView
                hideExplorerActions
                priceStatistics={priceStatistics}
                vehicles={vehicles}
                isLoading={isScraperLoading}
                onScraperComplete={refreshAll}
                selectedBrand={vehicleFilters.brand || "all"}
                selectedModel={vehicleFilters.model || "all"}
                selectedYear={vehicleFilters.year || "all"}
                selectedCity={vehicleFilters.city || "all"}
                selectedTrim={(vehicleFilters as { trim?: string }).trim || "all"}
                selectedDateRange={vehicleFilters.dateRange || "all"}
                regionFilter={vehicleFilters.regionFilter || "all"}
                searchTerm={vehicleFilters.searchTerm || ""}
                selectedTraction={vehicleFilters.traction || "all"}
                showTractionFilter={vehicles.some((v) => getVehicleTraction(v) !== null)}
                sortBy={vehicleFilters.sortBy || "created_at_desc"}
                availableBrands={filterOptions.brands}
                availableModels={filterOptions.models}
                availableYears={filterOptions.years}
                availableCities={filterOptions.cities}
                availableTrims={filterOptions.trims ?? []}
                totalCount={pagination.totalItems}
                enPatio={vehicles.filter((v) => v.location === "patio").length}
                enTaller={vehicles.filter((v) => v.location === "taller").length}
                onBrandChange={updateBrand}
                onModelChange={(v) => updateFilter("model", v)}
                onMotorChange={(v) => updateFilter("motor", v)}
                onYearChange={(v) => updateFilter("year", v)}
                onCityChange={(v) => updateFilter("city", v)}
                onTrimChange={(v) => updateFilter("trim", v)}
                onDateRangeChange={(v) => updateFilter("dateRange", v)}
                onRegionFilterChange={(v) => updateFilter("regionFilter", v)}
                onSearchTermChange={(v) => updateFilter("searchTerm", v)}
                onTractionChange={(v) => updateFilter("traction", v)}
                onSortChange={(v) => updateFilter("sortBy", v)}
                onClearFilters={clearFilters}
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
                isLoading={isScraperLoading}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearFilters}
                getPriceStatisticsForVehicle={getPriceStatisticsForVehicle}
                onVehicleUpdate={refreshAll}
            />

            {!isScraperLoading && pagination.totalPages > 1 && (
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
    );
}
