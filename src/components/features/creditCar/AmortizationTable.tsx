import React, { useMemo, useState, useEffect } from "react";
import { formatMoney } from "./simulator.utils";
import type { UnifiedSimulatorState } from "../../../types/simulator.types";
import { calculateDirectSchedule } from "./DirectCredit/direct.logic";
import { calculateBankSchedule } from "./BankCredit/bank.logic";

interface Props {
  data: UnifiedSimulatorState;
  onClose: () => void;
}

export const AmortizationModal = ({ data, onClose }: Props) => {

  // ==========================================
  // 🕹️ CONTROL DE ESTADO
  // ==========================================
  const [currentSystem, setCurrentSystem] = useState<'french' | 'german'>(
    (data.amortizationMethod === 'german') ? 'german' : 'french'
  );

  useEffect(() => {
    if (data.mode === 'bank' && data.amortizationMethod) {
       setCurrentSystem(data.amortizationMethod);
    }
  }, [data.amortizationMethod, data.mode]);

  // ==========================================
  // 🧠 CEREBRO
  // ==========================================
  const rows = useMemo(() => {
    if (data.mode === 'bank') {
      return calculateBankSchedule(data, currentSystem);
    } else {
      return calculateDirectSchedule(data);
    }
  }, [data, currentSystem]); 

  // ✅ DETECTAMOS SI HAY SEGUROS MENSUALES (> 0)
  // Esto sirve para ocultar la columna si es Crédito Directo o si el banco no cobra mensual.
  const hasMonthlyFees = (data.feesMonthlyDescription || 0) > 0;

  // ==========================================
  // 🎨 UI
  // ==========================================
  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-20 md:pt-20 bg-black/60 backdrop-blur-sm animate-fade-in overflow-hidden">
      
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ring-1 ring-gray-200">
        
        {/* HEADER */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0 z-20 relative">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              {data.mode === 'bank' ? 'Tabla de Amortización' : 'Plan de Pagos'}
            </h3>
            
            {/* TABS SELECTOR (Solo Banco) */}
            {data.mode === 'bank' ? (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setCurrentSystem('french')}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-all border ${
                    currentSystem === 'french'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Sistema Francés
                </button>
                <button
                  onClick={() => setCurrentSystem('german')}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-all border ${
                    currentSystem === 'german'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Sistema Alemán
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-1">Cuotas Fijas - Interés Comercial</p>
            )}

          </div>

          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors p-2 rounded-full cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* SUMMARY: Ajustamos el grid dinámicamente (3 o 4 columnas) */}
        <div className={`hidden md:grid gap-4 p-5 bg-gray-50 text-sm border-b border-gray-200 shrink-0 ${hasMonthlyFees ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <div>
            <p className="text-gray-400 text-xs uppercase font-bold">Monto Financiado</p>
            <p className="font-semibold text-gray-800">{formatMoney(data.financedCapital)}</p>
          </div>
          <div>
              <p className="text-gray-400 text-xs uppercase font-bold">Tasa / Interés</p>
              <p className="font-semibold text-gray-800">
                {data.mode === 'bank' ? `${data.rateLabel}` : 'Fija Comercial'}
              </p>
          </div>
          
          {/* ✅ SOLO SE MUESTRA SI HAY VALOR */}
          {hasMonthlyFees && (
            <div>
                <p className="text-gray-400 text-xs uppercase font-bold">Gastos Admin.</p>
                <p className="font-semibold text-gray-800">{formatMoney(data.feesMonthlyDescription)} /mes</p>
            </div>
          )}

          <div className="text-right">
              <p className="text-gray-400 text-xs uppercase font-bold">
                 {data.mode === 'bank' && currentSystem === 'german' ? 'Primera Cuota' : 'Cuota Mensual'}
              </p>
              <p className="font-bold text-blue-600 text-lg">
                {formatMoney(rows[0]?.amount || 0)}
              </p>
          </div>
        </div>

        {/* TABLE */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 relative ">
          <table className="w-full text-sm text-left border-collapse bg-white rounded-lg shadow-sm">
            <thead className="text-xs text-gray-500 uppercase sticky top-0 z-10 shadow-md">
              <tr className="bg-gray-100 text-gray-600">
                <th className="px-4 py-4 font-bold text-center border-b w-12 bg-gray-100">#</th>
                <th className="px-4 py-4 font-bold border-b text-blue-800 bg-gray-100">Fecha</th>
                <th className="px-4 py-4 font-bold border-b bg-gray-100">Capital</th>
                <th className="px-4 py-4 font-bold border-b bg-gray-100">Interés</th>
                
                {/* ✅ CABECERA DE SEGUROS CONDICIONAL */}
                {hasMonthlyFees && (
                  <th className="px-4 py-4 font-bold border-b hidden sm:table-cell bg-gray-100">Seguros</th>
                )}

                <th className="px-4 py-4 font-bold text-right border-b text-gray-900 bg-gray-100">Cuota</th>
                <th className="px-4 py-4 font-bold text-right border-b bg-gray-100">Saldo</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.cuotaNumber} className="hover:bg-blue-50 transition-colors group">
                  <td className="px-4 py-3 text-center text-gray-400 font-mono group-hover:text-blue-500">
                    {row.cuotaNumber}
                  </td>
                  <td className="px-4 py-3 font-medium text-blue-700 text-xs sm:text-sm whitespace-nowrap">
                    {row.date}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatMoney(row.capital)}
                  </td>
                  <td className="px-4 py-3 text-red-500 font-medium">
                    {formatMoney(row.interest)}
                  </td>
                  
                  {/* ✅ CELDA DE SEGUROS CONDICIONAL */}
                  {hasMonthlyFees && (
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      {formatMoney((row.insurance || 0) + (row.desgravamen || 0) + (row.gps || 0))}
                    </td>
                  )}

                  <td className="px-4 py-3 text-right font-bold text-gray-900 bg-gray-50/50 group-hover:bg-blue-100/30">
                    {formatMoney(row.amount)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 font-mono">
                    {formatMoney(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-white border-t border-gray-200 text-right shrink-0 z-20">
          <button onClick={onClose} className="px-6 py-2 bg-gray-800 text-white text-sm font-semibold rounded-lg hover:bg-black transition-all shadow-md cursor-pointer">
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};