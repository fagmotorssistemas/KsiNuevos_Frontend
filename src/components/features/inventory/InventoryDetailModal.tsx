import { useState, useEffect } from "react";
import {
    X, Save, Car, Share2, MapPin, Tag,
    DollarSign, Gauge, Calendar, AlertCircle,
    CheckCircle2, Loader2, Image as ImageIcon
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import type { InventoryCar } from "../../../hooks/useInventory";

// Componentes UI Locales (Inputs Estilizados)
const InputGroup = ({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            {label}
            {required && <span className="text-red-500">*</span>}
        </label>
        {children}
    </div>
);

const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        className={`w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm text-slate-800 placeholder:text-slate-400 ${className}`}
        {...props}
    />
);

const Select = ({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <div className="relative">
        <select
            className={`w-full h-10 px-3 pr-8 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm text-slate-800 appearance-none cursor-pointer ${className}`}
            {...props}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
    </div>
);

interface InventoryDetailModalProps {
    car: InventoryCar;
    onClose: () => void;
    onUpdate: () => void; // Para recargar la tabla al guardar
}

export function InventoryDetailModal({ car, onClose, onUpdate }: InventoryDetailModalProps) {
    const { supabase } = useAuth();
    const [activeTab, setActiveTab] = useState<'general' | 'marketing'>('general');
    const [isSaving, setIsSaving] = useState(false);

    // Estado del Formulario (Inicializado con los datos del auto)
    const [formData, setFormData] = useState({
        price: car.price || 0,
        mileage: car.mileage || 0,
        status: car.status || 'disponible',
        location: car.location || 'patio',
        description: car.description || '',
        // Marketing
        marketing_in_patio: car.marketing_in_patio || false,
        marketing_posts_count: car.marketing_posts_count || 0,
        marketing_videos_count: car.marketing_videos_count || 0,
        marketing_stories_count: car.marketing_stories_count || 0,
        img_main_url: car.img_main_url || '',
        // Datos Técnicos (Editables)
        color: car.color || '',
        plate_short: car.plate_short || '',
        year: car.year || new Date().getFullYear()
    });

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('inventory')
                .update({
                    price: Number(formData.price),
                    mileage: Number(formData.mileage),
                    status: formData.status as any,
                    location: formData.location as any,
                    description: formData.description,
                    marketing_in_patio: formData.marketing_in_patio,
                    marketing_posts_count: Number(formData.marketing_posts_count),
                    marketing_videos_count: Number(formData.marketing_videos_count),
                    marketing_stories_count: Number(formData.marketing_stories_count),
                    img_main_url: formData.img_main_url,
                    color: formData.color,
                    year: Number(formData.year)
                })
                .eq('id', car.id);

            if (error) throw error;

            onUpdate(); // Recargar datos en la tabla
            onClose();  // Cerrar modal
        } catch (error) {
            console.error("Error al actualizar vehículo:", error);
            alert("Hubo un error al guardar los cambios.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* HEADER */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            {car.brand.toUpperCase()} {car.model.toUpperCase()}
                            <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                {formData.year}
                            </span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            <span className="font-mono bg-slate-100 px-1 rounded text-slate-600">
                                {car.plate || formData.plate_short || 'S/P'}
                            </span>
                            • {car.type_body || 'Vehículo'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* TABS */}
                <div className="flex border-b border-slate-100 bg-slate-50/50 px-6">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general'
                                ? 'border-brand-600 text-brand-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Car className="h-4 w-4" /> Datos Generales
                    </button>
                    <button
                        onClick={() => setActiveTab('marketing')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'marketing'
                                ? 'border-brand-600 text-brand-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Share2 className="h-4 w-4" /> Marketing
                    </button>
                </div>

                {/* BODY (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 bg-white">

                    {/* --- PESTAÑA GENERAL --- */}
                    {activeTab === 'general' && (
                        <div className="space-y-6">

                            {/* Estado y Ubicación (Fila 1) */}
                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup label="Estado del Vehículo" required>
                                    <Select
                                        value={formData.status}
                                        onChange={(e) => handleChange('status', e.target.value)}
                                        className={
                                            formData.status === 'vendido' ? 'text-red-600 font-medium bg-red-50 border-red-200' :
                                                formData.status === 'disponible' ? 'text-emerald-600 font-medium bg-emerald-50 border-emerald-200' : ''
                                        }
                                    >
                                        <option value="disponible">🟢 Disponible</option>
                                        <option value="reservado">🟡 Reservado</option>
                                        <option value="vendido">🔴 Vendido</option>
                                        <option value="mantenimiento">🔧 En Taller</option>
                                        <option value="devuelto">🔙 Devuelto</option>
                                        <option value="conwilsonhernan">👥 Con Wilson Hernan</option>
                                        <option value="consignacion">🚗 En consignacion</option>
                                    </Select>
                                </InputGroup>

                                <InputGroup label="Ubicación Actual">
                                    <Select
                                        value={formData.location}
                                        onChange={(e) => handleChange('location', e.target.value)}
                                    >
                                        <option value="patio">🏠 Patio Principal</option>
                                        <option value="taller">🔧 Taller</option>
                                        <option value="showroom">✨ Showroom</option>
                                        <option value="otro">📍 Otro</option>
                                    </Select>
                                </InputGroup>
                            </div>

                            {/* Precio y Km (Fila 2) */}
                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup label="Precio de Venta" required>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                            <DollarSign className="h-4 w-4" />
                                        </div>
                                        <Input
                                            type="number"
                                            className="pl-9 font-mono font-medium"
                                            value={formData.price}
                                            onChange={(e) => handleChange('price', e.target.value)}
                                        />
                                    </div>
                                </InputGroup>

                                <InputGroup label="Kilometraje">
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Gauge className="h-4 w-4" />
                                        </div>
                                        <Input
                                            type="number"
                                            className="pl-9"
                                            value={formData.mileage}
                                            onChange={(e) => handleChange('mileage', e.target.value)}
                                        />
                                    </div>
                                </InputGroup>
                            </div>

                            {/* Detalles Adicionales */}
                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup label="Color">
                                    <Input
                                        value={formData.color}
                                        onChange={(e) => handleChange('color', e.target.value)}
                                        placeholder="Ej: Rojo, Plata..."
                                    />
                                </InputGroup>
                                <InputGroup label="Año Modelo">
                                    <Input
                                        type="number"
                                        value={formData.year}
                                        onChange={(e) => handleChange('year', e.target.value)}
                                    />
                                </InputGroup>
                            </div>

                            <InputGroup label="Observaciones Internas">
                                <textarea
                                    className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm text-slate-800 placeholder:text-slate-400 resize-none"
                                    placeholder="Detalles sobre llaves, rayones, estado mecánico..."
                                    value={formData.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                />
                            </InputGroup>
                        </div>
                    )}

                    {/* --- PESTAÑA MARKETING --- */}
                    {activeTab === 'marketing' && (
                        <div className="space-y-8">

                            {/* Toggle Principal */}
                            <div className="flex items-center justify-between bg-purple-50 p-4 rounded-xl border border-purple-100">
                                <div>
                                    <h3 className="font-semibold text-purple-900">Vehículo en Patio (MK T PT)</h3>
                                    <p className="text-xs text-purple-600 mt-1">Activa esto si el auto está físicamente listo para fotos.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.marketing_in_patio}
                                        onChange={(e) => handleChange('marketing_in_patio', e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>

                            {/* Contadores */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Posts</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        className="text-center font-bold text-lg h-12"
                                        value={formData.marketing_posts_count}
                                        onChange={(e) => handleChange('marketing_posts_count', e.target.value)}
                                    />
                                </div>
                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Videos</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        className="text-center font-bold text-lg h-12"
                                        value={formData.marketing_videos_count}
                                        onChange={(e) => handleChange('marketing_videos_count', e.target.value)}
                                    />
                                </div>
                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Historias</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        className="text-center font-bold text-lg h-12"
                                        value={formData.marketing_stories_count}
                                        onChange={(e) => handleChange('marketing_stories_count', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* URL de Foto */}
                            <InputGroup label="URL Foto Principal">
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        <ImageIcon className="h-4 w-4" />
                                    </div>
                                    <Input
                                        placeholder="https://..."
                                        className="pl-9"
                                        value={formData.img_main_url}
                                        onChange={(e) => handleChange('img_main_url', e.target.value)}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Pega aquí el link directo a la imagen del auto.</p>
                            </InputGroup>
                        </div>
                    )}

                </div>

                {/* FOOTER (Acciones) */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Guardar Cambios
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}