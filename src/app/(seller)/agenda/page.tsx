"use client";

import { useState } from "react";
import { 
    CalendarCheck, 
    History, 
    CalendarX, 
    Filter,
    Users,
    Plus
} from "lucide-react";

// Features
import { useAgenda, type AppointmentWithDetails, type DateFilterOption } from "@/hooks/useAgenda";
import { AppointmentCard } from "@/components/features/agenda/AppointmentCard";
import { AppointmentModal } from "@/components/features/agenda/AppointmentModal";

// UI
import { Button } from "@/components/ui/buttontable"; // Asegúrate de que la ruta sea correcta
import { useAuth } from "@/hooks/useAuth";

export default function AgendaPage() {
    const { profile } = useAuth();
    
    // Estado para controlar el Modal
    const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);

    const { 
        isLoading, 
        isAdmin,
        agents,
        groupedPending, 
        groupedHistory,
        pendingCount,
        activeTab,
        setActiveTab,
        filters,
        setFilters,
        actions: { markAsCompleted, cancelAppointment },
        refresh
    } = useAgenda();

    const renderDaySection = (dateLabel: string, appointments: AppointmentWithDetails[]) => (
        <div key={dateLabel} className="animate-in fade-in slide-in-from-bottom-2 duration-500 mb-8">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                {dateLabel}
            </h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {appointments.map((appt) => (
                    <AppointmentCard 
                        key={appt.id} 
                        appointment={appt} 
                        isAdminView={isAdmin} 
                        onComplete={markAsCompleted}
                        onCancel={cancelAppointment}
                    />
                ))}
            </div>
        </div>
    );

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            
            {/* 1. HEADER */}
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
                    {/* Botón para abrir el Modal */}
                    <Button 
                        variant="primary" 
                        size="sm"
                        className="bg-black hover:bg-gray-700 text-white"
                        onClick={() => setIsNewAppointmentOpen(true)}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Cita
                    </Button>
                </div>
            </div>

            {/* --- SECCIÓN ADMIN: FILTROS --- */}
            {isAdmin && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mr-2">
                        <Filter className="h-4 w-4" />
                        Filtros Admin:
                    </div>

                    {/* Filtro de Responsable */}
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

                    {/* Filtro de Tiempo */}
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

            {/* 2. PESTAÑAS (TABS) */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all ${
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
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all ${
                        activeTab === 'history'
                        ? 'border-slate-900 text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                    <History className="h-4 w-4" />
                    Historial
                </button>
            </div>

            {/* 3. CONTENIDO PRINCIPAL */}
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
                            <h3 className="text-lg font-medium text-slate-900">
                                {filters.responsibleId !== 'all' || filters.dateRange !== 'all' ? 'Sin resultados' : '¡Estás al día!'}
                            </h3>
                            <p className="text-slate-500 max-w-sm mt-2">
                                {filters.responsibleId !== 'all' || filters.dateRange !== 'all' 
                                    ? 'No hay citas que coincidan con los filtros seleccionados.' 
                                    : 'No tienes citas ni eventos pendientes.'}
                            </p>
                        </div>
                    )
                ) : (
                    Object.keys(groupedHistory).length > 0 ? (
                        Object.entries(groupedHistory).map(([date, list]) => 
                            renderDaySection(date, list)
                        )
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                            <div className="bg-slate-50 p-4 rounded-full mb-4">
                                <CalendarX className="h-10 w-10 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">Sin historial</h3>
                            <p className="text-slate-500 max-w-sm mt-2">
                                No se encontraron citas completadas o canceladas.
                            </p>
                        </div>
                    )
                )}
            </div>

            {/* 4. MODAL DE NUEVA CITA */}
            <AppointmentModal 
                isOpen={isNewAppointmentOpen}
                onClose={() => setIsNewAppointmentOpen(false)}
                onSuccess={refresh}
                // Si tienes un lead preseleccionado, puedes pasarlo aquí: leadId={null}
            />

        </div>
    );
}