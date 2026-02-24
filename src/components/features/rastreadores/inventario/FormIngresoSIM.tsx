"use client";

import { useState } from "react";
import { IngresoSIMPayload } from "@/types/rastreadores.types";
import { rastreadoresService } from "@/services/rastreadores.service";

interface Props {
    onSuccess: () => void;
}

export function FormIngresoSIM({ onSuccess }: Props) {
    const [formData, setFormData] = useState<IngresoSIMPayload>({
        iccid: '',
        numero: '',
        operadora: '',
        costo_mensual: 0
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await rastreadoresService.insertarSIM(formData);
            onSuccess();
            // Limpiar formulario
            setFormData({ iccid: '', numero: '', operadora: '', costo_mensual: 0 });
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                Ingreso de Nueva SIM
            </h3>
            
            <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">ICCID *</label>
                <input 
                    type="text" 
                    required 
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-sm"
                    value={formData.iccid}
                    onChange={(e) => setFormData({...formData, iccid: e.target.value})}
                />
            </div>
            <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Número *</label>
                <input 
                    type="text" 
                    required 
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-sm"
                    value={formData.numero}
                    onChange={(e) => setFormData({...formData, numero: e.target.value})}
                />
            </div>
            <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Operadora *</label>
                <input 
                    type="text" 
                    required 
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-sm"
                    value={formData.operadora}
                    onChange={(e) => setFormData({...formData, operadora: e.target.value})}
                />
            </div>
            <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Costo Mensual *</label>
                <input 
                    type="number" 
                    required 
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-sm"
                    value={formData.costo_mensual}
                    onChange={(e) => setFormData({...formData, costo_mensual: Number(e.target.value)})}
                />
            </div>
            
            <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase rounded-xl transition-colors disabled:opacity-50"
            >
                {isSubmitting ? 'Guardando...' : 'Guardar SIM'}
            </button>
        </form>
    );
}