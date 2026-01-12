"use client";

import React, { Suspense } from 'react';
import { useInventoryPublic } from "@/hooks/Homeksi/UseInventoryHook";
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

// Componente auxiliar para la lista de autos
const PopularInventory = () => {
  const { cars, isLoading } = useInventoryPublic();
  const popularCars = cars.slice(0, 4);

  if (isLoading) return <div className="col-span-full text-center py-10 text-neutral-500">Cargando destacados...</div>;
  if (popularCars.length === 0) return <div className="col-span-full text-center py-10 text-neutral-500">No hay vehículos disponibles.</div>;

  return popularCars.map((car) => <VehicleCard key={car.id} car={car} />);
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <MainNavbar />

      {/* --- CAMBIO AQUÍ --- */}
      {/* Agregué 'pb-24' (96px) para dar un buen espacio antes de que empiece el footer */}
      <main className="pb-24"> 
        
        {/* Hero Fallback: Negro Puro */}
        <Suspense fallback={<div className="h-[85vh] w-full bg-black animate-pulse flex items-center justify-center"><span className="text-white/20 text-3xl font-bold">K-si New...</span></div>}>
          <Hero />
        </Suspense>

        <SectionContainer>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Link href={"/creditCar"}>
              <ServiceCard type="credit" title="Créditos" description="Planes a tu medida con aprobación inmediata y tasas preferenciales." />
            </Link>
            <Link href={"/creditCar"}>
              <ServiceCard type="loan" title="Préstamos" description="Empeña tu auto y sigue manejándolo mientras obtienes liquidez hoy." />
            </Link>
            <Link href={"/creditCar"}>
              <ServiceCard type="offer" title="Ofertas" description="Descuentos exclusivos en inventario seleccionado cada semana." />
            </Link>
          </div>
        </SectionContainer>

        <SectionContainer bgVariant="gray">
          <div className="flex justify-between items-end mb-8">
            <KsTitle title="Los más populares" withAccent />
            <Link href="/buyCar">
              <button className="text-red-600 font-bold text-sm hover:underline mb-10 uppercase tracking-widest hover:text-red-700 transition-colors">
                Ver catálogo →
              </button> 
            </Link>
          </div>
          
          <VehicleGrid>
            {/* Grid Fallback: Gris Neutro */}
            <Suspense fallback={<div className="h-96 w-full bg-neutral-100 animate-pulse rounded-2xl"></div>}>
              <PopularInventory />
            </Suspense>
          </VehicleGrid>
        </SectionContainer>

        <SectionContainer>
          <KsTitle title="Busca por estilo de vida" centered />
          <LifestyleSection />
          <Suspense fallback={<div className="h-20 w-full bg-neutral-50 animate-pulse rounded-3xl"></div>}></Suspense>
        </SectionContainer>

        {/* Sección de Redes Sociales */}
        <SectionContainer bgVariant="gray">
          <KsTitle title="Nuestra Comunidad" subtitle="Conéctate con nosotros y no te pierdas ninguna novedad." withAccent />
          <SocialMediaSection />
        </SectionContainer>

        {/* Historias de éxito */}
        <SectionContainer>
            <KsTitle title="Historias de Éxito" subtitle="Ellos ya estrenaron su K-si Nuevo." centered />
            <div className="mt-8">
                <BuyerSection />
            </div>
        </SectionContainer>

        {/* Team: Fondo Negro Puro */}
        <SectionContainer bgVariant="white">
          <KsTitle title="Equipo K-si Nuevos" subtitle="Expertos listos para asesorarte en tu compra." centered />
          <TeamSection />
        </SectionContainer>
      </main>

      <MainFooter />
    </div>
  );
}