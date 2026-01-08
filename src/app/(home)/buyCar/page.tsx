"use client";

import React from "react";
import Head from "next/head";
import { useInventoryPublic } from "@/hooks/Homeksi/UseInventoryHook";
import { HeroSection } from "@/components/features/buyCar/HeroSection";
import { SidebarFilters } from "@/components/features/buyCar/SidebarFilters";
import { CatalogToolbar } from "@/components/features/buyCar/CatalogToolbar";
import { CarCard } from "@/components/features/buyCar/CarCard";
import { MainNavbar } from '@/components/layout/Homeksi/MainNavbar';
import { MainFooter } from '@/components/layout/Homeksi/MainFooter';

export default function BuyCarPage() {
  const {
    cars,
    totalCount,
    page,
    setPage,
    isLoading,
    sortBy,
    setSortBy,
    filters,
    updateFilter
  } = useInventoryPublic();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Head>
        <title>Comprar Auto | Catálogo</title>
      </Head>

      <MainNavbar />

      {/* --- CAMBIO AQUÍ: pt-20 (80px) coincide con el h-20 del Navbar --- */}
      <main className="flex-grow pt-0">
        
        <HeroSection />

        <div className="max-w-7xl mx-auto px-4 py-8 flex items-start gap-8">
            <SidebarFilters 
                filters={filters} 
                updateFilter={updateFilter} 
                onClear={() => updateFilter('search', '')}
            />

            <div className="flex-grow w-full">
                <CatalogToolbar 
                    totalCount={totalCount} 
                    sortBy={sortBy} 
                    setSortBy={setSortBy} 
                />

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-[400px] bg-gray-200 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                            {cars.map((car) => (
                                <CarCard key={car.id} car={car} />
                            ))}
                        </div>

                        {cars.length === 0 && (
                            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                                <p className="text-gray-500 text-lg">No encontramos autos con esos filtros.</p>
                                <button 
                                    onClick={() => updateFilter('search', '')}
                                    className="mt-2 text-blue-600 font-semibold hover:underline"
                                >
                                    Limpiar búsqueda
                                </button>
                            </div>
                        )}

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
      </main>

      <MainFooter />
    </div>
  );
}