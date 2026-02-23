"use client";

import { useState } from "react";
import { Plus, Check, Clock, Calendar, AlertCircle, TrendingUp } from "lucide-react";
import { useGastosFijos } from "@/hooks/taller/useGastosFijos";
import { NuevoGastoModal } from "./NuevoGastoModal";
import { RegistrarPagoGastoModal } from "./RegistrarPagoGastoModal";
import type { Cuenta } from "@/types/taller";

interface GastosManagerProps {
    cuentas: Cuenta[];
    onRecargarFinanzas: () => void;
}

export function GastosManager({ cuentas, onRecargarFinanzas }: GastosManagerProps) {
    const { gastos, resumen, isLoading, crearConfiguracionGasto, registrarPagoGasto, refresh } = useGastosFijos();
    
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [pagoModalData, setPagoModalData] = useState<any>(null);

    const handlePagoSuccess = async (gastoId: string, monto: number, cuentaId: string, fecha: string, obs: string, file: File | null) => {
        await registrarPagoGasto(gastoId, monto, cuentaId, fecha, obs, file);
        onRecargarFinanzas(); 
        refresh(); 
    };

    const handleCreateSuccess = async (data: any) => {
        await crearConfiguracionGasto(data);
    };

    // Nombre del mes actual
    const mesActual = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' });

    if (isLoading) return <div className="h-32 flex items-center justify-center text-slate-400">Cargando obligaciones...</div>;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
            
            {/* Header con Resumen */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h3 className="font-bold text-lg text-slate-800 capitalize">Obligaciones de {mesActual}</h3>
                    <p className="text-slate-500 text-sm">Gestiona tus pagos recurrentes (Luz, Agua, Renta).</p>
                </div>
                
                {/* Mini Dashboard de Progreso */}
                {/* <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                    <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase">Estimado Total</p>
                        <p className="font-bold text-slate-700">${resumen.totalPagar.toLocaleString()}</p>
                    </div>
                    <div className="h-8 w-[1px] bg-slate-200"></div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-emerald-600 uppercase">Pagado</p>
                        <p className="font-bold text-emerald-700">${resumen.totalPagado.toLocaleString()}</p>
                    </div>
                </div> */}

                <button 
                    onClick={() => setIsCreateOpen(true)}
                    className="text-white bg-emerald-800 hover:bg-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                    <Plus className="h-4 w-4" /> Nuevo Servicio
                </button>
            </div>

            {/* Grid de Tarjetas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {gastos.map((gasto) => {
                    // Si hay ultimo_pago_mes, significa que YA se pagó en el mes actual
                    const pagado = !!gasto.ultimo_pago_mes;
                    
                    return (
                        <div key={gasto.id} className={`relative rounded-xl border-2 p-4 transition-all group ${pagado ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-100 bg-white hover:border-blue-200 hover:shadow-md'}`}>
                            
                            {/* Badge de Estado */}
                            <div className="flex justify-between items-start mb-3">
                                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${pagado ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700 animate-pulse'}`}>
                                    {pagado ? <Check className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                                    {pagado ? 'AL DÍA' : 'PENDIENTE'}
                                </div>
                                <div className="text-xs text-slate-400 flex items-center gap-1 font-mono bg-slate-50 px-2 py-1 rounded-md">
                                    <Calendar className="h-3 w-3" /> Día {gasto.dia_limite_pago}
                                </div>
                            </div>

                            <h4 className="font-bold text-slate-800 text-lg mb-0.5 truncate" title={gasto.nombre}>{gasto.nombre}</h4>
                            <p className="text-xs text-slate-400 mb-3">Presupuesto: ${gasto.monto_habitual}</p>

                            <div className="border-t border-slate-100 pt-3">
                                {pagado ? (
                                    <div className="space-y-1">
                                        <p className="text-2xl font-black text-emerald-600">
                                            ${gasto.ultimo_pago_mes!.monto_pagado}
                                        </p>
                                        <p className="text-xs text-emerald-700 font-medium">
                                            Pagado el {new Date(gasto.ultimo_pago_mes!.fecha_pago).toLocaleDateString()}
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex items-end justify-between mb-3">
                                            <p className="text-2xl font-black text-slate-300 group-hover:text-slate-400 transition-colors">
                                                --.--
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => setPagoModalData(gasto)}
                                            className="w-full py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-900/10 transition-all flex justify-center items-center gap-2"
                                        >
                                            <TrendingUp className="h-4 w-4" /> Registrar Pago
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {gastos.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <h4 className="font-bold text-slate-600">Sin Servicios Configurados</h4>
                        <p className="text-slate-400 text-sm mb-4">Agrega tus gastos fijos (Luz, Agua) para controlarlos mensualmente.</p>
                        <button onClick={() => setIsCreateOpen(true)} className="text-blue-600 font-bold text-sm hover:underline">
                            + Crear mi primer servicio
                        </button>
                    </div>
                )}
            </div>

            {/* Modales */}
            <NuevoGastoModal 
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSave={handleCreateSuccess}
            />

            <RegistrarPagoGastoModal 
                isOpen={!!pagoModalData}
                onClose={() => setPagoModalData(null)}
                gasto={pagoModalData}
                cuentas={cuentas}
                onPagar={handlePagoSuccess}
            />
        </div>
    );
}