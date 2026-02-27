import { useState, useRef, useEffect } from "react";
import {
    X, Save, Car, Share2, MapPin, Tag,
    DollarSign, Gauge, Calendar, Loader2, 
    Image as ImageIcon, UploadCloud, Plus, Trash2,
    Link // <--- Nuevo icono importado
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import type { InventoryCar } from "../../../hooks/useInventory";

// Componentes UI Locales
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

const STATUS_LABELS: Record<string, string> = {
    disponible: '🟢 Disponible',
    reservado: '🟡 Reservado',
    vendido: '🔴 Vendido',
    mantenimiento: '🔧 En Taller',
    devuelto: '🔙 Devuelto',
    conwilsonhernan: '👥 Con Wilson Hernan',
    consignacion: '🚗 En consignacion',
};

const STATUS_STYLES: Record<string, string> = {
    disponible: 'text-emerald-600 font-medium bg-emerald-50 border-emerald-200',
    vendido: 'text-red-600 font-medium bg-red-50 border-red-200',
    reservado: 'text-amber-600 font-medium bg-amber-50 border-amber-200',
    mantenimiento: 'text-slate-600 font-medium bg-slate-100 border-slate-200',
    devuelto: 'text-brand-600 font-medium bg-brand-50 border-brand-200',
    conwilsonhernan: 'text-indigo-600 font-medium bg-indigo-50 border-indigo-200',
    consignacion: 'text-blue-600 font-medium bg-blue-50 border-blue-200',
};

function StatusBadge({ status }: { status: string }) {
    const label = STATUS_LABELS[status] ?? status;
    const style = STATUS_STYLES[status] ?? 'text-slate-600 font-medium bg-slate-50 border-slate-200';
    return (
        <div
            className={`w-full h-10 px-3 flex items-center rounded-lg border text-sm ${style} cursor-default select-none`}
            aria-readonly
        >
            {label}
        </div>
    );
}

interface InventoryDetailModalProps {
    car: InventoryCar;
    onClose: () => void;
    onUpdate: () => void;
    currentUserRole?: string | null;
}

export function InventoryDetailModal({ car, onClose, onUpdate, currentUserRole }: InventoryDetailModalProps) {
    const { supabase } = useAuth();
    const isAdmin = currentUserRole?.toLowerCase() === 'admin'; // Solo admin puede editar y poner precio
    // Añadimos 'publications' a las pestañas
    const [activeTab, setActiveTab] = useState<'general' | 'marketing' | 'photos' | 'publications'>('general');
    const [isSaving, setIsSaving] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");

    // --- ESTADO DE IMÁGENES ---
    // 1. Imagen Principal (Nueva)
    const [mainImageFile, setMainImageFile] = useState<File | null>(null);
    const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);

    // 2. Galería Existente (URLs que vienen de la BD)
    const [existingGallery, setExistingGallery] = useState<string[]>(car.img_gallery_urls || []);

    // 3. Galería Nueva (Archivos locales por subir)
    const [newGalleryFiles, setNewGalleryFiles] = useState<File[]>([]);
    const [newGalleryPreviews, setNewGalleryPreviews] = useState<string[]>([]);

    // Refs
    const mainInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    // Estado del Formulario
    const [formData, setFormData] = useState({
        price: car.price || 0,
        mileage: car.mileage || 0,
        status: car.status || 'disponible',
        location: car.location || 'patio',
        description: car.description || '',
        marketing_in_patio: car.marketing_in_patio || false,
        marketing_posts_count: car.marketing_posts_count || 0,
        marketing_videos_count: car.marketing_videos_count || 0,
        marketing_stories_count: car.marketing_stories_count || 0,
        img_main_url: car.img_main_url || '', // URL actual
        color: car.color || '',
        plate_short: car.plate_short || '',
        year: car.year || new Date().getFullYear(),
        publication_url: (car as any).publication_url || '' // Nueva columna
    });

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // --- MANEJO DE ARCHIVOS ---

    const uploadFileToSupabase = async (file: File): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${fileName}`; 
        
        const { error: uploadError } = await supabase.storage
            .from('inventory')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('inventory').getPublicUrl(filePath);
        return data.publicUrl;
    };

    const handleMainImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setMainImageFile(file);
            setMainImagePreview(URL.createObjectURL(file));
        }
    };

    const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setNewGalleryFiles(prev => [...prev, ...newFiles]);
            
            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
            setNewGalleryPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    // Borrar de la galería existente (solo quitamos la URL de la lista visual por ahora)
    const removeExistingGalleryImage = (index: number) => {
        setExistingGallery(prev => prev.filter((_, i) => i !== index));
    };

    // Borrar de los nuevos archivos pendientes de subir
    const removeNewGalleryImage = (index: number) => {
        setNewGalleryFiles(prev => prev.filter((_, i) => i !== index));
        setNewGalleryPreviews(prev => prev.filter((_, i) => i !== index));
    };


    const handleSave = async () => {
        setIsSaving(true);
        setUploadStatus("Iniciando...");

        try {
            let finalMainUrl = formData.img_main_url;
            let finalGalleryUrls = [...existingGallery]; // Empezamos con las que el usuario NO borró

            // 1. Subir nueva foto principal si existe
            if (mainImageFile) {
                setUploadStatus("Actualizando portada...");
                finalMainUrl = await uploadFileToSupabase(mainImageFile);
            }

            // 2. Subir nuevas fotos de galería si existen
            if (newGalleryFiles.length > 0) {
                setUploadStatus(`Subiendo ${newGalleryFiles.length} fotos nuevas...`);
                const uploadedUrls = await Promise.all(newGalleryFiles.map(file => uploadFileToSupabase(file)));
                finalGalleryUrls = [...finalGalleryUrls, ...uploadedUrls];
            }

            setUploadStatus("Guardando cambios...");

            {/*// 1. Actualizar tabla 'inventory' (por ID)
            const { error: error1 } = await supabase
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
                    
                    // Actualizamos imágenes
                    img_main_url: finalMainUrl,
                    img_gallery_urls: finalGalleryUrls,

                    color: formData.color,
                    year: Number(formData.year)
                })
                .eq('id', car.id);

            if (error1) throw error1;*/}

            // 2. Actualizar tabla 'inventoryoracle' (por PLATE) - IMPORTANTE para sincronización
            if (car.plate) {
                const { error: error2 } = await supabase
                    .from('inventoryoracle')
                    .update({
                        price: Number(formData.price),
                        mileage: Number(formData.mileage),
                        status: formData.status as any,
                        location: formData.location as any,
                        description: formData.description,
                        color: formData.color,
                        year: Number(formData.year),
                         marketing_in_patio: formData.marketing_in_patio,
                    marketing_posts_count: Number(formData.marketing_posts_count),
                    marketing_videos_count: Number(formData.marketing_videos_count),
                    marketing_stories_count: Number(formData.marketing_stories_count),
                    
                    // Actualizamos imágenes
                    img_main_url: finalMainUrl,
                    img_gallery_urls: finalGalleryUrls,
                        publication_url: formData.publication_url, // Guardar nueva columna
                        updated_at: new Date().toISOString()
                    })
                    .eq('plate', car.plate.toUpperCase());

                if (error2) {
                    console.warn("⚠️ Advertencia al actualizar inventoryoracle:", error2);
                }
            }

            onUpdate();
            onClose();
        } catch (error: any) {
            console.error("Error al actualizar vehículo:", error);
            alert("Error: " + (error.message || "No se pudo guardar."));
        } finally {
            setIsSaving(false);
            setUploadStatus("");
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
                <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'general' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Car className="h-4 w-4" /> Datos Generales
                    </button>
                    <button
                        onClick={() => setActiveTab('photos')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'photos' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <ImageIcon className="h-4 w-4" /> Fotos & Galería
                    </button>
                    <button
                        onClick={() => setActiveTab('marketing')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'marketing' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Share2 className="h-4 w-4" /> Marketing
                    </button>
                    <button
                        onClick={() => setActiveTab('publications')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'publications' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Link className="h-4 w-4" /> Publicaciones
                    </button>
                </div>

                {/* BODY (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 bg-white">

                    {/* --- PESTAÑA GENERAL --- */}
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup label="Estado del Vehículo" required>
                                    <StatusBadge status={formData.status} />
                                </InputGroup>

                                <InputGroup label="Ubicación Actual">
                                    {isAdmin ? (
                                        <Select
                                            value={formData.location}
                                            onChange={(e) => handleChange('location', e.target.value)}
                                        >
                                            <option value="patio">🏠 Patio Principal</option>
                                            <option value="taller">🔧 Taller</option>
                                            <option value="showroom">✨ Showroom</option>
                                            <option value="conwilsonhernan">👥 Con Wilson Hernan</option>
                                            <option value="otro">📍 Otro</option>
                                        </Select>
                                    ) : (
                                        <div className="h-10 px-3 flex items-center rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800">
                                            {formData.location === 'patio' && '🏠 Patio Principal'}
                                            {formData.location === 'taller' && '🔧 Taller'}
                                            {formData.location === 'showroom' && '✨ Showroom'}
                                            {formData.location === 'conwilsonhernan' && '👥 Con Wilson Hernan'}
                                            {formData.location === 'otro' && '📍 Otro'}
                                            {!['patio', 'taller', 'showroom', 'conwilsonhernan', 'otro'].includes(formData.location) && formData.location}
                                        </div>
                                    )}
                                </InputGroup>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup label="Precio de Venta" required>
                                    {isAdmin ? (
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                                            <Input
                                                type="number"
                                                className="pl-9 font-mono font-medium"
                                                value={formData.price}
                                                onChange={(e) => handleChange('price', e.target.value)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-10 px-3 flex items-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono font-medium text-slate-800">
                                            $ {Number(formData.price).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                        </div>
                                    )}
                                </InputGroup>

                                <InputGroup label="Kilometraje">
                                    <div className="relative">
                                        <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                                        <Input
                                            type="number"
                                            className="pl-9"
                                            value={formData.mileage}
                                            onChange={(e) => handleChange('mileage', e.target.value)}
                                            readOnly={!isAdmin}
                                            disabled={!isAdmin}
                                        />
                                    </div>
                                </InputGroup>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup label="Color">
                                    <Input
                                        value={formData.color}
                                        onChange={(e) => handleChange('color', e.target.value)}
                                        placeholder="Ej: Rojo, Plata..."
                                        readOnly={!isAdmin}
                                        disabled={!isAdmin}
                                    />
                                </InputGroup>
                                <InputGroup label="Año Modelo">
                                    <Input
                                        type="number"
                                        value={formData.year}
                                        onChange={(e) => handleChange('year', e.target.value)}
                                        readOnly={!isAdmin}
                                        disabled={!isAdmin}
                                    />
                                </InputGroup>
                            </div>

                            <InputGroup label="Observaciones Internas">
                                <textarea
                                    className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm text-slate-800 placeholder:text-slate-400 resize-none disabled:opacity-90 disabled:cursor-not-allowed"
                                    placeholder="Detalles sobre llaves, rayones, estado mecánico..."
                                    value={formData.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    readOnly={!isAdmin}
                                    disabled={!isAdmin}
                                />
                            </InputGroup>
                        </div>
                    )}

                    {/* --- PESTAÑA FOTOS --- */}
                    {activeTab === 'photos' && (
                        <div className="space-y-6">
                            {/* FOTO PRINCIPAL */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Foto Principal</h3>
                                <div 
                                    onClick={() => isAdmin && mainInputRef.current?.click()}
                                    className={`relative aspect-video w-full rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden group ${isAdmin ? 'cursor-pointer hover:border-brand-400' : 'cursor-default opacity-90'}`}
                                >
                                    {/* Mostramos la preview nueva O la URL existente */}
                                    {mainImagePreview || formData.img_main_url ? (
                                        <>
                                            <img 
                                                src={mainImagePreview || formData.img_main_url} 
                                                alt="Principal" 
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-white text-sm font-medium flex items-center gap-2">
                                                    <UploadCloud className="w-5 h-5" /> Cambiar Portada
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                            <ImageIcon className="w-10 h-10 mb-2" />
                                            <span>Click para subir portada</span>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        ref={mainInputRef} 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={handleMainImageSelect}
                                    />
                                </div>
                            </div>

                            {/* GALERÍA */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Galería ({existingGallery.length + newGalleryFiles.length})
                                    </h3>
                                    {isAdmin && (
                                        <button 
                                            onClick={() => galleryInputRef.current?.click()}
                                            className="text-xs text-brand-600 font-bold hover:underline flex items-center gap-1"
                                        >
                                            <Plus className="w-4 h-4" /> Agregar Fotos
                                        </button>
                                    )}
                                </div>
                                
                                <input 
                                    type="file" 
                                    ref={galleryInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    multiple
                                    onChange={handleGallerySelect}
                                />

                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                    {/* 1. Fotos Existentes */}
                                    {existingGallery.map((url, idx) => (
                                        <div key={`exist-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                                            <img src={url} alt="Galeria" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                            {isAdmin && (
                                                <button 
                                                    onClick={() => removeExistingGalleryImage(idx)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 transform hover:scale-110"
                                                    title="Eliminar foto"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                            <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 rounded opacity-0 group-hover:opacity-100">Guardada</span>
                                        </div>
                                    ))}

                                    {/* 2. Fotos Nuevas (Pendientes) */}
                                    {newGalleryPreviews.map((preview, idx) => (
                                        <div key={`new-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border-2 border-brand-200 group">
                                            <img src={preview} alt="Nueva" className="w-full h-full object-cover" />
                                            {isAdmin && (
                                                <button 
                                                    onClick={() => removeNewGalleryImage(idx)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                            <span className="absolute bottom-1 left-1 bg-brand-500 text-white text-[10px] px-1.5 rounded font-medium">Nueva</span>
                                        </div>
                                    ))}

                                    {/* Botón "Agregar más" en la grilla (solo admin) */}
                                    {isAdmin && (
                                        <div 
                                            onClick={() => galleryInputRef.current?.click()}
                                            className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 hover:bg-slate-50 text-slate-300 hover:text-brand-500 transition-colors"
                                        >
                                            <Plus className="w-6 h-6 mb-1" />
                                            <span className="text-[10px] font-medium">Agregar</span>
                                        </div>
                                    )}
                                </div>
                            </div>
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
                                <label className={`relative inline-flex items-center ${isAdmin ? 'cursor-pointer' : 'cursor-default opacity-80'}`}>
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.marketing_in_patio}
                                        onChange={(e) => handleChange('marketing_in_patio', e.target.checked)}
                                        disabled={!isAdmin}
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
                                        readOnly={!isAdmin}
                                        disabled={!isAdmin}
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
                                        readOnly={!isAdmin}
                                        disabled={!isAdmin}
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
                                        readOnly={!isAdmin}
                                        disabled={!isAdmin}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- PESTAÑA PUBLICACIONES --- */}
                    {activeTab === 'publications' && (
                        <div className="space-y-6">
                            <InputGroup label="URLs de Publicación">
                                <textarea
                                    className="w-full min-h-[150px] px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm text-slate-800 placeholder:text-slate-400 resize-y font-mono disabled:opacity-90 disabled:cursor-not-allowed"
                                    placeholder="https://facebook.com/...\nhttps://instagram.com/..."
                                    value={formData.publication_url}
                                    onChange={(e) => handleChange('publication_url', e.target.value)}
                                    readOnly={!isAdmin}
                                    disabled={!isAdmin}
                                />
                                <p className="text-xs text-slate-500">
                                    Pega aquí los enlaces a las publicaciones en redes sociales o portales.
                                </p>
                            </InputGroup>
                        </div>
                    )}

                </div>

                {/* FOOTER (Acciones) */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                    <span className="text-xs text-slate-500 italic animate-pulse">
                        {uploadStatus}
                    </span>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                            {isAdmin ? 'Cancelar' : 'Cerrar'}
                        </button>
                        {isAdmin && (
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-6 py-2 rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {uploadStatus || "Guardando..."}
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Guardar Cambios
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}