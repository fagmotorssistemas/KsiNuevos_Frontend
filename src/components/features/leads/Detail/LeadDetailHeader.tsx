import { useState } from "react";
import { X, ExternalLink, Loader2, Thermometer, Calculator, Pencil, Save, Undo } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button, Input } from "./ui-components"; // Asumo que Input existe en tus ui-components
import { STATUS_OPTIONS, TEMPERATURE_OPTIONS } from "./constants";
import type { LeadWithDetails } from "@/types/leads.types";

interface LeadDetailHeaderProps {
    lead: LeadWithDetails;
    onClose: () => void;
}

export function LeadDetailHeader({ lead, onClose }: LeadDetailHeaderProps) {
    const { supabase } = useAuth();
    const router = useRouter();
    
    // --- ESTADOS DE EDICIÓN ---
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(lead.name);
    const [phone, setPhone] = useState(lead.phone);
    const [isSavingData, setIsSavingData] = useState(false);

    // --- ESTADO: STATUS & TEMP ---
    const [currentStatus, setCurrentStatus] = useState<string>(lead.status || 'nuevo');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [currentTemp, setCurrentTemp] = useState<string>(lead.temperature || 'frio');
    const [isUpdatingTemp, setIsUpdatingTemp] = useState(false);

    // Lógica Guardar Datos Personales
    const handleSaveData = async () => {
        setIsSavingData(true);
        const { error } = await supabase
            .from('leads')
            .update({ name, phone })
            .eq('id', lead.id);

        if (error) {
            console.error("Error actualizando datos:", error);
            alert("Error al guardar cambios");
        } else {
            setIsEditing(false);
        }
        setIsSavingData(false);
    };

    // Lógica Redirección a Financiamiento
    const handleGoToFinance = () => {
        // Construimos la URL con parámetros
        const params = new URLSearchParams();
        
        // Datos básicos
        if (name) params.append("clientName", name);
        if (phone) params.append("clientPhone", phone);
        if (lead.lead_id_kommo) params.append("clientId", lead.lead_id_kommo.toString()); // Usamos ID de Kommo como referencia o Cédula si la tuvieras

        // Intentar pasar el vehículo de interés (tomamos el primero)
        if (lead.interested_cars && lead.interested_cars.length > 0) {
            const car = lead.interested_cars[0];
            // Pasamos un string de búsqueda para el inventario
            params.append("vehicleSearch", `${car.brand} ${car.model}`);
        }

        router.push(`/finance?${params.toString()}`);
    };

    // Lógica Cambio de Status
    const handleStatusChange = async (newStatus: string) => {
        if (newStatus === currentStatus) return;
        setIsUpdatingStatus(true);
        const { error } = await supabase.from('leads').update({ status: newStatus as any }).eq('id', lead.id);
        if (!error) setCurrentStatus(newStatus);
        setIsUpdatingStatus(false);
    };

    // Lógica Cambio de Temperatura
    const handleTempChange = async (newTemp: string) => {
        if (newTemp === currentTemp) return;
        setIsUpdatingTemp(true);
        const { error } = await supabase.from('leads').update({ temperature: newTemp as any }).eq('id', lead.id);
        if (!error) setCurrentTemp(newTemp);
        setIsUpdatingTemp(false);
    };

    const handleOpenKommo = () => {
        if (!lead.lead_id_kommo) return alert("Sin ID de Kommo.");
        window.open(`https://marketingfagmotorsurfacom.kommo.com/leads/detail/${lead.lead_id_kommo}`, '_blank');
    };

    const getFormattedSource = (source: string | null) => {
        if (!source) return 'Desconocido';
        const lower = String(source).toLowerCase();
        if (lower === 'waba') return 'WhatsApp';
        if (lower === 'tiktok_kommo') return 'TikTok';
        if (lower === 'instagram_business') return 'Instagram';
        return source;
    };

    return (
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 gap-4">
            
            {/* IZQUIERDA: DATOS DEL LEAD (EDITABLES) */}
            <div className="min-w-0 flex-1 w-full">
                {isEditing ? (
                    <div className="flex flex-col gap-2 max-w-md animate-in fade-in">
                        <input 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="text-lg font-bold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="Nombre del cliente"
                        />
                        <input 
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="text-sm text-slate-600 bg-white border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="Teléfono"
                        />
                        <div className="flex gap-2 mt-1">
                            <Button 
                                onClick={handleSaveData} 
                                disabled={isSavingData}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {isSavingData ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                                Guardar
                            </Button>
                            <Button  
                                onClick={() => { setIsEditing(false); setName(lead.name); setPhone(lead.phone); }}
                            >
                                <Undo className="h-3 w-3 mr-1" /> Cancelar
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="group relative">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-slate-800 truncate">{name}</h2>
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-brand-600 transition-opacity p-1"
                                title="Editar nombre y teléfono"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-slate-500 font-medium whitespace-nowrap">{phone || 'Sin teléfono'}</span>
                            <span className="text-slate-300">•</span>
                            <span className={`text-sm text-slate-500 capitalize`}>
                                {getFormattedSource(lead.source)}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* DERECHA: ACCIONES Y ESTADOS */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
                
                {/* 1. SELECTOR TEMPERATURA */}
                <div className="relative group">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-50 z-10">
                        <Thermometer className="h-3.5 w-3.5" />
                    </div>
                    <select
                        disabled={isUpdatingTemp}
                        value={currentTemp}
                        onChange={(e) => handleTempChange(e.target.value)}
                        className={`appearance-none pl-8 pr-8 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer outline-none border transition-all ${TEMPERATURE_OPTIONS.find(o => o.value === currentTemp)?.color || 'bg-gray-100'} ${isUpdatingTemp ? 'opacity-50' : 'hover:brightness-95'}`}
                    >
                        {TEMPERATURE_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-white text-slate-700">{o.label}</option>)}
                    </select>
                </div>

                {/* 2. SELECTOR ESTADO */}
                <div className="relative group">
                    <select
                        disabled={isUpdatingStatus}
                        value={currentStatus}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className={`appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer outline-none border transition-all ${STATUS_OPTIONS.find(o => o.value === currentStatus)?.color || 'bg-gray-100'} ${isUpdatingStatus ? 'opacity-50' : 'hover:brightness-95'}`}
                    >
                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-white text-slate-700">{o.label}</option>)}
                    </select>
                </div>

                {/* 3. BOTÓN FINANCIAMIENTO (NUEVO) */}
                <Button
                    onClick={handleGoToFinance}
                    className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-full text-xs font-bold gap-2 transition-colors shadow-sm"
                    title="Enviar datos al cotizador"
                >
                    <Calculator className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Cotizar</span>
                </Button>

                {/* 4. BOTÓN KOMMO */}
                <Button
                    onClick={handleOpenKommo}
                    className="bg-[#2c86fe]/10 text-[#2c86fe] hover:bg-[#2c86fe]/20 px-3 py-2 rounded-full text-xs font-bold gap-2 transition-colors"
                    title="Abrir en Kommo CRM"
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                </Button>

                <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}