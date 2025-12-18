"use client";

import React, { useState } from "react";
import { Calculator, RefreshCcw, Printer, FileCheck } from "lucide-react";
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

    // Estado para controlar si la tabla sale o no en el PDF
    // Default: false (No imprimir tabla)
    const [includeTableInPdf, setIncludeTableInPdf] = useState(false);

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

                    <div className="flex flex-wrap gap-3 items-center">
                        {/* Toggle Switch para Tabla en PDF */}
                        <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 select-none shadow-sm transition-colors">
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={includeTableInPdf}
                                    onChange={(e) => setIncludeTableInPdf(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </div>
                            <span className={`text-sm font-medium ${includeTableInPdf ? 'text-blue-600' : 'text-slate-500'}`}>
                                {includeTableInPdf ? "Con Tabla en PDF" : "Sin Tabla en PDF"}
                            </span>
                        </label>

                        <button
                            onClick={resetDefaults}
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors font-medium shadow-sm"
                            title="Reiniciar valores"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            <span className="hidden sm:inline">Reiniciar</span>
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
                            includeTableInPdf={includeTableInPdf}
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