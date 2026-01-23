"use client";
import React, { useEffect, useState } from "react";
// Importa tu hook de BANCO (asegúrate que la ruta sea correcta)
import { useCreditSimulator } from "@/hooks/credit/useBankCredit"; 
import { SimulatorControls } from "../SimulatorControls";
import { SimulatorResults } from "../SimulatorResults";
import type { UnifiedSimulatorState } from "../../../../types/simulator.types";

export const BankDetailedSimulator = () => {
  const [isSimulated, setIsSimulated] = useState(false);

  // Hook Original de Banco
  const { values, results, inventory, updateField, updateDownPaymentByAmount } = useCreditSimulator();

  // Resetear simulación si cambia el vehículo
  useEffect(() => { setIsSimulated(false); }, [values?.selectedVehicle?.id]);

  // 🔥 LÓGICA DINÁMICA DE ETIQUETAS (NUEVO)
  // 1. Obtenemos los valores del primer mes de forma segura
  const firstMonth = results.schedule?.[0] || {};
  const monthlyGps = firstMonth.gps || 0;
  
  // 2. Definimos la etiqueta según si existe cobro de GPS o no
  const dynamicFeesLabel = monthlyGps > 0 ? "Total Seguros y GPS" : "Total Seguros";


  // 🔥 EL ADAPTADOR: De Banco -> Unificado
  const unifiedData: UnifiedSimulatorState = {
    // Datos Vehículo
    inventory,
    selectedVehicle: values.selectedVehicle,
    vehiclePrice: values.vehiclePrice,
    
    // Entradas
    downPaymentAmount: results.downPaymentAmount,
    downPaymentPercentage: values.downPaymentPercentage,
    termMonths: values.termMonths,
    
    // Config Banco
    mode: "bank",
    selectedBankId: values.selectedBank,
    
    // UI Config
    showAmortizationSelect: true, 
    //amortizationMethod: values.amortizationMethod,
    isSimulated: isSimulated, 

    // Mapeo de Resultados Financieros
    monthlyPayment: results.firstMonthlyPayment,
    totalDebt: results.totalDebt,
    financedCapital: results.amountToFinance,
    totalInterest: results.totalInterest,
    
    // Mapeo de Rubros 
    // ✅ AQUI USAMOS LA VARIABLE DINÁMICA CREADA ARRIBA
    feesLabel: dynamicFeesLabel, 

    // Suma de rubros mensuales (si gps es 0, no suma nada, así que matemático está bien)
    feesMonthlyDescription: (firstMonth.insurance || 0) + (firstMonth.desgravamen || 0) + (firstMonth.gps || 0), 
    
    // Totales acumulados
    feesTotal: results.totalGps + results.totalInsurance + results.totalDesgravamen, 
    
    // Detalles Bancarios
    bankDetails: {
        legalFees: results.legalFees,
        monthlyInsurance: firstMonth.insurance,
        monthlyDesgravamen: firstMonth.desgravamen,
        monthlyGps: firstMonth.gps,
        bankName: results.bankName
    },

    // Etiquetas
    rateLabel: `${results.interestRate}% Anual`,
    schedule: results.schedule,
    rate: results.interestRate,
    
    // Acciones
    updateField,
    updateDownPaymentByAmount
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2 border border-gray-100">
        
        {/* Controles (Izquierda) */}
        <SimulatorControls 
            isSimulated={isSimulated} 
            setIsSimulated={setIsSimulated} 
            data={unifiedData} 
            variant="bank"  
        />
        
        {/* Resultados (Derecha) */}
        {/* SimulatorResults ya tiene la leyenda legal y usa data.feesLabel */}
        <SimulatorResults isSimulated={isSimulated} data={unifiedData} />
      </div>
    </div>
  );
};