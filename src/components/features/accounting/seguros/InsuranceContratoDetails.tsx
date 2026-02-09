"use client";

import { useState, useEffect } from "react";
import { contratosService } from "@/services/contratos.service";
import { dispositivosService } from "@/services/dispositivos.service";
import { ContratoDetalle } from "@/types/contratos.types";
import { 
    X, Loader2, Shield, FileText, 
    ShieldCheck, Layers, Calendar, 
    CreditCard, MessageSquare, User, Car
} from "lucide-react";
import { toast } from "sonner";

import { InsuranceAmortizacionTable } from "./InsuranceAmortizacionTable";
import { GPSForm } from "./GPSForm";
import { InsuranceForm } from "./InsuranceForm"; 
import { ClientVehicleInfo } from "./ClientVehicleInfo";
import { EconomicSummary } from "./EconomicSummary";

interface InsuranceContratoDetailsProps {
    contratoId: string;
    onClose: () => void;
    activeFilter?: 'rastreador' | 'seguro' | 'ambos'; 
    isReadOnly?: boolean; 
}

// Estilos compartidos
const cardStyle = "bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col h-full transition-all duration-300 hover:shadow-md";

export function InsuranceContratoDetails({ 
    contratoId, 
    onClose, 
    activeFilter = 'ambos',
    isReadOnly = true 
}: InsuranceContratoDetailsProps) {
    const [contrato, setContrato] = useState<ContratoDetalle | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Estados para listas
    const [rastreadores, setRastreadores] = useState<any[]>([]);
    const [seguros, setSeguros] = useState<any[]>([]);

    const loadDispositivos = async () => {
        const res = await dispositivosService.obtenerRastreadoresPorNota(contratoId);
        setRastreadores(res);
    };

    const loadSeguros = async () => {
        const res = await dispositivosService.obtenerSegurosPorNota(contratoId);
        setSeguros(res);
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

    if (loading) return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-[#E11D48]" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Cargando Expediente</p>
            </div>
        </div>
    );

    if (!contrato) return null;

    // Lógica para mostrar formularios según filtro
    const showGPSForm = !isReadOnly && (activeFilter === 'rastreador' || activeFilter === 'ambos');
    const showInsuranceForm = !isReadOnly && (activeFilter === 'seguro' || activeFilter === 'ambos');

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/10 backdrop-blur-sm">
            <div className="bg-white w-full max-w-[90rem] h-full shadow-2xl flex flex-col border-l border-slate-100 animate-in slide-in-from-right duration-300">
                
                {/* HEADER */}
                <header className="flex items-center justify-between px-8 py-6 border-b border-slate-50 shrink-0">
                    <div className="flex items-center gap-5">
                        <div className={`p-3 rounded-xl ${isReadOnly ? 'bg-slate-50 text-slate-400' : 'bg-red-50 text-[#E11D48]'}`}>
                            {isReadOnly ? <FileText size={20} /> : <ShieldCheck size={20} />}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                                    {isReadOnly ? 'Expediente Digital' : 'Gestión y Auditoría'}
                                </h2>
                                <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                    {contrato.nroContrato}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">
                                {isReadOnly ? 'Modo Consulta 360°' : 'Modo Edición Técnica'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="group p-2 rounded-full hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                    >
                        <X size={20} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
                    </button>
                </header>

                {/* CONTENIDO PRINCIPAL */}
                <div className="overflow-y-auto flex-1 p-8 bg-[#F8FAFC]">
                    <div className="max-w-7xl mx-auto space-y-8">
                        
                        {/* ============================================================== */}
                        {/* CASO 1: MODO AUDITORÍA (SOLO FORMULARIOS)                      */}
                        {/* ============================================================== */}
                        {!isReadOnly && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                                
                                {/* Tarjeta de Contexto Rápido (Para saber a quién auditamos) */}
                                <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-slate-50 rounded-full text-slate-400">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente Titular</p>
                                            <h3 className="text-lg font-bold text-slate-900 uppercase">{contrato.facturaNombre}</h3>
                                        </div>
                                    </div>
                                    <div className="h-10 w-px bg-slate-100 hidden md:block"></div>
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-right">Vehículo en Proceso</p>
                                            <h3 className="text-sm font-bold text-slate-900 uppercase text-right">
                                                {contrato.marca} {contrato.modelo} <span className="text-slate-300 mx-2">|</span> {contrato.placa || 'S/P'}
                                            </h3>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-full text-slate-400">
                                            <Car size={20} />
                                        </div>
                                    </div>
                                </div>

                                {/* Grid de Formularios Centrado */}
                                <div className={`grid grid-cols-1 ${showGPSForm && showInsuranceForm ? 'xl:grid-cols-2' : 'max-w-3xl mx-auto'} gap-8`}>
                                    {showGPSForm && (
                                        <GPSForm 
                                            contratoId={contrato.ccoCodigo}
                                            facturaRuc={contrato.facturaRuc}
                                            precioVenta={contrato.precioVehiculo}
                                            initialData={rastreadores}
                                            onSuccess={loadDispositivos} 
                                        />
                                    )}
                                    {showInsuranceForm && (
                                        <InsuranceForm 
                                            contratoId={contrato.ccoCodigo}
                                            facturaRuc={contrato.facturaRuc}
                                            precioVenta={contrato.precioVehiculo}
                                            initialData={seguros}
                                            onSuccess={loadSeguros}
                                        />
                                    )}
                                </div>
                            </div>
                        )}


                        {/* ============================================================== */}
                        {/* CASO 2: MODO EXPEDIENTE (SOLO VISIBLE SI ES READONLY)          */}
                        {/* ============================================================== */}
                        {isReadOnly && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-500">
                                
                                {/* COLUMNA IZQUIERDA: DATOS PRINCIPALES */}
                                <div className="lg:col-span-8 space-y-6">
                                    {/* Fila Cliente/Vehículo */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className={cardStyle}>
                                            <HeaderSection icon={<User size={16} />} title="Cliente" />
                                            <ClientVehicleInfo contrato={contrato} onlyClient />
                                        </div>
                                        <div className={cardStyle}>
                                            <HeaderSection icon={<Car size={16} />} title="Vehículo" />
                                            <ClientVehicleInfo contrato={contrato} onlyVehicle />
                                        </div>
                                    </div>

                                    {/* Fila Fechas y Ubicación */}
                                    <div className={cardStyle}>
                                        <HeaderSection icon={<Calendar size={16} />} title="Cláusulas y Ubicación" />
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            <div className="space-y-4">
                                                <DetailItem label="Fecha Texto" value={contrato.textoFecha} />
                                                <DetailItem label="Dado en" value={contrato.textoFechaDado} />
                                            </div>
                                            <div className="space-y-4">
                                                <DetailItem label="Fecha CR" value={contrato.textoFechaCr} />
                                                <DetailItem label="Ciudad Contrato" value={contrato.ciudadContrato} />
                                            </div>
                                            <div className="space-y-4">
                                                <DetailItem label="Ciudad Cliente" value={contrato.ciudadCliente} />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Resumen de Auditoría (Lectura) */}
                                    <div className={cardStyle}>
                                         <HeaderSection icon={<ShieldCheck size={16} />} title="Resumen de Auditoría" />
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3">Rastreadores Vinculados</p>
                                                {rastreadores.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {rastreadores.map((r, i) => (
                                                            <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                                <span className="text-xs font-mono font-bold text-slate-700">{r.imei}</span>
                                                                <span className="text-[10px] font-bold text-slate-400">{r.modelo}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <p className="text-xs text-slate-400 italic">No hay dispositivos</p>}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3">Pólizas Vigentes</p>
                                                {seguros.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {seguros.map((s, i) => (
                                                            <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                                <span className="text-xs font-bold text-slate-700">{s.aseguradora}</span>
                                                                <span className="text-[10px] font-bold text-slate-400">{s.tipo_seguro}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <p className="text-xs text-slate-400 italic">No hay pólizas</p>}
                                            </div>
                                         </div>
                                    </div>

                                    {/* Tabla Amortización */}
                                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                        <div className="px-8 py-6 border-b border-slate-50">
                                            <HeaderSection icon={<Layers size={16} />} title="Cronograma Financiero" />
                                        </div>
                                        <div className="p-6">
                                            <InsuranceAmortizacionTable contratoId={contrato.ccoCodigo} />
                                        </div>
                                    </div>
                                </div>

                                {/* COLUMNA DERECHA: ECONÓMICO Y EXTRAS (Sticky) */}
                                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
                                    <div className={`${cardStyle} bg-slate-900 border-slate-800 text-white`}>
                                        <EconomicSummary contrato={contrato} />
                                    </div>

                                    {(contrato.montoVehiculoUsado > 0 || contrato.montoCuotaAdicional > 0) && (
                                        <div className={cardStyle}>
                                            <HeaderSection icon={<CreditCard size={16} />} title="Pagos Especiales" />
                                            <div className="space-y-6">
                                                {contrato.montoVehiculoUsado > 0 && (
                                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Retoma Vehículo</p>
                                                        <p className="text-lg font-mono font-bold text-slate-900">${contrato.montoVehiculoUsado.toLocaleString()}</p>
                                                    </div>
                                                )}
                                                {contrato.montoCuotaAdicional > 0 && (
                                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Cuota Adicional</p>
                                                        <p className="text-lg font-mono font-bold text-slate-900">${contrato.montoCuotaAdicional.toLocaleString()}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className={cardStyle}>
                                        <HeaderSection icon={<MessageSquare size={16} />} title="Observaciones" />
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed italic">
                                            {contrato.observaciones || 'Sin observaciones registradas.'}
                                        </p>
                                        <div className="mt-4 pt-4 border-t border-slate-50">
                                            <p className="text-[9px] font-black text-slate-300 uppercase mb-1">Forma de Pago</p>
                                            <p className="text-xs font-bold text-slate-900">{contrato.formaPago}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}

function HeaderSection({ icon, title }: { icon: React.ReactNode, title: string }) {
    return (
        <div className="flex items-center gap-2.5 mb-6 text-[#E11D48]">
            {icon}
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">{title}</h3>
        </div>
    );
}

function DetailItem({ label, value }: { label: string, value?: string }) {
    if (!value) return null;
    return (
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-[13px] font-semibold text-slate-900 uppercase">{value}</p>
        </div>
    );
}