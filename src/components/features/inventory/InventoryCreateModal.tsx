import { useState, useRef } from "react";
import {
    X, Save, DollarSign, Gauge,
    Calendar, Hash, FileText, Loader2,
    MapPin, Tag, Image as ImageIcon, Plus, Trash2, UploadCloud
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { compressAndConvertToWebP, compressImageForUpload } from "@/lib/image-optimization";
import { uploadOptimizedMainImage, uploadOptimizedGalleryImage } from "@/lib/vehicle-image-upload";

// --- Componentes UI Locales ---
const InputGroup = ({ label, required = false, children, subLabel }: { label: string; required?: boolean; children: React.ReactNode, subLabel?: string }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            {label}
            {required && <span className="text-red-500">*</span>}
        </label>
        {children}
        {subLabel && <p className="text-[10px] text-slate-400">{subLabel}</p>}
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
    onSuccess: () => void;
}

export function InventoryCreateModal({ onClose, onSuccess }: InventoryCreateModalProps) {
    const { supabase } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(""); // Para mostrar qué está pasando

    // Estados para imágenes (Archivos y Previsualizaciones)
    const [mainImageFile, setMainImageFile] = useState<File | null>(null);
    const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
    
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

    // Refs para los inputs de archivo ocultos
    const mainInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    // Estado del Formulario (Datos de texto)
    const [formData, setFormData] = useState({
        brand: '', model: '', year: new Date().getFullYear(), price: '',
        plate: '', plate_short: '', mileage: '', color: '', type_body: '',
        status: 'disponible', location: 'patio', description: ''
    });

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // --- MANEJO DE IMÁGENES ---

    // 1. Seleccionar Imagen Principal
    const handleMainImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setMainImageFile(file);
            setMainImagePreview(URL.createObjectURL(file));
        }
    };

    // 2. Seleccionar Galería (Múltiples)
    const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setGalleryFiles(prev => [...prev, ...newFiles]);
            
            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
            setGalleryPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    // 3. Remover imagen de galería
    const removeGalleryImage = (index: number) => {
        setGalleryFiles(prev => prev.filter((_, i) => i !== index));
        setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
    };

    // --- GUARDAR TODO (insertar primero para obtener id, luego subir imágenes optimizadas) ---
    const handleCreate = async () => {
        if (!formData.brand || !formData.model || !formData.price) {
            alert("Por favor completa Marca, Modelo y Precio.");
            return;
        }

        setIsSaving(true);
        setUploadStatus("Guardando datos del vehículo...");

        try {
            // 1. Insertar en BD sin imágenes para obtener el id
            const { data: inserted, error: insertError } = await supabase
                .from('inventory')
                .insert({
                    brand: formData.brand.toLowerCase(),
                    model: formData.model.toLowerCase(),
                    year: Number(formData.year),
                    price: Number(formData.price),
                    plate: formData.plate ? formData.plate.toUpperCase() : null,
                    plate_short: formData.plate_short ? formData.plate_short.toUpperCase() : null,
                    mileage: Number(formData.mileage) || 0,
                    color: formData.color.toLowerCase(),
                    type_body: formData.type_body.toLowerCase(),
                    status: formData.status as any,
                    location: formData.location as any,
                    description: formData.description,
                    img_main_url: null,
                    img_gallery_urls: null,
                    marketing_in_patio: false,
                    stock: 1
                })
                .select("id")
                .single();

            if (insertError) throw insertError;
            const vehicleId = inserted?.id;
            if (!vehicleId) throw new Error("No se obtuvo el id del vehículo.");

            let mainImageUrl: string | null = null;
            let galleryUrls: string[] = [];

            // 2. Subir imagen principal optimizada (WEBP + 400/800/1200)
            if (mainImageFile) {
                setUploadStatus("Subiendo imagen principal...");
                try {
                    const optimized = await compressAndConvertToWebP(mainImageFile, { generateResponsiveSizes: true });
                    mainImageUrl = await uploadOptimizedMainImage(supabase, vehicleId, optimized);
                } catch (bucketErr: any) {
                    console.warn("Bucket vehicle-images no disponible, subiendo a inventory:", bucketErr);
                    const opt = await compressAndConvertToWebP(mainImageFile, { generateResponsiveSizes: false });
                    const path = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.webp`;
                    const { error: upErr } = await supabase.storage.from("inventory").upload(path, opt.main);
                    if (upErr) throw upErr;
                    const { data } = supabase.storage.from("inventory").getPublicUrl(path);
                    mainImageUrl = data.publicUrl;
                }
            }

            // 3. Subir galería optimizada (WEBP)
            if (galleryFiles.length > 0) {
                setUploadStatus(`Subiendo galería (${galleryFiles.length} fotos)...`);
                try {
                    const compressed = await Promise.all(galleryFiles.map((f) => compressImageForUpload(f)));
                    galleryUrls = await Promise.all(
                        compressed.map((file, i) => uploadOptimizedGalleryImage(supabase, vehicleId, file, i))
                    );
                } catch (bucketErr: any) {
                    console.warn("Bucket vehicle-images no disponible, subiendo a inventory:", bucketErr);
                    galleryUrls = await Promise.all(
                        galleryFiles.map(async (file) => {
                            const c = await compressImageForUpload(file);
                            const path = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.webp`;
                            const { error } = await supabase.storage.from("inventory").upload(path, c);
                            if (error) throw error;
                            const { data } = supabase.storage.from("inventory").getPublicUrl(path);
                            return data.publicUrl;
                        })
                    );
                }
            }

            // 4. Actualizar el registro con las URLs de imágenes
            if (mainImageUrl || galleryUrls.length > 0) {
                setUploadStatus("Actualizando imágenes...");
                await supabase
                    .from("inventory")
                    .update({
                        img_main_url: mainImageUrl,
                        img_gallery_urls: galleryUrls.length > 0 ? galleryUrls : null
                    })
                    .eq("id", vehicleId);
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Error al crear vehículo:", error);
            if (error.code === '23505') {
                alert("Ya existe un vehículo registrado con esa placa.");
            } else {
                alert("Error al guardar: " + (error.message || "Verifica los datos."));
            }
        } finally {
            setIsSaving(false);
            setUploadStatus("");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* HEADER */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Nuevo Vehículo</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Ingresa los datos y sube las fotografías.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* BODY (Grid de 2 columnas: Fotos a la izquierda, Datos a la derecha) */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    
                    {/* COLUMNA IZQUIERDA: IMÁGENES */}
                    <div className="w-full md:w-1/3 bg-slate-50 p-6 border-r border-slate-100 overflow-y-auto space-y-6">
                        
                        {/* 1. Imagen Principal */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                Foto Principal
                            </label>
                            <div 
                                onClick={() => mainInputRef.current?.click()}
                                className={`
                                    relative aspect-video rounded-lg border-2 border-dashed cursor-pointer transition-all group overflow-hidden
                                    ${mainImagePreview ? 'border-brand-500 bg-white' : 'border-slate-300 hover:border-brand-400 hover:bg-brand-50'}
                                `}
                            >
                                <input 
                                    type="file" 
                                    ref={mainInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleMainImageSelect}
                                />
                                
                                {mainImagePreview ? (
                                    <>
                                        <img src={mainImagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-white text-xs font-medium flex items-center gap-1">
                                                <UploadCloud className="w-4 h-4" /> Cambiar
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <ImageIcon className="w-8 h-8 mb-2" />
                                        <span className="text-xs">Click para subir portada</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Galería */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Galería ({galleryFiles.length})
                                </label>
                                <button 
                                    onClick={() => galleryInputRef.current?.click()}
                                    className="text-[10px] text-brand-600 font-bold hover:underline flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" /> Agregar
                                </button>
                                <input 
                                    type="file" 
                                    ref={galleryInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    multiple 
                                    onChange={handleGallerySelect}
                                />
                            </div>

                            {galleryPreviews.length > 0 ? (
                                <div className="grid grid-cols-3 gap-2">
                                    {galleryPreviews.map((preview, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-md overflow-hidden group border border-slate-200">
                                            <img src={preview} alt={`Galeria ${idx}`} className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => removeGalleryImage(idx)}
                                                className="absolute top-0.5 right-0.5 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <div 
                                        onClick={() => galleryInputRef.current?.click()}
                                        className="aspect-square rounded-md border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-brand-400 hover:bg-slate-100 text-slate-300 hover:text-brand-500 transition-colors"
                                    >
                                        <Plus className="w-6 h-6" />
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => galleryInputRef.current?.click()}
                                    className="p-6 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-100 transition-colors"
                                >
                                    <Plus className="w-6 h-6 mb-1" />
                                    <span className="text-[10px]">Agregar fotos extra</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: FORMULARIO */}
                    <div className="flex-1 overflow-y-auto p-6 bg-white space-y-6">

                        {/* SECCIÓN 1: DATOS PRINCIPALES */}
                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="Marca" required>
                                <Input placeholder="Ej: Toyota" value={formData.brand} onChange={(e) => handleChange('brand', e.target.value)} autoFocus />
                            </InputGroup>
                            <InputGroup label="Modelo" required>
                                <Input placeholder="Ej: Fortuner" value={formData.model} onChange={(e) => handleChange('model', e.target.value)} />
                            </InputGroup>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="Precio ($)" required>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                                    <Input type="number" className="pl-9" placeholder="0.00" value={formData.price} onChange={(e) => handleChange('price', e.target.value)} />
                                </div>
                            </InputGroup>
                            <InputGroup label="Año" required>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                                    <Input type="number" className="pl-9" value={formData.year} onChange={(e) => handleChange('year', e.target.value)} />
                                </div>
                            </InputGroup>
                        </div>

                        {/* SECCIÓN 2: IDENTIFICACIÓN */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                            <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                                <Hash className="h-4 w-4 text-brand-500" /> Identificación
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup label="Placa Real" subLabel="Obligatoria para documentos">
                                    <Input placeholder="Ej: ABC-1234" value={formData.plate} onChange={(e) => handleChange('plate', e.target.value)} className="uppercase font-mono" />
                                </InputGroup>
                                <InputGroup label="Cód. Interno" subLabel="Identificación rápida">
                                    <Input placeholder="Ej: A1, P5" value={formData.plate_short} onChange={(e) => handleChange('plate_short', e.target.value)} className="uppercase font-mono" />
                                </InputGroup>
                            </div>
                        </div>

                        {/* SECCIÓN 3: DETALLES */}
                        <div className="grid grid-cols-3 gap-4">
                            <InputGroup label="Km">
                                <div className="relative">
                                    <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                                    <Input type="number" className="pl-9" placeholder="0" value={formData.mileage} onChange={(e) => handleChange('mileage', e.target.value)} />
                                </div>
                            </InputGroup>
                            <InputGroup label="Color">
                                <Input placeholder="Ej: Blanco" value={formData.color} onChange={(e) => handleChange('color', e.target.value)} />
                            </InputGroup>
                            <InputGroup label="Tipo">
                                <Input placeholder="Ej: SUV" value={formData.type_body} onChange={(e) => handleChange('type_body', e.target.value)} />
                            </InputGroup>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="Estado">
                                <div className="relative">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                                    <Select className="pl-9" value={formData.status} onChange={(e) => handleChange('status', e.target.value)}>
                                        <option value="disponible">🟢 Disponible</option>
                                        <option value="reservado">🟡 Reservado</option>
                                        <option value="mantenimiento">🔧 En Taller</option>
                                        <option value="devuelto">🔙 Devuelto</option>
                                        <option value="conwilsonhernan">👥 Con Wilson Hernan</option>
                                        <option value="consignacion">🚗 En consignacion</option>
                                    </Select>
                                </div>
                            </InputGroup>
                            <InputGroup label="Ubicación">
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                                    <Select className="pl-9" value={formData.location} onChange={(e) => handleChange('location', e.target.value)}>
                                        <option value="patio">🏠 Patio Principal</option>
                                        <option value="taller">🔧 Taller</option>
                                        <option value="showroom">✨ Showroom</option>
                                    </Select>
                                </div>
                            </InputGroup>
                        </div>

                        <InputGroup label="Notas / Descripción">
                            <div className="relative">
                                <FileText className="absolute left-3 top-3 text-slate-400 h-4 w-4" />
                                <textarea
                                    className="w-full min-h-[80px] pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm text-slate-800 placeholder:text-slate-400 resize-none"
                                    placeholder="Detalles importantes..."
                                    value={formData.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                />
                            </div>
                        </InputGroup>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                    <span className="text-xs text-slate-500 italic">
                        {uploadStatus}
                    </span>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={isSaving}
                            className="px-6 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {uploadStatus || "Guardando..."}
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
        </div>
    );
}