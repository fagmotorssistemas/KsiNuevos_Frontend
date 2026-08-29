"use client";

import React, { Suspense } from "react";
import { useInventoryMaster } from "@/hooks/Homeksi/useInventoryMaster";
import type { SpecsFilter } from "@/hooks/Homeksi/modules/filterBySpecs";
import { HeroSection } from "@/components/features/buyCar/HeroSection";
import { SidebarFilters } from "@/components/features/buyCar/SidebarFilters";
import { CatalogToolbar } from "@/components/features/buyCar/CatalogToolbar";
import { CarCard } from "@/components/features/buyCar/CarCard";
import { MainNavbar } from "@/components/layout/Homeksi/MainNavbar";
import { MainFooter } from "@/components/layout/Homeksi/MainFooter";

function VehiclesCatalogContent({
  brandSlug,
  heading,
  intro,
}: {
  brandSlug?: string;
  heading?: string;
  intro?: string;
}) {
  const {
    cars,
    totalCount,
    page,
    setPage,
    isLoading,
    sortBy,
    setSortBy,
    filters,
    setFilterValue,
    setSpecFilter,
    clearFilters,
  } = useInventoryMaster({ brandSlug });

  const handleUpdateFilter = (key: string, value: unknown) => {
    switch (key) {
      case "search":
        setFilterValue("searchQuery", value);
        break;
      case "priceRange": {
        const range = value as [number, number];
        setFilterValue("minPrice", range[0]);
        setFilterValue("maxPrice", range[1]);
        break;
      }
      case "categories":
        setFilterValue("categories", value);
        break;
      case "locations":
        setFilterValue("locations", value);
        break;
      case "minYear":
      case "maxYear":
      case "transmission":
      case "fuelType":
      case "colors":
      case "minMileage":
      case "maxMileage":
        setSpecFilter(key as keyof SpecsFilter, value);
        break;
      default:
        console.warn(`Filtro desconocido: ${key}`);
    }
  };

  return (
    <>
      <HeroSection title={heading} intro={intro} />

      <div className="max-w-7xl mx-auto px-4 py-12 flex items-start gap-10">
        <SidebarFilters
          filters={filters}
          updateFilter={handleUpdateFilter}
          onClear={clearFilters}
        />

        <div className="min-w-0 flex-1 w-full">
          <CatalogToolbar totalCount={totalCount} sortBy={sortBy} setSortBy={setSortBy} />

          {isLoading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-6 md:gap-8">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                <div
                  key={i}
                  className="h-[420px] bg-neutral-100 rounded-2xl animate-pulse min-w-0"
                ></div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-6 md:gap-8">
                {cars.map((car) => (
                  <CarCard key={car.id} car={car} />
                ))}
              </div>

              {cars.length === 0 && (
                <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-neutral-300 mt-6">
                  <p className="text-neutral-500 text-lg font-medium mb-2">
                    No encontramos autos con esos filtros.
                  </p>
                  <button
                    onClick={clearFilters}
                    className="text-red-600 font-bold hover:underline hover:text-red-700"
                  >
                    Limpiar todos los filtros
                  </button>
                </div>
              )}

              {cars.length < totalCount && (
                <div className="mt-16 flex flex-col items-center">
                  <button
                    onClick={() => setPage(page + 1)}
                    className="px-8 py-3 bg-white border border-neutral-300 text-black font-bold rounded-xl hover:bg-neutral-50 hover:border-red-600 transition-all shadow-sm hover:shadow-md"
                  >
                    Cargar más vehículos
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function VehiclesCatalogView({
  brandSlug,
  heading,
  intro,
}: {
  brandSlug?: string;
  heading?: string;
  intro?: string;
}) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
      <MainNavbar />

      <main className="flex-grow pt-0">
        <Suspense
          fallback={
            <div className="w-full h-96 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-red-600"></div>
            </div>
          }
        >
          <VehiclesCatalogContent
            brandSlug={brandSlug}
            heading={heading}
            intro={intro}
          />
        </Suspense>
      </main>

      <MainFooter />
    </div>
  );
}
