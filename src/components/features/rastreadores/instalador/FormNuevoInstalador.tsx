"use client";

import { useState } from "react";
import { NuevoInstaladorPayload } from "@/types/rastreadores.types";
import { instaladoresService } from "@/services/instaladores.service";

interface Props {
    onSuccess: () => void;
}

export function FormNuevoInstalador({ onSuccess }: Props) {
    const [formData, setFormData] = useState<NuevoInstaladorPayload>({
        nombre: '',
        telefono: '',
        valor_por_instalacion: 0
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await instaladoresService.crearInstalador(formData);
            onSuccess();
            setFormData({ nombre: '', telefono: '', valor_por_instalacion: 0 }); 
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border-2 border-slate-300 shadow-md space-y-5">
            <h3 className="text-sm font-black text-black uppercase tracking-wide border-b-2 border-slate-200 pb-3">
                Registrar Técnico / Instalador
            </h3>
            
            <div>
                <label className="text-xs font-black text-black uppercase tracking-wider">Nombre Completo *</label>
                <input 
                    type="text" required 
                    className="w-full mt-2 p-3 border-2 border-slate-300 focus:border-black focus:ring-0 rounded-lg text-black font-bold outline-none transition-colors"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    placeholder="Ej. Juan Pérez"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-black text-black uppercase tracking-wider">Teléfono</label>
                    <input 
                        type="text" 
                        className="w-full mt-2 p-3 border-2 border-slate-300 focus:border-black focus:ring-0 rounded-lg text-black font-bold outline-none transition-colors"
                        value={formData.telefono}
                        onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                        placeholder="09..."
                    />
                </div>
                <div>
                    <label className="text-xs font-black text-black uppercase tracking-wider">Tarifa por Inst. ($) *</label>
                    <input 
                        type="number" step="0.01" required min="0"
                        className="w-full mt-2 p-3 border-2 border-slate-300 focus:border-black focus:ring-0 rounded-lg text-black font-black outline-none transition-colors"
                        value={formData.valor_por_instalacion}
                        onChange={(e) => setFormData({...formData, valor_por_instalacion: parseFloat(e.target.value)})}
                    />
                </div>
            </div>
            
            <button 
                type="submit" disabled={isSubmitting}
                className="w-full py-4 mt-2 bg-black hover:bg-slate-800 text-white text-sm font-black uppercase tracking-widest rounded-xl transition-colors disabled:opacity-50"
            >
                {isSubmitting ? 'Guardando...' : 'Guardar Instalador'}
            </button>
        </form>
    );
}