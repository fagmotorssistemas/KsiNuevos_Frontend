import { AmortizationRow, UnifiedSimulatorState } from "@/types/simulator.types";
// Helper para fechas (lo sacamos para reutilizar o lo dejamos aquí si es exclusivo)
const getEstimatedDate = (monthIndex: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + monthIndex);
  return new Intl.DateTimeFormat('es-EC', { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
};

export const calculateDirectSchedule = (data: UnifiedSimulatorState): AmortizationRow[] => {
  const schedule: AmortizationRow[] = [];
  
  const term = data.termMonths;
  const payment = data.monthlyPayment;
  const totalToPay = payment * term;

  // Capital Real (Validación)
  let principalTotal = data.financedCapital + (data.feesTotal || 0);
  if (!principalTotal || principalTotal <= data.financedCapital) {
       principalTotal = data.financedCapital + (data.feesTotal || 0); 
  }

  // Cálculos fijos
  const totalInterest = totalToPay - principalTotal;
  const fixedInterest = totalInterest / term;
  const fixedCapital = payment - fixedInterest;

  let currentBalance = totalToPay;

  for (let i = 1; i <= term; i++) {
    currentBalance -= payment;
    if (i === term || currentBalance < 0.1) currentBalance = 0;

    schedule.push({
      cuotaNumber: i,
      date: getEstimatedDate(i),
      capital: fixedCapital,
      interest: fixedInterest,
      insurance: 0,
      amount: payment,
      balance: currentBalance,
    });
  }
  return schedule;
};