"use client";

import React, { Suspense } from "react";
import Head from "next/head";

// 1. IMPORT DEL HOOK MAESTRO
import { useInventoryMaster } from "@/hooks/Homeksi/useInventoryMaster";

// 2. IMPORTS DE TUS COMPONENTES
import { HeroSection } from "@/components/features/buyCar/HeroSection";
import { SidebarFilters } from "@/components/features/buyCar/SidebarFilters";
import { CatalogToolbar } from "@/components/features/buyCar/CatalogToolbar";
import { CarCard } from "@/components/features/buyCar/CarCard";
import { MainNavbar } from '@/components/layout/Homeksi/MainNavbar';
import { MainFooter } from '@/components/layout/Homeksi/MainFooter';

// --- COMPONENTE INTERNO: Maneja la lógica y los datos ---
function BuyCarContent() {
  // 3. USO DEL HOOK (Aquí es donde se leen los params, por eso aislamos esto)
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
      // Filtros Directos
      case 'search':
        setFilterValue('searchQuery', value);
        break;
      case 'priceRange':
        // El slider envía un array [min, max]
        setFilterValue('minPrice', value[0]);
        setFilterValue('maxPrice', value[1]);
        break;
      case 'categories':
        setFilterValue('categories', value);
        break;
      case 'locations':
        setFilterValue('locations', value);
        break;
        
      // Filtros de Especificaciones (Specs)
      case 'minYear':
      case 'maxYear':
      case 'transmission':
      case 'fuelType':
      case 'colors':
      case 'minMileage':
      case 'maxMileage':
        setSpecFilter(key as any, value);
        break;
        
      default:
        console.warn(`Filtro desconocido: ${key}`);
    }
  };

  return (
    <>
      <HeroSection />

      <div className="max-w-7xl mx-auto px-4 py-8 flex items-start gap-8">
          
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
                  // Skeleton Loading
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} className="h-[400px] bg-gray-200 rounded-xl animate-pulse"></div>
                      ))}
                  </div>
              ) : (
                  <>
                      {/* Grid de Autos */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                          {cars.map((car) => (
                              <CarCard key={car.id} car={car} />
                          ))}
                      </div>

                      {/* Mensaje de "No hay resultados" */}
                      {cars.length === 0 && (
                          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300 mt-6">
                              <p className="text-gray-500 text-lg">No encontramos autos con esos filtros.</p>
                              <button 
                                  onClick={clearFilters}
                                  className="mt-2 text-blue-600 font-semibold hover:underline"
                              >
                                  Limpiar todos los filtros
                              </button>
                          </div>
                      )}

                      {/* Paginación "Cargar Más" */}
                      {cars.length < totalCount && (
                           <div className="mt-12 flex flex-col items-center">
                              <button 
                                  onClick={() => setPage(page + 1)}
                                  className="px-8 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-full hover:bg-gray-50 transition shadow-sm hover:shadow-md"
                              >
                                  Cargar más
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

// --- COMPONENTE PRINCIPAL: Wrapper con Suspense para corregir el error ---
export default function BuyCarPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Head>
        <title>Comprar Auto | Catálogo</title>
      </Head>

      <MainNavbar />

      <main className="flex-grow pt-0">
        {/* Suspense atrapa la lectura de URL params durante el build */}
        <Suspense fallback={
          <div className="w-full h-96 flex items-center justify-center">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        }>
          <BuyCarContent />
        </Suspense>
      </main>

      <MainFooter />
    </div>
  );
}