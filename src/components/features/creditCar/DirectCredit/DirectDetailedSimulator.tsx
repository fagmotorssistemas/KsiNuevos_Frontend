"use client";
import React, { useEffect, useState } from "react";
import { useCreditSimulator } from "@/hooks/credit/useDirectCredit"; 
import { SimulatorControls } from "../SimulatorControls";
import { SimulatorResults } from "../SimulatorResults";
import type { UnifiedSimulatorState } from "../../../../types/simulator.types";

export const DirectDetailedSimulator = () => {
  const [isSimulated, setIsSimulated] = useState(false);
  
  // 1. Hook Original (Tu matemática correcta)
  const { values, results, inventory, updateField, updateDownPaymentByAmount } = useCreditSimulator();

  useEffect(() => { setIsSimulated(false); }, [values?.selectedVehicle?.id]);

  // ============================================================
  // 🔧 ARREGLO VISUAL PARA LA CABECERA
  // (Para que Capital + Interés sumen la cuota exacta visualmente)
  // ============================================================
  
  // Recalculamos totales para sacar el promedio exacto
  const feesTotalVal = values.adminFee + values.gpsFee + values.insuranceFee;
  const principalTotal = results.vehicleBalance + feesTotalVal; // Capital + Gastos
  const totalToPay = results.monthlyPayment * values.termMonths; // Total Deuda
  const totalInterestReal = totalToPay - principalTotal; // Interés Real

  // Promedios fijos para mostrar arriba
  const avgInterest = values.termMonths > 0 ? totalInterestReal / values.termMonths : 0;
  const avgCapital = results.monthlyPayment - avgInterest;
  // ============================================================

  // 2. EL ADAPTADOR
  const unifiedData: UnifiedSimulatorState = {
    inventory,
    selectedVehicle: values.selectedVehicle,
    vehiclePrice: values.vehiclePrice,
    
    mode: "direct", 

    // Entradas
    downPaymentAmount: results.downPaymentAmount,
    downPaymentPercentage: values.downPaymentPercentage,
    termMonths: values.termMonths,
    
    // UI Config
    showAmortizationSelect: false,
    amortizationMethod: undefined,
    isSimulated: isSimulated,

    // Mapeo de Resultados
    monthlyPayment: results.monthlyPayment,
    totalDebt: results.totalDebt,
    financedCapital: results.vehicleBalance,
    totalInterest: results.totalInterest,
    
    // 🔥 AQUÍ PASAMOS LOS VALORES CORREGIDOS PARA LA CABECERA
    // Asegúrate de que tu componente SimulatorResults use estas propiedades si existen
    monthlyInterest: avgInterest, 
    monthlyCapital: avgCapital,   
    
    // Rubros
    feesLabel: "Gastos Admin, GPS y Seguros (Capitalizados)",
    feesMonthlyDescription: 0,
    feesTotal: feesTotalVal, 
    
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