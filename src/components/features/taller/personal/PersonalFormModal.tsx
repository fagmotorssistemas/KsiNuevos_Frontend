"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2, User, Briefcase, DollarSign, Calendar } from "lucide-react";
import type { TallerPersonal, CandidatoProfile } from "@/types/taller";

interface PersonalFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any, esNuevo: boolean) => Promise<any>;
    itemToEdit?: TallerPersonal | null;
    candidatos: CandidatoProfile[];
}

export function PersonalFormModal({ isOpen, onClose, onSave, itemToEdit, candidatos }: PersonalFormModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    
    // Estados
    const [profileId, setProfileId] = useState("");
    const [cargo, setCargo] = useState("");
    const [salario, setSalario] = useState("");
    const [fechaIngreso, setFechaIngreso] = useState("");
    const [banco, setBanco] = useState("");
    const [activo, setActivo] = useState(true);

    useEffect(() => {
        if (itemToEdit) {
            setProfileId(itemToEdit.profile_id);
            setCargo(itemToEdit.cargo);
            setSalario(itemToEdit.salario_mensual.toString());
            setFechaIngreso(itemToEdit.fecha_ingreso || "");
            setBanco(itemToEdit.datos_bancarios || "");
            setActivo(itemToEdit.activo);
        } else {
            // Reset
            setProfileId("");
            setCargo("");
            setSalario("");
            setFechaIngreso(new Date().toISOString().split('T')[0]);
            setBanco("");
            setActivo(true);
        }
    }, [itemToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        const payload = {
            id: itemToEdit?.id, // Solo si editamos
            profile_id: profileId,
            cargo,
            salario_mensual: parseFloat(salario) || 0,
            fecha_ingreso: fechaIngreso,
            datos_bancarios: banco,
            activo
        };

        await onSave(payload, !itemToEdit);
        setIsLoading(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-blue-600" />
                        {itemToEdit ? "Editar Ficha de Empleado" : "Contratar Nuevo Personal"}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    
                    {/* Selector de Usuario (Solo si es nuevo) */}
                    {!itemToEdit && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Usuario del Sistema</label>
                            {candidatos.length > 0 ? (
                                <select 
                                    required
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    value={profileId}
                                    onChange={(e) => setProfileId(e.target.value)}
                                >
                                    <option value="">-- Seleccionar Usuario --</option>
                                    {candidatos.map(c => (
                                        <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="p-3 bg-orange-50 text-orange-600 text-sm rounded-lg border border-orange-100">
                                    No hay usuarios disponibles para contratar. Crea primero una cuenta de usuario en el sistema.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Si editamos, mostramos quién es */}
                    {itemToEdit && (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="h-10 w-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold">
                                {itemToEdit.profile?.full_name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-bold text-slate-800">{itemToEdit.profile?.full_name}</p>
                                <p className="text-xs text-slate-500">{itemToEdit.profile?.email}</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cargo / Puesto</label>
                            <input 
                                required
                                type="text" 
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ej: Jefe de Taller"
                                value={cargo}
                                onChange={(e) => setCargo(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Salario Mensual ($)</label>
                            <input 
                                required
                                type="number" 
                                min="0"
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="0.00"
                                value={salario}
                                onChange={(e) => setSalario(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Datos Bancarios</label>
                        <textarea 
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none text-sm"
                            placeholder="Ej: Banco Pichincha, Ahorros, #1234567890"
                            value={banco}
                            onChange={(e) => setBanco(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-center">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Fecha Ingreso</label>
                            <input 
                                type="date" 
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={fechaIngreso}
                                onChange={(e) => setFechaIngreso(e.target.value)}
                            />
                        </div>
                        
                        {/* Toggle Activo */}
                        {itemToEdit && (
                            <div className="flex items-center gap-3 pt-4">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={activo}
                                        onChange={(e) => setActivo(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                    <span className="ml-3 text-sm font-medium text-slate-700">
                                        {activo ? 'Empleado Activo' : 'Inactivo / Baja'}
                                    </span>
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 flex justify-center items-center gap-2">
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            Guardar Ficha
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}