import { useMemo } from "react";

// TUS REGLAS DE NEGOCIO EXACTAS
const FINANCING_RULES = {
    downPaymentPercentage: 60, // Entrada FIJA del 60%
    termMonths: 36,            // Plazo FIJO de 36 meses
    interestRateMonthly: 1.5,  // Tasa mensual 1.5%
    
    // GASTOS ADICIONALES
    adminFee: 386,             // Gasto Administrativo Fijo
    gpsFee: 686,               // Dispositivo Satelital Fijo
    insuranceRate: 0.03        // Seguro: 3% del valor del auto
};

export const useCreditCalculator = (vehiclePrice: number) => {
    
    const results = useMemo(() => {
        // Validación básica
        if (!vehiclePrice || vehiclePrice <= 0) {
            return { monthlyPayment: 0, downPaymentAmount: 0, termMonths: 0, totalDebt: 0 };
        }

        const { 
            downPaymentPercentage, 
            termMonths, 
            interestRateMonthly, 
            adminFee, 
            gpsFee, 
            insuranceRate 
        } = FINANCING_RULES;

        // 1. CALCULAR ENTRADA (60% del valor del auto)
        const downPaymentAmount = vehiclePrice * (downPaymentPercentage / 100);

        // 2. CALCULAR SALDO DEL VEHÍCULO (Lo que falta por pagar del auto)
        const vehicleBalance = vehiclePrice - downPaymentAmount;

        // 3. CALCULAR SEGURO (3% del valor TOTAL del auto)
        const insuranceFee = vehiclePrice * insuranceRate;

        // 4. CAPITAL TOTAL A FINANCIAR
        // Sumamos: Saldo del Auto + Admin + GPS + Seguro
        const totalCapital = vehicleBalance + adminFee + gpsFee + insuranceFee;

        // 5. CALCULAR INTERÉS TOTAL
        // Fórmula: Capital * Tasa * Plazo
        const totalInterest = totalCapital * (interestRateMonthly / 100) * termMonths;

        // 6. DEUDA TOTAL (Capital + Intereses)
        const totalDebt = totalCapital + totalInterest;

        // 7. CUOTA MENSUAL FINAL
        const monthlyPayment = totalDebt / termMonths;

        return {
            monthlyPayment,      // Cuota final
            downPaymentAmount,   // Cuánto paga de entrada (60%)
            termMonths,          // 36 meses
            totalDebt            // Deuda total (opcional)
        };

    }, [vehiclePrice]);

    return results;
};