import React, { useEffect } from 'react';
import { useTestimonials } from '@/hooks/useTestimonials';
import { X, MessageCircle, Star, User, Car, Calendar } from 'lucide-react';

interface TestimonialsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TestimonialsModal({ isOpen, onClose }: TestimonialsModalProps) {
    const { testimonials, loading, fetchAllTestimonials } = useTestimonials();

    useEffect(() => {
        if (isOpen) fetchAllTestimonials();
    }, [isOpen, fetchAllTestimonials]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <MessageCircle className="h-6 w-6 text-orange-500" />
                            Gestión de Testimonios
                        </h2>
                        <p className="text-sm text-slate-500">Opiniones de clientes sobre K-si Nuevos</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="h-6 w-6 text-slate-500" />
                    </button>
                </div>

                {/* Grid de Tarjetas */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-100/30">
                    {loading && testimonials.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-4">
                            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-slate-500 font-medium">Cargando comentarios...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {testimonials.map((t) => (
                                <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 border border-orange-200">
                                                    <User className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 leading-tight">{t.customer_name}</h4>
                                                    <div className="flex gap-0.5 mt-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} className={`h-3 w-3 ${i < (t.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-slate-200"}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${t.display_on_home ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {t.display_on_home ? 'PÚBLICO' : 'PRIVADO'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 italic leading-relaxed mb-4">
                                            "{t.comment}"
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t border-slate-50 space-y-2">
                                        {t.inventory && (
                                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                                <Car className="h-3 w-3" />
                                                <span className="font-medium">{t.inventory.brand} {t.inventory.model}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                            <Calendar className="h-3 w-3" />
                                            {t.created_at ? new Date(t.created_at).toLocaleDateString() : '---'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}