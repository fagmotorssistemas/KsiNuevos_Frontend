"use client";

import React from "react";
import Link from "next/link";
import type { InventoryCar } from "@/hooks/Homeksi/useInventoryData";

import { MainNavbar } from "@/components/layout/Homeksi/MainNavbar";
import { MainFooter, NuestraHistoriaSection } from "@/components/layout/Homeksi/MainFooter";
import { SectionContainer } from "@/components/layout/Homeksi/SectionContainer";

import { KsTitle } from "@/components/ui/Homeksi/KsTitle";

import { Hero } from "@/components/features/Homeksi/Hero";
import { HeroTrustPanel } from "@/components/features/Homeksi/HeroTrustPanel";
import { ServiceCard } from "@/components/features/Homeksi/ServiceCard";
import { VehicleCard } from "@/components/features/Homeksi/VehicleCard";
import { VehicleGrid } from "@/components/features/Homeksi/VehicleGrid";
import { LifestyleSection } from "@/components/features/Homeksi/LifestyleSection";
import { SocialMediaSection } from "@/components/features/Homeksi/SocialMediaCard";
import { BuyerSection } from "@/components/features/Homeksi/buyer";
import { CreditBanner } from "@/components/features/Homeksi/CreditBanner";
import { CuencaSeoFaq } from "@/components/features/Homeksi/CuencaSeoFaq";
import { PUBLIC_PATHS } from "@/lib/nav/publicPaths";

type CuencaAzuayHomeViewProps = {
  popularCars: InventoryCar[];
  stockCount: number;
};

export default function CuencaAzuayHomeView({
  popularCars,
  stockCount,
}: CuencaAzuayHomeViewProps) {
  return (
    <div className="min-h-screen bg-white">
      <MainNavbar />

      <main>
        <Hero />

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

          {stockCount > 0 ? (
            <p className="mb-6 max-w-3xl text-sm leading-relaxed text-neutral-500">
              Hoy hay {stockCount} autos usados y seminuevos disponibles en
              Cuenca. Estas son las unidades con más interés en sala:
            </p>
          ) : null}

          <VehicleGrid>
            {popularCars.length > 0 ? (
              popularCars.map((car, index) => (
                <VehicleCard
                  key={`popular-${index}-${car.id}`}
                  car={car}
                  featured
                />
              ))
            ) : (
              <div className="col-span-full text-center py-10 text-neutral-500">
                El catálogo de autos usados en Cuenca se actualiza en sala.{" "}
                <Link href={PUBLIC_PATHS.comprar} className="text-red-700 hover:underline">
                  Ver inventario
                </Link>
              </div>
            )}
          </VehicleGrid>
        </SectionContainer>

        <SectionContainer>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ServiceCard
              type="sales"
              href={PUBLIC_PATHS.comprar}
              kicker="+5.000 entregas"
              title="Vehículos vendidos"
              description="Más de cinco mil autos usados y seminuevos entregados en Cuenca, con clientes que ya salieron rodando."
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
          <KsTitle
            title="Nuestra Comunidad"
            subtitle="Conéctate con nosotros y no te pierdas ninguna novedad."
            withAccent
          />
          <SocialMediaSection />
        </SectionContainer>

        <SectionContainer>
          <KsTitle
            title="Historias de Éxito"
            subtitle="Ellos ya estrenaron su K-si Nuevo."
            centered
          />
          <div className="mt-8">
            <BuyerSection />
          </div>
        </SectionContainer>

        <NuestraHistoriaSection />
        <CuencaSeoFaq />
      </main>

      <MainFooter showHistoria={false} />
    </div>
  );
}
