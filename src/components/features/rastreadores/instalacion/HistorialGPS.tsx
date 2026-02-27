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
}

export function HistorialGPS({ historialgps, onHistorialUpdate }: HistorialGPSProps) {
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

    if (historialgps.length === 0) return null;

    return (
        <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-4">
                <History size={16} className="text-slate-400" />
                <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">GPS Comprados (Historial)</h4>
                <span className="ml-auto text-[10px] font-bold text-slate-500">{historialgps.length} dispositivo(s)</span>
            </div>

            <div className="space-y-3">
                {historialgps.map((gps) => {
                    const estadoActual = estadosSeleccionados[gps.id] || gps.estado || 'PENDIENTE_INSTALACION';

                    return (
                        <div key={gps.id} className="p-3 bg-gradient-to-r from-slate-50 to-blue-50 border border-blue-100 rounded-lg">
                            <div className="flex items-start justify-between gap-3">
                                {/* Info GPS */}
                                <div className="flex items-start gap-3 flex-1">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Smartphone size={16} className="text-blue-700" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-black text-slate-900 uppercase">
                                            {gps.modelo || 'GPS Sin Modelo'}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-mono mt-1">IMEI: {gps.imei}</div>
                                        <div className="text-[10px] text-slate-400 mt-1 flex gap-2">
                                            <span>Costo: ${gps.costo_compra?.toLocaleString() || '0'}</span>
                                            <span>•</span>
                                            <span>Venta: ${gps.precio_venta?.toLocaleString() || '0'}</span>
                                        </div>

                                        {/* SIM e Instalador */}
                                        <div className="mt-2 pt-2 border-t border-slate-200 flex gap-3 text-[10px] flex-wrap">
                                            {gps.sim_id && gps.gps_sims && (
                                                <span className="badge bg-cyan-50 text-cyan-700 px-2 py-1 rounded font-bold">
                                                    SIM: {gps.gps_sims.numero || gps.gps_sims.iccid}
                                                </span>
                                            )}
                                            {gps.instalador_id && gps.gps_instaladores && (
                                                <span className="badge bg-amber-50 text-amber-700 px-2 py-1 rounded font-bold">
                                                    Inst: {gps.gps_instaladores.nombre} (${gps.costo_instalacion?.toLocaleString() || '0'})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Estado y Acciones */}
                                <div className="text-right flex flex-col gap-2">
                                    <div className="flex gap-1">
                                        <select
                                            value={estadoActual}
                                            onChange={e => setEstadosSeleccionados({ ...estadosSeleccionados, [gps.id]: e.target.value })}
                                            className="text-[10px] font-black px-2 py-1 rounded-md uppercase border bg-slate-50 text-slate-900 outline-none"
                                        >
                                            {ESTADOS_GPS.map(estado => (
                                                <option key={estado.value} value={estado.value}>
                                                    {estado.label}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => handleActualizarEstado(gps.id)}
                                            disabled={guardandoGPSId === gps.id}
                                            className="bg-slate-700 hover:bg-slate-800 text-white px-2 py-1 rounded-md text-[10px] font-black uppercase disabled:opacity-50 transition-all"
                                        >
                                            {guardandoGPSId === gps.id ? <Loader2 className="animate-spin" size={12} /> : 'Guardar'}
                                        </button>
                                    </div>

                                    <div className="text-[9px] text-slate-400">
                                        {gps.created_at ? new Date(gps.created_at).toLocaleDateString() : 'S/F'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
