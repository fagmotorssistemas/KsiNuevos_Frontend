"use client";

import { useState } from "react";
import { Loader2, History, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { rastreadoresService } from "@/services/rastreadores.service";

const ESTADOS_GPS = [
    { value: 'PENDIENTE_INSTALACION', label: 'Pendiente Instalación' },
    { value: 'INSTALADO', label: 'Instalado' },
    { value: 'ACTIVO', label: 'Activo' },
    { value: 'SUSPENDIDO', label: 'Suspendido' },
    { value: 'RETIRADO', label: 'Retirado' }
] as const;

interface HistorialGPSProps {
    historialgps: any[];
    onHistorialUpdate: (gps: any) => void;
    /** Si true, se muestra como tarjeta independiente con cabecera (ej. después de ClienteInfo) */
    asCard?: boolean;
}

export function HistorialGPS({ historialgps, onHistorialUpdate, asCard = false }: HistorialGPSProps) {
    const [estadosSeleccionados, setEstadosSeleccionados] = useState<{ [key: string]: string }>({});
    const [guardandoGPSId, setGuardandoGPSId] = useState<string | null>(null);

    const handleActualizarEstado = async (gpsId: string) => {
        const nuevoEstado = estadosSeleccionados[gpsId];
        if (!nuevoEstado) return toast.error("Seleccione un estado");

        setGuardandoGPSId(gpsId);
        try {
            const res = await rastreadoresService.actualizarEstadoGPS(gpsId, nuevoEstado);
            if (res.success) {
                onHistorialUpdate({ ...res.data, estado: nuevoEstado });
                toast.success("Estado actualizado correctamente");
            } else {
                toast.error("Error al actualizar estado");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error crítico al actualizar");
        } finally {
            setGuardandoGPSId(null);
        }
    };

    const content = (
        <>
            {!asCard && (
                <div className="flex items-center gap-2 mb-4">
                    <History size={16} className="text-slate-400" />
                    <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">GPS Comprados (Historial)</h4>
                    <span className="ml-auto text-[10px] font-bold text-slate-500">{historialgps.length} dispositivo(s)</span>
                </div>
            )}
            <div className="space-y-3">
                {historialgps.map((gps) => {
                    const estadoActual = estadosSeleccionados[gps.id] || gps.estado || 'PENDIENTE_INSTALACION';

                    return (
                        <div key={gps.id} className="p-3 bg-gradient-to-r from-slate-50 to-blue-50/80 border border-slate-100 rounded-xl hover:border-blue-100 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1">
                                    <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                                        <Smartphone size={16} className="text-blue-700" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-black text-slate-900 uppercase">
                                            {gps.modelo || 'GPS Sin Modelo'}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">IMEI: {gps.imei}</div>
                                        <div className="text-[10px] text-slate-400 mt-1 flex gap-2 flex-wrap">
                                            <span>Costo: ${Number(gps.costo_compra || 0).toLocaleString('es-EC')}</span>
                                            <span>•</span>
                                            <span>Venta: ${Number(gps.precio_venta || 0).toLocaleString('es-EC')}</span>
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-slate-200/80 flex gap-2 text-[10px] flex-wrap">
                                            {gps.sim_id && gps.gps_sims && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 font-semibold">
                                                    SIM: {gps.gps_sims.numero || gps.gps_sims.iccid}
                                                </span>
                                            )}
                                            {gps.instalador_id && gps.gps_instaladores && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold">
                                                    Inst: {gps.gps_instaladores.nombre} (${Number(gps.costo_instalacion || 0).toLocaleString('es-EC')})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col gap-2 shrink-0">
                                    <div className="flex gap-1.5">
                                        <select
                                            value={estadoActual}
                                            onChange={e => setEstadosSeleccionados({ ...estadosSeleccionados, [gps.id]: e.target.value })}
                                            className="text-[10px] font-black px-2 py-1.5 rounded-lg uppercase border border-slate-200 bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-400"
                                        >
                                            {ESTADOS_GPS.map(estado => (
                                                <option key={estado.value} value={estado.value}>
                                                    {estado.label}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => handleActualizarEstado(gps.id)}
                                            disabled={guardandoGPSId === gps.id}
                                            className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase disabled:opacity-50 transition-all"
                                        >
                                            {guardandoGPSId === gps.id ? <Loader2 className="animate-spin" size={12} /> : 'Guardar'}
                                        </button>
                                    </div>
                                    <div className="text-[9px] text-slate-400">
                                        {gps.created_at ? new Date(gps.created_at).toLocaleDateString('es-EC') : 'S/F'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );

    if (historialgps.length === 0) return null;

    if (asCard) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2 border-l-4 border-l-blue-500">
                    <History size={16} className="text-slate-500" />
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Historial del cliente</h3>
                    <span className="ml-auto text-[10px] font-bold text-slate-500">{historialgps.length} dispositivo(s)</span>
                </div>
                <div className="p-6">
                    {content}
                </div>
            </div>
        );
    }

    return (
        <div className="mt-6 pt-6 border-t border-slate-200">
            {content}
        </div>
    );
}
