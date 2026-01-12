"use client";

import React from "react";
import { useParams } from "next/navigation"; 
import { useCarDetail } from "@/hooks/Homeksi/useCarDetail";
import Link from "next/link"; // Usamos Link de next para navegación interna optimizada

// Layout
import { MainNavbar } from '@/components/layout/Homeksi/MainNavbar';
import { MainFooter } from '@/components/layout/Homeksi/MainFooter';

// Componentes del Detalle
import { CarGallery } from "@/components/features/buyCar/carDetail/CarGallery";
import { CarHeader } from "@/components/features/buyCar/carDetail/CarHeader";
import { CarSpecs } from "@/components/features/buyCar/carDetail/CarSpecs";
import { CarFeatures } from "@/components/features/buyCar/carDetail/CarFeatures";

export default function CarDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { car, isLoading, error } = useCarDetail(id);

  // --- ESTADO DE CARGA (Branded) ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <MainNavbar />
        <div className="flex-grow flex items-center justify-center h-[60vh]">
          {/* Spinner Rojo K-si Nuevos */}
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600 border-l-transparent border-r-transparent"></div>
        </div>
        <MainFooter />
      </div>
    );
  }

  // --- ESTADO DE ERROR ---
  if (error || !car) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
         <MainNavbar />
         <div className="flex-grow flex flex-col items-center justify-center text-center px-4">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Vehículo no disponible</h2>
            <p className="text-gray-500 mb-6 max-w-md">
              Es posible que este auto haya sido vendido o el enlace no sea correcto.
            </p>
            <Link 
              href="/buyCar" 
              className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-lg"
            >
              Ver inventario disponible
            </Link>
         </div>
         <MainFooter />
      </div>
    );
  }

  // --- RENDERIZADO DEL AUTO ---
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900">
      <MainNavbar />

      <main className="flex-grow pt-6 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Breadcrumb Minimalista */}
            <nav className="flex items-center text-sm text-gray-400 mb-8">
                <Link href="/buyCar" className="hover:text-red-600 transition-colors">
                  Autos
                </Link> 
                <span className="mx-3 text-gray-300">/</span>
                <span className="text-gray-900 font-semibold truncate">
                  {car.brand} {car.model}
                </span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
                
                {/* --- COLUMNA IZQUIERDA (Contenido Visual y Técnico) --- */}
                <div className="lg:col-span-7 space-y-12">
                    
                    {/* 1. Galería */}
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                      <CarGallery 
                          mainImage={car.img_main_url} 
                          galleryImages={null} 
                      />
                    </div>

                    {/* 2. Descripción */}
                    {car.description && (
                        <div className="border-t border-gray-100 pt-8">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Sobre este auto</h3>
                            <p className="text-gray-600 leading-relaxed whitespace-pre-line text-base">
                                {car.description}
                            </p>
                        </div>
                    )}

                    {/* 3. Ficha Técnica */}
                    <div className="border-t border-gray-100 pt-8">
                       <CarSpecs car={car} />
                    </div>

                    {/* 4. Equipamiento */}
                    <div className="border-t border-gray-100 pt-8">
                      <h3 className="text-xl font-bold text-gray-900 mb-6">Equipamiento destacado</h3>
                      <CarFeatures features={Array.isArray(car.features) ? car.features as string[] : []} />
                    </div>
                </div>

                {/* --- COLUMNA DERECHA (Sticky Sidebar - Conversión) --- */}
                <div className="lg:col-span-5 relative">
                    {/* El div sticky se "pega" al hacer scroll */}
                    <div className="sticky top-28 space-y-6">
                        
                        {/* Tarjeta Principal de Información */}
                        <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                           {/* Pasamos estilos limpios al Header */}
                            <CarHeader 
                                brand={car.brand}
                                model={car.model}
                                version={car.version}
                                year={car.year}
                                price={car.price || 0}
                                mileage={car.mileage}
                                city={car.city_registration} 
                            />
                            
                            <div className="mt-8 space-y-3">
                                <button className="w-full bg-red-600 text-white text-lg font-bold py-4 rounded-xl hover:bg-red-700 transition-all shadow-md hover:shadow-red-200 transform hover:-translate-y-0.5">
                                    ¡Lo quiero! Contactar
                                </button>
                                
                                <button className="w-full bg-white text-gray-900 font-bold py-4 rounded-xl border border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-all">
                                    Simular Crédito
                                </button>
                            </div>

                            <p className="text-xs text-center text-gray-400 mt-4">
                                * Precio final sujeto a cambios. Consulta términos y condiciones.
                            </p>
                        </div>

                        {/* Tarjeta de Garantía/Confianza (Opcional, mejora UX) */}
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 flex items-start gap-3">
                            <div className="text-red-600 mt-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-gray-900">Compra 100% Segura</h4>
                                <p className="text-xs text-gray-500 mt-1">Todos nuestros autos pasan por una inspección mecánica de 150 puntos.</p>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
      </main>

      <MainFooter />
    </div>
  );
}