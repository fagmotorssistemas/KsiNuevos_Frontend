"use client";

import React from 'react';
import { MainNavbar } from '@/components/layout/Homeksi/MainNavbar';
import { MainFooter } from '@/components/layout/Homeksi/MainFooter';

// Importamos los nuevos componentes
import { HeroSell } from '@/components/features/sellCar/HeroSell';
import { ProcessSteps } from '@/components/features/sellCar/ProcessSteps';
import { BenefitsSection } from '@/components/features/sellCar/BenefitsSection';
import { FaqAccordion } from '@/components/features/sellCar/FaqAccordion';

export default function SellCarPage() {
  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-red-100 selection:text-red-900">
      <MainNavbar />

      <main>
        {/* Componente Hero con Formulario */}
        <HeroSell />

        {/* Barra de Estadísticas (Pequeña sección intermedia) */}
        <div className="bg-black py-12">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-neutral-800">
                <div className="px-4">
                    <p className="text-4xl font-extrabold text-white mb-1">+5,000</p>
                    <p className="text-neutral-400 text-sm uppercase tracking-widest">Autos Comprados</p>
                </div>
                <div className="px-4">
                    <p className="text-4xl font-extrabold text-white mb-1">24h</p>
                    <p className="text-neutral-400 text-sm uppercase tracking-widest">Tiempo Promedio de Venta</p>
                </div>
                <div className="px-4">
                    <p className="text-4xl font-extrabold text-white mb-1">100%</p>
                    <p className="text-neutral-400 text-sm uppercase tracking-widest">Seguro y Confiable</p>
                </div>
            </div>
        </div>

        {/* Pasos a seguir */}
        <ProcessSteps />

        {/* Beneficios e Imagen */}
        <BenefitsSection />

        {/* Preguntas Frecuentes */}
        <FaqAccordion />

      </main>

      <MainFooter />
    </div>
  );
}