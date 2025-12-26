import { differenceInDays, parseISO, isValid, format } from 'date-fns';

// Formato de Moneda ($ 1,200.50)
export const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '$ 0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount);
};

// Formato de Fecha para Inputs (YYYY-MM-DD)
export const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return isValid(date) ? date.toISOString().split('T')[0] : '';
};

// Cálculo de Días de Mora
export const calculateDaysOverdue = (fechaVencimiento: string | null, fechaPago: string | null): number => {
    if (!fechaVencimiento) return 0;

    const vencimiento = new Date(fechaVencimiento);
    // Si ya pagó, comparamos contra la fecha de pago. Si no, contra HOY.
    const fin = fechaPago ? new Date(fechaPago) : new Date();

    // Si la fecha de fin es ANTERIOR al vencimiento, no hay mora (negativo o cero)
    const diff = differenceInDays(fin, vencimiento);

    return diff > 0 ? diff : 0;
};

// Cálculo de Valor de Mora
export const calculateMoraValue = (dias: number, tasaDiaria: number): number => {
    return dias * tasaDiaria;
};

// Cálculo de Totales de la Fila
export const calculateRowTotals = (
    capital: number,
    interes: number,
    mora: number,
    abonos: number
) => {
    const totalEsperado = capital + interes + mora;
    const saldoPendiente = totalEsperado - abonos;
    return { totalEsperado, saldoPendiente };
};