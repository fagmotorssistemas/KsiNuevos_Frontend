"use client";

import React from "react";
import { Calculator, RefreshCcw, Printer } from "lucide-react";
import { useCreditSimulator } from "@/hooks/useCreditSimulator";
import { CreditForm, CreditProforma } from "@/components/features/financing/CreditComponents";

export default function CreditSimulatorPage() {
    const {
        values,
        results,
        updateField,
        updateDownPaymentByAmount,
        resetDefaults
    } = useCreditSimulator();

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 print:p-0 print:bg-white">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* HEADER (Oculto al imprimir) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <Calculator className="text-blue-600 h-8 w-8" />
                            Cotizador Financiero
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Simulación de crédito automotriz (Interés Flat)
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={resetDefaults}
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors font-medium shadow-sm"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Reiniciar
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium shadow-md shadow-blue-600/20"
                        >
                            <Printer className="w-4 h-4" />
                            Imprimir / PDF
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* COLUMNA IZQUIERDA: CONFIGURACIÓN (Oculto al imprimir) */}
                    <div className="lg:col-span-4 print:hidden">
                        <CreditForm
                            values={values}
                            results={results}
                            updateField={updateField}
                            updateDownPaymentByAmount={updateDownPaymentByAmount}
                        />
                    </div>

                    {/* COLUMNA DERECHA: PROFORMA (Visible en pantalla e impresión) */}
                    <div className="lg:col-span-8 print:col-span-12 print:w-full">
                        <CreditProforma
                            values={values}
                            results={results}
                        />
                    </div>
                </div>
            </div>

            {/* Estilos Globales de Impresión */}
            <style jsx global>{`
        @media print {
          body {
            background: white;
            color: black;
          }
          /* Ocultar elementos marcados con print:hidden */
          .print\\:hidden {
            display: none !important;
          }
          /* Asegurar anchos correctos */
          .print\\:col-span-12 {
            grid-column: span 12 / span 12 !important;
            width: 100% !important;
          }
        }
      `}</style>
        </div>
    );
}