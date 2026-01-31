'use client'

import React, { useEffect } from 'react';
import { useTestimonials } from '@/hooks/useTestimonials';
import { 
    MessageCircle, 
    Star, 
    User, 
    Car, 
    Calendar, 
    CheckCircle2, 
    XCircle, 
    Trash2 
} from 'lucide-react';

export function TestimonialsView() {
    // Importamos las nuevas funciones desde el hook
    const { 
        testimonials, 
        loading, 
        fetchAllTestimonials, 
        updateTestimonialStatus, 
        deleteTestimonial 
    } = useTestimonials();

    useEffect(() => {
        fetchAllTestimonials();
    }, [fetchAllTestimonials]);

    // Función manejadora para eliminar con confirmación
    const handleDelete = async (id: number) => {
        if (confirm("¿Estás seguro de que deseas eliminar este testimonio permanentemente?")) {
            await deleteTestimonial(id);
        }
    };

    if (loading && testimonials.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4 bg-white rounded-xl border border-slate-200">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium">Cargando testimonios de K-si Nuevos...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
            {/* Encabezado de la Sección */}
            <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-100 rounded-lg text-amber-600 shadow-sm">
                        <MessageCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-amber-900 text-lg">Gestión de Reseñas</h3>
                        <p className="text-sm text-amber-700/80">Monitorea y modera las opiniones de tus clientes en la web.</p>
                    </div>
                </div>
                <div className="bg-white px-6 py-2 rounded-lg border border-amber-200 shadow-sm text-center">
                    <span className="block text-2xl font-black text-amber-900 leading-none">{testimonials.length}</span>
                    <span className="text-[10px] uppercase font-bold text-amber-500 tracking-widest">Total Feedback</span>
                </div>
            </div>

            {/* Grid de Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {testimonials.map((t) => (
                    <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                        <div className="flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 group-hover:border-amber-200 group-hover:bg-amber-50 transition-colors">
                                        <User className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{t.customer_name}</h4>
                                        <div className="flex gap-0.5 mt-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`h-3.5 w-3.5 ${i < (t.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-slate-200"}`} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                    t.display_on_home 
                                    ? 'bg-green-50 text-green-700 border-green-100' 
                                    : 'bg-slate-50 text-slate-500 border-slate-200'
                                }`}>
                                    {t.display_on_home ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                    {t.display_on_home ? 'VISIBLE' : 'BORRADOR'}
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 italic leading-relaxed mb-6 border-l-2 border-slate-100 pl-4">
                                "{t.comment}"
                            </p>
                        </div>

                        {/* Footer de la Card con Info y Botones */}
                        <div className="mt-4 pt-4 border-t border-slate-50 space-y-4">
                            <div className="flex flex-col gap-2">
                                {t.inventory && (
                                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                                        <Car className="h-4 w-4 text-slate-400" />
                                        <span>Vehículo: {t.inventory.brand} {t.inventory.model}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>Fecha: {t.created_at ? new Date(t.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' }) : '---'}</span>
                                </div>
                            </div>

                            {/* SECCIÓN DE BOTONES DE ACCIÓN */}
                            <div className="flex items-center gap-2">
                                {!t.display_on_home ? (
                                    <button
                                        onClick={() => updateTestimonialStatus(t.id, true)}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors shadow-sm"
                                    >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Publicar
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => updateTestimonialStatus(t.id, false)}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors border border-slate-200"
                                    >
                                        <XCircle className="h-3.5 w-3.5" />
                                        Quitar
                                    </button>
                                )}

                                <button
                                    onClick={() => handleDelete(t.id)}
                                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors border border-red-100"
                                    title="Eliminar comentario"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}