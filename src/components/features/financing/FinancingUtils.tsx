import React from "react";
import type { Database } from "@/types/supabase";

// --- TIPOS (Usando el tipo de Supabase para consistencia) ---
export type InventoryCarRow = Database['public']['Tables']['inventoryoracle']['Row'];

export interface SimulatorValues {
    clientName: string;
    clientId: string;
    clientPhone: string;
    clientAddress: string;
    vehiclePrice: number;
    downPaymentPercentage: number;
    termMonths: number;
    interestRateMonthly: number;
    adminFee: number;
    gpsFee: number;
    insuranceFee: number;
    startDate?: string; 
    selectedVehicle: InventoryCarRow | null;
}

export interface SimulatorResults {
    downPaymentAmount: number;
    vehicleBalance: number;
    totalCapital: number;
    totalInterest: number;
    totalDebt: number;
    monthlyPayment: number;
    schedule: any[];
}

// --- UTILS ---
export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(value);
};

// --- COMPONENTES VISUALES ---

export const InputGroup = ({ label, icon: Icon, children }: { label: string, icon?: any, children: React.ReactNode }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {label}
        </label>
        {children}
    </div>
);

// NUEVO COMPONENTE: Input Numérico Inteligente (Resuelve el problema del "0")
interface SmartNumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    value: number;
    onValueChange: (val: number) => void;
}

export const SmartNumberInput = ({ value, onValueChange, className, ...props }: SmartNumberInputProps) => {
    return (
        <input
            type="number"
            // MAGIA AQUÍ: Si el valor es 0, mostramos cadena vacía.
            // Esto permite que el placeholder se vea y que al escribir no salga "02".
            value={value === 0 ? "" : value}
            onChange={(e) => {
                const val = e.target.value;
                // Si borran todo (""), enviamos 0 al estado para que no rompa los cálculos
                onValueChange(val === "" ? 0 : Number(val));
            }}
            // Evita que el scroll del mouse cambie los números accidentalmente
            onWheel={(e) => e.currentTarget.blur()}
            className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${className}`}
            {...props}
        />
    );
};