"use client";

import React from "react";
import { useParams } from "next/navigation"; // Para leer el ID de la URL
import { useCarDetail } from "@/hooks/Homeksi/useCarDetail";

// Layout
import { MainNavbar } from '@/components/layout/Homeksi/MainNavbar';
import { MainFooter } from '@/components/layout/Homeksi/MainFooter';

// Componentes del Detalle
import { CarGallery } from "@/components/features/buyCar/carDetail/CarGallery";
import { CarHeader } from "@/components/features/buyCar/carDetail/CarHeader";
import { CarSpecs } from "@/components/features/buyCar/carDetail/CarSpecs";
import { CarFeatures } from "@/components/features/buyCar/carDetail/CarFeatures";

export default function CarDetailPage() {
  // 1. Obtenemos el ID de la URL
  const params = useParams();
  const id = params?.id as string;

  // 2. Usamos nuestro Hook especializado que trae TODOS los datos
  const { car, isLoading, error } = useCarDetail(id);

  // --- ESTADOS DE CARGA Y ERROR ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (error || !car) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Auto no encontrado</h2>
        <p className="text-gray-600 mb-4">Lo sentimos, no pudimos cargar la información de este vehículo.</p>
        <a href="/buyCar" className="text-blue-600 font-semibold hover:underline">Volver al catálogo</a>
      </div>
    );
  }

  // --- RENDERIZADO DEL AUTO ---
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <MainNavbar />

      <main className="flex-grow pt-8 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Breadcrumb simple */}
            <div className="text-sm text-gray-500 mb-6">
                <a href="/buyCar" className="hover:text-blue-600">Autos</a> 
                <span className="mx-2">/</span>
                <span className="text-gray-900 font-medium">{car.brand} {car.model}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                
                {/* COLUMNA IZQUIERDA (Galería y Detalles Técnicos) - Ocupa 7 columnas */}
                <div className="lg:col-span-7 space-y-8">
                    {/* 1. Galería */}
                    <CarGallery 
                        mainImage={car.img_main_url} 
                        // Asumimos que tienes un campo gallery_urls, si no, pasamos null
                        galleryImages={null} 
                    />

                    {/* 2. Descripción (Si la tienes en DB) */}
                    {car.description && (
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-3">Descripción</h3>
                            <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                                {car.description}
                            </p>
                        </div>
                    )}

                    {/* 3. Ficha Técnica Completa (Debug Mode) */}
                    {/* AQUI ESTÁ EL CAMBIO: Pasamos el objeto entero 'car' */}
                    <CarSpecs car={car} />

                    {/* 4. Equipamiento */}
                    {/* Convertimos el JSON de features a string[] si es necesario */}
                    <CarFeatures features={Array.isArray(car.features) ? car.features as string[] : []} />
                </div>

                {/* COLUMNA DERECHA (Info Clave y Contacto - Sticky) - Ocupa 5 columnas */}
                <div className="lg:col-span-5">
                    <div className="sticky top-24 space-y-6">
                        
                        {/* 1. Header con Precio */}
                        <CarHeader 
                            brand={car.brand}
                            model={car.model}
                            version={car.version}
                            year={car.year}
                            price={car.price || 0}
                            mileage={car.mileage}
                            // Usamos city_registration si existe, sino location
                            city={car.city_registration || car.location} 
                        />

                        {/* 2. Botones de Acción (Call to Action) */}
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                            <h4 className="font-bold text-gray-900 mb-4">¿Te interesa este auto?</h4>
                            
                            <button className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-lg mb-3 hover:bg-blue-700 transition-colors shadow-sm">
                                Contactar Vendedor
                            </button>
                            
                            <button className="w-full bg-white text-gray-800 font-bold py-3.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                                Simular Crédito
                            </button>

                            <p className="text-xs text-center text-gray-500 mt-4">
                                * Precios sujetos a cambio sin previo aviso.
                            </p>
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