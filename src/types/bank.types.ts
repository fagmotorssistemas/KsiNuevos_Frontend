import type { Database } from "@/types/supabase";

export type InventoryCarRow = Database["public"]["Tables"]["inventory"]["Row"];
export type BankID = "austro" | "guayaquil" | "jep" | "caja" | "pastaza" | "merced";
export type AmortizationMethod = "french" | "german"

export interface BankProfile {
  id: BankID;
  name: string;
  rate: number;           // Tasa de interés anual (TEA)
  legalFee: number;       // Gastos legales iniciales
  insuranceRate: number;  // % Seguro de auto anual
  desgravamenRate: number;// % Desgravamen anual
  gpsPrice: number;       // 🔥 NUEVO: Precio mensual del GPS específico por banco
}

export interface SimulatorValues {
  selectedVehicle: any | null; // O tu tipo InventoryCarRow
  selectedBank: BankID;
  vehiclePrice: number;
  downPaymentMode: "percentage" | "amount";
  downPaymentPercentage: number;
  customDownPaymentAmount: number;
  termMonths: number;
  amortizationMethod: AmortizationMethod;
  // gpsFee: number;  <-- ELIMINAMOS ESTO DE AQUÍ (ahora va en el banco)
  startDate: string;
}

export interface SimulatorResults {
  bankName: string;
  interestRate: number;
  downPaymentAmount: number;
  vehicleBalance: number;
  legalFees: number;
  amountToFinance: number;
  
  // Totales
  totalInterest: number;
  totalGps: number;
  totalInsurance: number;
  totalDesgravamen: number;
  totalDebt: number;
  firstMonthlyPayment: number;
  
  // Tabla
  schedule: Array<{
    cuotaNumber: number;
    date: string;
    amount: number;
    capital: number;
    interest: number;
    insurance: number;
    desgravamen: number;
    gps: number;
    balance: number;
  }>;
}