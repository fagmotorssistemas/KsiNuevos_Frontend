import React, { useState } from "react";
import {
    User,
    DollarSign,
    Calendar,
    Settings2,
    Car,
    FileText,
    ChevronDown,
    ChevronUp,
    MapPin,
    Phone,
    CreditCard
} from "lucide-react";

// --- TIPOS (Definidos aquí para que el código sea autónomo) ---
export interface SimulatorValues {
    clientName: string;
    clientId: string;
    clientPhone: string;
    clientAddress: string;
    startDate: string;
    vehiclePrice: number;
    downPaymentPercentage: number;
    termMonths: number;
    interestRateMonthly: number;
    adminFee: number;
    gpsFee: number;
    insuranceFee: number;
}

export interface SimulatorResults {
    downPaymentAmount: number;
    vehicleBalance: number;
    totalCapital: number;
    totalInterest: number;
    totalDebt: number;
    monthlyPayment: number;
    schedule: Array<{
        cuotaNumber: number;
        date: string;
        amount: number;
    }>;
}

// --- UTILS ---
export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(value);
};

// --- SUB-COMPONENTE: INPUT GROUP ---
export const InputGroup = ({ label, icon: Icon, children }: { label: string, icon?: any, children: React.ReactNode }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {label}
        </label>
        {children}
    </div>
);

// --- COMPONENTE 1: FORMULARIO DE CONFIGURACIÓN (Panel Izquierdo) ---
interface CreditFormProps {
    values: SimulatorValues;
    results: SimulatorResults;
    updateField: (field: keyof SimulatorValues, value: any) => void;
    updateDownPaymentByAmount: (amount: number) => void;
}

export function CreditForm({ values, results, updateField, updateDownPaymentByAmount }: CreditFormProps) {
    return (
        <div className="space-y-6 print:hidden">

            {/* Datos del Cliente */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-3">
                    <User className="w-5 h-5 text-blue-500" />
                    <h3>Datos del Cliente</h3>
                </div>

                <InputGroup label="Nombre Completo">
                    <input
                        type="text"
                        value={values.clientName}
                        onChange={(e) => updateField('clientName', e.target.value)}
                        placeholder="Ej: Juan Pérez"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </InputGroup>

                <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Cédula / RUC" icon={CreditCard}>
                        <input
                            type="text"
                            value={values.clientId}
                            onChange={(e) => updateField('clientId', e.target.value)}
                            placeholder="010..."
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </InputGroup>
                    <InputGroup label="Teléfono" icon={Phone}>
                        <input
                            type="text"
                            value={values.clientPhone}
                            onChange={(e) => updateField('clientPhone', e.target.value)}
                            placeholder="099..."
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </InputGroup>
                </div>

                <InputGroup label="Dirección" icon={MapPin}>
                    <input
                        type="text"
                        value={values.clientAddress}
                        onChange={(e) => updateField('clientAddress', e.target.value)}
                        placeholder="Ej: Av. Las Américas..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </InputGroup>

                <InputGroup label="Fecha de Inicio">
                    <input
                        type="date"
                        value={values.startDate}
                        onChange={(e) => updateField('startDate', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </InputGroup>
            </div>

            {/* Vehículo y Condiciones */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-3">
                    <Car className="w-5 h-5 text-blue-500" />
                    <h3>Vehículo y Plazo</h3>
                </div>

                <InputGroup label="Precio del Vehículo ($)" icon={DollarSign}>
                    <input
                        type="number"
                        value={values.vehiclePrice}
                        onChange={(e) => updateField('vehiclePrice', Number(e.target.value))}
                        className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                </InputGroup>

                <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Entrada (%)">
                        <input
                            type="number"
                            value={values.downPaymentPercentage}
                            onChange={(e) => updateField('downPaymentPercentage', Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </InputGroup>
                    <InputGroup label="Entrada ($)">
                        <input
                            type="number"
                            value={Number(results.downPaymentAmount.toFixed(2))}
                            onChange={(e) => updateDownPaymentByAmount(Number(e.target.value))}
                            className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </InputGroup>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Plazo (Meses)" icon={Calendar}>
                        <select
                            value={values.termMonths}
                            onChange={(e) => updateField('termMonths', Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                            {[12, 24, 36, 48, 60].map(m => (
                                <option key={m} value={m}>{m} Meses</option>
                            ))}
                        </select>
                    </InputGroup>
                    <InputGroup label="Tasa Mensual (%)">
                        <input
                            type="number"
                            step="0.1"
                            value={values.interestRateMonthly}
                            onChange={(e) => updateField('interestRateMonthly', Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </InputGroup>
                </div>
            </div>

            {/* Gastos Adicionales */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-3">
                    <Settings2 className="w-5 h-5 text-blue-500" />
                    <h3>Gastos Adicionales</h3>
                </div>

                <InputGroup label="Gasto Administrativo ($)">
                    <input
                        type="number"
                        value={values.adminFee}
                        onChange={(e) => updateField('adminFee', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                </InputGroup>

                <InputGroup label="Dispositivo Satelital / GPS ($)">
                    <input
                        type="number"
                        value={values.gpsFee}
                        onChange={(e) => updateField('gpsFee', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                </InputGroup>

                <InputGroup label="Seguro / Póliza ($)">
                    <input
                        type="number"
                        value={values.insuranceFee}
                        onChange={(e) => updateField('insuranceFee', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                </InputGroup>
            </div>
        </div>
    );
}

// --- COMPONENTE 2: PROFORMA DE IMPRESIÓN (Panel Derecho) ---
interface CreditProformaProps {
    values: SimulatorValues;
    results: SimulatorResults;
    includeTableInPdf: boolean;
}

export function CreditProforma({ values, results, includeTableInPdf }: CreditProformaProps) {
    const [showTable, setShowTable] = useState(false);

    // Clase dinámica para la impresión de la tabla
    const printTableClass = includeTableInPdf
        ? "print:opacity-100 print:max-h-[5000px] print:block"
        : "print:hidden";

    return (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg print:shadow-none print:border-none print:p-0">

            {/* --- SECCIÓN LOGO AGREGADA --- */}
            {/* Se ubica arriba del encabezado. No es link. */}
            <div className="flex items-center gap-8 mb-6 print:mb-8">
                <img
                    src="/logol.png" // CAMBIA ESTO POR: src="/logo.png"
                    alt="Logo de Ksi"
                    className="object-contain w-[200px] h-[30px]"
                />
            </div>

            {/* Encabezado del Documento */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Proforma de Financiamiento</h2>
                    <p className="text-slate-500 text-sm mt-1">Ksi-Nuevos | Financiamiento Directo</p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-slate-500 mb-1">Fecha de Emisión</div>
                    <div className="font-medium text-slate-900">{new Date().toLocaleDateString('es-EC', { dateStyle: 'long' })}</div>
                </div>
            </div>

            {/* Datos del Cliente (Cabecera Detallada) */}
            <div className="bg-slate-50 rounded-lg p-4 mb-8 print:bg-transparent print:border print:border-slate-200">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Datos del Solicitante</h3>
                <div className="grid grid-cols-2 gap-y-2 gap-x-8">
                    <div>
                        <span className="text-xs text-slate-500 block">Cliente</span>
                        <span className="text-sm font-bold text-slate-900">{values.clientName || "---"}</span>
                    </div>
                    <div>
                        <span className="text-xs text-slate-500 block">Cédula / RUC</span>
                        <span className="text-sm font-bold text-slate-900">{values.clientId || "---"}</span>
                    </div>
                    <div>
                        <span className="text-xs text-slate-500 block">Teléfono</span>
                        <span className="text-sm font-medium text-slate-900">{values.clientPhone || "---"}</span>
                    </div>
                    <div>
                        <span className="text-xs text-slate-500 block">Dirección</span>
                        <span className="text-sm font-medium text-slate-900">{values.clientAddress || "---"}</span>
                    </div>
                </div>
            </div>

            {/* Resumen Principal (Grid) */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Detalle del Vehículo</h3>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">Precio Vehículo</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(values.vehiclePrice)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">Entrada ({values.downPaymentPercentage.toFixed(0)}%)</span>
                        <span className="font-semibold text-green-600">- {formatCurrency(results.downPaymentAmount)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-200">
                        <span className="font-medium text-slate-800">Saldo a Financiar</span>
                        <span className="font-bold text-slate-900">{formatCurrency(results.vehicleBalance)}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Gastos Operativos</h3>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">Gastos Administrativo</span>
                        <span className="font-medium text-slate-900">{formatCurrency(values.adminFee)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">Dispositivo Satelital</span>
                        <span className="font-medium text-slate-900">{formatCurrency(values.gpsFee)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">Seguro</span>
                        <span className="font-medium text-slate-900">{formatCurrency(values.insuranceFee)}</span>
                    </div>
                </div>
            </div>

            {/* Cálculo Final y Cuota */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 mb-8 print:bg-slate-50 print:border-slate-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Capital Total (Saldo + Gastos)</span>
                            <span className="font-bold text-slate-900">{formatCurrency(results.totalCapital)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Interés ({values.interestRateMonthly}% x {values.termMonths} meses)</span>
                            <span className="font-medium text-red-600">+ {formatCurrency(results.totalInterest)}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex justify-between text-base">
                            <span className="font-bold text-slate-800">TOTAL DEUDA</span>
                            <span className="font-bold text-slate-900">{formatCurrency(results.totalDebt)}</span>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 text-center print:border-slate-800">
                        <div className="text-sm text-slate-500 font-medium uppercase mb-1">Cuota Mensual Fija</div>
                        <div className="text-4xl font-black text-blue-600 print:text-black">
                            {formatCurrency(results.monthlyPayment)}
                        </div>
                        <div className="text-xs text-slate-400 mt-2 font-medium">
                            Plazo: {values.termMonths} Meses
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabla de Amortización */}
            <div className={`mt-8 ${printTableClass}`}>
                <button
                    onClick={() => setShowTable(!showTable)}
                    className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 mb-4 print:hidden"
                >
                    {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showTable ? "Ocultar Tabla de Amortización" : "Ver Tabla de Amortización Proyectada"}
                </button>

                <div className={`overflow-hidden transition-all duration-300 ${showTable ? 'opacity-100 max-h-[2000px]' : 'opacity-0 max-h-0'} ${printTableClass}`}>
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Cronograma de Pagos
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-100">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Cuota #</th>
                                    <th className="px-4 py-3">Fecha de Pago</th>
                                    <th className="px-4 py-3 text-right rounded-r-lg">Valor a Pagar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.schedule.map((item) => (
                                    <tr key={item.cuotaNumber} className="border-b border-slate-50 hover:bg-slate-50/50">
                                        <td className="px-4 py-2.5 font-medium text-slate-900">{item.cuotaNumber}</td>
                                        <td className="px-4 py-2.5 text-slate-600 capitalize">{item.date}</td>
                                        <td className="px-4 py-2.5 text-right font-mono font-medium text-slate-900">
                                            {formatCurrency(item.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="mt-12 pt-6 border-t border-slate-200 text-xs text-slate-400 text-center leading-relaxed print:mt-8">
                <p>Esta cotización es referencial y aproximada. Precios y tasas sujetos a aprobación crediticia final.</p>
                <p>Generado automáticamente por Sistema de Gestión Concesionaria.</p>
            </div>
        </div>
    );
}
