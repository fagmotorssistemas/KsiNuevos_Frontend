import { useState } from "react";
import { X, ExternalLink, Loader2, Thermometer } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "./ui-components";
import { STATUS_OPTIONS, TEMPERATURE_OPTIONS } from "./constants";
import type { LeadWithDetails } from "../../../../hooks/useLeads";

interface LeadDetailHeaderProps {
    lead: LeadWithDetails;
    onClose: () => void;
}

export function LeadDetailHeader({ lead, onClose }: LeadDetailHeaderProps) {
    const { supabase } = useAuth();
    
    // --- ESTADO: STATUS ---
    const [currentStatus, setCurrentStatus] = useState<string>(lead.status || 'nuevo');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // --- ESTADO: TEMPERATURA ---
    const [currentTemp, setCurrentTemp] = useState<string>(lead.temperature || 'frio');
    const [isUpdatingTemp, setIsUpdatingTemp] = useState(false);

    // Lógica Cambio de Status
    const handleStatusChange = async (newStatus: string) => {
        if (newStatus === currentStatus) return;
        setIsUpdatingStatus(true);

        const { error } = await supabase
            .from('leads')
            .update({ status: newStatus as any })
            .eq('id', lead.id);

        if (!error) {
            setCurrentStatus(newStatus);
        } else {
            console.error("Error actualizando estado:", error);
            alert("No se pudo actualizar el estado.");
        }
        setIsUpdatingStatus(false);
    };

    // Lógica Cambio de Temperatura
    const handleTempChange = async (newTemp: string) => {
        if (newTemp === currentTemp) return;
        setIsUpdatingTemp(true);

        const { error } = await supabase
            .from('leads')
            .update({ temperature: newTemp as any })
            .eq('id', lead.id);

        if (!error) {
            setCurrentTemp(newTemp);
        } else {
            console.error("Error actualizando temperatura:", error);
            alert("No se pudo actualizar la temperatura.");
        }
        setIsUpdatingTemp(false);
    };

    const handleOpenKommo = () => {
        if (!lead.lead_id_kommo) {
            alert("Este lead no tiene ID de Kommo asociado.");
            return;
        }
        const url = `https://marketingfagmotorsurfacom.kommo.com/leads/detail/${lead.lead_id_kommo}`;
        window.open(url, '_blank');
    };

    const getFormattedSource = (source: string | null) => {
        if (!source) return 'Desconocido';
        const lowerSource = String(source).toLowerCase();
        if (lowerSource === 'waba') return 'WhatsApp';
        if (lowerSource === 'tiktok_kommo') return 'TikTok';
        if (lowerSource === 'instagram_business') return 'Instagram';
        return source;
    };

    const isSpecialSource = ['waba', 'tiktok_kommo', 'instagram_business'].includes((lead.source as string)?.toLowerCase());

    return (
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="min-w-0 pr-4">
                <h2 className="text-xl font-bold text-slate-800 truncate">{lead.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-slate-500 font-medium whitespace-nowrap">{lead.phone || 'Sin teléfono'}</span>
                    <span className="text-slate-300">•</span>
                    <span className={`text-sm text-slate-500 ${isSpecialSource ? '' : 'capitalize'}`}>
                        {getFormattedSource(lead.source)}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-nowrap">
                
                {/* --- SELECTOR DE TEMPERATURA --- */}
                <div className="relative group shrink-0 hidden sm:block"> {/* Oculto en móviles muy pequeños si falta espacio */}
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-50 z-10">
                        <Thermometer className="h-3.5 w-3.5" />
                    </div>
                    <select
                        disabled={isUpdatingTemp}
                        value={currentTemp}
                        onChange={(e) => handleTempChange(e.target.value)}
                        className={`
                            appearance-none pl-8 pr-8 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer outline-none border transition-all
                            ${TEMPERATURE_OPTIONS.find(o => o.value === currentTemp)?.color || 'bg-gray-100'}
                            ${isUpdatingTemp ? 'opacity-50 cursor-wait' : 'hover:brightness-95'}
                        `}
                    >
                        {TEMPERATURE_OPTIONS.map(option => (
                            <option key={option.value} value={option.value} className="bg-white text-slate-700">
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-60">
                        {isUpdatingTemp ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        )}
                    </div>
                </div>

                {/* --- SELECTOR DE ESTADO --- */}
                <div className="relative group shrink-0">
                    <select
                        disabled={isUpdatingStatus}
                        value={currentStatus}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className={`
                            appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer outline-none border transition-all
                            ${STATUS_OPTIONS.find(o => o.value === currentStatus)?.color || 'bg-gray-100'}
                            ${isUpdatingStatus ? 'opacity-50 cursor-wait' : 'hover:brightness-95'}
                        `}
                    >
                        {STATUS_OPTIONS.map(option => (
                            <option key={option.value} value={option.value} className="bg-white text-slate-700">
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-60">
                        {isUpdatingStatus ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        )}
                    </div>
                </div>

                <Button
                    onClick={handleOpenKommo}
                    className="bg-[#2c86fe]/10 text-[#2c86fe] hover:bg-[#2c86fe]/20 px-4 py-2 rounded-full text-xs font-bold gap-2 transition-colors whitespace-nowrap shrink-0"
                    title="Abrir en Kommo CRM"
                >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span className="shrink-0 hidden md:inline">Kommo</span>
                </Button>

                <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600 shrink-0">
                    <X className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}