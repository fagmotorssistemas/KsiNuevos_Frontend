import { useState } from "react";
import {
    Bot,
    Calendar,
    Clock,
    ArrowRight,
    ExternalLink,
    Trash2,
    AlertTriangle,
    X
} from "lucide-react";
import type { BotSuggestionLead } from "@/hooks/useAgenda";

interface BotSuggestionCardProps {
    suggestion: BotSuggestionLead;
    onSchedule: (lead: BotSuggestionLead) => void;
    onDiscard: (id: number) => void;
}

export function BotSuggestionCard({ suggestion, onSchedule, onDiscard }: BotSuggestionCardProps) {
    const { name, phone, time_reference, hour_detected, day_detected, interested_cars, lead_id_kommo } = suggestion;

    const [showDeleteModal, setShowDeleteModal] = useState(false);

    let suggestedDateStr = "Fecha por confirmar";
    let suggestedTimeStr = "--:--";

    if (time_reference) {
        const date = new Date(time_reference);
        
        // --- CORRECCIÓN DEFINITIVA ---
        // Usamos timeZone: 'UTC' para forzar que la fecha se muestre tal cual está en la BD (ej: 12:00+00)
        // y prevenir que el navegador le reste 5 horas por estar en Ecuador.
        suggestedDateStr = date.toLocaleDateString('es-EC', { 
            weekday: 'short', 
            day: 'numeric', 
            month: 'short',
            timeZone: 'UTC' // Importante: Evita que cambie el día si la resta de horas cruza la medianoche
        });

        if (hour_detected) {
            suggestedTimeStr = hour_detected.toString().slice(0, 5); 
        } else {
            // Si no hay hour_detected, usamos la hora de time_reference pero forzando UTC
            // para que 12:00:00+00 se muestre como 12:00 y no como 07:00
            suggestedTimeStr = date.toLocaleTimeString('es-EC', { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'UTC' // Importante: Muestra la hora "cruda" del servidor
            });
        }
    } else {
        if (day_detected) {
            const [y, m, d] = day_detected.toString().split('-');
            const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            suggestedDateStr = date.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' });
        } else if (hour_detected) {
            suggestedDateStr = "Posiblemente Hoy";
        }

        if (hour_detected) {
            suggestedTimeStr = hour_detected.toString().slice(0, 5);
        }
    }

    const car = interested_cars?.[0];

    const handleOpenKommo = () => {
        if (lead_id_kommo) {
            window.open(`https://marketingfagmotorsurfacom.kommo.com/leads/detail/${lead_id_kommo}`, '_blank');
        } else {
            alert("Este lead no tiene ID de Kommo asociado.");
        }
    };

    const handleConfirmDiscard = () => {
        onDiscard(suggestion.id);
        setShowDeleteModal(false);
    };

    return (
        <>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-xl border border-indigo-100 bg-white hover:border-indigo-300 hover:shadow-md transition-all group relative">

                {/* Icono Bot */}
                <div className="p-3 bg-indigo-50 rounded-full text-indigo-600 shrink-0 relative">
                    <Bot className="h-6 w-6" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                    </span>
                </div>

                {/* Info Principal */}
                <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center justify-between md:justify-start gap-2 mb-1">
                        <h3 className="text-base font-bold text-slate-800 truncate">{name}</h3>
                        {lead_id_kommo && (
                            <button
                                onClick={handleOpenKommo}
                                className="md:hidden text-slate-400 hover:text-[#2c86fe]"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800 bg-indigo-50 px-2 py-0.5 rounded">
                            <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                            <span>{suggestedDateStr}</span>
                            <span className="text-indigo-300">|</span>
                            <Clock className="h-3.5 w-3.5 text-indigo-600" />
                            <span>{suggestedTimeStr}</span>
                        </div>

                        {phone && <span className="text-slate-400 text-xs hidden sm:inline">• {phone}</span>}
                        {car && <span className="text-slate-400 text-xs hidden sm:inline">• {car.brand} {car.model}</span>}
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Descartar sugerencia"
                    >
                        <Trash2 className="h-5 w-5" />
                    </button>

                    {lead_id_kommo && (
                        <button
                            onClick={handleOpenKommo}
                            className="hidden md:flex p-2 text-slate-400 hover:text-[#2c86fe] hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver en Kommo"
                        >
                            <ExternalLink className="h-5 w-5" />
                        </button>
                    )}

                    <button
                        onClick={() => onSchedule(suggestion)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-indigo-200 transition-colors"
                    >
                        Agendar
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* MODAL */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 relative animate-in zoom-in-95 duration-200">

                        <button
                            onClick={() => setShowDeleteModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                                <AlertTriangle className="h-6 w-6" />
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 mb-2">
                                ¿Descartar sugerencia?
                            </h3>

                            <p className="text-sm text-slate-500 mb-6">
                                Esta acción eliminará la sugerencia de la lista. ¿Estás seguro de que deseas continuar?
                            </p>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmDiscard}
                                    className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                                >
                                    Sí, descartar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}