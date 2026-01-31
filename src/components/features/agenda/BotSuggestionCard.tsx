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
        
        suggestedDateStr = date.toLocaleDateString('es-EC', { 
            weekday: 'short', 
            day: 'numeric', 
            month: 'short',
            timeZone: 'UTC' 
        });

        if (hour_detected) {
            suggestedTimeStr = hour_detected.toString().slice(0, 5); 
        } else {
            suggestedTimeStr = date.toLocaleTimeString('es-EC', { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'UTC' 
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
            {/* Contenedor: Minimalismo puro. Borde gris suave que se oscurece levemente al hover */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm transition-all group relative">

                {/* Icono Bot: Fondo gris casi blanco con icono en negro suave. El punto de actividad es el único acento rojo */}
                <div className="p-3 bg-gray-50 rounded-full text-gray-700 shrink-0 relative border border-gray-100">
                    <Bot className="h-6 w-6" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-20"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                </div>

                {/* Info Principal */}
                <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center justify-between md:justify-start gap-2 mb-1">
                        <h3 className="text-base font-bold text-gray-900 truncate">{name}</h3>
                        {lead_id_kommo && (
                            <button
                                onClick={handleOpenKommo}
                                className="md:hidden text-gray-400 hover:text-red-600 transition-colors"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                        {/* Badge de Tiempo: Monocromático para no distraer, con bordes definidos */}
                        <div className="flex items-center gap-1.5 font-medium text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            <span>{suggestedDateStr}</span>
                            <span className="text-gray-300">|</span>
                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                            <span>{suggestedTimeStr}</span>
                        </div>

                        {phone && <span className="text-gray-400 text-xs hidden sm:inline">• {phone}</span>}
                        {car && <span className="text-gray-400 text-xs hidden sm:inline">• {car.brand} {car.model}</span>}
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors rounded-lg"
                        title="Descartar sugerencia"
                    >
                        <Trash2 className="h-5 w-5" />
                    </button>

                    {lead_id_kommo && (
                        <button
                            onClick={handleOpenKommo}
                            className="hidden md:flex p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                            title="Ver en Kommo"
                        >
                            <ExternalLink className="h-5 w-5" />
                        </button>
                    )}

                    {/* Botón Agendar: Negro profundo con texto blanco para autoridad, hover con un rojo muy sutil */}
                    <button
                        onClick={() => onSchedule(suggestion)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-all shadow-sm active:scale-95"
                    >
                        Agendar
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* MODAL */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 relative border border-gray-100">

                        <button
                            onClick={() => setShowDeleteModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-black"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="h-12 w-12 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-600">
                                <AlertTriangle className="h-6 w-6" />
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                                ¿Descartar sugerencia?
                            </h3>

                            <p className="text-sm text-gray-500 mb-6">
                                Se eliminará de la lista de pendientes.
                            </p>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    No, volver
                                </button>
                                <button
                                    onClick={handleConfirmDiscard}
                                    className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
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