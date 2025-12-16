import { useState } from "react";
import { MessageCircle, Calendar } from "lucide-react";
import type { LeadWithDetails } from "../../../../hooks/useLeads";

// Importación de componentes divididos
import { LeadDetailHeader } from "./LeadDetailHeader";
import { LeadInfoSidebar } from "./LeadInfoSidebar";
import { LeadHistoryTab } from "./LeadHistoryTab";
import { LeadAgendaTab } from "./LeadAgendaTab";

interface LeadDetailModalProps {
    lead: LeadWithDetails;
    onClose: () => void;
}

export function LeadDetailModal({ lead, onClose }: LeadDetailModalProps) {
    // Solo manejamos el estado de las pestañas aquí
    const [activeTab, setActiveTab] = useState<'history' | 'agenda'>('history');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-slate-900/5">

                {/* --- HEADER --- */}
                <LeadDetailHeader lead={lead} onClose={onClose} />

                <div className="flex flex-1 overflow-hidden">
                    {/* --- COLUMNA IZQUIERDA (Info Estática & Resumen) --- */}
                    <LeadInfoSidebar lead={lead} />

                    {/* --- COLUMNA DERECHA (Tabs) --- */}
                    <div className="w-2/3 flex flex-col bg-white">
                        {/* Selector de Pestañas */}
                        <div className="flex border-b border-slate-100">
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history'
                                    ? 'border-slate-800 text-slate-800'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <MessageCircle className="h-4 w-4" /> Historial
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('agenda')}
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'agenda'
                                    ? 'border-slate-800 text-slate-800'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Calendar className="h-4 w-4" /> Agenda
                                </div>
                            </button>
                        </div>

                        {/* --- CONTENIDO PESTAÑAS --- */}
                        {activeTab === 'history' && <LeadHistoryTab lead={lead} />}
                        {activeTab === 'agenda' && <LeadAgendaTab lead={lead} />}
                    </div>
                </div>
            </div>
        </div>
    );
}