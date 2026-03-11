"use client";

import { useState } from "react";
import { Loader2, History, Smartphone, Plus } from "lucide-react";
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
    const [tabs, setTabs] = useState<{ [key: string]: 'DATOS' | 'EVIDENCIA_RASTREADOR' | 'EVIDENCIA_PAGO' }>({});
    const [uploadingGPSId, setUploadingGPSId] = useState<string | null>(null);

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

    const handleUploadEvidencias = async (
        gps: any,
        files: FileList | null,
        tipo: 'evidencia_gps' | 'comprobante_pago'
    ) => {
        if (!files || files.length === 0) return;
        if (!gps.venta_id) {
            toast.error("No se puede adjuntar: falta ID de venta.");
            return;
        }

        setUploadingGPSId(gps.id);
        const toastId = toast.loading("Subiendo evidencias...");
        try {
            // Evidencia rastreador → bucket evidencia_rastreador; Forma de pago → bucket evidencia_formadepago_rastreador
            const nuevasUrls = tipo === 'evidencia_gps'
                ? await rastreadoresService.subirEvidencias(Array.from(files))
                : await rastreadoresService.subirEvidenciasRastreadorBucket(Array.from(files));
            if (nuevasUrls.length > 0) {
                const urlsActuales = tipo === 'evidencia_gps' ? gps.url_evidencia_gps : gps.url_comprobante_pago;
                const res = await rastreadoresService.agregarEvidenciasVenta(
                    gps.venta_id,
                    urlsActuales,
                    nuevasUrls,
                    tipo
                );
                if (res.success) {
                    toast.success("Evidencias subidas correctamente", { id: toastId });
                    const data = res.data as { url_evidencia_gps?: string | null; url_comprobante_pago?: string | null };
                    onHistorialUpdate({
                        ...gps,
                        url_evidencia_gps: tipo === 'evidencia_gps' ? (data.url_evidencia_gps ?? gps.url_evidencia_gps) : gps.url_evidencia_gps,
                        url_comprobante_pago: tipo === 'comprobante_pago' ? (data.url_comprobante_pago ?? gps.url_comprobante_pago) : gps.url_comprobante_pago,
                    });
                } else {
                    toast.error(res.error || "Error al guardar en base de datos", { id: toastId });
                }
            } else {
                toast.error("No se pudo subir ninguna evidencia", { id: toastId });
            }
        } catch (err) {
            console.error(err);
            toast.error("Error al subir archivos. Revisa la conexión o el tamaño del archivo.", { id: toastId });
        } finally {
            setUploadingGPSId(null);
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
                    const activeTab = tabs[gps.id] || 'DATOS';

                    const urlsEvidenciaRastreador = gps.url_evidencia_gps ? gps.url_evidencia_gps.split(',').filter(Boolean) : [];
                    const urlsComprobantePago = gps.url_comprobante_pago ? gps.url_comprobante_pago.split(',').filter(Boolean) : [];

                    return (
                        <div key={gps.id} className="p-5 bg-slate-50/80 border-2 border-slate-200 rounded-2xl hover:border-slate-300 transition-colors">
                            {/* TABS */}
                            <div className="flex gap-2 mb-4 border-b border-slate-200 pb-2 flex-wrap">
                                <button
                                    onClick={() => setTabs(prev => ({ ...prev, [gps.id]: 'DATOS' }))}
                                    className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'DATOS' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-200'}`}
                                >
                                    Datos del Dispositivo
                                </button>
                                <button
                                    onClick={() => setTabs(prev => ({ ...prev, [gps.id]: 'EVIDENCIA_RASTREADOR' }))}
                                    className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'EVIDENCIA_RASTREADOR' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-200'}`}
                                >
                                    Evidencia rastreador ({urlsEvidenciaRastreador.length})
                                </button>
                                <button
                                    onClick={() => setTabs(prev => ({ ...prev, [gps.id]: 'EVIDENCIA_PAGO' }))}
                                    className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'EVIDENCIA_PAGO' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-200'}`}
                                >
                                    Forma de pago ({urlsComprobantePago.length})
                                </button>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div className="flex gap-4 flex-1 min-w-0">
                                    {activeTab === 'DATOS' && (
                                        <div className="p-3 bg-white rounded-xl border border-slate-200 shrink-0 self-start">
                                            <Smartphone size={22} className="text-slate-600" />
                                        </div>
                                    )}
                                    
                                    {/* CONTENIDO TAB DATOS */}
                                    {activeTab === 'DATOS' && (
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
                                        {gps.gps_sims && (
                                            <>
                                                <div>
                                                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">ICCID</span>
                                                    <span className="block text-sm font-mono font-semibold text-slate-800">{gps.gps_sims.iccid ?? '—'}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">IMSI</span>
                                                    <span className="block text-sm font-mono font-semibold text-slate-800">{gps.gps_sims.imsi ?? '—'}</span>
                                                </div>
                                            </>
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
                                    )}

                                    {/* CONTENIDO TAB EVIDENCIA RASTREADOR (colocar rastreador) */}
                                    {activeTab === 'EVIDENCIA_RASTREADOR' && (
                                        <div className="flex-1 min-w-0 flex flex-col gap-4">
                                            <p className="text-xs text-slate-500 mb-1">Fotos o PDF de la instalación del rastreador.</p>
                                            <div className="flex gap-3 flex-wrap">
                                                {urlsEvidenciaRastreador.map((url: string, idx: number) => {
                                                    const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)/i);
                                                    return (
                                                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-xl border border-slate-200 w-24 h-24 sm:w-32 sm:h-32 hover:border-slate-400 transition-colors bg-white shadow-sm">
                                                            {isImage ? (
                                                                <img src={url} alt={`Evidencia rastreador ${idx + 1}`} className="object-cover w-full h-full" />
                                                            ) : (
                                                                <div className="flex items-center justify-center w-full h-full bg-slate-50 text-slate-400 group-hover:text-blue-500 transition-colors">
                                                                    <span className="text-xs font-bold uppercase">Ver PDF</span>
                                                                </div>
                                                            )}
                                                        </a>
                                                    );
                                                })}
                                                <label className="relative flex flex-col items-center justify-center w-24 h-24 sm:w-32 sm:h-32 border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer bg-slate-50 group">
                                                    {uploadingGPSId === gps.id ? (
                                                        <Loader2 className="animate-spin text-emerald-500 mb-2" size={24} />
                                                    ) : (
                                                        <Plus className="text-slate-400 group-hover:text-emerald-500 mb-2" size={24} />
                                                    )}
                                                    <span className="text-[10px] font-bold text-slate-500 group-hover:text-emerald-600 uppercase text-center px-2">
                                                        {uploadingGPSId === gps.id ? 'Subiendo...' : 'Adjuntar evidencias'}
                                                    </span>
                                                    <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => { handleUploadEvidencias(gps, e.target.files, 'evidencia_gps'); e.target.value = ''; }} disabled={uploadingGPSId === gps.id} />
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* CONTENIDO TAB FORMA DE PAGO (comprobante) */}
                                    {activeTab === 'EVIDENCIA_PAGO' && (
                                        <div className="flex-1 min-w-0 flex flex-col gap-4">
                                            <p className="text-xs text-slate-500 mb-1">Comprobante de pago (transferencia, depósito, cheque).</p>
                                            <div className="flex gap-3 flex-wrap">
                                                {urlsComprobantePago.map((url: string, idx: number) => {
                                                    const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)/i);
                                                    return (
                                                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-xl border border-slate-200 w-24 h-24 sm:w-32 sm:h-32 hover:border-slate-400 transition-colors bg-white shadow-sm">
                                                            {isImage ? (
                                                                <img src={url} alt={`Comprobante ${idx + 1}`} className="object-cover w-full h-full" />
                                                            ) : (
                                                                <div className="flex items-center justify-center w-full h-full bg-slate-50 text-slate-400 group-hover:text-blue-500 transition-colors">
                                                                    <span className="text-xs font-bold uppercase">Ver PDF</span>
                                                                </div>
                                                            )}
                                                        </a>
                                                    );
                                                })}
                                                <label className="relative flex flex-col items-center justify-center w-24 h-24 sm:w-32 sm:h-32 border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer bg-slate-50 group">
                                                    {uploadingGPSId === gps.id ? (
                                                        <Loader2 className="animate-spin text-emerald-500 mb-2" size={24} />
                                                    ) : (
                                                        <Plus className="text-slate-400 group-hover:text-emerald-500 mb-2" size={24} />
                                                    )}
                                                    <span className="text-[10px] font-bold text-slate-500 group-hover:text-emerald-600 uppercase text-center px-2">
                                                        {uploadingGPSId === gps.id ? 'Subiendo...' : 'Adjuntar comprobante'}
                                                    </span>
                                                    <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => { handleUploadEvidencias(gps, e.target.files, 'comprobante_pago'); e.target.value = ''; }} disabled={uploadingGPSId === gps.id} />
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                </div>
                                {activeTab === 'DATOS' && (
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
                                )}
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
