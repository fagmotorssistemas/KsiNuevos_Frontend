"use client";

import { useState, useEffect } from "react";
// CORRECCIÓN: Solo usamos el servicio de rastreadores para mantener independencia
import { rastreadoresService } from "@/services/rastreadores.service"; 
import { 
    X, Loader2, CalendarDays, CheckCircle2, Paperclip, Edit2, User 
} from "lucide-react";
import { toast } from "sonner";
import { GPSForm } from "./GPSForm";

interface GPSContratoDetailsProps {
    contratoId: string;
    onClose: () => void;
}

// Interfaz alineada con ContratoGPS del servicio para evitar errores de tipo
interface DetalleGPS {
    ccoCodigo: string;
    nroContrato: string;
    fechaInstalacion: string; // Coincide con el mapeo del service
    cliente: string;          // Coincide con el mapeo del service
    ruc: string;              // Coincide con el mapeo del service
    placa: string;
    marca: string;
    modelo: string;
    color: string;
    anio: string;
    totalRastreador: number;
}

export function GPSContratoDetails({ contratoId, onClose }: GPSContratoDetailsProps) {
    const [contrato, setContrato] = useState<DetalleGPS | null>(null);
    const [rastreadores, setRastreadores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [viewer, setViewer] = useState<{open: boolean, urls: string[]}>({ open: false, urls: [] });

    const loadData = async () => {
        try {
            setLoading(true);
            
            // 1. Cargar datos del contrato usando el servicio INDEPENDIENTE
            const dataContrato = await rastreadoresService.getDetalleContratoGPS(contratoId);
            
            // Forzamos el tipado para evitar el error de asignación de TS
            setContrato(dataContrato as DetalleGPS);

            if (dataContrato) {
                // 2. Cargar dispositivos instalados en Supabase
                const res = await rastreadoresService.obtenerPorContrato(contratoId);
                setRastreadores(res || []);
            }
        } catch (error) { 
            console.error(error);
            toast.error("Error cargando detalles del contrato"); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { loadData(); }, [contratoId]);

    const handleSuccess = async () => {
        const res = await rastreadoresService.obtenerPorContrato(contratoId);
        setRastreadores(res || []);
        setEditing(false);
    };

    if (loading) return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md"><Loader2 className="text-white animate-spin"/></div>;
    if (!contrato) return null;

    const hasGPS = rastreadores.length > 0;
    const precio = contrato.totalRastreador;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
            <div className="bg-white w-full max-w-2xl max-h-[95vh] flex flex-col rounded-[2.5rem] shadow-2xl overflow-hidden">
                
                {/* Header */}
                <div className="px-8 pt-8 pb-6 bg-white relative shrink-0 border-b border-slate-100">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"><X size={22}/></button>
                    
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">{contrato.nroContrato}</span>
                        <span className="text-slate-400 text-[10px] font-bold uppercase flex gap-1 items-center"><CalendarDays size={12}/> {contrato.fechaInstalacion || "Sin Fecha"}</span>
                    </div>

                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase leading-tight mb-4 tracking-tight">
                        {contrato.cliente}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100 mb-2">
                        <div className="bg-white border-2 border-slate-900 px-3 py-1.5 rounded-2xl text-center shadow-sm shrink-0">
                            <span className="block text-[7px] font-black text-slate-400 uppercase leading-none mb-1">PLACA</span>
                            <span className="text-xl font-black font-mono leading-none">{contrato.placa || 'S/N'}</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-black uppercase text-slate-900 truncate">{contrato.marca} {contrato.modelo}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{contrato.color} • {contrato.anio}</p>
                        </div>
                    </div>

                    {/* Identificación del Cliente */}
                    <div className="flex items-center gap-2 mt-2 px-1">
                        <User size={14} className="text-slate-300"/>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">RUC/C.I:</span>
                        <span className="text-xs font-mono font-black text-slate-700">{contrato.ruc}</span>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 md:p-8 custom-scrollbar">
                    {!hasGPS ? (
                        <GPSForm 
                            contratoId={contrato.ccoCodigo} 
                            facturaRuc={contrato.ruc} 
                            precioVenta={precio} 
                            onSuccess={loadData} 
                        />
                    ) : !editing ? (
                        <SuccessCard 
                            data={rastreadores[0]} 
                            price={precio} 
                            onView={(urls) => setViewer({ open: true, urls })} 
                            onEdit={() => setEditing(true)} 
                        />
                    ) : (
                        <GPSForm 
                            contratoId={contrato.ccoCodigo} 
                            facturaRuc={contrato.ruc} 
                            precioVenta={precio} 
                            initialData={rastreadores[0]} 
                            onSuccess={handleSuccess} 
                            onCancel={() => setEditing(false)} 
                        />
                    )}
                </div>
            </div>

            {/* Visor de evidencias básico */}
            {viewer.open && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
                    <button onClick={() => setViewer({open:false, urls:[]})} className="absolute top-6 right-6 text-white bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all"><X size={24}/></button>
                    <img src={viewer.urls[0]} alt="Evidencia" className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl animate-in zoom-in-95" />
                </div>
            )}
        </div>
    );
}

function SuccessCard({ data, price, onView, onEdit }: { data: any, price: number, onView: (u:string[])=>void, onEdit: ()=>void }) {
    const urls = data.evidencias || (data.evidencia_url ? [data.evidencia_url] : []);
    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full animate-in fade-in zoom-in-95">
            <div className="h-1.5 w-full bg-[#E11D48]"></div>
            <div className="p-6 flex-1 flex flex-col gap-6">
                <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                        <div className="p-2.5 rounded-xl bg-rose-50 text-[#E11D48] shadow-sm"><CheckCircle2 size={22}/></div>
                        <div>
                            <h3 className="text-sm font-black uppercase text-slate-900 tracking-tight">Rastreo Activo</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado: Vinculado</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="block text-[9px] font-black text-slate-300 uppercase tracking-wider">Valor Venta</span>
                        <span className="block text-sm font-mono font-black text-slate-900">${price.toFixed(2)}</span>
                    </div>
                </div>
                
                <div className="bg-slate-50 rounded-2xl p-5 space-y-3 border border-slate-100">
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modelo</span>
                        <span className="text-xs font-bold text-slate-900">{data.modelo}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">IMEI</span>
                        <span className="text-xs font-mono font-bold tracking-wider text-slate-900">{data.imei}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proveedor</span>
                        <span className="text-xs font-bold text-slate-900">{data.proveedor}</span>
                    </div>
                </div>

                <div className="flex gap-3 mt-auto">
                    {urls.length > 0 ? (
                        <button 
                            onClick={()=>onView(urls)} 
                            className="flex-1 py-3.5 rounded-xl bg-slate-900 text-white text-[10px] font-bold uppercase hover:bg-slate-800 transition-all flex justify-center gap-2 items-center shadow-lg shadow-slate-200"
                        >
                            <Paperclip size={12}/> Ver Evidencia
                        </button>
                    ) : (
                        <button disabled className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-400 text-[10px] font-bold uppercase cursor-not-allowed">
                            Sin Evidencia
                        </button>
                    )}
                    <button 
                        onClick={onEdit} 
                        className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-bold uppercase hover:bg-slate-50 transition-all flex justify-center gap-2 items-center"
                    >
                        <Edit2 size={14}/> Editar
                    </button>
                </div>
            </div>
        </div>
    );
}