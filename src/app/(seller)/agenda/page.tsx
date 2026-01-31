"use client";

import { useState } from "react";
import { 
    CalendarCheck, 
    History, 
    CalendarX, 
    Filter,
    Users,
    Plus,
    Sparkles,
    Globe,
    LayoutGrid,
    ListFilter,
    SortAsc,
    SortDesc
} from "lucide-react";

import { useAgenda, type AppointmentWithDetails, type DateFilterOption, type BotSuggestionLead } from "@/hooks/useAgenda";
import { useWebAppointments } from "@/hooks/useWebAppointments"; 
import { WebAppointmentCard } from "@/components/features/agenda/WebAppointmentCard";
import { WebAppointmentDetailModal } from "@/components/features/agenda/WebAppointmentDetailModal";
import { WebAppointmentWithDetails as WebApptType } from "@/types/web-appointments";

import { AppointmentCard } from "@/components/features/agenda/AppointmentCard";
import { AppointmentModal } from "@/components/features/agenda/AppointmentModal";
import { BotSuggestionCard } from "@/components/features/agenda/BotSuggestionCard";

import { Button } from "@/components/ui/buttontable"; 
import { useAuth } from "@/hooks/useAuth";

export default function AgendaPage() {
    const { profile } = useAuth();
    
    // -- ESTADOS PARA MODALES --
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<AppointmentWithDetails | null>(null);
    const [suggestionData, setSuggestionData] = useState<any | null>(null); 

    const [isWebModalOpen, setIsWebModalOpen] = useState(false);
    const [selectedWebAppointment, setSelectedWebAppointment] = useState<WebApptType | null>(null);

    // -- ESTADO PARA SUB-PESTAÑAS DE HISTORIAL --
    const [historySubTab, setHistorySubTab] = useState<'leads' | 'web'>('leads');

    // Hooks de Lógica Principal
    const { 
        isLoading, 
        isAdmin,
        agents,
        groupedPending, 
        groupedHistory,
        botSuggestions, 
        pendingCount,
        suggestionsCount,
        activeTab,
        setActiveTab,
        filters,
        setFilters,
        actions: { markAsCompleted, cancelAppointment, discardSuggestion },
        refresh
    } = useAgenda();

    // Hook de Citas Web actualizado con acciones de notas y asignación
    const {
        appointments: webAppointments,
        loading: loadingWeb,
        currentFilter,
        setFilter,
        sortOrder,
        setSortOrder,
        actions: { 
            updateStatus: updateWebStatus, 
            assignToMe: autoAssignWeb,
            updateNotes: updateWebNotes // Nueva acción integrada
        }
    } = useWebAppointments();

    // --- LÓGICA DE FILTRADO PARA CITAS WEB (ADMIN/USER) ---
    const filteredWebAppointments = webAppointments.filter((appt: WebApptType) => {
        if (isAdmin) return true;
        return appt.responsible_id === profile?.id;
    });

    const webPendingCount = filteredWebAppointments.filter((a: WebApptType) => 
        a.status === 'pendiente' || a.status === 'aceptado' || a.status === 'reprogramado'
    ).length;

    const webHistoryRequests = filteredWebAppointments.filter((a: WebApptType) => 
        a.status === 'atendido' || a.status === 'cancelado'
    );

    // -- MANEJADORES --
    const handleOpenNew = () => {
        setEditingAppointment(null);
        setSuggestionData(null);
        setIsModalOpen(true);
    };

    const handleEdit = (appointment: AppointmentWithDetails) => {
        setEditingAppointment(appointment);
        setSuggestionData(null);
        setIsModalOpen(true);
    };

    const handleOpenWebDetail = (appt: WebApptType) => {
        setSelectedWebAppointment(appt);
        setIsWebModalOpen(true);
    };

    const handleProcessSuggestion = (lead: BotSuggestionLead) => {
        let finalDateObj = new Date(); 
        if (lead.time_reference) {
            finalDateObj = new Date(lead.time_reference);
        } else if (lead.day_detected && lead.hour_detected) {
            const dateTimeString = `${lead.day_detected}T${lead.hour_detected}`;
            const parsed = new Date(dateTimeString);
            if (!isNaN(parsed.getTime())) finalDateObj = parsed;
        } else if (lead.hour_detected) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const [hours, minutes] = lead.hour_detected.toString().split(':');
            tomorrow.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            finalDateObj = tomorrow;
        }
        const tzOffset = finalDateObj.getTimezoneOffset() * 60000; 
        const localISOTime = new Date(finalDateObj.getTime() - tzOffset).toISOString().slice(0, 16);

        setSuggestionData({
            title: `Cita con ${lead.name}`,
            lead_id: lead.id,
            external_client_name: lead.name,
            start_time: localISOTime, 
            location: "Por definir",
            notes: `Cita detectada automáticamente.\nVehículo de interés: ${lead.interested_cars?.[0]?.brand || ''} ${lead.interested_cars?.[0]?.model || ''}`
        });
        setEditingAppointment(null);
        setIsModalOpen(true);
    };

    const renderDaySection = (dateLabel: string, appointments: AppointmentWithDetails[]) => (
        <div key={dateLabel} className="animate-in fade-in slide-in-from-bottom-2 duration-500 mb-8">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                {dateLabel}
            </h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
                {appointments.map((appt) => (
                    <AppointmentCard 
                        key={appt.id} 
                        appointment={appt} 
                        isAdminView={isAdmin} 
                        onComplete={markAsCompleted}
                        onCancel={cancelAppointment}
                        onEdit={handleEdit}
                    />
                ))}
            </div>
        </div>
    );

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-slate-900">
                        {isAdmin ? 'Agenda General' : 'Mi Agenda'}
                    </h1>
                    <p className="text-md text-slate-500 mt-1">
                        {profile ? `Hola, ${profile.full_name}.` : 'Bienvenido.'} 
                        {pendingCount > 0 
                            ? ` Tienes ${pendingCount} eventos pendientes.` 
                            : ' No hay eventos pendientes.'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="primary" 
                        size="sm"
                        className="bg-black hover:bg-gray-700 text-white"
                        onClick={handleOpenNew}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Cita
                    </Button>
                </div>
            </div>

            {/* FILTROS ADMIN */}
            {isAdmin && activeTab !== 'web_requests' && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mr-2">
                        <Filter className="h-4 w-4" />
                        Filtros Admin:
                    </div>
                    <div className="flex-1 w-full md:w-auto">
                        <label className="text-xs text-slate-400 font-semibold block mb-1">Responsable</label>
                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <select
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none cursor-pointer"
                                value={filters.responsibleId}
                                onChange={(e) => setFilters(prev => ({ ...prev, responsibleId: e.target.value }))}
                            >
                                <option value="all">Todos los Responsables</option>
                                <option disabled>──────────</option>
                                {agents.map(agent => (
                                    <option key={agent.id} value={agent.id}>
                                        {agent.full_name || 'Agente Sin Nombre'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex-1 w-full md:w-auto">
                        <label className="text-xs text-slate-400 font-semibold block mb-1">Período de Tiempo</label>
                        <select
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none cursor-pointer"
                            value={filters.dateRange}
                            onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as DateFilterOption }))}
                        >
                            <option value="all">Todas las fechas</option>
                            <option disabled>──────────</option>
                            <option value="today">Solo Hoy</option>
                            <option value="tomorrow">Mañana</option>
                            <option value="week">Próximos 7 días</option>
                            <option value="fortnight">Próximos 15 días</option>
                            <option value="month">Próximos 30 días</option>
                        </select>
                    </div>
                    {(filters.responsibleId !== 'all' || filters.dateRange !== 'all') && (
                        <button 
                            onClick={() => setFilters({ responsibleId: 'all', dateRange: 'all' })}
                            className="mt-5 text-xs text-red-500 hover:text-red-700 font-medium underline"
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>
            )}

            {/* PESTAÑAS PRINCIPALES */}
            <div className="flex border-b border-slate-200 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                        activeTab === 'pending'
                        ? 'border-slate-900 text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                    <CalendarCheck className="h-4 w-4" />
                    Por Gestionar
                    {pendingCount > 0 && (
                        <span className="ml-1 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            {pendingCount}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('web_requests')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                        activeTab === 'web_requests'
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-slate-500 hover:text-blue-600 hover:border-blue-200'
                    }`}
                >
                    <Globe className="h-4 w-4" />
                    Solicitudes Web
                    {webPendingCount > 0 && (
                        <span className="ml-1 bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            {webPendingCount}
                        </span>
                    )}
                </button>
                
                <button
                    onClick={() => setActiveTab('suggestions')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                        activeTab === 'suggestions'
                        ? 'border-indigo-600 text-indigo-700'
                        : 'border-transparent text-slate-500 hover:text-indigo-600 hover:border-indigo-200'
                    }`}
                >
                    <Sparkles className="h-4 w-4" />
                    Sugerencias IA
                    {suggestionsCount > 0 && (
                        <span className="ml-1 bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            {suggestionsCount}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                        activeTab === 'history'
                        ? 'border-slate-900 text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                    <History className="h-4 w-4" />
                    Historial
                </button>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="min-h-[400px]">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64 text-slate-400 animate-pulse">
                        Cargando agenda...
                    </div>
                ) : activeTab === 'pending' ? (
                    Object.keys(groupedPending).length > 0 ? (
                        Object.entries(groupedPending).map(([date, list]) => 
                            renderDaySection(date, list)
                        )
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                             <div className="bg-green-50 p-4 rounded-full mb-4">
                                <CalendarCheck className="h-10 w-10 text-green-500" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">¡Estás al día!</h3>
                            <p className="text-slate-500 max-w-sm mt-2">No hay eventos pendientes.</p>
                        </div>
                    )

                ) : activeTab === 'web_requests' ? (
                    loadingWeb ? (
                        <div className="flex items-center justify-center h-40">Cargando solicitudes web...</div>
                    ) : (
                        <div className="py-6 space-y-6 animate-in fade-in">
                            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <ListFilter className="h-4 w-4 text-slate-400" />
                                        <select
                                            value={currentFilter}
                                            onChange={(e) => setFilter(e.target.value as any)}
                                            className="text-sm font-medium bg-transparent outline-none cursor-pointer text-slate-600 focus:text-blue-600"
                                        >
                                            <option value="all">Todos los estados</option>
                                            <option value="pendiente">Pendientes</option>
                                            <option value="aceptado">Solo Aceptados</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 border-l pl-4">
                                    {sortOrder === 'oldest' ? <SortAsc className="h-4 w-4 text-slate-400" /> : <SortDesc className="h-4 w-4 text-slate-400" />}
                                    <select
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value as any)}
                                        className="text-sm font-medium bg-transparent outline-none cursor-pointer text-slate-600"
                                    >
                                        <option value="oldest">Más antiguos primero</option>
                                        <option value="newest">Más recientes primero</option>
                                    </select>
                                </div>
                            </div>

                            <h3 className="flex items-center gap-2 text-sm font-bold text-blue-500 uppercase tracking-wider px-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                Solicitudes desde el Sitio Web ({filteredWebAppointments.filter(a => a.status !== 'atendido' && a.status !== 'cancelado').length})
                            </h3>

                            {filteredWebAppointments.filter(a => a.status !== 'atendido' && a.status !== 'cancelado').length > 0 ? (
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {filteredWebAppointments
                                        .filter(a => a.status !== 'atendido' && a.status !== 'cancelado')
                                        .map((appt: WebApptType) => (
                                        <WebAppointmentCard 
                                            key={appt.id}
                                            appointment={appt}
                                            currentUserId={profile?.id}
                                            onViewDetails={handleOpenWebDetail}
                                            onStatusChange={updateWebStatus}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                                    <div className="bg-blue-50 p-4 rounded-full mb-4">
                                        <Globe className="h-10 w-10 text-blue-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-900">Sin Solicitudes</h3>
                                    <p className="text-slate-500 max-w-sm mt-2">No se encontraron solicitudes web.</p>
                                </div>
                            )}
                        </div>
                    )

                ) : activeTab === 'suggestions' ? (
                    botSuggestions.length > 0 ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 py-6">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <h3 className="text-sm font-bold text-indigo-500 uppercase tracking-wider">
                                    Detectadas Automáticamente ({suggestionsCount})
                                </h3>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                {botSuggestions.map((suggestion) => (
                                    <BotSuggestionCard 
                                        key={suggestion.id} 
                                        suggestion={suggestion} 
                                        onSchedule={handleProcessSuggestion}
                                        onDiscard={discardSuggestion}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                            <div className="bg-indigo-50 p-4 rounded-full mb-4">
                                <Sparkles className="h-10 w-10 text-indigo-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">Sin sugerencias</h3>
                            <p className="text-slate-500 max-w-sm mt-2">El robot no ha detectado nuevas intenciones.</p>
                        </div>
                    )
                ) : (
                    /* APARTADO DE HISTORIAL */
                    <div className="space-y-6 animate-in fade-in duration-500 py-4">
                        <div className="flex items-center gap-2 p-1 bg-slate-200/50 w-fit rounded-xl border border-slate-200">
                            <button
                                onClick={() => setHistorySubTab('leads')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                    historySubTab === 'leads' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <LayoutGrid className="h-3.5 w-3.5" />
                                HISTORIAL LEADS
                            </button>
                            <button
                                onClick={() => setHistorySubTab('web')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                    historySubTab === 'web' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Globe className="h-3.5 w-3.5" />
                                HISTORIAL WEB
                            </button>
                        </div>

                        <div className="mt-6">
                            {historySubTab === 'leads' ? (
                                Object.keys(groupedHistory).length > 0 ? (
                                    Object.entries(groupedHistory).map(([date, list]) => renderDaySection(date, list))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                                        <History className="h-8 w-8 text-slate-300 mb-3" />
                                        <h3 className="text-md font-medium text-slate-900">Sin historial de leads</h3>
                                    </div>
                                )
                            ) : (
                                webHistoryRequests.length > 0 ? (
                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                        {webHistoryRequests.map((appt: WebApptType) => (
                                            <WebAppointmentCard 
                                                key={appt.id}
                                                appointment={appt}
                                                currentUserId={profile?.id}
                                                onViewDetails={handleOpenWebDetail}
                                                onStatusChange={updateWebStatus}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                                        <Globe className="h-8 w-8 text-blue-200 mb-3" />
                                        <h3 className="text-md font-medium text-slate-900">Sin historial web</h3>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* MODALES */}
            <AppointmentModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={refresh}
                appointmentToEdit={editingAppointment}
                initialData={suggestionData} 
            />

            <WebAppointmentDetailModal 
                isOpen={isWebModalOpen}
                onClose={() => setIsWebModalOpen(false)}
                appointment={selectedWebAppointment}
                currentUserId={profile?.id}
                onAssign={async (id: number) => {
                    if (selectedWebAppointment) return await autoAssignWeb(id);
                    return Promise.resolve(null);
                }}
                onCancel={async (id: number) => await updateWebStatus(id, 'cancelado')}
                onStatusChange={async (id: number, status: WebApptType['status']) => 
                    await updateWebStatus(id, status as any)
                }
                // CONEXIÓN DE LA NUEVA FUNCIONALIDAD DE NOTAS
                onUpdateNotes={async (id: number, notes: string) => 
                    await updateWebNotes(id, notes)
                }
            />
        </div>
    );
}