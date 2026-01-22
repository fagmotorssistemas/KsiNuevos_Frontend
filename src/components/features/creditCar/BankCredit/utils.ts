import { SimulatorValues, SimulatorResults } from "@/types/bank.types";
import { BANK_OPTIONS } from "./constants";

export function calculateCredit(values: SimulatorValues): SimulatorResults {
  // Obtenemos la configuración del banco seleccionado (aquí está el gpsPrice)
  const bank = BANK_OPTIONS[values.selectedBank];
  console.log("Banco seleccionado:", values.selectedBank);
  console.log("Datos del banco:", BANK_OPTIONS[values.selectedBank]);

  // 1. Cálculos Base
  let downPayment = values.downPaymentMode === "amount"
    ? Math.max(0, Math.min(values.customDownPaymentAmount, values.vehiclePrice))
    : values.vehiclePrice * (Math.max(0, Math.min(values.downPaymentPercentage, 90)) / 100);

  const vehicleBalance = values.vehiclePrice - downPayment;
  const legalFees = bank.legalFee;
  const amountToFinance = vehicleBalance + legalFees; // Financiamos legales

  // 2. Tasas y Rubros Mensuales
  const r = (bank.rate / 100) / 12;
  const n = values.termMonths;
  const monthlyCarInsurance = (values.vehiclePrice * (bank.insuranceRate / 100)) / 12;
  const monthlyDesgravamen = (amountToFinance * (bank.desgravamenRate / 100)) / 12;
  
  // 🔥 CORRECCIÓN: Leemos el GPS desde el banco, no desde 'values'
  // Si es JEP, esto será 0. Si es Austro, será 20 (según tu constants.ts)
  const monthlyGps = bank.gpsPrice; 

  let schedule = [];
  let totalInterest = 0;
  let firstMonthlyPayment = 0;
  let balance = amountToFinance;

  // 3. Generación de Tabla
  if (n > 0 && amountToFinance > 0) {
    // Cálculo Francés (Cuota Fija Capital+Interés)
    const pow = Math.pow(1 + r, n);
    const pureQuotaFrances = (amountToFinance * r * pow) / (pow - 1);
    
    // Cálculo Alemán (Capital Fijo)
    const capitalFixedAleman = amountToFinance / n;

    for (let i = 1; i <= n; i++) {
      let interestPart = balance * r;
      let capitalPart = 0;
      let fullQuota = 0;

      if (values.amortizationMethod === "frances") {
        capitalPart = pureQuotaFrances - interestPart;
        // 🔥 Usamos monthlyGps aquí
        fullQuota = pureQuotaFrances + monthlyCarInsurance + monthlyDesgravamen + monthlyGps;
      } else {
        capitalPart = capitalFixedAleman;
        // 🔥 Y aquí
        fullQuota = capitalFixedAleman + interestPart + monthlyCarInsurance + monthlyDesgravamen + monthlyGps;
      }

      if (i === 1) firstMonthlyPayment = fullQuota;

      balance -= capitalPart;
      totalInterest += interestPart;

      const date = new Date(values.startDate);
      date.setMonth(date.getMonth() + i);

      schedule.push({
        cuotaNumber: i,
        date: date.toLocaleDateString("es-EC"),
        amount: fullQuota,
        capital: capitalPart,
        interest: interestPart,
        insurance: monthlyCarInsurance,
        desgravamen: monthlyDesgravamen,
        gps: monthlyGps, // 🔥 Guardamos el valor correcto en la tabla
        balance: Math.max(0, balance),
      });
    }
  }

  return {
    bankName: bank.name,
    interestRate: bank.rate,
    downPaymentAmount: downPayment,
    vehicleBalance,
    legalFees,
    amountToFinance,
    totalInterest,
    // 🔥 Calculamos totales usando monthlyGps
    totalGps: monthlyGps * n, 
    totalInsurance: monthlyCarInsurance * n,
    totalDesgravamen: monthlyDesgravamen * n,
    // 🔥 Sumamos al total de la deuda
    totalDebt: amountToFinance + totalInterest + (monthlyGps * n) + (monthlyCarInsurance * n) + (monthlyDesgravamen * n),
    firstMonthlyPayment,
    schedule,
  };
}