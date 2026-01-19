import { useMemo } from "react";
import { AmortizationItem } from "@/types/contracts";

// REGLAS FINANCIERAS (Valores por defecto)
const CONTRACT_RULES = {
    defaultTermMonths: 36,     // Plazo por defecto
    interestRateMonthly: 1.5,  // 1.5% Mensual
    adminFee: 386,             
    gpsFee: 686,               
    insuranceRate: 0.03        
};

// CAMBIO: Añadimos 'customMonths' a los argumentos
export const useContractFinancing = (
    vehiclePrice: number, 
    customDownPayment?: number, 
    customMonths?: number
) => {
    
    const results = useMemo(() => {
        if (!vehiclePrice || vehiclePrice <= 0) {
            return { 
                monthlyPayment: 0, 
                termMonths: 0, 
                totalDebt: 0, 
                amortizationSchedule: [],
                totalReceivable: 0
            };
        }

        const { 
            defaultTermMonths, 
            interestRateMonthly, 
            adminFee, 
            gpsFee, 
            insuranceRate 
        } = CONTRACT_RULES;

        // 1. DEFINICIÓN DEL PLAZO (MESES)
        // Si el usuario pone un mes válido lo usamos, si no, usamos el defecto (36)
        const termMonths = (customMonths && customMonths > 0) ? customMonths : defaultTermMonths;

        // 2. ENTRADA
        const downPaymentAmount = customDownPayment !== undefined 
            ? customDownPayment 
            : vehiclePrice * 0.60;

        // 3. CAPITAL
        const vehicleBalance = vehiclePrice - downPaymentAmount; 
        
        if (vehicleBalance < 0) {
             return { monthlyPayment: 0, termMonths: 0, totalDebt: 0, amortizationSchedule: [], totalReceivable: 0 };
        }

        const insuranceFee = vehiclePrice * insuranceRate;
        const principal = vehicleBalance + adminFee + gpsFee + insuranceFee;

        // 4. CÁLCULO CUOTA (PMT)
        const rate = interestRateMonthly / 100;
        
        const monthlyPayment = 
            (principal * rate * Math.pow(1 + rate, termMonths)) / 
            (Math.pow(1 + rate, termMonths) - 1);

        const totalDebt = monthlyPayment * termMonths;

        // 5. TABLA DE AMORTIZACIÓN DINÁMICA
        const amortizationSchedule: AmortizationItem[] = [];
        let currentBalance = principal;
        const today = new Date();

        for (let i = 1; i <= termMonths; i++) {
            const paymentDate = new Date(today);
            paymentDate.setMonth(today.getMonth() + i);

            const interestPayment = currentBalance * rate;
            const capitalPayment = monthlyPayment - interestPayment;
            
            currentBalance -= capitalPayment;
            const finalBalance = currentBalance < 0.1 ? 0 : currentBalance;

            amortizationSchedule.push({
                id: i,
                date: paymentDate.toISOString(),
                description: `Cuota ${i.toString().padStart(2, '0')} de ${termMonths}`,
                capital: capitalPayment, 
                amount: monthlyPayment,  
                balance: finalBalance
            });
        }

        return {
            monthlyPayment,      
            downPaymentAmount, 
            termMonths, // Devolvemos el plazo real usado
            totalDebt,           
            amortizationSchedule,
            totalReceivable: totalDebt 
        };

    }, [vehiclePrice, customDownPayment, customMonths]); // Se recalcula si cambian los meses

    return results;
};