"use client"; 
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation'; // 👈 Importamos esto para leer la URL
import { DetailedSimulator } from '@/components/features/creditCar/DetailedSimulator'; 
import { MainNavbar } from '@/components/layout/Homeksi/MainNavbar';
import { MainFooter } from '@/components/layout/Homeksi/MainFooter';
import type { CreditMode } from '@/types/simulator.types';

export default function SimuladorPage() {
  const searchParams = useSearchParams();
  
  // 1. Leemos el modo desde la URL (si existe)
  const initialMode = searchParams.get('mode') === 'bank' ? 'bank' : 'direct';

  // 2. Iniciamos el estado con lo que vino de la URL
  const [currentMode, setCurrentMode] = useState<CreditMode>(initialMode);

  // (Opcional) Si cambia la URL dinámicamente, actualizamos el estado
  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'bank' || modeParam === 'direct') {
      setCurrentMode(modeParam);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <MainNavbar />

      <main className="flex-grow">
        {/* ENCABEZADO: Muestra qué modo está activo visualmente */}
        <div className="bg-[#c22e2e] pt-16 pb-24 px-4 text-center text-white">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Simula tu Crédito {currentMode === 'direct' ? 'Directo' : 'Bancario'}
          </h1>
          <p className="text-blue-100 max-w-2xl mx-auto mb-8">
            Calcula tus cuotas al instante con nuestra herramienta financiera.
          </p>

          {/* SELECTOR DE PESTAÑAS (Útil para cambiar de opinión sin volver atrás) */}
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

      <MainFooter />
    </div>
  );
}