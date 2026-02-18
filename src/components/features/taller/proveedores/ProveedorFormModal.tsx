"use client";

import { useState, useEffect } from "react";
import { X, Save, Truck, Loader2 } from "lucide-react";
import type { TallerProveedor } from "@/types/taller";

interface ProveedorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<any>;
    itemToEdit?: TallerProveedor | null;
}

export function ProveedorFormModal({ isOpen, onClose, onSave, itemToEdit }: ProveedorModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        nombre_comercial: "",
        ruc: "",
        telefono: "",
        categoria: "Repuestos",
        contacto_nombre: "",
        email: "",
        dia_pago_habitual: "",
        notas: ""
    });

    useEffect(() => {
        if (itemToEdit) {
            setFormData({
                nombre_comercial: itemToEdit.nombre_comercial,
                ruc: itemToEdit.ruc || "",
                telefono: itemToEdit.telefono || "",
                categoria: itemToEdit.categoria || "Repuestos",
                contacto_nombre: itemToEdit.contacto_nombre || "",
                email: itemToEdit.email || "",
                dia_pago_habitual: itemToEdit.dia_pago_habitual?.toString() || "",
                notas: itemToEdit.notas || ""
            });
        } else {
            setFormData({
                nombre_comercial: "",
                ruc: "",
                telefono: "",
                categoria: "Repuestos",
                contacto_nombre: "",
                email: "",
                dia_pago_habitual: "",
                notas: ""
            });
        }
    }, [itemToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Convertir día a número si existe
        const payload = {
            ...formData,
            dia_pago_habitual: formData.dia_pago_habitual ? parseInt(formData.dia_pago_habitual) : null
        };
        await onSave(payload);
        setIsLoading(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Truck className="h-5 w-5 text-blue-600" />
                        {itemToEdit ? "Editar Proveedor" : "Nuevo Proveedor"}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Datos Principales */}
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nombre Comercial <span className="text-red-500">*</span></label>
                            <input 
                                required
                                type="text" 
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ej: Importadora de Repuestos S.A."
                                value={formData.nombre_comercial}
                                onChange={e => setFormData({...formData, nombre_comercial: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">RUC / ID</label>
                            <input 
                                type="text" 
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="010xxxxxxx001"
                                value={formData.ruc}
                                onChange={e => setFormData({...formData, ruc: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Categoría</label>
                            <select 
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                value={formData.categoria}
                                onChange={e => setFormData({...formData, categoria: e.target.value})}
                            >
                                <option value="Repuestos">Repuestos</option>
                                <option value="Lubricantes">Lubricantes</option>
                                <option value="Servicios">Servicios (Tercerizados)</option>
                                <option value="Insumos">Insumos/Varios</option>
                            </select>
                        </div>

                        {/* Datos de Contacto */}
                        <div className="md:col-span-2 border-t border-slate-100 pt-2 mt-2">
                            <span className="text-xs font-bold text-blue-600 uppercase mb-3 block">Información de Contacto</span>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Persona de Contacto</label>
                            <input 
                                type="text" 
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ej: Juan Pérez"
                                value={formData.contacto_nombre}
                                onChange={e => setFormData({...formData, contacto_nombre: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Teléfono / Celular</label>
                            <input 
                                type="text" 
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="09xxxxxxxx"
                                value={formData.telefono}
                                onChange={e => setFormData({...formData, telefono: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Email</label>
                            <input 
                                type="email" 
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="contacto@empresa.com"
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Día Habitual de Pago</label>
                            <input 
                                type="number" 
                                min="1" max="31"
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ej: 15 (de cada mes)"
                                value={formData.dia_pago_habitual}
                                onChange={e => setFormData({...formData, dia_pago_habitual: e.target.value})}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Notas Adicionales</label>
                            <textarea 
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                                placeholder="Información bancaria, horarios de atención, etc..."
                                value={formData.notas}
                                onChange={e => setFormData({...formData, notas: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex justify-center items-center gap-2"
                        >
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}