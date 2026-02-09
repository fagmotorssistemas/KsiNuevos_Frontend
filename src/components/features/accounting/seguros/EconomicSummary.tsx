import { BadgeDollarSign } from "lucide-react";
import { ContratoDetalle } from "@/types/contratos.types";

interface EconomicSummaryProps {
    contrato: ContratoDetalle;
}

export function EconomicSummary({ contrato }: EconomicSummaryProps) {
    return (
        <div className="flex flex-col h-full space-y-8">
            {/* Título de Sección con acento de marca */}
            <div className="flex items-center gap-3 text-[#E11D48]">
                <BadgeDollarSign size={18} strokeWidth={2.5} />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Resumen Económico</h3>
            </div>
            
            <div className="flex-1 space-y-10">
                {/* PRECIO BASE: Diseño minimalista con borde lateral */}
                <div className="relative pl-6 border-l-2 border-slate-100">
                    <div className="flex justify-between items-baseline mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Precio de Venta
                        </span>
                        <span className="text-xl font-mono font-black text-slate-900">
                            ${contrato.precioVehiculo?.toLocaleString()}
                        </span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase leading-tight italic">
                        SON: {contrato.precioVehiculoLetras}
                    </p>
                </div>

                {/* GASTOS ADICIONALES: Grid equilibrado sin fondos pesados */}
                <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-1.5">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                            Gastos Adm.
                        </p>
                        <p className="text-sm font-mono font-bold text-slate-900 border-b border-slate-50 pb-2">
                            ${contrato.gastosAdministrativos?.toLocaleString()}
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                            Otros Gastos
                        </p>
                        <p className="text-sm font-mono font-bold text-slate-900 border-b border-slate-50 pb-2">
                            ${contrato.precioGastos?.toLocaleString() || '0'}
                        </p>
                    </div>
                </div>

                {/* TOTAL FINAL: Integrado en la base para evitar solapamientos */}
                <div className="pt-8 mt-auto border-t border-slate-100">
                    <div className="flex justify-between items-end">
                        <div className="space-y-2">
                            <span className="text-[10px] font-black text-[#E11D48] uppercase tracking-[0.2em] block">
                                Total Final de Venta
                            </span>
                            <p className="text-[9px] text-slate-400 font-bold uppercase max-w-[280px] leading-relaxed">
                                {contrato.totalLetras}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-4xl font-mono font-black text-slate-900 tracking-tighter">
                                {contrato.totalFinal}
                            </span>
                        </div>
                    </div>

                    {/* Detalle de Pagaré / Cronograma */}
                    <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                            Valor Pagaré
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-900 uppercase">
                            Según Cronograma
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}