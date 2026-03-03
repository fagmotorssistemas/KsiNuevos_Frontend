"use client";

import { ArrowLeft, Plus, User, UserCheck, FileText } from "lucide-react";
import { ContratoGPS } from "@/types/rastreadores.types";
import { ClienteInfo } from "./ClienteInfo";
import { HistorialGPS } from "./HistorialGPS";
import type { Asesor } from "@/hooks/useAsesores";

interface VistaHistorialClienteProps {
    seleccionado: ContratoGPS;
    historialCliente: any[];
    loadingHistorial: boolean;
    fechaEntrega: string;
    onFechaEntregaChange: (value: string) => void;
    asesorId: string | null;
    onAsesorIdChange: (id: string | null) => void;
    asesores: Asesor[];
    asesoresLoading: boolean;
    onVolver: () => void;
    onNuevoDispositivo: () => void;
    onHistorialUpdate: (gps: any) => void;
}

export function VistaHistorialCliente({
    seleccionado,
    historialCliente,
    loadingHistorial,
    fechaEntrega,
    onFechaEntregaChange,
    asesorId,
    onAsesorIdChange,
    asesores,
    asesoresLoading,
    onVolver,
    onNuevoDispositivo,
    onHistorialUpdate
}: VistaHistorialClienteProps) {
    return (
        <div className="max-w-4xl mx-auto animate-in slide-in-from-right-4 duration-300 pb-10 space-y-6">
            <button
                type="button"
                onClick={onVolver}
                className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
                <ArrowLeft size={18} /> Volver al listado
            </button>

            {/* Título tipo orden de trabajo */}
            <div className="text-center py-4 border-b-2 border-slate-200">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">
                    Orden de trabajo · Vinculación GPS
                </h1>
                <p className="text-base text-slate-600 mt-1 font-medium">
                    Cliente: {seleccionado.cliente}
                </p>
            </div>

            {/* Bloque 1: Datos del cliente y pedido — todo visible, tipografía legible */}
            <ClienteInfo
                isExternal={false}
                seleccionado={seleccionado}
                newClient={{ nombre: '', identificacion: '', telefono: '', email: '', placa: '', marca: '', modelo: '', anio: '', color: '' }}
                onClientChange={() => {}}
                fechaEntrega={fechaEntrega}
                onFechaEntregaChange={onFechaEntregaChange}
                asesorId={asesorId}
                onAsesorIdChange={onAsesorIdChange}
                asesores={asesores}
                asesoresLoading={asesoresLoading}
            />

            {/* Bloque 2: Dispositivos vinculados (historial) */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <FileText size={18} /> Dispositivos vinculados
                    </h2>
                    <button
                        type="button"
                        onClick={onNuevoDispositivo}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold uppercase bg-[#E11D48] text-white hover:bg-rose-700 transition-colors shadow-sm"
                    >
                        <Plus size={18} /> Nuevo dispositivo
                    </button>
                </div>
                <div className="p-6">
                    {loadingHistorial ? (
                        <p className="text-base text-slate-500 py-8 text-center">Cargando historial...</p>
                    ) : historialCliente.length > 0 ? (
                        <HistorialGPS
                            historialgps={historialCliente}
                            onHistorialUpdate={onHistorialUpdate}
                            asCard={false}
                        />
                    ) : (
                        <div className="py-10 text-center">
                            <p className="text-base text-slate-600 font-medium">
                                Sin dispositivos vinculados.
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                                Use &quot;+ Nuevo dispositivo&quot; para agregar uno.
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
