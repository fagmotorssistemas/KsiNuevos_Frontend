import { useState } from "react";
import { MessageCircle, Calendar, MapPin, ShoppingBag } from "lucide-react";
import type { LeadWithDetails } from "@/types/leads.types";

// Importación de componentes divididos
import { LeadDetailHeader } from "./LeadDetailHeader";
import { LeadInfoSidebar } from "./LeadInfoSidebar";
import { LeadHistoryTab } from "./LeadHistoryTab";
import { LeadAgendaTab } from "./LeadAgendaTab";
import { LeadShowroomTab } from "./LeadShowroomTab"; 
import { LeadRequestsTab } from "./LeadRequestsTab"; 

interface LeadDetailModalProps {
    lead: LeadWithDetails;
    onClose: () => void;
}

type TabType = 'history' | 'agenda' | 'showroom' | 'requests';

export function LeadDetailModal({ lead, onClose }: LeadDetailModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('history');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Contenedor Principal del Modal con altura fija (90vh) */}
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-slate-900/5">

                {/* --- HEADER (Fijo arriba) --- */}
                <div className="shrink-0">
                    <LeadDetailHeader lead={lead} onClose={onClose} />
                </div>

                {/* --- CUERPO PRINCIPAL (Flex Row para columnas) --- */}
                <div className="flex flex-1 overflow-hidden flex-col md:flex-row h-full">
                    
                    {/* --- COLUMNA IZQUIERDA (Info Estática) --- */}
                    <div className="hidden md:block w-1/3 h-full overflow-hidden border-r border-slate-200 bg-slate-50">
                        {/* El Sidebar ahora se encarga de su propio scroll interno */}
                        <LeadInfoSidebar lead={lead} />
                    </div>

                    {/* --- COLUMNA DERECHA (Pestañas Dinámicas) --- */}
                    <div className="w-full md:w-2/3 flex flex-col bg-white h-full overflow-hidden">
                        
                        {/* Selector de Pestañas (Header de la columna derecha) */}
                        <div className="shrink-0 flex border-b border-slate-100 overflow-x-auto no-scrollbar bg-white z-10">
                            <TabButton 
                                active={activeTab === 'history'} 
                                onClick={() => setActiveTab('history')} 
                                icon={MessageCircle} 
                                label="Historial" 
                            />
                            <TabButton 
                                active={activeTab === 'agenda'} 
                                onClick={() => setActiveTab('agenda')} 
                                icon={Calendar} 
                                label="Agenda" 
                            />
                            <TabButton 
                                active={activeTab === 'showroom'} 
                                onClick={() => setActiveTab('showroom')} 
                                icon={MapPin} 
                                label="Showroom" 
                            />
                            <TabButton 
                                active={activeTab === 'requests'} 
                                onClick={() => setActiveTab('requests')} 
                                icon={ShoppingBag} 
                                label="Pedidos" 
                            />
                        </div>

                        {/* --- CONTENIDO DE LA PESTAÑA ACTIVA --- */}
                        {/* CORRECCIÓN VISUAL CRÍTICA:
                            Agregamos 'flex flex-col h-full' aquí. 
                            Esto permite que los componentes hijos (como LeadHistoryTab) que usan 'flex-1' 
                            se expandan para llenar todo el espacio vertical disponible y activen sus propios scrollbars.
                        */}
                        <div className="flex-1 overflow-hidden relative flex flex-col h-full">
                            {activeTab === 'history' && <LeadHistoryTab lead={lead} />}
                            {activeTab === 'agenda' && <LeadAgendaTab lead={lead} />}
                            {activeTab === 'showroom' && <LeadShowroomTab lead={lead} />}
                            {activeTab === 'requests' && <LeadRequestsTab lead={lead} />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Subcomponente simple para el botón de la pestaña
function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap outline-none focus:bg-slate-50 ${
                active
                ? 'border-slate-800 text-slate-800 bg-slate-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
        >
            <div className="flex items-center justify-center gap-2">
                <Icon className={`h-4 w-4 ${active ? 'text-slate-800' : 'text-slate-400'}`} /> 
                {label}
            </div>
        </button>
    );
}