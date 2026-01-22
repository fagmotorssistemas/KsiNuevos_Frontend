"use client"; 

import React, { useState, useEffect, Suspense } from 'react'; // 1. Importamos Suspense
import { useSearchParams } from 'next/navigation';
import { DetailedSimulator } from '@/components/features/creditCar/DetailedSimulator'; 
import { MainNavbar } from '@/components/layout/Homeksi/MainNavbar';
import { MainFooter } from '@/components/layout/Homeksi/MainFooter';
import type { CreditMode } from '@/types/simulator.types';

// ------------------------------------------------------------------
// 1. COMPONENTE INTERNO (Maneja la lógica de URL y Estado)
// ------------------------------------------------------------------
function SimuladorContent() {
  const searchParams = useSearchParams();
  
  // Leemos el modo desde la URL
  const initialMode = searchParams.get('mode') === 'bank' ? 'bank' : 'direct';
  const [currentMode, setCurrentMode] = useState<CreditMode>(initialMode);

  // Actualizamos si cambia la URL
  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'bank' || modeParam === 'direct') {
      setCurrentMode(modeParam);
    }
  }, [searchParams]);

  return (
    <main className="flex-grow">
        {/* ENCABEZADO: Muestra qué modo está activo visualmente */}
        <div className="bg-[#c22e2e] pt-16 pb-24 px-4 text-center text-white">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Simula tu Crédito {currentMode === 'direct' ? 'Directo' : 'Bancario'}
          </h1>
          <p className="text-blue-100 max-w-2xl mx-auto mb-8">
            Calcula tus cuotas al instante con nuestra herramienta financiera.
          </p>

          {/* SELECTOR DE PESTAÑAS */}
          <div className="inline-flex bg-white/10 p-1 rounded-xl backdrop-blur-sm border border-white/20">
            <button
              onClick={() => setCurrentMode("direct")}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                currentMode === "direct"
                  ? "bg-white text-[#ec2b2b] shadow-md"
                  : "text-white hover:bg-white/10"
              }`}
            >
              Crédito Directo
            </button>
            <button
              onClick={() => setCurrentMode("bank")}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                currentMode === "bank"
                  ? "bg-white text-[#ec2b2b] shadow-md"
                  : "text-white hover:bg-white/10"
              }`}
            >
              Crédito Bancario
            </button>
          </div>
        </div>

        {/* EL SIMULADOR INTELIGENTE */}
        <div className="-mt-16 pb-16 relative z-10">
          <DetailedSimulator mode={currentMode} />
        </div>
      </main>
  );
}

// ------------------------------------------------------------------
// 2. COMPONENTE PRINCIPAL (Page)
// ------------------------------------------------------------------
export default function SimuladorPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <MainNavbar />

      {/* Aquí está la MAGIA para arreglar el error:
         Envolvemos el componente que usa searchParams dentro de Suspense.
         Esto le dice a Next.js: "Espera a que cargue el cliente para renderizar esta parte"
      */}
      <Suspense fallback={
        <div className="flex-grow flex items-center justify-center min-h-[400px] bg-[#c22e2e]">
           <span className="text-white font-semibold animate-pulse">Cargando simulador...</span>
        </div>
      }>
        <SimuladorContent />
      </Suspense>

      <MainFooter />
    </div>
  );
}