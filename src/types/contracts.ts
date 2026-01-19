// src/types/contracts.ts

// Define la estructura de una cuota individual para la tabla de amortización
export interface AmortizationItem {
  id: number;
  date: string;        // Fecha de la cuota
  description: string; // Ej: "Cuota 01 de 36"
  capital: number;     // Valor abonado a capital
  amount: number;      // Valor total de la cuota
  balance: number;     // Saldo restante
}

export type ContractType = 'cash' | 'credit';

export interface ContractData {
  // --- Identificadores ---
  contractId?: string;       // Ej: "CCV-1334"
  date?: string;             // Fecha de emisión
  startDate?: string;        // Fecha inicio crédito
  endDate?: string;          // Fecha fin crédito

  // --- Cliente ---
  clientName: string;
  clientId: string;          // Cédula / RUC
  clientAddress?: string;
  clientCity?: string;
  clientPhone?: string;
  clientActivity?: string;   // Para formulario UAFE
  fundsOrigin?: string;      // Para formulario UAFE

  // --- Vehículo ---
  carMake: string;
  carModel: string;
  carYear: string | number;
  carPlate: string;
  carColor: string;
  carOrigin: string;
  carEngine: string;
  carChassis: string;
  carType?: string;          // Ej: CAMIONETA
  
  // --- CAMPOS QUE FALTABAN (SOLUCIÓN AL ERROR) ---
  carCylinder?: string;      // Cilindraje (ej: 3.5L)
  carTonnage?: string;       // Tonelaje (ej: 1.5 TON)
  carCapacity?: string;      // Capacidad (ej: 5 PASAJEROS)

  // --- Parte de Pago / Retoma ---
  tradeInVehicle?: string;   // Descripción breve auto dejado
  tradeInPlate?: string;
  tradeInValue?: number;     // Valor por el que se recibe

  // --- Valores Financieros ---
  carPrice: number;          // Precio del auto
  downPayment?: number;      // Entrada
  creditAmount?: number;     // Saldo a financiar
  monthlyInstallment?: number; // Valor cuota
  months?: number;           // Plazo (ej: 36)
  installments?: number;     // Sinónimo de months
  
  // --- Gastos Adicionales ---
  administrativeFee?: number; 
  deviceCost?: number;        
  
  // --- Totales ---
  totalReceivable?: number;   // Total final deuda

  // --- Datos Administrativos ---
  salesAdvisorName?: string;  
  previousOwnerName?: string; 
  
  // --- Tabla de Amortización ---
  amortizationSchedule?: AmortizationItem[];
}