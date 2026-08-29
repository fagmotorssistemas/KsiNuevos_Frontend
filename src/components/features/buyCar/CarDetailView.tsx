"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCarDetail } from "@/hooks/Homeksi/useCarDetail";
import { useCreditCalculator } from "@/hooks/Homeksi/useCreditCalculator";
import {
  getVehicleBrandPath,
  getVehiclePublicPath,
  VEHICLES_CATALOG_PATH,
} from "@/lib/inventario/vehicle-public-slug";
import { MainNavbar } from "@/components/layout/Homeksi/MainNavbar";
import { MainFooter } from "@/components/layout/Homeksi/MainFooter";
import { CarGallery } from "@/components/features/buyCar/carDetail/CarGallery";
import { CarHeader } from "@/components/features/buyCar/carDetail/CarHeader";
import { CarSpecs } from "@/components/features/buyCar/carDetail/CarSpecs";
import BookingButton from "@/components/features/buyCar/carDetail/BookingButton";

function VehicleLoadingShell() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <MainNavbar />
      <div className="flex-grow flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600 border-l-transparent border-r-transparent"></div>
      </div>
      <MainFooter />
    </div>
  );
}

export function CarDetailView({ lookupKey }: { lookupKey: string }) {
  const router = useRouter();
  const { car, isLoading, error } = useCarDetail(lookupKey);

  useEffect(() => {
    if (!car) return;
    const canonical = getVehiclePublicPath(car);
    if (window.location.pathname !== canonical) {
      router.replace(canonical, { scroll: false });
    }
  }, [car, router]);

  const credit = useCreditCalculator(car?.price || 0);

  if (isLoading) {
    return <VehicleLoadingShell />;
  }

  if (error || !car) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <MainNavbar />
        <div className="flex-grow flex flex-col items-center justify-center text-center px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Vehículo no disponible</h2>
          <Link
            href={VEHICLES_CATALOG_PATH}
            className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-lg"
          >
            Ver inventario disponible
          </Link>
        </div>
        <MainFooter />
      </div>
    );
  }

  const ActionBlock = () => (
    <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
      <CarHeader
        brand={car.brand}
        model={car.model}
        version={car.version}
        year={car.year}
        price={car.price || 0}
        mileage={car.mileage}
        city={car.registration_place || "Cuenca"}
      />

      <div className="mt-8 space-y-3">
        <BookingButton carId={car.id} carTitle={`${car.brand} ${car.model} ${car.year}`} />

        <div className="bg-neutral-50 rounded-xl p-5 flex justify-between items-center border border-neutral-100 hover:border-red-100 transition-colors cursor-default group">
          <div className="flex flex-col">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1 group-hover:text-red-600 transition-colors">
              Financiamiento
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-black">
                ${Math.round(credit.monthlyPayment).toLocaleString()}
              </span>
              <span className="text-xs font-bold text-neutral-400">/mes</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1 font-medium">*Estimado a 36 meses</p>
          </div>

          <div className="text-right pl-6 border-l border-neutral-200 group-hover:border-red-200 transition-colors">
            <span className="text-[10px] text-neutral-400 block mb-1 font-bold uppercase">
              Entrada ({Math.round((credit.downPaymentAmount / (car.price || 1)) * 100)}%)
            </span>
            <span className="text-base font-bold text-black">
              ${Math.round(credit.downPaymentAmount).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-center text-gray-400 mt-4">
        * Precio final sujeto a cambios. Consulta términos y condiciones.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900">
      <MainNavbar />

      <main className="flex-grow pt-4 lg:pt-6 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center text-sm text-gray-400 mb-6 lg:mb-8 flex-wrap gap-y-1">
            <Link href={VEHICLES_CATALOG_PATH} className="hover:text-red-600 transition-colors">
              Vehículos
            </Link>
            <span className="mx-3 text-gray-300">/</span>
            <Link
              href={getVehicleBrandPath(car.brand)}
              className="hover:text-red-600 transition-colors uppercase"
            >
              {car.brand}
            </Link>
            <span className="mx-3 text-gray-300">/</span>
            <span className="text-gray-900 font-semibold truncate">
              {car.model} {car.year}
            </span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
            <div className="lg:col-span-7 space-y-8 lg:space-y-12">
              <div className="bg-white rounded-3xl overflow-hidden">
                <CarGallery mainImage={car.img_main_url} galleryImages={car.img_gallery_urls} />
              </div>

              <div className="block lg:hidden">
                <ActionBlock />
              </div>

              {car.description && (
                <div className="border-t border-gray-100 pt-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Sobre este auto</h3>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line text-base">
                    {car.description}
                  </p>
                </div>
              )}

              <div className="border-t border-gray-100 pt-8">
                <CarSpecs car={car} />
              </div>
            </div>

            <div className="lg:col-span-5 relative hidden lg:block">
              <div className="sticky top-28 space-y-6">
                <ActionBlock />

                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 flex items-start gap-3">
                  <div className="text-red-600 mt-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">Compra 100% Segura</h4>
                    <p className="text-xs text-gray-500 mt-1">Todos nuestros autos garantizados.</p>
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

export function VehicleLegacyRedirect({ lookupKey }: { lookupKey: string }) {
  const router = useRouter();
  const { car, isLoading, error } = useCarDetail(lookupKey);

  useEffect(() => {
    if (!car) return;
    router.replace(getVehiclePublicPath(car), { scroll: false });
  }, [car, router]);

  if (error && !isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <MainNavbar />
        <div className="flex-grow flex flex-col items-center justify-center text-center px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Vehículo no disponible</h2>
          <Link
            href={VEHICLES_CATALOG_PATH}
            className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-lg"
          >
            Ver inventario disponible
          </Link>
        </div>
        <MainFooter />
      </div>
    );
  }

  return <VehicleLoadingShell />;
}
