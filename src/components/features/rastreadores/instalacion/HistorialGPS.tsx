"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, History, Smartphone, Plus, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { rastreadoresService } from "@/services/rastreadores.service";
import { useAuth } from "@/hooks/useAuth";

function esEstadoHistorial(estado?: string) {
    const e = String(estado ?? "").toUpperCase();
    return e === "BAJA" || e === "STOCK";
}

const ESTADOS_GPS = [
    { value: 'VENDIDO', label: 'Pendiente instalación' },
    { value: 'INSTALADO', label: 'Instalado' },
    { value: 'STOCK', label: 'En stock' },
    { value: 'RMA', label: 'RMA' },
    { value: 'BAJA', label: 'Baja' },
] as const;

const MOTIVOS_BAJA = [
    { value: 'RETIRO' as const, label: 'Se retiró el dispositivo' },
    { value: 'CONFUSION' as const, label: 'Confusión de IMEI' },
];

function CompactSelect({
    value,
    placeholder,
    options,
    open,
    disabled,
    onToggle,
    onChange,
}: {
    value: string;
    placeholder?: string;
    options: { value: string; label: string }[];
    open: boolean;
    disabled?: boolean;
    onToggle: () => void;
    onChange: (value: string) => void;
}) {
    const selected = options.find((option) => option.value === value);

    return (
        <div className="relative min-w-0 flex-1">
            <button
                type="button"
                disabled={disabled}
                aria-expanded={open}
                aria-haspopup="listbox"
                onClick={onToggle}
                className={`flex h-10 w-full items-center gap-2 rounded-xl border pl-3 pr-2 text-left text-sm font-medium shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    open
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
            >
                <span className="min-w-0 flex-1 truncate">{selected?.label || placeholder}</span>
                <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-180 text-white/70' : 'text-slate-400'}`}
                />
            </button>
            {open ? (
                <div
                    role="listbox"
                    className="absolute right-0 top-[calc(100%+0.4rem)] z-[90] w-full min-w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
                >
                    {options.map((option) => {
                        const active = option.value === value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => onChange(option.value)}
                                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                                    active ? 'bg-slate-900 font-semibold text-white' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                                {active ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}

interface HistorialGPSProps {
    historialgps: any[];
    onHistorialUpdate: (gps: any) => void;
    /** Si true, se muestra como tarjeta independiente con cabecera (ej. después de ClienteInfo) */
    asCard?: boolean;
    /** Tras Baja por confusión: abrir formulario para el IMEI correcto (no suma venta) */
    onConfusionImei?: () => void;
}

export function HistorialGPS({ historialgps, onHistorialUpdate, asCard = false, onConfusionImei }: HistorialGPSProps) {
    const { profile } = useAuth();
    const isAdmin = profile?.role === "admin";

    const [estadosSeleccionados, setEstadosSeleccionados] = useState<{ [key: string]: string }>({});
    const [guardandoGPSId, setGuardandoGPSId] = useState<string | null>(null);
    const [tabs, setTabs] = useState<{ [key: string]: 'DATOS' | 'EVIDENCIA_RASTREADOR' | 'EVIDENCIA_PAGO' }>({});
    const [uploadingGPSId, setUploadingGPSId] = useState<string | null>(null);
    const [motivosBaja, setMotivosBaja] = useState<{ [key: string]: 'RETIRO' | 'CONFUSION' }>({});
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!openMenu) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) setOpenMenu(null);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpenMenu(null);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [openMenu]);

    const itemKey = (gps: { venta_id?: string; id?: string }) => gps.venta_id || gps.id || '';
    const nHistorial = historialgps.filter((g) => esEstadoHistorial(g.estado)).length;
    const nActivos = historialgps.length - nHistorial;
    const nConfusion = historialgps.filter((g) => esEstadoHistorial(g.estado) && g.motivo_baja === 'CONFUSION').length;
    const nRetiro = nHistorial - nConfusion;
    const etiquetaConteo = [
        nActivos > 0 ? `${nActivos} activo(s)` : null,
        nConfusion > 0 ? `${nConfusion} corrección de IMEI` : null,
        nRetiro > 0 ? `${nRetiro} retirado(s)` : null,
    ].filter(Boolean).join(' · ') || 'Sin dispositivos';

    const persistirEstado = async (
        gps: { id: string; venta_id?: string; estado?: string; precio_venta?: number; precio_total?: number; observacion?: string | null },
        nuevoEstado: string,
        motivoBaja?: 'RETIRO' | 'CONFUSION'
    ) => {
        const key = itemKey(gps);
        setGuardandoGPSId(key);
        try {
            const res = await rastreadoresService.actualizarEstadoGPS(gps.id, nuevoEstado, gps.venta_id, motivoBaja);
            if (res.success) {
                const esConfusion = motivoBaja === 'CONFUSION';
                onHistorialUpdate({
                    ...gps,
                    estado: nuevoEstado,
                    venta_id: gps.venta_id,
                    motivo_baja: motivoBaja ?? null,
                    precio_venta: esConfusion ? 0 : gps.precio_venta,
                    precio_total: esConfusion ? 0 : gps.precio_total,
                });
                if (nuevoEstado === 'BAJA' || nuevoEstado === 'STOCK') {
                    if (esConfusion) {
                        toast.success("IMEI incorrecto quedó en historial sin sumar venta. Ahora registre el IMEI correcto.");
                        onConfusionImei?.();
                    } else {
                        toast.success("Dispositivo retirado. Volvió a stock y esta venta queda como historial.");
                    }
                } else {
                    toast.success("Estado actualizado correctamente");
                }
                return true;
            }
            const mensaje = typeof res.error === 'string' ? res.error : "Error al actualizar estado";
            toast.error(mensaje);
            return false;
        } catch (err) {
            console.error(err);
            toast.error("Error crítico al actualizar");
            return false;
        } finally {
            setGuardandoGPSId(null);
        }
    };

    const persistirMotivoBaja = async (gps: any, motivo: 'RETIRO' | 'CONFUSION') => {
        if (!gps.venta_id) return toast.error("No se puede guardar el motivo: falta ID de venta.");
        const key = itemKey(gps);
        setGuardandoGPSId(key);
        try {
            const res = await rastreadoresService.registrarMotivoBaja(gps.venta_id, motivo);
            if (res.success) {
                onHistorialUpdate({
                    ...gps,
                    motivo_baja: motivo,
                    precio_venta: motivo === 'CONFUSION' ? 0 : gps.precio_venta,
                    precio_total: motivo === 'CONFUSION' ? 0 : gps.precio_total,
                });
                toast.success(motivo === 'CONFUSION'
                    ? "Quedó como confusión de IMEI. El precio ya no suma como otro dispositivo."
                    : "Quedó como retiro del dispositivo.");
            } else {
                toast.error("No se pudo guardar el motivo de baja");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error al guardar el motivo de baja");
        } finally {
            setGuardandoGPSId(null);
        }
    };

    const handleActualizarEstado = async (gps: { id: string; venta_id?: string; estado?: string }) => {
        const key = itemKey(gps);
        const nuevoEstado = estadosSeleccionados[key] || gps.estado;
        if (!nuevoEstado) return toast.error("Seleccione un estado");
        if (nuevoEstado === gps.estado) return toast.error("Seleccione un estado distinto al actual");
        if (nuevoEstado === 'BAJA') {
            const motivo = motivosBaja[key];
            if (!motivo) return toast.error("Indique por qué se da de baja antes de guardar");
            await persistirEstado(gps, 'BAJA', motivo);
            return;
        }
        await persistirEstado(gps, nuevoEstado);
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
                    <span className="text-sm font-bold text-slate-600">{etiquetaConteo}</span>
                </div>
            )}
            <div ref={menuRef} className="space-y-4">
                {historialgps.map((gps) => {
                    const key = itemKey(gps);
                    const estadoGuardado = gps.estado || 'VENDIDO';
                    const estadoActual = estadosSeleccionados[key] || estadoGuardado;
                    const esBajaGuardada = estadoGuardado === 'BAJA';
                    const activeTab = tabs[key] || 'DATOS';

                    const urlsEvidenciaRastreador = gps.url_evidencia_gps ? gps.url_evidencia_gps.split(',').filter(Boolean) : [];
                    const urlsComprobantePago = gps.url_comprobante_pago ? gps.url_comprobante_pago.split(',').filter(Boolean) : [];

                    return (
                        <div key={key} className="p-5 bg-slate-50/80 border-2 border-slate-200 rounded-2xl hover:border-slate-300 transition-colors">
                            {esBajaGuardada && gps.motivo_baja === 'CONFUSION' && (
                                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                    <span className="font-black uppercase text-xs tracking-wider">Confusión de IMEI</span>
                                    <p className="mt-0.5">No es un segundo dispositivo. El IMEI estaba mal escrito; el valor de venta no suma.</p>
                                </div>
                            )}
                            {esBajaGuardada && gps.motivo_baja === 'RETIRO' && (
                                <div className="mb-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                    <span className="font-black uppercase text-xs tracking-wider">Dispositivo retirado</span>
                                    <p className="mt-0.5">Se quitó el aparato. Volvió a stock y esta venta queda como historial.</p>
                                </div>
                            )}
                            {esBajaGuardada && !gps.motivo_baja && (
                                <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 space-y-2">
                                    <p className="text-sm font-bold text-slate-800">¿Por qué se dio de baja este IMEI?</p>
                                    <p className="text-xs text-slate-600">Hay que distinguirlo: si solo se equivocaron el IMEI, no debe contar como otro dispositivo de ${Number(gps.precio_venta || gps.precio_total || 0).toLocaleString('es-EC')}.</p>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            disabled={guardandoGPSId === key}
                                            onClick={() => persistirMotivoBaja(gps, 'CONFUSION')}
                                            className="px-3 py-2 rounded-xl text-xs font-black uppercase bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50"
                                        >
                                            Fue confusión de IMEI
                                        </button>
                                        <button
                                            type="button"
                                            disabled={guardandoGPSId === key}
                                            onClick={() => persistirMotivoBaja(gps, 'RETIRO')}
                                            className="px-3 py-2 rounded-xl text-xs font-black uppercase border-2 border-slate-300 text-slate-800 hover:bg-white disabled:opacity-50"
                                        >
                                            Se retiró el dispositivo
                                        </button>
                                    </div>
                                </div>
                            )}
                            {/* TABS */}
                            <div className="flex gap-2 mb-4 border-b border-slate-200 pb-2 flex-wrap">
                                <button
                                    onClick={() => setTabs(prev => ({ ...prev, [key]: 'DATOS' }))}
                                    className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'DATOS' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-200'}`}
                                >
                                    Datos del Dispositivo
                                </button>
                                <button
                                    onClick={() => setTabs(prev => ({ ...prev, [key]: 'EVIDENCIA_RASTREADOR' }))}
                                    className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'EVIDENCIA_RASTREADOR' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-200'}`}
                                >
                                    Evidencia rastreador ({urlsEvidenciaRastreador.length})
                                </button>
                                <button
                                    onClick={() => setTabs(prev => ({ ...prev, [key]: 'EVIDENCIA_PAGO' }))}
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
                                        {isAdmin && (
                                            <div>
                                                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Costo compra</span>
                                                <span className="block text-base font-semibold text-slate-800">${Number(gps.costo_compra || 0).toLocaleString('es-EC')}</span>
                                            </div>
                                        )}
                                        <div>
                                            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Precio venta</span>
                                            {gps.motivo_baja === 'CONFUSION' ? (
                                                <span className="block text-base font-semibold text-amber-800">$0 · no suma</span>
                                            ) : (
                                                <span className="block text-base font-semibold text-slate-800">${Number(gps.precio_venta || 0).toLocaleString('es-EC')}</span>
                                            )}
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
                                    <div className="flex flex-col gap-2 shrink-0 w-full sm:w-[280px]">
                                        {esBajaGuardada ? (
                                            gps.motivo_baja === 'CONFUSION' ? (
                                                <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                                    Confusión de IMEI. No suma al valor de venta.
                                                </p>
                                            ) : gps.motivo_baja === 'RETIRO' ? (
                                                <p className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                                                    Retirado. Volvió a stock.
                                                </p>
                                            ) : (
                                                <p className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                                                    Falta indicar si fue retiro o confusión de IMEI.
                                                </p>
                                            )
                                        ) : null}
                                        <CompactSelect
                                            value={estadoActual}
                                            options={ESTADOS_GPS.map((estado) => ({ value: estado.value, label: estado.label }))}
                                            open={openMenu === `${key}-estado`}
                                            disabled={esBajaGuardada}
                                            onToggle={() => setOpenMenu((current) => (current === `${key}-estado` ? null : `${key}-estado`))}
                                            onChange={(next) => {
                                                setEstadosSeleccionados({ ...estadosSeleccionados, [key]: next });
                                                setOpenMenu(null);
                                                if (next !== 'BAJA') {
                                                    setMotivosBaja((prev) => {
                                                        const copy = { ...prev };
                                                        delete copy[key];
                                                        return copy;
                                                    });
                                                } else {
                                                    setOpenMenu(`${key}-motivo`);
                                                }
                                            }}
                                        />
                                        {!esBajaGuardada && estadoActual === 'BAJA' ? (
                                            <CompactSelect
                                                value={motivosBaja[key] ?? ''}
                                                placeholder="Motivo de baja"
                                                options={MOTIVOS_BAJA}
                                                open={openMenu === `${key}-motivo`}
                                                onToggle={() => setOpenMenu((current) => (current === `${key}-motivo` ? null : `${key}-motivo`))}
                                                onChange={(next) => {
                                                    setMotivosBaja((prev) => ({ ...prev, [key]: next as 'RETIRO' | 'CONFUSION' }));
                                                    setOpenMenu(null);
                                                }}
                                            />
                                        ) : null}
                                        <button
                                            type="button"
                                            onClick={() => handleActualizarEstado(gps)}
                                            disabled={guardandoGPSId === key || esBajaGuardada || (estadoActual === 'BAJA' && !motivosBaja[key])}
                                            className="h-10 bg-slate-800 hover:bg-slate-900 text-white px-4 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
                                        >
                                            {guardandoGPSId === key ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Guardar estado'}
                                        </button>
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
                    <span className="ml-auto text-sm font-bold text-slate-500">{etiquetaConteo}</span>
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
