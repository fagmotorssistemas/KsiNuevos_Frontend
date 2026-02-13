"use client";

import { useState, useEffect, useRef } from "react";
import { 
    ShieldCheck, Loader2, Save, ArrowLeft, 
    Paperclip, FileText, Image as ImageIcon, Trash2, Plus, 
    AlertCircle, Search
} from "lucide-react";
import { toast } from "sonner"; // O tu librería de notificaciones favorita

// Imports de tu lógica de negocio
import { segurosService, SeguroPayload } from "@/services/seguros.service";
import { SeguroVehicular } from "@/types/seguros.types";
import { useInstallationStatus } from "@/hooks/useInstallationStatus";
import { formatDinero } from "@/utils/format";
import { SegurosSidebar } from "@/components/layout/seguros-sidebar";

// Listas estáticas para el formulario
const BROKERS = ["TECNISEGUROS", "AON", "NOVA", "ASESORES DE SEGUROS", "DIRECTO"];
const ASEGURADORAS = ["CHUBB SEGUROS", "SWEADEN", "MAPFRE", "ECUASUIZA", "LATINA"];
const PLANES = ["TODO RIESGO (1 AÑO)", "TODO RIESGO (2 AÑO)", "PÉRDIDA TOTAL"];

export default function SegurosPage() {
    // ==========================================
    // ESTADOS GLOBALES
    // ==========================================
    const [vista, setVista] = useState<'LISTA' | 'FORMULARIO'>('LISTA');
    const [loadingData, setLoadingData] = useState(true);
    const [seguros, setSeguros] = useState<SeguroVehicular[]>([]);
    
    // Datos seleccionados para el formulario
    const [seleccionado, setSeleccionado] = useState<{
        notaId: string;
        ruc: string;
        cliente: string;
        fecha: string;
        precio: number;
    } | null>(null);

    // ==========================================
    // LÓGICA DE LISTA (DASHBOARD)
    // ==========================================
    const cargarSeguros = async () => {
        setLoadingData(true);
        try {
            const data = await segurosService.obtenerSeguros();
            setSeguros(data);
        } catch (error) {
            console.error(error);
            // toast.error("Error cargando lista");
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        cargarSeguros();
    }, []);

    // Totales KPI
    const totalCantidad = seguros.length;
    const totalRecaudado = seguros.reduce((acc, item) => acc + item.valores.total, 0);

    // Handler para abrir formulario
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
                            {/* Header */}
                            <div className="flex flex-col gap-1">
                                <h1 className="text-2xl font-bold text-gray-900">Seguros Vehiculares</h1>
                                <p className="text-sm text-gray-500">Panel de control de pólizas emitidas</p>
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

                            {/* Tabla */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                    <h3 className="font-semibold text-gray-700">Detalle de Ventas</h3>
                                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                        {seguros.length} registros
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-gray-50 text-gray-500 font-medium text-xs uppercase tracking-wider">
                                            <tr>
                                                <th className="px-6 py-3">Nota / Fecha</th>
                                                <th className="px-6 py-3">Cliente</th>
                                                <th className="px-6 py-3">Vehículo</th>
                                                <th className="px-6 py-3 text-right">Valor Total</th>
                                                <th className="px-6 py-3 text-center">Gestión</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {loadingData ? (
                                                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Cargando datos...</td></tr>
                                            ) : seguros.length > 0 ? (
                                                seguros.map((item) => (
                                                    <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-gray-900">{item.referencia}</div>
                                                            <div className="text-xs text-gray-400 mt-0.5 font-mono">{item.fechaEmision.split('T')[0]}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-medium text-gray-900 max-w-[200px] truncate" title={item.cliente.nombre}>{item.cliente.nombre}</div>
                                                            <div className="text-xs text-gray-500">{item.cliente.identificacion}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-gray-700 font-medium">{item.bienAsegurado.descripcion}</div>
                                                            <div className="inline-flex items-center gap-2 mt-1">
                                                                <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border uppercase tracking-wider font-bold">{item.bienAsegurado.placa}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{formatDinero(item.valores.total)}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button 
                                                                onClick={() => handleGestionar(item)}
                                                                className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 active:scale-95"
                                                            >
                                                                <ShieldCheck size={14} /> Gestionar
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No se encontraron registros</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
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
                                                {ASEGURADORAS.map(a => <option key={a} value={a}>{a}</option>)}
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