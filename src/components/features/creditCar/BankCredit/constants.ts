// features/creditCar/BankCredit/constants.ts
import { BankID, BankProfile, SimulatorValues } from "@/types/bank.types"; // Ajusta la ruta

export const BANK_OPTIONS: Record<BankID, BankProfile> = {
  austro: { 
    id: "austro", 
    name: "Banco del Austro", 
    rate: 16.77, 
    legalFee: 0, 
    insuranceRate: 0,     // 5% es estándar banca
    desgravamenRate: 0, 
    gpsPrice: 0            // Austro suele incluir monitoreo
  },
  guayaquil: { 
    id: "guayaquil", 
    name: "Banco Guayaquil", 
    rate: 15.60, 
    legalFee: 0, 
    insuranceRate: 0, 
    desgravamenRate: 0, 
    gpsPrice: 0            // Chevrolet/ChevyStar suele costar esto
  },
  jep: { 
    id: "jep", 
    name: "Cooperativa JEP", 
    // 🔥 CAMBIO CLAVE 1: Usamos la TASA NOMINAL para el cálculo matemático
    // Aunque la efectiva sea 16.77%, la tabla se calcula con la nominal.
    rate: 15.60, 
    legalFee: 0, 
    // El seguro de auto se paga aparte en JEP (según tu análisis anterior)
    insuranceRate: 0, 
    // 🔥 CAMBIO CLAVE 2: Ajuste fino para llegar a los $448 exactos
    // (448 / 3 años / 17800 monto) * 100 = 0.84% aprox
    desgravamenRate: 0.84, 
    gpsPrice: 0 
  },
  caja: { 
    id: "caja", 
    name: "Cooperativa CAJA", 
    rate: 13.80, 
    legalFee: 0, 
    insuranceRate: 0, 
    desgravamenRate: 0, 
    gpsPrice: 0            // Precio promedio cooperativa
  },
  pastaza: { 
    id: "pastaza", 
    name: "CACPE Pastaza", 
    rate: 16.59, 
    legalFee: 0, 
    insuranceRate: 0, 
    desgravamenRate: 0, 
    gpsPrice: 0             // Generalmente no lo obligan en financiamiento
  },
  merced: { 
    id: "merced", 
    name: "Cooperativa La Merced", 
    rate: 14.60, 
    legalFee: 0, 
    insuranceRate: 0, 
    desgravamenRate: 1.0, 
    gpsPrice: 0 
  },
};

export const DEFAULT_SIMULATOR_VALUES: SimulatorValues = {
  selectedVehicle: null,
  selectedBank: "austro",
  vehiclePrice: 20000,
  downPaymentMode: "percentage",
  downPaymentPercentage: 25,
  customDownPaymentAmount: 5000,
  termMonths: 48,
  amortizationMethod: "frances",
  startDate: new Date().toISOString().split("T")[0],
  // gpsFee eliminado de aquí
};