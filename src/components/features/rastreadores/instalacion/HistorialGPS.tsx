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
                <div className="flex items-center gap-2 mb-5">
                    <History size={18} className="text-slate-500" />
                    <span className="text-sm font-bold text-slate-600">{historialgps.length} dispositivo(s)</span>
                </div>
            )}
            <div className="space-y-4">
                {historialgps.map((gps) => {
                    const estadoActual = estadosSeleccionados[gps.id] || gps.estado || 'PENDIENTE_INSTALACION';

                    return (
                        <div key={gps.id} className="p-5 bg-slate-50/80 border-2 border-slate-200 rounded-2xl hover:border-slate-300 transition-colors">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div className="flex gap-4 flex-1 min-w-0">
                                    <div className="p-3 bg-white rounded-xl border border-slate-200 shrink-0 self-start">
                                        <Smartphone size={22} className="text-slate-600" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 flex-1 min-w-0">
                                        <div>
                                            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">IMEI</span>
                                            <span className="block text-base font-bold text-slate-900 font-mono">{gps.imei}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Modelo dispositivo</span>
                                            <span className="block text-base font-bold text-slate-900">{gps.modelo || '—'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Proveedor</span>
                                            <span className="block text-base font-semibold text-slate-800">{gps.proveedor?.nombre ?? '—'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Costo compra</span>
                                            <span className="block text-base font-semibold text-slate-800">${Number(gps.costo_compra || 0).toLocaleString('es-EC')}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Precio venta</span>
                                            <span className="block text-base font-semibold text-slate-800">${Number(gps.precio_venta || 0).toLocaleString('es-EC')}</span>
                                        </div>
                                        {gps.sim_id && gps.gps_sims && (
                                            <div className="sm:col-span-2">
                                                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Chip / SIM</span>
                                                <span className="block text-sm font-semibold text-slate-700">{gps.gps_sims.numero || gps.gps_sims.iccid}</span>
                                            </div>
                                        )}
                                        {gps.instalador_id && gps.gps_instaladores && (
                                            <div className="sm:col-span-2">
                                                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Instalador</span>
                                                <span className="block text-sm font-semibold text-slate-700">{gps.gps_instaladores.nombre} · ${Number(gps.costo_instalacion || 0).toLocaleString('es-EC')}</span>
                                            </div>
                                        )}
                                        <div>
                                            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Registro</span>
                                            <span className="block text-sm font-medium text-slate-600">
                                                {gps.created_at ? new Date(gps.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                            </span>
                                        </div>
                                        {(gps.observacion != null && gps.observacion !== '') && (
                                            <div className="sm:col-span-2">
                                                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Observación</span>
                                                <span className="block text-sm font-medium text-slate-700">{gps.observacion}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 shrink-0 sm:items-end">
                                    <div className="flex gap-2 flex-wrap">
                                        <select
                                            value={estadoActual}
                                            onChange={e => setEstadosSeleccionados({ ...estadosSeleccionados, [gps.id]: e.target.value })}
                                            className="text-sm font-bold px-3 py-2 rounded-xl border-2 border-slate-200 bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
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
                                            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold uppercase disabled:opacity-50 transition-all"
                                        >
                                            {guardandoGPSId === gps.id ? <Loader2 className="animate-spin" size={16} /> : 'Guardar estado'}
                                        </button>
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
                    <History size={18} className="text-slate-500" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Historial del cliente</h3>
                    <span className="ml-auto text-sm font-bold text-slate-500">{historialgps.length} dispositivo(s)</span>
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
