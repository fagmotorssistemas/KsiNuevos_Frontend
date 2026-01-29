import type { Database } from "@/types/supabase";

// ==========================================
// 1. TIPOS COMPARTIDOS (Base)
// ==========================================

// Extraemos el tipo de fila de Supabase
export type InventoryCarRow = Database["public"]["Tables"]["inventory"]["Row"];

// Identificadores de Bancos
export type BankID = "austro" | "guayaquil" | "jep" | "caja" | "pastaza" | "merced";

// Modos de Crédito
export type CreditMode = "direct" | "bank";

// Métodos de Amortización
export type AmortizationMethod = "french" | "german";

// ==========================================
// 2. TIPOS PARA LÓGICA BANCARIA (Cálculos internos)
// ==========================================

export interface BankProfile {
  id: BankID;
  name: string;
  rate: number;           // Tasa anual (TEA)
  legalFee: number;       // Gastos legales fijos
  insuranceRate: number;  // % Seguro anual
  desgravamenRate: number;// % Desgravamen anual
  gpsPrice: number;       // Costo mensual GPS
}

export interface SimulatorResults {
  bankName: string;
  interestRate: number;
  downPaymentAmount: number;
  vehicleBalance: number;
  legalFees: number;
  amountToFinance: number; // El capital base + gastos legales (si aplica)
  
  // Totales acumulados
  totalInterest: number;
  totalGps: number;
  totalInsurance: number;
  totalDesgravamen: number;
  totalDebt: number;       // Suma de todo lo que pagará el cliente
  firstMonthlyPayment: number;
  
  // La tabla calculada
  schedule: AmortizationRow[];
}

// ==========================================
// 3. ESTRUCTURA DE LA TABLA (Filas)
// ==========================================
export interface AmortizationRow {
  cuotaNumber: number;
  date: string;
  amount: number;       // Cuota total
  capital: number;      // Abono a capital
  interest: number;     // Interés
  balance: number;      // Saldo restante
  insurance?: number;   // Seguro Auto
  desgravamen?: number; // Seguro Desgravamen
  gps?: number;         // GPS
}

// ==========================================
// 4. ESTADO UNIFICADO (Lo que usa la UI y el Modal)
// ==========================================
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
  amortizationMethod?: AmortizationMethod;
  isSimulated: boolean; 
  
  // --- RESULTADOS FINANCIEROS ---
  monthlyPayment: number;    // La cuota mensual a mostrar

  monthlyInterest?: number;  // Para mostrar desglose fijo en cabecera (Directo)
  monthlyCapital?: number;   // Para mostrar desglose fijo en cabecera (Directo)
  
  // IMPORTANTE: Para que la tabla cuadre con el arreglo matemático anterior,
  // 'financedCapital' debe ser el SALDO INICIAL TOTAL (Vehículo + Gastos Capitalizados)
  financedCapital: number;   
  
  totalDebt: number;         // Total a pagar al final del plazo
  totalInterest: number;
  
  // --- TASA Y RUBROS ---
  rate: number;              // Ej: 15.60
  rateLabel: string;         // Ej: "15.60% Anual"
  
  feesLabel: string;         // Ej: "Gastos Admin, GPS y Seguros"
  feesMonthlyDescription: number; // Valor mensual visual (si aplica)
  feesTotal: number;         // Valor total capitalizado
  
  // --- DETALLES ESPECÍFICOS DE BANCO (Opcional) ---
  bankDetails?: {
    legalFees: number;
    monthlyInsurance: number;
    monthlyDesgravamen: number;
    monthlyGps: number;
    bankName: string;
  };

  // --- TABLA DE AMORTIZACIÓN ---
  // Reutilizamos el tipo AmortizationRow para consistencia
  schedule?: AmortizationRow[];

  // --- ACCIONES (Métodos) ---
  updateField: (field: any, value: any) => void;
  updateDownPaymentByAmount: (amount: number) => void;
}