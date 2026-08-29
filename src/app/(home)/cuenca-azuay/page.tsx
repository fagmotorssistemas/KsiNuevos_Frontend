"use client";

import React, { Suspense } from 'react';
import { usePopularInventory } from '@/hooks/usePopularInventory';
import Link from 'next/link';

import { MainNavbar } from '@/components/layout/Homeksi/MainNavbar';
import { MainFooter } from '@/components/layout/Homeksi/MainFooter';
import { SectionContainer } from '@/components/layout/Homeksi/SectionContainer';

import { KsTitle } from '@/components/ui/Homeksi/KsTitle';

import { Hero } from '@/components/features/Homeksi/Hero';
import { HeroTrustPanel } from '@/components/features/Homeksi/HeroTrustPanel';
import { ServiceCard } from '@/components/features/Homeksi/ServiceCard';
import { VehicleCard } from '@/components/features/Homeksi/VehicleCard';
import { VehicleGrid } from '@/components/features/Homeksi/VehicleGrid';
import { LifestyleSection } from '@/components/features/Homeksi/LifestyleSection';
import { SocialMediaSection } from '@/components/features/Homeksi/SocialMediaCard';
import { BuyerSection } from '@/components/features/Homeksi/buyer';
import { CreditBanner } from '@/components/features/Homeksi/CreditBanner';
import { PUBLIC_PATHS } from '@/lib/nav/publicPaths';

const PopularInventory = () => {
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
          featured
        />
      ))}
    </>
  );
};

export default function CuencaAzuayHomePage() {
  return (
    <div className="min-h-screen bg-white">
      <MainNavbar />

      <main>
        <Suspense fallback={<div className="h-[85vh] w-full bg-black animate-pulse flex items-center justify-center"><span className="text-white/20 text-3xl font-bold">Cargando...</span></div>}>
          <Hero />
        </Suspense>

        <HeroTrustPanel />

        <SectionContainer bgVariant="gray">
          <div className="flex justify-between items-end mb-8">
            <KsTitle title="Los más populares" withAccent />
            <Link href={PUBLIC_PATHS.comprar}>
              <button className="text-red-600 font-bold text-sm hover:underline mb-2 uppercase tracking-widest hover:text-red-700 transition-colors">
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

        <SectionContainer>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <ServiceCard
                type="sales"
                href={PUBLIC_PATHS.comprar}
                kicker="+5.000 entregas"
                title="Vehículos vendidos"
                description="Más de cinco mil autos entregados. Un historial real de operación en Cuenca, con clientes que ya salieron rodando."
              />
              <ServiceCard
                type="consign"
                href={PUBLIC_PATHS.vender}
                kicker="Venta a tu nombre"
                title="Consignaciones"
                description="Recibimos tu auto en vitrina, lo exhibimos y gestionamos la venta. Tú defines el precio; nosotros el proceso."
              />
              <ServiceCard
                type="tradein"
                href={PUBLIC_PATHS.vender}
                kicker="Parte de pago"
                title="Recibimos tu usado"
                description="Trae el auto que ya tienes. Lo tasamos en sala y lo descontamos del siguiente. Cambias de vehículo sin dejar el tuyo parado."
              />
          </div>
        </SectionContainer>
        <CreditBanner />
        <SectionContainer>
          <KsTitle title="Busca por estilo de vida" centered />
          <LifestyleSection />
        </SectionContainer>

        <SectionContainer bgVariant="gray">
          <KsTitle title="Nuestra Comunidad" subtitle="Conéctate con nosotros y no te pierdas ninguna novedad." withAccent />
          <SocialMediaSection />
        </SectionContainer>

        <SectionContainer>
            <KsTitle title="Historias de Éxito" subtitle="Ellos ya estrenaron su K-si Nuevo." centered />
            <div className="mt-8">
                <BuyerSection />
            </div>
        </SectionContainer>
      </main>

      <MainFooter />
    </div>
  );
}
