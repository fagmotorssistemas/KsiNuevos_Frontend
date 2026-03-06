"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { 
    ShieldCheck, Loader2, Save, ArrowLeft, 
    Paperclip, FileText, Image as ImageIcon, Trash2, Plus, RefreshCw
} from "lucide-react";

import { segurosService, SeguroPayload } from "@/services/seguros.service";
import { aseguradorasService } from "@/services/aseguradoras.service";
import { SeguroVehicular } from "@/types/seguros.types";
import type { Aseguradora } from "@/types/aseguradoras.types";
import { useInstallationStatus } from "@/hooks/useInstallationStatus";
import { useSegurosCartera } from "@/hooks/useSegurosCartera";
import { formatDinero } from "@/utils/format";
import { SegurosSidebar } from "@/components/layout/seguros-sidebar";
import { SegurosCarteraTable } from "@/components/features/seguros/SegurosCarteraTable";

// Listas estáticas para el formulario (aseguradoras se cargan desde Supabase)
const BROKERS = ["TECNISEGUROS", "AON", "NOVA", "ASESORES DE SEGUROS", "DIRECTO"];
const PLANES = ["TODO RIESGO (1 AÑO)", "TODO RIESGO (2 AÑO)", "PÉRDIDA TOTAL"];

function SegurosPageContent() {
    const searchParams = useSearchParams();
    const [vista, setVista] = useState<'LISTA' | 'FORMULARIO'>('LISTA');
    const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'CREDITO' | 'CONTADO'>('TODOS');
    const {
        seguros,
        loading: loadingData,
        enrichedData,
        cargar: cargarSeguros,
        creditos,
        contados,
        conAlertaRenovacion,
    } = useSegurosCartera();

    const [seleccionado, setSeleccionado] = useState<{
        notaId: string;
        ruc: string;
        cliente: string;
        fecha: string;
        precio: number;
    } | null>(null);

    const [aseguradorasList, setAseguradorasList] = useState<Aseguradora[]>([]);

    const totalCantidad = seguros.length;
    const totalRecaudado = seguros.reduce((acc, item) => acc + item.valores.total, 0);

    // Cargar aseguradoras desde Supabase para el selector del formulario
    useEffect(() => {
        aseguradorasService.listarActivas().then(setAseguradorasList).catch(() => setAseguradorasList([]));
    }, []);

    // Abrir formulario si se llegó con ?nota=XXX (ej. desde Cartera de Clientes)
    useEffect(() => {
        const nota = searchParams.get("nota");
        if (!nota || loadingData || seguros.length === 0) return;
        const item = seguros.find((s) => s.referencia === nota);
        if (item) {
            setSeleccionado({
                notaId: item.referencia,
                ruc: item.cliente.identificacion,
                cliente: item.cliente.nombre,
                fecha: item.fechaEmision,
                precio: item.valores.seguro,
            });
            setVista("FORMULARIO");
        }
    }, [searchParams, loadingData, seguros]);

    const handleGestionar = (item: SeguroVehicular) => {
        setSeleccionado({
            notaId: item.referencia,
            ruc: item.cliente.identificacion,
            cliente: item.cliente.nombre,
            fecha: item.fechaEmision,
            precio: item.valores.seguro
        });
        setVista('FORMULARIO');
    };

    // ==========================================
    // LÓGICA DE FORMULARIO (GESTIÓN)
    // ==========================================
    const [formLoading, setFormLoading] = useState(false);
    const [existingId, setExistingId] = useState<number | null>(null); // ID de Supabase si ya existe
    const [form, setForm] = useState({
        broker: '',
        aseguradora: '',
        tipoSeguro: '',
        costo: 0
    });
    
    // Archivos
    const [archivosNuevos, setArchivosNuevos] = useState<File[]>([]);
    const [evidenciasGuardadas, setEvidenciasGuardadas] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Hook de días (Visual)
    const statusInstalacion = useInstallationStatus(seleccionado?.fecha);

    // Efecto al abrir formulario: Verificar si ya existe en Supabase
    useEffect(() => {
        if (vista === 'FORMULARIO' && seleccionado) {
            // Resetear form
            setForm({ broker: '', aseguradora: '', tipoSeguro: '', costo: 0 });
            setArchivosNuevos([]);
            setEvidenciasGuardadas([]);
            setExistingId(null);

            const verificarExistencia = async () => {
                setFormLoading(true);
                try {
                    const existente = await segurosService.obtenerPolizaRegistrada(seleccionado.notaId);
                    if (existente) {
                        setExistingId(existente.id);
                        setForm({
                            broker: existente.broker,
                            aseguradora: existente.aseguradora,
                            tipoSeguro: existente.tipo_seguro,
                            costo: existente.costo_seguro
                        });
                        setEvidenciasGuardadas(existente.evidencias || []);
                    }
                } catch (error) {
                    console.error("Error verificando póliza", error);
                } finally {
                    setFormLoading(false);
                }
            };
            verificarExistencia();
        }
    }, [vista, seleccionado]);

    // Handlers de Archivos
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            setArchivosNuevos(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };
    const removeNewFile = (idx: number) => setArchivosNuevos(prev => prev.filter((_, i) => i !== idx));
    const removeSavedEvidence = (idx: number) => setEvidenciasGuardadas(prev => prev.filter((_, i) => i !== idx));

    // Guardar Póliza
    const handleGuardar = async () => {
        if (!seleccionado) return;
        if (!form.broker || !form.aseguradora) return alert("Complete broker y aseguradora");

        setFormLoading(true);
        try {
            // 1. Subir nuevos archivos
            let urlsFinales = [...evidenciasGuardadas];
            if (archivosNuevos.length > 0) {
                const nuevasUrls = await segurosService.subirEvidencias(archivosNuevos);
                urlsFinales = [...urlsFinales, ...nuevasUrls];
            }

            // 2. Payload
            const payload: SeguroPayload = {
                identificacion_cliente: seleccionado.ruc,
                nota_venta: seleccionado.notaId,
                broker: form.broker,
                aseguradora: form.aseguradora,
                tipo_seguro: form.tipoSeguro,
                costo_seguro: form.costo,
                precio_venta: seleccionado.precio,
                evidencias: urlsFinales
            };

            // 3. Insertar o Actualizar
            let res;
            if (existingId) {
                res = await segurosService.actualizarPoliza(existingId, payload);
            } else {
                res = await segurosService.crearPoliza(payload);
            }

            if (res.success) {
                alert("Póliza guardada correctamente"); // O toast.success
                setVista('LISTA'); // Volver a lista
                cargarSeguros(); // Recargar datos por si cambió estado
            } else {
                alert("Error al guardar: " + res.error);
            }

        } catch (error) {
            console.error(error);
            alert("Error crítico al guardar");
        } finally {
            setFormLoading(false);
        }
    };

    // ==========================================
    // RENDER
    // ==========================================

    return (
        <div className="flex min-h-screen bg-gray-50">
            <SegurosSidebar />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    
                    {/* --- VISTA: LISTA (DASHBOARD) --- */}
                    {vista === 'LISTA' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex flex-col gap-1">
                                    <h1 className="text-2xl font-bold text-gray-900">Seguros Vehiculares</h1>
                                    <p className="text-sm text-gray-500">Panel de control de pólizas emitidas (seguro 1 año)</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={cargarSeguros}
                                    disabled={loadingData}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-60"
                                >
                                    <RefreshCw size={18} className={loadingData ? "animate-spin" : ""} />
                                    Actualizar
                                </button>
                            </div>

                            {/* KPIs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Pólizas Activas</p>
                                        <p className="text-4xl font-bold text-gray-800 mt-2">{loadingData ? '...' : totalCantidad}</p>
                                    </div>
                                    <div className="p-4 bg-emerald-50 rounded-full text-emerald-600"><ShieldCheck size={32} /></div>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Recaudado</p>
                                        <p className="text-4xl font-bold text-emerald-600 mt-2">{loadingData ? '...' : formatDinero(totalRecaudado)}</p>
                                    </div>
                                    <div className="p-4 bg-emerald-50 rounded-full text-emerald-600"><span className="text-2xl font-black">$</span></div>
                                </div>
                            </div>

                            <SegurosCarteraTable
                                seguros={seguros}
                                enrichedData={enrichedData}
                                loading={loadingData}
                                creditos={creditos}
                                contados={contados}
                                conAlertaRenovacion={conAlertaRenovacion}
                                filtroTipo={filtroTipo}
                                setFiltroTipo={setFiltroTipo}
                                onGestionar={handleGestionar}
                                showRefresh={false}
                            />
                        </div>
                    )}

                    {/* --- VISTA: FORMULARIO (GESTIÓN) --- */}
                    {vista === 'FORMULARIO' && seleccionado && (
                        <div className="max-w-3xl mx-auto animate-in slide-in-from-right-4 duration-300">
                            {/* Header Form */}
                            <div className="mb-8">
                                <button onClick={() => setVista('LISTA')} className="text-slate-400 hover:text-slate-800 flex items-center gap-2 text-xs font-bold uppercase mb-4 transition-colors">
                                    <ArrowLeft size={14}/> Volver al listado
                                </button>
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                    <div>
                                        <h1 className="text-2xl font-black text-slate-900 uppercase">
                                            {existingId ? 'Editar Póliza' : 'Emitir Póliza'}
                                        </h1>
                                        <p className="text-sm text-slate-500 mt-1">
                                            Nota Venta: <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 rounded">{seleccionado.notaId}</span>
                                        </p>
                                    </div>
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-transparent ${statusInstalacion.colorClass}`}>
                                        <statusInstalacion.Icon size={16} />
                                        <span className="text-xs font-bold uppercase">{statusInstalacion.text}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Form Body */}
                            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
                                {formLoading && (
                                    <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-sm">
                                        <Loader2 className="animate-spin text-emerald-600" size={32} />
                                    </div>
                                )}
                                
                                <div className="p-6 md:p-8 space-y-6">
                                    {/* Info Cliente */}
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Cliente</p>
                                            <p className="text-xs font-bold text-slate-900 truncate">{seleccionado.cliente}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase">RUC / CI</p>
                                            <p className="text-xs font-mono font-bold text-slate-900">{seleccionado.ruc}</p>
                                        </div>
                                    </div>

                                    {/* Inputs */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Broker</label>
                                            <select 
                                                value={form.broker} onChange={e => setForm({...form, broker: e.target.value})}
                                                className="w-full p-3 bg-slate-50 border border-transparent rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all uppercase"
                                            >
                                                <option value="">-- Seleccionar --</option>
                                                {BROKERS.map(b => <option key={b} value={b}>{b}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Aseguradora</label>
                                            <select 
                                                value={form.aseguradora} onChange={e => setForm({...form, aseguradora: e.target.value})}
                                                className="w-full p-3 bg-slate-50 border border-transparent rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all uppercase"
                                            >
                                                <option value="">-- Seleccionar --</option>
                                                {aseguradorasList.map(a => <option key={a.id} value={a.nombre}>{a.nombre}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Plan</label>
                                            <select 
                                                value={form.tipoSeguro} onChange={e => setForm({...form, tipoSeguro: e.target.value})}
                                                className="w-full p-3 bg-slate-50 border border-transparent rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all uppercase"
                                            >
                                                <option value="">-- Seleccionar --</option>
                                                {PLANES.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Costos */}
                                    <div className="p-4 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-100">
                                        <span className="text-xs font-bold text-slate-500 uppercase">Costo Póliza (Neto)</span>
                                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200">
                                            <span className="text-slate-400">$</span>
                                            <input 
                                                type="number" value={form.costo} onChange={e => setForm({...form, costo: parseFloat(e.target.value) || 0})}
                                                className="w-24 text-right font-mono font-bold outline-none text-slate-900"
                                            />
                                        </div>
                                    </div>

                                    {/* Archivos */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2"><Paperclip size={12}/> Evidencias</label>
                                            <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold text-emerald-600 uppercase hover:underline flex items-center gap-1"><Plus size={12}/> Agregar</button>
                                        </div>
                                        
                                        {evidenciasGuardadas.map((url, idx) => (
                                            <div key={`old-${idx}`} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="p-1.5 bg-white rounded shadow-sm text-slate-400"><ShieldCheck size={14}/></div>
                                                    <a href={url} target="_blank" rel="noreferrer" className="text-xs font-bold text-slate-600 truncate hover:text-emerald-600 hover:underline">Ver Documento #{idx+1}</a>
                                                </div>
                                                <button onClick={() => removeSavedEvidence(idx)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                                            </div>
                                        ))}

                                        {archivosNuevos.map((file, idx) => (
                                            <div key={`new-${idx}`} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="p-1.5 bg-white rounded shadow-sm text-emerald-600">{file.type.includes('pdf') ? <FileText size={14}/> : <ImageIcon size={14}/>}</div>
                                                    <span className="text-xs font-bold text-emerald-800 truncate">{file.name}</span>
                                                </div>
                                                <button onClick={() => removeNewFile(idx)} className="text-emerald-400 hover:text-red-500"><Trash2 size={14}/></button>
                                            </div>
                                        ))}
                                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept="image/*,application/pdf" className="hidden" />
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 border-t border-slate-100">
                                    <button onClick={handleGuardar} disabled={formLoading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {formLoading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                                        {existingId ? 'Actualizar Póliza' : 'Guardar Póliza'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
}

export default function SegurosPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen bg-gray-50 items-center justify-center">
                <Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
        }>
            <SegurosPageContent />
        </Suspense>
    );
}