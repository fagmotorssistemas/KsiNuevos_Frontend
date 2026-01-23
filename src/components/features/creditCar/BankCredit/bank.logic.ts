import { AmortizationRow, UnifiedSimulatorState } from "@/types/simulator.types";

// ==========================================
// 📅 UTILIDAD DE FECHAS
// ==========================================
const getEstimatedDate = (monthIndex: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthIndex);
    return new Intl.DateTimeFormat('es-EC', { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
};

// ==========================================
// 🧮 FÓRMULA BANCARIA (Solo para Francés)
// ==========================================
const calculatePMT = (rate: number, nper: number, pv: number): number => {
    if (rate === 0) return pv / nper;
    return (pv * rate) / (1 - Math.pow(1 + rate, -nper));
};

export const calculateBankSchedule = (data: UnifiedSimulatorState, system: 'french' | 'german' = 'french'): AmortizationRow[] => {
    const schedule: AmortizationRow[] = [];
    
    // 1. Saldo Inicial
    let balance = data.financedCapital + (data.feesTotal || 0);
    if (!balance || balance <= 0) balance = data.financedCapital;

    const term = data.termMonths;
    const monthlyRate = (data.rate || 15.60) / 100 / 12;

    // === PRE-CÁLCULOS ===
    
    // A) Para FRANCÉS: La CUOTA es fija.
    const frenchFixedQuota = calculatePMT(monthlyRate, term, balance);

    // B) Para ALEMÁN: El CAPITAL es fijo.
    const germanFixedCapital = balance / term;

    for (let i = 1; i <= term; i++) {
        const interest = balance * monthlyRate;
        
        let capital = 0;
        let amount = 0;

        if (system === 'french') {
            // --- SISTEMA FRANCÉS ---
            // Cuota Fija, Capital Variable (sube)
            amount = frenchFixedQuota;
            capital = amount - interest;
        } else {
            // --- SISTEMA ALEMÁN ---
            // Capital Fijo, Cuota Variable (baja)
            capital = germanFixedCapital;
            amount = capital + interest; // <--- ESTO HACE QUE LA CUOTA BAJE CADA MES
        }

        // --- AJUSTE ULTIMA CUOTA (Para cuadrar centavos) ---
        if (i === term) {
            if (system === 'french') {
                // En francés ajustamos el pago final
                amount = balance + interest;
                capital = balance;
            } else {
                // En alemán el capital es el saldo restante
                capital = balance;
                amount = capital + interest;
            }
        }

        // Reducción de saldo
        balance -= capital;
        if (balance < 0) balance = 0;

        schedule.push({
            cuotaNumber: i,
            date: getEstimatedDate(i),
            capital: capital,   // Alemán: Fijo / Francés: Sube
            interest: interest, // Siempre baja
            insurance: 0,
            amount: amount,     // Alemán: Baja / Francés: Fijo
            balance: balance,
        });
    }

    return schedule;
};