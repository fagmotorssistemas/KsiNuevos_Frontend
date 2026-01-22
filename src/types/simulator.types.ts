import type { Database } from "@/types/supabase";

// ✅ 1. Definimos InventoryCarRow
export type InventoryCarRow = Database["public"]["Tables"]["inventory"]["Row"];

export type CreditMode = "direct" | "bank";

export type BankID = "austro" | "guayaquil" | "jep" | "caja" | "pastaza" | "merced";

// ✅ 2. La Interfaz Unificada Actualizada
export interface UnifiedSimulatorState {
  // --- DATOS BÁSICOS ---
  inventory: InventoryCarRow[];
  selectedVehicle: InventoryCarRow | null;
  vehiclePrice: number;
  
  mode: CreditMode;          
  selectedBankId?: string;   

  // --- ENTRADAS ---
  downPaymentAmount: number;
  downPaymentPercentage: number;
  termMonths: number;
  
  // --- CONFIGURACIÓN UI ---
  showAmortizationSelect: boolean;
  amortizationMethod?: 'frances' | 'aleman';
  isSimulated: boolean; 
  
  // --- RESULTADOS ---
  monthlyPayment: number;
  totalDebt: number;
  financedCapital: number;
  totalInterest: number;
  
  // --- TASA (¡AQUÍ ESTABA EL ERROR!) ---
  rate: number;       // <--- AGREGA ESTA LÍNEA (ej: 15.60)
  rateLabel: string;  // (ej: "15.60% Anual")

  // --- RUBROS ---
  feesLabel: string; 
  feesMonthlyDescription: number; 
  feesTotal: number; 
  
  // --- DETALLES DE BANCO ---
  bankDetails?: {
    legalFees: number;
    monthlyInsurance: number;
    monthlyDesgravamen: number;
    monthlyGps: number;
    bankName: string;
  };

  // --- TABLA DE AMORTIZACIÓN ---
  schedule?: Array<{
    cuotaNumber: number;
    date: string;
    amount: number;
    capital: number;
    interest: number;
    balance: number;
    insurance?: number;
    desgravamen?: number;
    gps?: number;
  }>;

  // --- ACCIONES ---
  updateField: (field: any, value: any) => void;
  updateDownPaymentByAmount: (amount: number) => void;
}