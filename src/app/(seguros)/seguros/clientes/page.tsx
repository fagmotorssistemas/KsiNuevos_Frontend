"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, RefreshCw, Store } from "lucide-react";
import { SegurosSidebar } from "@/components/layout/seguros-sidebar";
import { useSegurosCartera } from "@/hooks/useSegurosCartera";
import { SegurosCarteraTable } from "@/components/features/seguros/SegurosCarteraTable";
import { SegurosPolizaForm } from "@/components/features/seguros/SegurosPolizaForm";
import { SegurosGestionModal } from "@/components/features/seguros/SegurosGestionModal";
import type { SeguroVehicular } from "@/types/seguros.types";

export default function SegurosClientesPage() {
  const [filtroTipo, setFiltroTipo] = useState<"TODOS" | "CREDITO" | "CONTADO">("TODOS");
  const [selectedItem, setSelectedItem] = useState<SeguroVehicular | null>(null);
  const [seleccionado, setSeleccionado] = useState<{
    notaId: string;
    ruc: string;
    cliente: string;
    fecha: string;
    precio: number;
  } | null>(null);
  const {
    seguros,
    loading,
    enrichedData,
    cargar,
    creditos,
    contados,
    conAlertaRenovacion,
  } = useSegurosCartera();

  const handleGestionar = (item: SeguroVehicular) => {
    setSelectedItem(item);
  };

  const handleEditarDesdeModal = () => {
    if (!selectedItem) return;
    setSeleccionado({
      notaId: selectedItem.referencia,
      ruc: selectedItem.cliente.identificacion,
      cliente: selectedItem.cliente.nombre,
      fecha: selectedItem.fechaEmision,
      precio: selectedItem.valores.seguro,
    });
    setSelectedItem(null);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SegurosSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Users size={26} className="text-emerald-600" />
                    Cartera de Clientes
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Seguros vehiculares por cliente (1 año). Crédito, contado y alertas de renovación 2º año.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/seguros/ventas"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm"
                  >
                    <Store size={18} />
                    Vender a particular
                  </Link>
                  <button
                    type="button"
                    onClick={cargar}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-60"
                  >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    Actualizar
                  </button>
                </div>
              </div>

              {seleccionado ? (
                <SegurosPolizaForm
                  seleccionado={seleccionado}
                  onClose={() => setSeleccionado(null)}
                  onSuccess={() => cargar()}
                  backLabel="Volver a la cartera"
                />
              ) : (
                <>
                  <SegurosCarteraTable
                    seguros={seguros}
                    enrichedData={enrichedData}
                    loading={loading}
                    creditos={creditos}
                    contados={contados}
                    conAlertaRenovacion={conAlertaRenovacion}
                    filtroTipo={filtroTipo}
                    setFiltroTipo={setFiltroTipo}
                    onGestionar={handleGestionar}
                    showVencimientoColumns={true}
                    showRefresh={false}
                  />
                  {selectedItem && (
                    <SegurosGestionModal
                      item={selectedItem}
                      onClose={() => setSelectedItem(null)}
                      onEditar={handleEditarDesdeModal}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
