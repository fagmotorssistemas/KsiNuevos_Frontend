import React from "react";
import { formatMoney } from "./simulator.utils";
import type { UnifiedSimulatorState } from "../../../types/simulator.types";

interface Props {
  data: UnifiedSimulatorState;
  onClose: () => void;
}

export const AmortizationModal = ({ data, onClose }: Props) => {

  // --- Lógica de Fechas ---
  const getEstimatedDate = (monthIndex: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthIndex);
    return new Intl.DateTimeFormat('es-EC', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(d);
  };

  // --- Generador Genérico ---
  const generateGenericSchedule = () => {
    const schedule = [];
    let balance = data.financedCapital;
    const safeRate = data.rate || 15.60; 
    const monthlyRate = safeRate / 100 / 12;
    const insuranceAndOthers = data.feesMonthlyDescription || 0;
    const paymentWithoutFees = (data.monthlyPayment - insuranceAndOthers);

    for (let i = 1; i <= data.termMonths; i++) {
      const interest = balance * monthlyRate;
      let capital = paymentWithoutFees - interest;
      
      if (balance - capital < 0 || i === data.termMonths) {
          capital = balance;
      }

      const finalPayment = capital + interest + insuranceAndOthers;
      balance -= capital;

      schedule.push({
        period: i,
        date: getEstimatedDate(i),
        capital: capital,
        interest: interest,
        insurance: insuranceAndOthers,
        payment: finalPayment,
        balance: balance < 0 ? 0 : balance,
      });
    }
    return schedule;
  };

  const rows = data.schedule && data.schedule.length > 0 
    ? data.schedule.map((row) => ({
        period: row.cuotaNumber,
        date: row.date || getEstimatedDate(row.cuotaNumber),
        capital: row.capital,
        interest: row.interest,
        insurance: (row.insurance || 0) + (row.desgravamen || 0) + (row.gps || 0),
        payment: row.amount || (row.capital + row.interest + ((row.insurance || 0) + (row.desgravamen || 0) + (row.gps || 0))),
        balance: row.balance
      }))
    : generateGenericSchedule();

  return (
    // 🔥 CAMBIO 1: 'items-start' en vez de 'center' y 'pt-24' para bajarlo
    <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-20 md:pt-20 bg-black/60 backdrop-blur-sm animate-fade-in overflow-hidden">
      
      {/* 🔥 CAMBIO 2: 'max-h-[85vh]' para que quepa bien aunque lo bajemos */}
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ring-1 ring-gray-200">
        
        {/* Cabecera */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0 z-20 relative">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Tabla de Amortización</h3>
            <p className="text-sm text-gray-500">
              {data.mode === 'bank' ? `Proyección ${data.bankDetails?.bankName || 'Bancaria'}` : 'Crédito Directo'}
            </p>
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

        {/* Resumen */}
        <div className="hidden md:grid grid-cols-4 gap-4 p-5 bg-gray-50 text-sm border-b border-gray-200 shrink-0">
          <div>
            <p className="text-gray-400 text-xs uppercase font-bold">Fecha Inicio</p>
            <p className="font-semibold text-gray-800">{new Date().toLocaleDateString('es-EC')}</p>
          </div>
          <div>
             <p className="text-gray-400 text-xs uppercase font-bold">Tasa Aplicada</p>
             <p className="font-semibold text-gray-800">{data.rateLabel}</p>
          </div>
          <div>
             <p className="text-gray-400 text-xs uppercase font-bold">Seguros/Otros</p>
             <p className="font-semibold text-gray-800">{formatMoney(data.feesMonthlyDescription)} /mes</p>
          </div>
          <div className="text-right">
             <p className="text-gray-400 text-xs uppercase font-bold">Cuota Final</p>
             <p className="font-bold text-blue-600 text-lg">{formatMoney(data.monthlyPayment)}</p>
          </div>
        </div>

        {/* Tabla Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 relative p-4">
          <table className="w-full text-sm text-left border-collapse bg-white rounded-lg shadow-sm">
            <thead className="text-xs text-gray-500 uppercase sticky top-0 z-10 shadow-md">
              <tr className="bg-gray-100 text-gray-600">
                <th className="px-4 py-4 font-bold text-center border-b w-12 bg-gray-100">#</th>
                <th className="px-4 py-4 font-bold border-b text-blue-800 bg-gray-100">Fecha Pago</th>
                <th className="px-4 py-4 font-bold border-b bg-gray-100">Capital</th>
                <th className="px-4 py-4 font-bold border-b bg-gray-100">Interés</th>
                <th className="px-4 py-4 font-bold border-b hidden sm:table-cell bg-gray-100">Seguros</th>
                <th className="px-4 py-4 font-bold text-right border-b text-gray-900 bg-gray-100">Cuota</th>
                <th className="px-4 py-4 font-bold text-right border-b bg-gray-100">Saldo</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.period} className="hover:bg-blue-50 transition-colors group">
                  <td className="px-4 py-3 text-center text-gray-400 font-mono group-hover:text-blue-500">
                    {row.period}
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
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                    {formatMoney(row.insurance)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 bg-gray-50/50 group-hover:bg-blue-100/30">
                    {formatMoney(row.payment)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 font-mono">
                    {formatMoney(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-200 text-right shrink-0 z-20">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-gray-800 text-white text-sm font-semibold rounded-lg hover:bg-black transition-all shadow-md cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};