"use client";

// 1. Importar layouts
import { MainNavbar } from '@/components/layout/Homeksi/MainNavbar';
import { MainFooter } from '@/components/layout/Homeksi/MainFooter';

// 2. Importar nuestra Feature específica
import { CreditHero } from '@/components/features/creditCar/CreditHero';

export default function CreditCarPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Barra de navegación */}
      <MainNavbar />

      <main>
        {/* Aquí va toda la sección principal con el auto y los botones */}
        <CreditHero />
      
      </main>

      {/* Pie de página */}
      <MainFooter />
    </div>
  );
}