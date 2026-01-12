"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { KsButton } from '../../ui/Homeksi/KsButton';
import { KsBadge } from '../../ui/Homeksi/KsBadge';
import { useCreditSimulator } from "@/hooks/useCreditSimulator";
import { InventorySearch } from '../financing/InventorySearch';
import { InventoryCarRow } from '../financing/FinancingUtils';

export const Hero = () => {
  const { inventory, isLoadingInventory } = useCreditSimulator();
  const [selectedCar, setSelectedCar] = useState<InventoryCarRow | null>(null);

  return (
    // CAMBIO: bg-black en lugar de slate-900
    <section className="relative h-[85vh] flex items-center justify-center bg-black overflow-hidden">
      <div className="absolute inset-0 opacity-50">
        <img 
          src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=1920" 
          alt="Hero car" 
          className="w-full h-full object-cover grayscale-[30%]" // Un poco de desaturación para elegancia
        />
      </div>
      
      <div className="relative z-20 text-center px-4 max-w-5xl">
        <KsBadge variant="solid">Oferta</KsBadge>        
        <h1 className="text-5xl md:text-7xl uppercase text-white mt-6 mb-6 font-nike">
          Tu próximo auto, <br />
          <span className="text-red-600">K-si como nuevo.</span>
        </h1>
        
        {/* BUSCADOR CON CLASE DE SOBRESCRITURA NEUTRA */}
        <div className="max-w-2xl mx-auto mb-8 text-left ksi-search-override">
          <InventorySearch 
            inventory={inventory}
            selectedVehicle={selectedCar}
            onSelect={(car) => setSelectedCar(car)}
            onClear={() => setSelectedCar(null)}
            isLoading={isLoadingInventory}
          />
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/buyCar">
            <KsButton variant="secondary">Comprar auto</KsButton>
          </Link>
          <Link href="/sellCar">
            <KsButton variant="outline">Vender o Cambiar</KsButton>
          </Link>
        </div>

        <style jsx global>{`
          @font-face {
            font-family: 'NikeFuturaND';
            src: url('/fonts/Nike/NikeFuturaND.woff2') format('woff2');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }

          .font-nike {
            font-family: 'NikeFuturaND', sans-serif !important;
          }

          .ksi-search-override label {
            display: none !important;
          }

          /* Input Blanco Puro con borde gris neutro */
          .ksi-search-override input {
            font-weight: 700 !important;
            border-radius: 0.75rem !important;
            background-color: white !important;
            border: 1px solid #e5e5e5 !important; /* neutral-200 */
            color: #000 !important;
          }

          .ksi-search-override input:focus {
            border-color: #DC2626 !important; /* red-600 */
            box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.1) !important;
          }

          .ksi-search-override input::placeholder {
            color: #a3a3a3 !important; /* neutral-400 */
          }

          /* Ocultar elementos verdes o azules heredados */
          .ksi-search-override .bg-green-50, 
          .ksi-search-override div[class*="text-green-700"],
          .ksi-search-override span[class*="text-slate-600"],
          .ksi-search-override span[class*="text-slate-400"] {
            display: none !important;
          }

          .ksi-search-override li {
            text-transform: uppercase !important;
            color: #171717 !important; /* neutral-900 */
          }

          .ksi-search-override li:hover {
            background-color: #FEF2F2 !important; /* red-50 */
          }
          
          .ksi-search-override li:hover .text-slate-800 {
            color: #DC2626 !important;
          }
        `}</style>
      </div>
    </section>
  );
};