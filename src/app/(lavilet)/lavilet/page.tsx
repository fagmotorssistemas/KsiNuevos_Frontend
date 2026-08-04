"use client";

import { useState } from "react";
import { proyectos } from "@/data/lavilet/proyectos";
import { Hero } from "@/components/features/lavilet/Hero";
import { ContextoMercado } from "@/components/features/lavilet/ContextoMercado";
import { TablaComparativa } from "@/components/features/lavilet/TablaComparativa";
import { GraficoPrecioM2 } from "@/components/features/lavilet/GraficoPrecioM2";
import { GaleriaProyectos } from "@/components/features/lavilet/GaleriaProyectos";
import { IndiceValor } from "@/components/features/lavilet/IndiceValor";
import { Simulador } from "@/components/features/lavilet/Simulador";
import { Recomendacion } from "@/components/features/lavilet/Recomendacion";
import { ComparacionModal } from "@/components/features/lavilet/ComparacionModal";

export default function LaviletPage() {
  // Estado compartido entre la tabla y el gráfico
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comparingId, setComparingId] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelectedId(prev => prev === id ? null : id);
  };

  const handleCompare = (id: string) => {
    setComparingId(id);
  };

  return (
    <main className="min-h-screen bg-[#faf8f5] selection:bg-[#c48b5d]/30">
      <Hero />
      <ContextoMercado />
      
      <section className="py-24 relative bg-[#faf8f5] overflow-hidden">
        {/* Background image with heavy blur for the infographic look */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 blur-xl scale-110"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')" }}
        />
        <div className="absolute inset-0 z-0 bg-white/90" />

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-10 items-start">
            <TablaComparativa 
              proyectos={proyectos} 
              selectedId={selectedId} 
              onSelect={handleSelect}
              onCompare={handleCompare}
            />
            
            <div className="sticky top-24">
              <GraficoPrecioM2 
                proyectos={proyectos} 
                selectedId={selectedId} 
                onSelect={handleSelect}
                onCompare={handleCompare}
              />
            </div>
          </div>
        </div>
      </section>

      <GaleriaProyectos proyectos={proyectos} selectedId={selectedId} />

      <IndiceValor />
      <Simulador />
      <Recomendacion />

      <ComparacionModal 
        isOpen={!!comparingId} 
        onClose={() => setComparingId(null)} 
        proyectoId={comparingId} 
      />
    </main>
  );
}
