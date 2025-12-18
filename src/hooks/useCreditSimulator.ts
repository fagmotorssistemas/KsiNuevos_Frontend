import { useState, useMemo } from "react";

// Definimos los tipos para mantener TypeScript feliz
export interface SimulatorValues {
    // Datos Cliente
    clientName: string;
    clientId: string;      // Nuevo: Cédula/RUC
    clientPhone: string;   // Nuevo: Teléfono
    clientAddress: string; // Nuevo: Dirección

    // Datos Financieros
    vehiclePrice: number;
    downPaymentPercentage: number;
    termMonths: number;
    interestRateMonthly: number;
    adminFee: number;
    gpsFee: number;
    insuranceFee: number;
    startDate: string;
}

export interface SimulatorResults {
    downPaymentAmount: number;
    vehicleBalance: number;
    totalCapital: number;
    totalInterest: number;
    totalDebt: number;
    monthlyPayment: number;
    schedule: Array<{
        cuotaNumber: number;
        date: string;
        amount: number;
    }>;
}

export function useCreditSimulator() {
    // Valores por defecto
    const defaultValues: SimulatorValues = {
        clientName: "",
        clientId: "",
        clientPhone: "",
        clientAddress: "",
        vehiclePrice: 10000,
        downPaymentPercentage: 60, // 60%
        termMonths: 36,
        interestRateMonthly: 1.5, // 1.5% mensual
        adminFee: 386,
        gpsFee: 686,
        insuranceFee: 400,
        startDate: new Date().toISOString().split('T')[0]
    };

    const [values, setValues] = useState<SimulatorValues>(defaultValues);

    // Lógica de Negocio (Memoized)
    const results = useMemo<SimulatorResults>(() => {
        // 1. Entrada y Saldo Vehículo
        const downPaymentAmount = values.vehiclePrice * (values.downPaymentPercentage / 100);
        const vehicleBalance = values.vehiclePrice - downPaymentAmount;

        // 2. Capital Total a Financiar (Saldo + Gastos Capitalizados)
        const totalCapital = vehicleBalance + values.adminFee + values.gpsFee + values.insuranceFee;

        // 3. Cálculo de Interés (SISTEMA FLAT / DIRECTO)
        // Fórmula: Capital * Tasa * Tiempo
        const totalInterest = totalCapital * (values.interestRateMonthly / 100) * values.termMonths;

        // 4. Total Deuda
        const totalDebt = totalCapital + totalInterest;

        // 5. Cuota Mensual
        const monthlyPayment = totalDebt / values.termMonths;

        // 6. Generación de Tabla de Amortización
        const schedule = Array.from({ length: values.termMonths }).map((_, index) => {
            const date = new Date(values.startDate);
            date.setMonth(date.getMonth() + index + 1); // Sumar meses a la fecha inicio

            return {
                cuotaNumber: index + 1,
                date: date.toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' }),
                amount: monthlyPayment
            };
        });

        return {
            downPaymentAmount,
            vehicleBalance,
            totalCapital,
            totalInterest,
            totalDebt,
            monthlyPayment,
            schedule
        };
    }, [values]);

    // Actions
    const updateField = (field: keyof SimulatorValues, value: any) => {
        setValues(prev => ({ ...prev, [field]: value }));
    };

    const updateDownPaymentByAmount = (amount: number) => {
        const percentage = (amount / values.vehiclePrice) * 100;
        setValues(prev => ({ ...prev, downPaymentPercentage: percentage }));
    };

    const resetDefaults = () => {
        setValues(defaultValues);
    };

    return {
        values,
        results,
        updateField,
        updateDownPaymentByAmount,
        resetDefaults
    };
}