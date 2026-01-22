"use client";
import React, { useEffect, useState } from "react";
// Asegúrate de que este import sea correcto para tu estructura
import { useCreditSimulator } from "@/hooks/credit/useDirectCredit"; 
import { SimulatorControls } from "../SimulatorControls";
import { SimulatorResults } from "../SimulatorResults";
import type { UnifiedSimulatorState } from "../../../../types/simulator.types";

export const DirectDetailedSimulator = () => {
  const [isSimulated, setIsSimulated] = useState(false);
  
  // Hook Original de Directo
  const { values, results, inventory, updateField, updateDownPaymentByAmount } = useCreditSimulator();

  useEffect(() => { setIsSimulated(false); }, [values?.selectedVehicle?.id]);

  // EL ADAPTADOR: De Directo -> Unificado
  const unifiedData: UnifiedSimulatorState = {
    inventory,
    selectedVehicle: values.selectedVehicle,
    vehiclePrice: values.vehiclePrice,
    
    // 🔥 SOLUCIÓN DEL ERROR: Agregamos el modo
    mode: "direct", 

    // Entradas
    downPaymentAmount: results.downPaymentAmount,
    downPaymentPercentage: values.downPaymentPercentage,
    termMonths: values.termMonths,
    
    // UI Config
    showAmortizationSelect: false, // En directo no eligen amortización
    amortizationMethod: undefined,
    isSimulated: isSimulated,

    // Mapeo de Resultados
    monthlyPayment: results.monthlyPayment,
    totalDebt: results.totalDebt,
    financedCapital: results.vehicleBalance,
    totalInterest: results.totalInterest,
    
    // Rubros
    feesLabel: "Gastos Admin, GPS y Seguros (Capitalizados)",
    feesMonthlyDescription: 0,
    feesTotal: values.adminFee + values.gpsFee + values.insuranceFee, 
    
    // Textos
    rateLabel: `${values.interestRateMonthly}% Mensual`,
    rate: values.interestRateMonthly * 12,
    
    // Acciones
    updateField,
    updateDownPaymentByAmount
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2 border border-gray-100">
        
        {/* Controles: Pasamos variant="direct" */}
        <SimulatorControls 
            isSimulated={isSimulated} 
            setIsSimulated={setIsSimulated} 
            data={unifiedData} 
            variant="direct" 
        />
        
        <SimulatorResults isSimulated={isSimulated} data={unifiedData} />
      </div>
    </div>
  );
};