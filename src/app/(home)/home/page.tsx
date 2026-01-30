"use client";

import React, { Suspense } from 'react';
// Importamos el hook que ahora tiene la lógica de agrupación y descarga masiva
import { usePopularInventory } from '@/hooks/usePopularInventory';
import Link from 'next/link';

// Layout Components
import { MainNavbar } from '@/components/layout/Homeksi/MainNavbar';
import { MainFooter } from '@/components/layout/Homeksi/MainFooter';
import { SectionContainer } from '@/components/layout/Homeksi/SectionContainer';

// UI Components
import { KsTitle } from '@/components/ui/Homeksi/KsTitle';

// Feature Components
import { Hero } from '@/components/features/Homeksi/Hero';
import { ServiceCard } from '@/components/features/Homeksi/ServiceCard';
import { VehicleCard } from '@/components/features/Homeksi/VehicleCard';
import { VehicleGrid } from '@/components/features/Homeksi/VehicleGrid';
import { LifestyleSection } from '@/components/features/Homeksi/LifestyleSection';
import { TeamSection } from '@/components/features/Homeksi/TeamSection';
import { SocialMediaSection } from '@/components/features/Homeksi/SocialMediaCard';
import { BuyerSection } from '@/components/features/Homeksi/buyer'; 
import { CreditBanner } from '@/components/features/Homeksi/CreditBanner';
// Componente auxiliar optimizado para el Top 4
const PopularInventory = () => {
  // Obtenemos los autos ya ordenados por leads del mes desde el hook
  const { cars, isLoading } = usePopularInventory(4);

  if (isLoading) return (
    <div className="col-span-full flex flex-col items-center py-20 gap-4 text-neutral-500">
      <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="animate-pulse">Calculando los favoritos de este mes...</p>
    </div>
  );

  if (!cars || cars.length === 0) return (
    <div className="col-span-full text-center py-10 text-neutral-500">
      No hay vehículos disponibles con actividad reciente.
    </div>
  );

  return (
    <>
      {cars.map((car, index) => (
        <VehicleCard 
          key={`popular-${index}-${car.id}`} 
          car={car} 
        />
      ))}
    </>
  );
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <MainNavbar />

      <main className="pb-24"> 
        
        {/* Hero Section */}
        <Suspense fallback={<div className="h-[85vh] w-full bg-black animate-pulse flex items-center justify-center"><span className="text-white/20 text-3xl font-bold">Cargando...</span></div>}>
          <Hero />
        </Suspense>

        {/* Accesos Directos a Servicios */}
        <SectionContainer>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <ServiceCard type="credit" title="Créditos" description="Planes a tu medida con aprobación inmediata y tasas preferenciales." />
              <ServiceCard type="loan" title="Recomendados" description="Recomendaciones por ciudad, familia, trabajo o aventura." />
              <ServiceCard type="offer" title="Asesoría" description="Te orientamos para elegir el plan que mejor se ajuste a tu bolsillo." />
          </div>
        </SectionContainer>
        <CreditBanner />
        {/* Sección de Inventario Popular (Ordenado por Leads del Mes) */}
        <SectionContainer bgVariant="gray">
          <div className="flex justify-between items-end mb-8">
            <KsTitle title="Los más populares" withAccent />
            <Link href="/buyCar">
              <button className="text-red-600 font-bold text-sm hover:underline mb-10 uppercase tracking-widest hover:text-red-700 transition-colors">
                Ver catálogo completo →
              </button> 
            </Link>
          </div>
          
          <VehicleGrid>
            <Suspense fallback={<div className="h-96 w-full bg-neutral-100 animate-pulse rounded-2xl"></div>}>
              <PopularInventory />
            </Suspense>
          </VehicleGrid>
        </SectionContainer>

        {/* Búsqueda por Estilo de Vida */}
        <SectionContainer>
          <KsTitle title="Busca por estilo de vida" centered />
          <LifestyleSection />
        </SectionContainer>

        {/* Comunidad y Redes Sociales */}
        <SectionContainer bgVariant="gray">
          <KsTitle title="Nuestra Comunidad" subtitle="Conéctate con nosotros y no te pierdas ninguna novedad." withAccent />
          <SocialMediaSection />
        </SectionContainer>

        {/* Historias de Éxito */}
        <SectionContainer>
            <KsTitle title="Historias de Éxito" subtitle="Ellos ya estrenaron su K-si Nuevo." centered />
            <div className="mt-8">
                <BuyerSection />
            </div>
        </SectionContainer>

        {/* Sección del Equipo */}
        <SectionContainer bgVariant="white">
          <KsTitle title="Equipo K-si Nuevos" subtitle="Expertos listos para asesorarte en tu compra." centered />
          <TeamSection />
        </SectionContainer>
      </main>

      <MainFooter />
    </div>
  );
}