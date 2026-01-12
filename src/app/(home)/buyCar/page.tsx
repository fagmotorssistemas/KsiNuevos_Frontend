"use client";

import React, { Suspense } from "react";
import Head from "next/head";

// 1. IMPORT DEL HOOK MAESTRO
import { useInventoryMaster } from "@/hooks/Homeksi/useInventoryMaster";

// 2. IMPORTS DE TUS COMPONENTES
import { HeroSection } from "@/components/features/buyCar/HeroSection";
import { SidebarFilters } from "@/components/features/buyCar/SidebarFilters";
import { CatalogToolbar } from "@/components/features/buyCar/CatalogToolbar";
import { CarCard } from "@/components/features/buyCar/CarCard"; // Asegúrate que este sea el que actualizamos antes
import { MainNavbar } from '@/components/layout/Homeksi/MainNavbar';
import { MainFooter } from '@/components/layout/Homeksi/MainFooter';

// --- COMPONENTE INTERNO: Maneja la lógica y los datos ---
function BuyCarContent() {
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
    clearFilters
  } = useInventoryMaster();

  // 4. ADAPTADOR: Conecta el Sidebar (UI) con el Hook (Lógica)
  const handleUpdateFilter = (key: string, value: any) => {
    switch (key) {
      case 'search': setFilterValue('searchQuery', value); break;
      case 'priceRange':
        setFilterValue('minPrice', value[0]);
        setFilterValue('maxPrice', value[1]);
        break;
      case 'categories': setFilterValue('categories', value); break;
      case 'locations': setFilterValue('locations', value); break;
      case 'minYear':
      case 'maxYear':
      case 'transmission':
      case 'fuelType':
      case 'colors':
      case 'minMileage':
      case 'maxMileage':
        setSpecFilter(key as any, value);
        break;
      default: console.warn(`Filtro desconocido: ${key}`);
    }
  };

  return (
    <>
      <HeroSection />

      <div className="max-w-7xl mx-auto px-4 py-12 flex items-start gap-10">
          
          {/* Sidebar con el adaptador conectado */}
          <SidebarFilters 
              filters={filters} 
              updateFilter={handleUpdateFilter} 
              onClear={clearFilters}
          />

          <div className="flex-grow w-full">
              <CatalogToolbar 
                  totalCount={totalCount} 
                  sortBy={sortBy} 
                  setSortBy={setSortBy} 
              />

              {isLoading ? (
                  // Skeleton Loading Neutro
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} className="h-[420px] bg-neutral-100 rounded-2xl animate-pulse"></div>
                      ))}
                  </div>
              ) : (
                  <>
                      {/* Grid de Autos */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                          {cars.map((car) => (
                              <CarCard key={car.id} car={car} />
                          ))}
                      </div>

                      {/* Mensaje de "No hay resultados" */}
                      {cars.length === 0 && (
                          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-neutral-300 mt-6">
                              <p className="text-neutral-500 text-lg font-medium mb-2">No encontramos autos con esos filtros.</p>
                              <button 
                                  onClick={clearFilters}
                                  // CAMBIO: Blue -> Red
                                  className="text-red-600 font-bold hover:underline hover:text-red-700"
                              >
                                  Limpiar todos los filtros
                              </button>
                          </div>
                      )}

                      {/* Paginación "Cargar Más" */}
                      {cars.length < totalCount && (
                           <div className="mt-16 flex flex-col items-center">
                              <button 
                                  onClick={() => setPage(page + 1)}
                                  // Botón neutro
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

// --- COMPONENTE PRINCIPAL ---
export default function BuyCarPage() {
  return (
    // Fondo neutro muy suave para toda la página
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
      <Head>
        <title>Comprar Auto | Catálogo K-si Nuevos</title>
      </Head>

      <MainNavbar />

      <main className="flex-grow pt-0">
        <Suspense fallback={
          <div className="w-full h-96 flex items-center justify-center">
             {/* Spinner Rojo */}
             <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-red-600"></div>
          </div>
        }>
          <BuyCarContent />
        </Suspense>
      </main>

      <MainFooter />
    </div>
  );
}