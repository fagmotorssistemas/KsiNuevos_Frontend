import React, { useState } from "react";
import { ChevronUp, ChevronDown, FileText } from "lucide-react";
import { formatCurrency, SimulatorValues, SimulatorResults } from "./FinancingUtils";
import { ExecutiveSignature } from "./ExecutiveSignature";

interface CreditProformaProps {
    values: SimulatorValues;
    results: SimulatorResults;
    includeTableInPdf: boolean;
}

export function CreditProforma({ values, results, includeTableInPdf }: CreditProformaProps) {
    const [showTable, setShowTable] = useState(false);
    const printTableClass = includeTableInPdf ? "print:block" : "print:hidden";

    return (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl print:shadow-none print:border-none print:p-0">
            {/* Logo y Cabecera */}
            <div className="flex items-center gap-8 mb-6">
                <img src="/logol.png" alt="Logo Ksi" className="object-contain w-[180px] h-[35px]" />
            </div>

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

            {/* CAJAS DUALES (Side-by-side) */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                {/* Datos del Solicitante */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 print:bg-transparent print:border-slate-200">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Datos del Solicitante</h3>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                        <div className="col-span-2">
                            <span className="text-[9px] text-slate-500 block uppercase font-semibold">Cliente</span>
                            <span className="text-xs font-bold text-slate-900 block truncate">{values.clientName || "---"}</span>
                        </div>
                        <div>
                            <span className="text-[9px] text-slate-500 block uppercase font-semibold">Cédula / RUC</span>
                            <span className="text-xs font-bold text-slate-900 block">{values.clientId || "---"}</span>
                        </div>
                        <div>
                            <span className="text-[9px] text-slate-500 block uppercase font-semibold">Teléfono</span>
                            <span className="text-xs font-bold text-slate-900 block">{values.clientPhone || "---"}</span>
                        </div>
                        <div>
                            <span className="text-[9px] text-slate-500 block uppercase font-semibold">Dirección</span>
                            <span className="text-xs font-bold text-slate-900 block">{values.clientAddress || "---"}</span>
                        </div>
                    </div>
                </div>

                {/* Datos del Vehículo */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 print:bg-transparent print:border-slate-200">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Vehículo de Interés</h3>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                        <div className="col-span-2">
                            <span className="text-[9px] text-slate-500 block uppercase font-semibold">Marca y Modelo</span>
                            <span className="text-xs font-bold text-slate-900 block truncate">
                                {values.selectedVehicle
                                    ? `${values.selectedVehicle.brand} ${values.selectedVehicle.model}`.toUpperCase()
                                    : "SIN ESPECIFICAR"}
                            </span>
                        </div>
                        <div>
                            <span className="text-[9px] text-slate-500 block uppercase font-semibold">Año</span>
                            <span className="text-xs font-bold text-slate-900 block">
                                {values.selectedVehicle?.year || "---"}
                            </span>
                        </div>
                        <div>
                            <span className="text-[9px] text-slate-500 block uppercase font-semibold">Color</span>
                            <span className="text-xs font-bold text-slate-900 block truncate">
                                {(values.selectedVehicle?.color || "---").toUpperCase()}
                            </span>
                        </div>
                         {values.selectedVehicle?.plate_short && (
                            <div className="print:hidden">
                                <span className="text-[9px] text-slate-500 block uppercase font-semibold">Placa </span>
                                <span className="text-xs font-bold text-slate-900 block truncate">
                                    {values.selectedVehicle.plate_short}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Resumen Principal */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Detalle Financiero</h3>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600 text-sm">Precio Vehículo</span>
                        <span className="font-semibold text-slate-900 text-sm">{formatCurrency(values.vehiclePrice)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600 text-sm">Entrada ({values.downPaymentPercentage.toFixed(0)}%)</span>
                        <span className="font-semibold text-green-600 text-sm">- {formatCurrency(results.downPaymentAmount)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-200">
                        <span className="font-medium text-slate-800 text-sm">Saldo Financiar</span>
                        <span className="font-bold text-slate-900 text-sm">{formatCurrency(results.vehicleBalance)}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Gastos Operativos</h3>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600 text-sm">Gastos Administrativos</span>
                        <span className="font-medium text-slate-900 text-sm">{formatCurrency(values.adminFee)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600 text-sm">Dispositivo Satelital</span>
                        <span className="font-medium text-slate-900 text-sm">{formatCurrency(values.gpsFee)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600 text-sm">Seguro</span>
                        <span className="font-medium text-slate-900 text-sm">{formatCurrency(values.insuranceFee)}</span>
                    </div>
                </div>
            </div>

            {/* TOTALES Y CUOTA */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 mb-8 print:bg-slate-50 print:border-slate-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Capital (Saldo + Gastos)</span>
                            <span className="font-bold text-slate-900">{formatCurrency(results.totalCapital)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-red-600">
                            <span className="font-medium">Interés ({values.interestRateMonthly}% x {values.termMonths} meses)</span>
                            <span className="font-bold">+ {formatCurrency(results.totalInterest)}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex justify-between text-base">
                            <span className="font-bold text-slate-800 uppercase">Total Deuda</span>
                            <span className="font-bold text-slate-900">{formatCurrency(results.totalDebt)}</span>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 text-center print:border-slate-800">
                        <div className="text-sm text-slate-500 font-bold uppercase mb-1">Cuota Mensual Fija</div>
                        <div className="text-4xl font-black text-blue-600 print:text-black">
                            {formatCurrency(results.monthlyPayment)}
                        </div>
                        <div className="text-xs text-slate-400 mt-2 font-medium">
                            Plazo: {values.termMonths} Meses
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabla Amortización */}
            <div className={`mt-8 ${printTableClass}`}>
                <button onClick={() => setShowTable(!showTable)} className="flex items-center gap-2 text-sm font-semibold text-blue-600 mb-4 print:hidden">
                    {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showTable ? "Ocultar Cronograma" : "Ver Cronograma de Pagos"}
                </button>
                <div className={`${showTable ? 'block' : 'hidden'} ${printTableClass}`}>
                    <h3 className="font-bold text-slate-800 mb-3 text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Cronograma de Pagos
                    </h3>
                    <table className="w-full text-[10px] text-left">
                        <thead className="bg-slate-100 uppercase text-slate-500 font-bold">
                            <tr>
                                <th className="px-4 py-2">Cuota #</th>
                                <th className="px-4 py-2">Fecha Estimada</th>
                                <th className="px-4 py-2 text-right">Valor Cuota</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.schedule.map((item: any) => (
                                <tr key={item.cuotaNumber} className="border-b border-slate-50">
                                    <td className="px-4 py-1.5 font-bold text-slate-900">{item.cuotaNumber}</td>
                                    <td className="px-4 py-1.5 text-slate-600 capitalize">{item.date}</td>
                                    <td className="px-4 py-1.5 text-right font-bold text-slate-900">{formatCurrency(item.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <ExecutiveSignature />
            <div className="mt-12 pt-6 border-t border-slate-200 text-[10px] text-slate-400 text-center uppercase tracking-widest font-bold">
                <p>Esta cotización es referencial y aproximada. Precios y tasas sujetos a aprobación crediticia final.</p>
                <p>Generado automáticamente por Sistema de Gestión Concesionaria.</p>
            </div>
        </div>
    );
}