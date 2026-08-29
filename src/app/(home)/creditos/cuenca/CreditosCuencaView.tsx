"use client";

import { MainNavbar } from "@/components/layout/Homeksi/MainNavbar";
import { MainFooter } from "@/components/layout/Homeksi/MainFooter";
import { CreditHero } from "@/components/features/creditCar/CreditHero";

export default function CreditosCuencaView() {
  return (
    <div className="min-h-screen bg-white">
      <MainNavbar />
      <main>
        <CreditHero />
      </main>
      <MainFooter />
    </div>
  );
}
