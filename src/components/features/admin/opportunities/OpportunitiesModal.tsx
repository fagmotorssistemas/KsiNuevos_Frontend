"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface OpportunitiesModalProps {
    children: React.ReactNode;
    onClose: () => void;
}

export function OpportunitiesModal({ children, onClose }: OpportunitiesModalProps) {
    // Bloquear scroll del body
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // Cerrar con Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 h-[100vh] backdrop-blur-sm animate-in fade-in duration-200" />

            {/* Modal */}
            <div className="relative w-full max-w-5xl max-h-[85vh] overflow-y-auto
                bg-white rounded-2xl shadow-2xl
                animate-in fade-in slide-in-from-bottom-4 duration-300"
            >
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between
                    px-6 py-4 bg-white border-b border-slate-100 rounded-t-2xl"
                >
                    <h2 className="text-lg font-black text-slate-900">Mejores Oportunidades</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 
                            hover:bg-slate-100 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}