"use client";

import { useState, useEffect } from "react";
import { contratosService } from "@/services/contratos.service";
import { dispositivosService } from "@/services/dispositivos.service";
import { ContratoDetalle } from "@/types/contratos.types";
import { 
    X, Loader2, User, 
    MapPin, CalendarDays, Edit2, CheckCircle2, Phone, Paperclip,
    FileText, Image as ImageIcon, Download
} from "lucide-react";
import { toast } from "sonner";

import { GPSForm } from "./GPSForm";
import { InsuranceForm } from "./InsuranceForm"; 

interface InsuranceContratoDetailsProps {
    contratoId: string;
    onClose: () => void;
    activeFilter?: 'rastreador' | 'seguro' | 'ambos'; 
}

// --- COMPONENTE PRINCIPAL ---
export function InsuranceContratoDetails({ 
    contratoId, 
    onClose, 
    activeFilter = 'ambos',
}: InsuranceContratoDetailsProps) {
    const [contrato, setContrato] = useState<ContratoDetalle | null>(null);
    const [loading, setLoading] = useState(true);
    
    const [rastreadores, setRastreadores] = useState<any[]>([]);
    const [seguros, setSeguros] = useState<any[]>([]);

    // Estados de Edición
    const [editingGPS, setEditingGPS] = useState(false);
    const [editingSeguro, setEditingSeguro] = useState(false);

    // Estado del Visor de Evidencias
    const [viewerState, setViewerState] = useState<{ isOpen: boolean; urls: string[]; title: string }>({
        isOpen: false, urls: [], title: ''
    });

    const hasGPS = rastreadores.length > 0;
    const hasSeguro = seguros.length > 0;
    const isSingleView = activeFilter === 'rastreador' || activeFilter === 'seguro';

    // --- CARGA DE DATOS ---
    const loadDispositivos = async () => {
        const res = await dispositivosService.obtenerRastreadoresPorNota(contratoId);
        setRastreadores(res || []);
    };

    const loadSeguros = async () => {
        const res = await dispositivosService.obtenerSegurosPorNota(contratoId);
        setSeguros(res || []);
    };

    useEffect(() => {
        const loadAllData = async () => {
            try {
                setLoading(true);
                const data = await contratosService.getDetalleContrato(contratoId);
                setContrato(data);
                if (data) {
                    await Promise.all([loadDispositivos(), loadSeguros()]);
                }
            } catch (error) {
                toast.error("Error sincronizando información");
            } finally {
                setLoading(false);
            }
        };
        if (contratoId) loadAllData();
    }, [contratoId]);

    // --- MANEJADORES DE ÉXITO (POST-EDICIÓN) ---
    const handleSuccessGPS = async () => {
        await loadDispositivos(); // Recargar datos frescos
        setEditingGPS(false);     // Salir de modo edición
    };

    const handleSuccessSeguro = async () => {
        await loadSeguros();
        setEditingSeguro(false);
    };

    const handleOpenViewer = (urls: string[], title: string) => {
        setViewerState({ isOpen: true, urls, title });
    };

    const getPrice = (val?: string | number) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        return parseFloat(val.toString().replace(/[^0-9.]/g, '') || "0");
    };

    if (loading) return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
        </div>
    );

    if (!contrato) return null;

    const showGPS = activeFilter === 'rastreador' || activeFilter === 'ambos';
    const showInsurance = activeFilter === 'seguro' || activeFilter === 'ambos';
    
    const presupuestoGPS = getPrice(contrato.totalRastreador);
    const presupuestoSeguro = getPrice(contrato.totalSeguro);
    const fechaDisplay = contrato.fechaCiudad || contrato.textoFecha || "Fecha Pendiente";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            
            <div className={`bg-white w-full ${isSingleView ? 'max-w-2xl' : 'max-w-5xl'} max-h-[95vh] flex flex-col rounded-[2.5rem] shadow-2xl overflow-hidden`}>
                
                {/* --- HEADER --- */}
                <div className="px-8 pt-8 pb-6 bg-white relative shrink-0">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all z-10">
                        <X size={22} />
                    </button>

                    <div className="border-b border-slate-100 pb-6">
                        
                        {/* 1. Contexto (Badge + Fecha) */}
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-slate-900 text-white text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider shadow-sm">
                                {contrato.nroContrato}
                            </span>
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <CalendarDays size={12} /> {fechaDisplay}
                            </span>
                        </div>

                        {/* 2. NOMBRE DEL CLIENTE */}
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight uppercase leading-none mb-5">
                            {contrato.facturaNombre}
                        </h1>

                        {/* 3. TARJETA VEHÍCULO */}
                        <div className="inline-flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-2 pr-6 mb-5 max-w-full">
                            <div className="bg-white border-[2px] border-slate-900 text-slate-900 px-3 py-1.5 rounded-xl text-center min-w-[100px] shadow-sm shrink-0">
                                <span className="block text-[7px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-0.5">PLACA</span>
                                <span className="block text-xl font-black tracking-widest leading-none font-mono">
                                    {contrato.placa || 'S/N'}
                                </span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-black text-slate-900 uppercase leading-tight truncate">
                                    {contrato.marca} {contrato.modelo}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-wide">
                                    {contrato.color} • {contrato.anio} • {contrato.tipoVehiculo}
                                </p>
                            </div>
                        </div>

                        {/* 4. DATOS DE CONTACTO */}
                        <div className="flex flex-col gap-2 text-xs text-slate-500 font-bold pl-1">
                            <div className="flex items-center gap-3">
                                <div className="w-5 flex justify-center"><User size={14} className="text-slate-300"/></div>
                                <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 text-slate-700">
                                    {contrato.facturaRuc}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-5 flex justify-center"><Phone size={14} className="text-slate-300"/></div>
                                <span>{contrato.facturaTelefono || 'Sin teléfono registrado'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-5 flex justify-center"><MapPin size={14} className="text-slate-300"/></div>
                                <span className="uppercase">{contrato.facturaDireccion}</span>
                            </div>
                        </div>

                    </div>
                </div>

                {/* --- BODY --- */}
                <div className="overflow-y-auto flex-1 bg-slate-50/50 p-6 md:p-8 custom-scrollbar">
                    <div className={`grid ${isSingleView ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'} gap-6 h-full items-start`}>
                        
                        {/* --- COLUMNA GPS --- */}
                        {showGPS && (
                            <div className="h-full flex flex-col">
                                {/* Lógica:
                                    1. No tiene GPS -> Formulario Crear
                                    2. Tiene GPS y NO Edita -> Tarjeta Éxito
                                    3. Tiene GPS y Edita -> Formulario Editar (con initialData)
                                */}
                                {!hasGPS ? (
                                    <GPSForm 
                                        contratoId={contrato.ccoCodigo}
                                        facturaRuc={contrato.facturaRuc}
                                        precioVenta={presupuestoGPS} 
                                        onSuccess={loadDispositivos} 
                                    />
                                ) : !editingGPS ? (
                                    <SuccessCard 
                                        title="Rastreo Satelital" 
                                        data={rastreadores[0]} 
                                        type="gps" 
                                        price={presupuestoGPS} 
                                        onViewEvidence={(urls) => handleOpenViewer(urls, "Evidencias GPS")}
                                        onEdit={() => setEditingGPS(true)} // Activar edición
                                    />
                                ) : (
                                    <GPSForm 
                                        contratoId={contrato.ccoCodigo}
                                        facturaRuc={contrato.facturaRuc}
                                        precioVenta={presupuestoGPS} 
                                        initialData={rastreadores[0]} // Pasar datos existentes
                                        onSuccess={handleSuccessGPS} // Refrescar y salir
                                        onCancel={() => setEditingGPS(false)} // Cancelar
                                    />
                                )}
                            </div>
                        )}

                        {/* --- COLUMNA SEGUROS --- */}
                        {showInsurance && (
                            <div className="h-full flex flex-col">
                                {!hasSeguro ? (
                                    <InsuranceForm 
                                        contratoId={contrato.ccoCodigo}
                                        facturaRuc={contrato.facturaRuc}
                                        precioVenta={presupuestoSeguro}
                                        onSuccess={loadSeguros}
                                    />
                                ) : !editingSeguro ? (
                                    <SuccessCard 
                                        title="Póliza de Seguro" 
                                        data={seguros[0]} 
                                        type="seguro" 
                                        price={presupuestoSeguro}
                                        onViewEvidence={(urls) => handleOpenViewer(urls, "Póliza de Seguro")}
                                        onEdit={() => setEditingSeguro(true)} // Activar edición
                                    />
                                ) : (
                                    <InsuranceForm 
                                        contratoId={contrato.ccoCodigo}
                                        facturaRuc={contrato.facturaRuc}
                                        precioVenta={presupuestoSeguro}
                                        initialData={seguros[0]} // Pasar datos existentes
                                        onSuccess={handleSuccessSeguro} // Refrescar y salir
                                        onCancel={() => setEditingSeguro(false)} // Cancelar
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* --- FOOTER --- */}
                <div className="px-8 py-4 bg-white border-t border-slate-100 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                    <span>Vendedor: <span className="text-slate-900">{contrato.vendedor || 'Oficina'}</span></span>
                    <span className="opacity-50">K-si Nuevos System v2.0</span>
                </div>
            </div>

            {/* VISOR DE EVIDENCIAS INTEGRADO */}
            <EvidenceViewer 
                isOpen={viewerState.isOpen}
                onClose={() => setViewerState(prev => ({ ...prev, isOpen: false }))}
                urls={viewerState.urls}
                title={viewerState.title}
            />
        </div>
    );
}

// --- SUB-COMPONENTE: VISOR DE EVIDENCIAS ---
function EvidenceViewer({ isOpen, onClose, urls, title }: { isOpen: boolean, onClose: () => void, urls: string[], title: string }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => { if (isOpen) setCurrentIndex(0); }, [isOpen]);

    if (!isOpen || urls.length === 0) return null;

    const currentUrl = urls[currentIndex];
    const isPDF = currentUrl.toLowerCase().includes('.pdf');

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-50">
                <X size={24} />
            </button>

            <div className="w-full max-w-6xl h-full max-h-[90vh] flex flex-col md:flex-row gap-6">
                <div className="flex-1 bg-black/50 rounded-2xl border border-white/10 relative flex items-center justify-center overflow-hidden">
                    {isPDF ? (
                        <iframe src={`${currentUrl}#toolbar=0`} className="w-full h-full rounded-xl" title="Visor PDF"/>
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={currentUrl} alt="Evidencia" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"/>
                    )}
                    <a href={currentUrl} target="_blank" rel="noreferrer" className="absolute bottom-4 right-4 p-2 bg-black/60 text-white text-xs font-bold uppercase rounded-lg border border-white/20 hover:bg-white hover:text-black transition-all flex items-center gap-2">
                        <Download size={14}/> Abrir Original
                    </a>
                </div>

                {urls.length > 1 && (
                    <div className="w-full md:w-72 flex flex-col gap-4 shrink-0">
                        <div className="text-white">
                            <h3 className="text-lg font-black uppercase tracking-tight">{title}</h3>
                            <p className="text-xs text-white/50 font-bold uppercase">Archivo {currentIndex + 1} de {urls.length}</p>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                            {urls.map((url, idx) => {
                                const isTypePDF = url.toLowerCase().includes('.pdf');
                                const isActive = idx === currentIndex;
                                return (
                                    <button key={idx} onClick={() => setCurrentIndex(idx)} className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${isActive ? 'bg-white text-slate-900 border-white' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:border-white/30'}`}>
                                        <div className={`p-2 rounded-lg ${isActive ? 'bg-slate-200 text-slate-900' : 'bg-black/30 text-slate-500'}`}>
                                            {isTypePDF ? <FileText size={18}/> : <ImageIcon size={18}/>}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-wide truncate">Evidencia #{idx + 1}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- SUB-COMPONENTE: TARJETA DE ÉXITO ---
function SuccessCard({ 
    title, data, type, price, onViewEvidence, onEdit 
}: { 
    title: string, data: any, type: 'gps' | 'seguro', price: number,
    onViewEvidence: (urls: string[]) => void,
    onEdit?: () => void
}) {
    const isGPS = type === 'gps';
    const accentColor = isGPS ? 'bg-blue-600' : 'bg-emerald-600';
    const iconColor = isGPS ? 'text-blue-600 bg-blue-50' : 'text-emerald-600 bg-emerald-50';

    let evidenceUrls: string[] = [];
    if (Array.isArray(data.evidencias) && data.evidencias.length > 0) {
        evidenceUrls = data.evidencias;
    } else if (data.evidencia_url) {
        evidenceUrls = [data.evidencia_url];
    }

    return (
        <div className="bg-white rounded-3xl p-0 shadow-sm border border-slate-100 relative overflow-hidden flex flex-col group hover:shadow-md transition-all h-full">
            <div className={`h-1.5 w-full ${accentColor} shrink-0`}></div>
            
            <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${iconColor}`}>
                            <CheckCircle2 size={22} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">{title}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Estado: Activo</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="block text-[9px] font-black text-slate-300 uppercase">Valor Venta</span>
                        <span className="block text-sm font-mono font-black text-slate-900">${price.toFixed(2)}</span>
                    </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 mb-6 space-y-4 border border-slate-100 flex-1">
                    {isGPS ? (
                        <>
                            <Row label="Modelo" value={data.modelo} />
                            <Row label="IMEI" value={data.imei} isMono />
                            <Row label="Proveedor" value={data.proveedor} />
                        </>
                    ) : (
                        <>
                            <Row label="Aseguradora" value={data.aseguradora} />
                            <Row label="Broker" value={data.broker} />
                            <Row label="Plan" value={data.tipo_seguro} />
                        </>
                    )}
                </div>

                <div className="flex gap-3 mt-auto shrink-0">
                    {evidenceUrls.length > 0 ? (
                        <button 
                            onClick={() => onViewEvidence(evidenceUrls)}
                            className="flex-1 py-3.5 rounded-xl bg-slate-900 text-white text-[10px] font-bold uppercase text-center hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                        >
                            <Paperclip size={12}/> Ver Evidencias ({evidenceUrls.length})
                        </button>
                    ) : (
                        <button disabled className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-400 text-[10px] font-bold uppercase cursor-not-allowed">
                            Sin Evidencia
                        </button>
                    )}
                    
                    <button 
                        onClick={onEdit}
                        className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-bold uppercase hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <Edit2 size={14} /> Editar
                    </button>
                </div>
            </div>
        </div>
    );
}

function Row({ label, value, isMono }: { label: string, value: string, isMono?: boolean }) {
    return (
        <div className="flex justify-between items-center border-b border-slate-200 pb-2 last:border-0 last:pb-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
            <span className={`text-xs font-bold text-slate-900 ${isMono ? 'font-mono tracking-wider' : ''} truncate max-w-[180px] text-right`}>
                {value}
            </span>
        </div>
    );
}