"use client";

import { useState } from "react";
import { 
    CalendarCheck, 
    History, 
    CalendarX, 
    Plus 
} from "lucide-react";

// Features
import { useAgenda, type AppointmentWithDetails } from "@/features/../hooks/useAgenda";
import { AppointmentCard } from "@/components/features/agenda/AppointmentCard";

// UI
import { Button } from "@/components/ui/buttontable";
import { useAuth } from "@/hooks/useAuth";

export default function AgendaPage() {
    const { profile } = useAuth();
    
    const { 
        isLoading, 
        groupedPending, 
        groupedHistory,
        activeTab,
        setActiveTab,
        actions: { markAsCompleted, cancelAppointment },
        refresh
    } = useAgenda();

    // Calculamos totales para los badges de las pestañas
    const pendingCount = Object.values(groupedPending).flat().length;
    const historyCount = Object.values(groupedHistory).flat().length;

    // Helper para renderizar una sección de día
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
                    <h1 className="text-3xl font-semibold text-slate-900">Mi Agenda</h1>
                    <p className="text-md text-slate-500 mt-1">
                        {profile ? `Hola, ${profile.full_name}.` : 'Bienvenido.'} 
                        {pendingCount > 0 
                            ? ` Tienes ${pendingCount} citas pendientes.` 
                            : ' No tienes citas pendientes.'}
                    </p>
                </div>
                <div>
                    <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={refresh} 
                        disabled={isLoading}
                    >
                        {isLoading ? 'Sincronizando...' : 'Actualizar Agenda'}
                    </Button>
                </div>
            </div>

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
                    // Estado de Carga
                    <div className="flex items-center justify-center h-64 text-slate-400 animate-pulse">
                        Cargando tu agenda...
                    </div>
                ) : activeTab === 'pending' ? (
                    // --- VISTA PENDIENTES ---
                    Object.keys(groupedPending).length > 0 ? (
                        Object.entries(groupedPending).map(([date, list]) => 
                            renderDaySection(date, list)
                        )
                    ) : (
                        // Empty State (Pendientes)
                        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                            <div className="bg-green-50 p-4 rounded-full mb-4">
                                <CalendarCheck className="h-10 w-10 text-green-500" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">¡Estás al día!</h3>
                            <p className="text-slate-500 max-w-sm mt-2">
                                No tienes citas pendientes por ahora. Ve al tablero de Leads para agendar nuevas visitas.
                            </p>
                        </div>
                    )
                ) : (
                    // --- VISTA HISTORIAL ---
                    Object.keys(groupedHistory).length > 0 ? (
                        Object.entries(groupedHistory).map(([date, list]) => 
                            renderDaySection(date, list)
                        )
                    ) : (
                        // Empty State (Historial)
                        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                            <div className="bg-slate-50 p-4 rounded-full mb-4">
                                <CalendarX className="h-10 w-10 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">Sin historial</h3>
                            <p className="text-slate-500 max-w-sm mt-2">
                                Aún no has completado o cancelado ninguna cita.
                            </p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}