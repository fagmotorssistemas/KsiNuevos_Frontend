import { Database } from "@/types/supabase";

// Basado en tu esquema de Inventory
export type InventoryCarRow = Database['public']['Tables']['inventory']['Row'];

export interface SimulatorValues {
    clientName: string;
    clientId: string;
    clientPhone: string;
    clientAddress: string;
    
    // Financiero
    vehiclePrice: number;
    downPaymentPercentage: number;
    termMonths: number;
    interestRateMonthly: number;
    
    // Gastos
    adminFee: number;
    gpsFee: number;
    insuranceFee: number;
    
    // Vehículo Seleccionado (Objeto completo de la DB)
    selectedVehicle: InventoryCarRow | null;
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