"use client";

import { useState } from "react";
import { X, Save, Loader2, CalendarClock, Zap } from "lucide-react";

interface NuevoGastoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<any>;
}

export function NuevoGastoModal({ isOpen, onClose, onSave }: NuevoGastoModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [nombre, setNombre] = useState('');
    const [monto, setMonto] = useState('');
    const [diaLimite, setDiaLimite] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        await onSave({
            nombre,
            monto_habitual: parseFloat(monto) || 0,
            dia_limite_pago: parseInt(diaLimite) || 5
        });
        setIsLoading(false);
        onClose();
        setNombre('');
        setMonto('');
        setDiaLimite('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-orange-500" />
                        Nuevo Gasto Fijo
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nombre del Servicio</label>
                        <input 
                            required
                            type="text" 
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ej: Empresa Eléctrica, Arriendo..."
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Costo Estimado</label>
                            <input 
                                required
                                type="number" 
                                step="0.01"
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="0.00"
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1 flex items-center gap-1">
                                Día de Pago <CalendarClock className="h-3 w-3" />
                            </label>
                            <input 
                                required
                                type="number" 
                                min="1" max="31"
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ej: 5"
                                value={diaLimite}
                                onChange={(e) => setDiaLimite(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 flex justify-center items-center gap-2">
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            Crear
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}