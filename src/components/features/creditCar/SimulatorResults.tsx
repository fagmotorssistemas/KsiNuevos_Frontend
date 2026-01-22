import React, { useState } from "react";
import { formatMoney } from "./simulator.utils";
import type { UnifiedSimulatorState } from "../../../types/simulator.types";
// Importamos el modal que acabamos de crear
import { AmortizationModal } from "./AmortizationTable";

interface Props {
  isSimulated: boolean;
  data: UnifiedSimulatorState;
}

export const SimulatorResults = ({ isSimulated, data }: Props) => {
  // Estado para controlar si el modal está abierto o cerrado
  const [showModal, setShowModal] = useState(false);

  const show = (val: number) => (isSimulated ? val : 0);

  // Cálculos visuales para las burbujas
  const baseCuota = data.monthlyPayment - data.feesMonthlyDescription;
  const capitalEstimado = baseCuota > 0 ? baseCuota * 0.7 : 0; 
  const interesEstimado = baseCuota > 0 ? baseCuota * 0.3 : 0; 

  return (
    <>
      <div className="p-8 md:p-10 bg-white flex flex-col justify-between relative h-full">
        <div>
          <h4 className="text-gray-400 font-bold text-center mb-8 uppercase text-sm tracking-wider">
            Tus pagos mensuales serán
          </h4>

          {/* DESGLOSE VISUAL (Burbujas) */}
          <div className="flex justify-center text-center gap-8 mb-4">
            <div>
              <p className="font-bold text-gray-700 text-lg">
                {formatMoney(show(capitalEstimado))}
              </p>
              <p className="text-[10px] text-gray-400 uppercase">Capital</p>
            </div>
            <div className="text-gray-300 mt-1">+</div>
            <div>
              <p className="font-bold text-gray-700 text-lg">
                {formatMoney(show(interesEstimado))}
              </p>
              <p className="text-[10px] text-gray-400 uppercase">Interés</p>
            </div>
            <div className="text-gray-300 mt-1">+</div>
            <div>
              <p className="font-bold text-gray-700 text-lg">
                {formatMoney(show(data.feesMonthlyDescription))}
              </p>
              <p className="text-[10px] text-gray-400 uppercase">Seguros</p>
            </div>
          </div>

          {/* CUOTA PRINCIPAL */}
          <div className="text-center py-6 border-b border-gray-100 mb-8">
            <p className="text-6xl font-black text-[#000000] tracking-tighter">
              {formatMoney(show(data.monthlyPayment))}
            </p>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              Durante {show(data.termMonths)} meses
            </p>
            
            <p className={`text-xs mt-1 ${isSimulated ? "text-blue-600" : "text-gray-300"}`}>
               Con una tasa referencial del {isSimulated ? data.rateLabel : "0%"}
            </p>
          </div>

          {/* DETALLE LISTADO */}
          <div className="space-y-4 max-w-xs mx-auto">
            <h5 className="font-bold text-gray-800 text-center mb-4">
              Detalle de tu crédito
            </h5>

            <div className="flex justify-between text-sm text-gray-600">
              <span>Capital (Financiado):</span>
              <span className="font-semibold">{formatMoney(show(data.financedCapital))}</span>
            </div>

            <div className="flex justify-between text-sm text-gray-600">
              <span>Total de interés aprox:</span>
              <span className="font-semibold">{formatMoney(show(data.totalInterest))}</span>
            </div>

            <div className="flex justify-between text-sm text-gray-600">
              <span>{data.feesLabel || "Seguros y Otros"}:</span>
              <span className="font-semibold">{formatMoney(show(data.feesTotal))}</span>
            </div>

            <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between text-base font-bold text-[#000000]">
              <span>Total a pagar:</span>
              <span>{formatMoney(show(data.totalDebt))}</span>
            </div>
            
            {/* 🔥 AQUÍ ESTÁ EL BOTÓN MÁGICO "Ver tabla de amortización" */}
            {isSimulated && (
              <div className="text-center mt-2">
                <button 
                  onClick={() => setShowModal(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium underline underline-offset-4 decoration-blue-200 hover:decoration-blue-600 transition-all cursor-pointer"
                >
                  Ver tabla de amortización
                </button>
              </div>
            )}

          </div>
        </div>

        {/* LEYENDA LEGAL */}
        <div className="mt-8 pt-4 border-t border-gray-50">
          <p className="text-[13px] text-gray-400 text-center leading-relaxed italic px-4">
            * Valores referenciales, no son considerados como una oferta formal. 
            Sujeto a análisis de crédito.
          </p>
        </div>
      </div>

      {/* RENDERIZADO DEL MODAL (Solo si showModal es true) */}
      {showModal && (
        <AmortizationModal 
          data={data} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </>
  );
};