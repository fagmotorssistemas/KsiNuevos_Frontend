import { useState } from "react";
import { 
    X, Save, Car, DollarSign, Gauge, 
    Calendar, Hash, FileText, Loader2, 
    MapPin, Tag, Image as ImageIcon
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";

// Componentes UI Locales (Reutilizados para consistencia)
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

interface InventoryCreateModalProps {
    onClose: () => void;
    onSuccess: () => void; // Para recargar la tabla al crear
}

export function InventoryCreateModal({ onClose, onSuccess }: InventoryCreateModalProps) {
    const { supabase } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    
    // Estado del Formulario
    const [formData, setFormData] = useState({
        // Datos Obligatorios
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        price: '',
        
        // Datos Identificación
        plate: '',        // Placa Real
        plate_short: '',  // Placa Corta / Código Interno
        
        // Datos Opcionales Comunes
        mileage: '',
        color: '',
        type_body: '',    // SUV, Sedan...
        status: 'disponible',
        location: 'patio',
        description: '',
        img_main_url: ''
    });

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCreate = async () => {
        // Validación básica
        if (!formData.brand || !formData.model || !formData.price) {
            alert("Por favor completa Marca, Modelo y Precio.");
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('inventory')
                .insert({
                    brand: formData.brand.toLowerCase(), // Normalizamos a minúsculas
                    model: formData.model.toLowerCase(),
                    year: Number(formData.year),
                    price: Number(formData.price),
                    
                    plate: formData.plate.toUpperCase() || null, // Placa en mayúsculas o NULL si está vacía
                    plate_short: formData.plate_short.toUpperCase() || null,
                    
                    mileage: Number(formData.mileage) || 0,
                    color: formData.color.toLowerCase(),
                    type_body: formData.type_body.toLowerCase(),
                    status: formData.status as any,
                    location: formData.location as any,
                    description: formData.description,
                    img_main_url: formData.img_main_url,
                    
                    // Valores por defecto
                    marketing_in_patio: false,
                    stock: 1
                });

            if (error) throw error;
            
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Error al crear vehículo:", error);
            // Manejo de error de placa duplicada
            if (error.code === '23505') {
                alert("Ya existe un vehículo registrado con esa placa.");
            } else {
                alert("Error al guardar. Verifica los datos.");
            }
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
                        <h2 className="text-lg font-bold text-slate-900">Nuevo Vehículo</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Ingresa los datos para registrar en el inventario.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* BODY (Formulario) */}
                <div className="flex-1 overflow-y-auto p-6 bg-white space-y-6">
                    
                    {/* SECCIÓN 1: DATOS PRINCIPALES */}
                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Marca" required>
                            <Input 
                                placeholder="Ej: Toyota" 
                                value={formData.brand}
                                onChange={(e) => handleChange('brand', e.target.value)}
                                autoFocus
                            />
                        </InputGroup>
                        <InputGroup label="Modelo" required>
                            <Input 
                                placeholder="Ej: Fortuner" 
                                value={formData.model}
                                onChange={(e) => handleChange('model', e.target.value)}
                            />
                        </InputGroup>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Precio ($)" required>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <DollarSign className="h-4 w-4" />
                                </div>
                                <Input 
                                    type="number" 
                                    className="pl-9"
                                    placeholder="0.00"
                                    value={formData.price}
                                    onChange={(e) => handleChange('price', e.target.value)}
                                />
                            </div>
                        </InputGroup>
                        <InputGroup label="Año" required>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Calendar className="h-4 w-4" />
                                </div>
                                <Input 
                                    type="number" 
                                    className="pl-9"
                                    value={formData.year}
                                    onChange={(e) => handleChange('year', e.target.value)}
                                />
                            </div>
                        </InputGroup>
                    </div>

                    {/* SECCIÓN 2: IDENTIFICACIÓN (PLACAS) */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                        <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                            <Hash className="h-4 w-4 text-brand-500" />
                            Identificación
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="Placa Real">
                                <Input 
                                    placeholder="Ej: ABC-1234" 
                                    value={formData.plate}
                                    onChange={(e) => handleChange('plate', e.target.value)}
                                    className="uppercase font-mono"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Si la tiene, es obligatoria para documentos.</p>
                            </InputGroup>
                            <InputGroup label="Código Interno / Placa Corta">
                                <Input 
                                    placeholder="Ej: A1, P5" 
                                    value={formData.plate_short}
                                    onChange={(e) => handleChange('plate_short', e.target.value)}
                                    className="uppercase font-mono"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Para identificación rápida en patio.</p>
                            </InputGroup>
                        </div>
                    </div>

                    {/* SECCIÓN 3: DETALLES ADICIONALES */}
                    <div className="grid grid-cols-3 gap-4">
                        <InputGroup label="Kilometraje">
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Gauge className="h-4 w-4" />
                                </div>
                                <Input 
                                    type="number" 
                                    className="pl-9"
                                    placeholder="0"
                                    value={formData.mileage}
                                    onChange={(e) => handleChange('mileage', e.target.value)}
                                />
                            </div>
                        </InputGroup>
                        <InputGroup label="Color">
                            <Input 
                                placeholder="Ej: Blanco"
                                value={formData.color}
                                onChange={(e) => handleChange('color', e.target.value)}
                            />
                        </InputGroup>
                        <InputGroup label="Tipo">
                            <Input 
                                placeholder="Ej: SUV"
                                value={formData.type_body}
                                onChange={(e) => handleChange('type_body', e.target.value)}
                            />
                        </InputGroup>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Estado Inicial">
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Tag className="h-4 w-4" />
                                </div>
                                <Select 
                                    value={formData.status} 
                                    onChange={(e) => handleChange('status', e.target.value)}
                                    className="pl-9"
                                >
                                    <option value="disponible">🟢 Disponible</option>
                                    <option value="reservado">🟡 Reservado</option>
                                    <option value="mantenimiento">🔧 En Taller</option>
                                </Select>
                            </div>
                        </InputGroup>
                        <InputGroup label="Ubicación">
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <MapPin className="h-4 w-4" />
                                </div>
                                <Select 
                                    value={formData.location} 
                                    onChange={(e) => handleChange('location', e.target.value)}
                                    className="pl-9"
                                >
                                    <option value="patio">🏠 Patio Principal</option>
                                    <option value="taller">🔧 Taller</option>
                                    <option value="showroom">✨ Showroom</option>
                                </Select>
                            </div>
                        </InputGroup>
                    </div>

                    <InputGroup label="Foto Principal (URL)">
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <ImageIcon className="h-4 w-4" />
                            </div>
                            <Input 
                                placeholder="https://ejemplo.com/foto.jpg"
                                value={formData.img_main_url}
                                onChange={(e) => handleChange('img_main_url', e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </InputGroup>

                    <InputGroup label="Notas / Descripción">
                        <div className="relative">
                            <div className="absolute left-3 top-3 text-slate-400">
                                <FileText className="h-4 w-4" />
                            </div>
                            <textarea 
                                className="w-full min-h-[80px] pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm text-slate-800 placeholder:text-slate-400 resize-none"
                                placeholder="Detalles importantes..."
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                            />
                        </div>
                    </InputGroup>

                </div>

                {/* FOOTER */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleCreate}
                        disabled={isSaving}
                        className="px-6 py-2 rounded-lg text-sm font-medium text-black bg-brand-600 hover:bg-brand-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Registrando...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Registrar Vehículo
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}