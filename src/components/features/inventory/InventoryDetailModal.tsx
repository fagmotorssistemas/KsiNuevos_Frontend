import { useState, useRef, useEffect, useMemo } from "react";
import {
    X, Save, Car, Share2, MapPin, Tag, Cog,
    DollarSign, Gauge, Loader2,
    Image as ImageIcon, UploadCloud, Plus, Trash2,
    Link, FileText,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import type { InventoryCar } from "../../../hooks/useInventory";
import type { VehiculoInventario } from "@/types/inventario.types";
import { inventarioService } from "@/services/inventario.service";
import { compressAndConvertToWebP, compressImageForUpload } from "@/lib/image-optimization";
import { uploadOptimizedMainImage, uploadOptimizedGalleryImage } from "@/lib/vehicle-image-upload";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

// --- UI unificada (mismo patrón que modal Inventario General) ---
function SectionTitle({
    icon: Icon,
    title,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
}) {
    return (
        <div className="flex items-center gap-2 text-blue-600 font-medium border-b border-blue-50 pb-2">
            <Icon className="h-4 w-4" />
            {title}
        </div>
    );
}

function ItemDetail({
    label,
    value,
    highlight = false,
}: {
    label: string;
    value: string | number | null | undefined;
    highlight?: boolean;
}) {
    const text = value != null ? String(value).trim() : "";
    const isEmpty = !text || text === ".";
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">{label}</span>
            <div
                className={`text-xs p-2 rounded border ${
                    isEmpty
                        ? "bg-red-50 text-red-600 border-red-100 italic"
                        : highlight
                          ? "bg-blue-50 text-blue-800 border-blue-100 font-bold"
                          : "bg-white text-slate-700 border-slate-200"
                }`}
            >
                {isEmpty ? "No especificado" : text}
            </div>
        </div>
    );
}

function FormField({
    label,
    required = false,
    children,
    className = "",
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            <span className="text-[10px] uppercase font-bold text-slate-400">
                {label}
                {required && <span className="text-red-500 normal-case"> *</span>}
            </span>
            <div className="rounded border border-slate-200 bg-white overflow-hidden">{children}</div>
        </div>
    );
}

const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        className={`w-full h-9 px-2 bg-white focus:bg-blue-50/30 focus:border-blue-300 outline-none transition-all text-xs text-slate-800 placeholder:text-slate-400 border-0 ${className}`}
        {...props}
    />
);

const Select = ({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <div className="relative">
        <select
            className={`w-full h-9 px-2 pr-7 bg-white focus:bg-blue-50/30 outline-none transition-all text-xs text-slate-800 appearance-none cursor-pointer border-0 ${className}`}
            {...props}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
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

function displayVal(v: string | number | null | undefined): string | null {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s === "" || s === "." ? null : s;
}

function coalesce(...vals: (string | number | null | undefined)[]): string | null {
    for (const v of vals) {
        const d = displayVal(v);
        if (d) return d;
    }
    return null;
}

function StatusBadge({ status }: { status: string }) {
    const label = STATUS_LABELS[status] ?? status;
    const style = STATUS_STYLES[status] ?? "text-slate-600 font-medium bg-slate-50 border-slate-200";
    return (
        <div className={`w-full h-9 px-2 flex items-center text-xs border-0 ${style} cursor-default select-none`}>
            {label}
        </div>
    );
}

function ModalPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-xl border border-slate-200 bg-slate-50/40 p-5 space-y-4 ${className}`}>
            {children}
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
    const isAdmin = currentUserRole?.toLowerCase() === 'admin'; // Solo admin puede editar precio
    const isMarketing = currentUserRole?.toLowerCase() === 'marketing';
    const canEdit = isAdmin || isMarketing; // Admin edita todo; marketing edita todo excepto precio
    // Añadimos 'publications' a las pestañas
    const [activeTab, setActiveTab] = useState<'general' | 'marketing' | 'photos' | 'publications'>('general');
    const [isSaving, setIsSaving] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");
    const [oracleFicha, setOracleFicha] = useState<VehiculoInventario | null>(null);
    const [loadingFicha, setLoadingFicha] = useState(false);

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

    useEffect(() => {
        if (!car.plate) {
            setOracleFicha(null);
            return;
        }
        let cancelled = false;
        setLoadingFicha(true);
        inventarioService
            .getDetalleVehiculo(car.plate)
            .then((data) => {
                if (!cancelled) setOracleFicha(data.fichaTecnica ?? null);
            })
            .catch(() => {
                if (!cancelled) setOracleFicha(null);
            })
            .finally(() => {
                if (!cancelled) setLoadingFicha(false);
            });
        return () => {
            cancelled = true;
        };
    }, [car.plate]);

    const ficha = useMemo(() => {
        const o = oracleFicha;
        const cyl = car.cylinder_count != null ? String(car.cylinder_count) : null;
        return {
            marca: coalesce(car.brand, o?.marca),
            modelo: coalesce(car.model, o?.modelo),
            anio: coalesce(car.year, o?.anioModelo),
            color: coalesce(formData.color, car.color, o?.color),
            tipo: coalesce(car.type_body, car.type, o?.tipo),
            version: coalesce(car.version, o?.version),
            motor: coalesce(car.engine_number, o?.motor),
            chasis: coalesce(car.vin, o?.chasis),
            cilindraje: coalesce(car.engine_displacement, cyl, o?.cilindraje),
            combustible: coalesce(car.fuel_type, o?.combustible),
            ejes: coalesce(car.axles_count, o?.nroEjes),
            llantas: coalesce(car.wheels_count, o?.nroLlantas),
            paisOrigen: coalesce(car.country_origin, o?.paisOrigen),
            anioMatricula: coalesce(car.registration_year, o?.anioMatricula),
            lugarMatricula: coalesce(car.registration_place, o?.lugarMatricula),
            proveedor: coalesce(car.supplier, o?.proveedor),
            descripcionSistema: coalesce(o?.descripcion, car.description),
        };
    }, [car, oracleFicha, formData.color]);

    // --- MANEJO DE ARCHIVOS ---

    /** Subida optimizada: imagen principal con versiones 400/800/1200 a vehicle-images/{vehicleId}/ */
    const uploadOptimizedMain = async (file: File): Promise<string> => {
        const optimized = await compressAndConvertToWebP(file, { generateResponsiveSizes: true });
        return uploadOptimizedMainImage(supabase, car.id, optimized);
    };

    /** Subida optimizada: galería WEBP a vehicle-images/{vehicleId}/gallery/ */
    const uploadOptimizedGalleryFile = async (file: File, index: number): Promise<string> => {
        const compressed = await compressImageForUpload(file);
        return uploadOptimizedGalleryImage(supabase, car.id, compressed, index);
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

            // 1. Subir nueva foto principal (optimizada WEBP + srcset 400/800/1200)
            if (mainImageFile) {
                setUploadStatus("Actualizando portada...");
                try {
                    finalMainUrl = await uploadOptimizedMain(mainImageFile);
                } catch (bucketErr: any) {
                    console.warn("Bucket vehicle-images no disponible, subiendo a inventory:", bucketErr);
                    const opt = await compressAndConvertToWebP(mainImageFile, { generateResponsiveSizes: false });
                    const fallbackPath = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.webp`;
                    const { error: upErr } = await supabase.storage.from("inventory").upload(fallbackPath, opt.main);
                    if (upErr) throw upErr;
                    const { data } = supabase.storage.from("inventory").getPublicUrl(fallbackPath);
                    finalMainUrl = data.publicUrl;
                }
            }

            // 2. Subir nuevas fotos de galería (optimizadas WEBP)
            if (newGalleryFiles.length > 0) {
                setUploadStatus(`Subiendo ${newGalleryFiles.length} fotos nuevas...`);
                try {
                    const startIndex = finalGalleryUrls.length;
                    const urls = await Promise.all(
                        newGalleryFiles.map((file, i) => uploadOptimizedGalleryFile(file, startIndex + i))
                    );
                    finalGalleryUrls = [...finalGalleryUrls, ...urls];
                } catch (bucketErr: any) {
                    console.warn("Bucket vehicle-images no disponible, subiendo a inventory:", bucketErr);
                    const uploadedUrls = await Promise.all(
                        newGalleryFiles.map(async (file) => {
                            const compressed = await compressImageForUpload(file);
                            const path = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.webp`;
                            const { error } = await supabase.storage.from("inventory").upload(path, compressed);
                            if (error) throw error;
                            const { data } = supabase.storage.from("inventory").getPublicUrl(path);
                            return data.publicUrl;
                        })
                    );
                    finalGalleryUrls = [...finalGalleryUrls, ...uploadedUrls];
                }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* HEADER */}
                <div className="flex items-start justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-lg shrink-0">
                            <Car className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">
                                {car.brand} {car.model}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="bg-slate-800 text-white text-xs font-mono px-2 py-0.5 rounded">
                                    {car.plate || formData.plate_short || "S/P"}
                                </span>
                                <span className="text-slate-500 text-sm border-l border-slate-300 pl-2">
                                    {formData.year}
                                </span>
                                <span className="text-slate-500 text-sm capitalize">
                                    {car.type_body || "Vehículo"}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* TABS */}
                <div className="flex border-b border-slate-200 px-6 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Car className="h-4 w-4" /> Datos Generales
                    </button>
                    <button
                        onClick={() => setActiveTab('photos')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'photos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <ImageIcon className="h-4 w-4" /> Fotos & Galería
                    </button>
                    <button
                        onClick={() => setActiveTab('marketing')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'marketing' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Share2 className="h-4 w-4" /> Marketing
                    </button>
                    <button
                        onClick={() => setActiveTab('publications')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'publications' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Link className="h-4 w-4" /> Publicaciones
                    </button>
                </div>

                {/* BODY (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 bg-white">

                    {/* --- PESTAÑA GENERAL --- */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                            <ModalPanel>
                                <SectionTitle icon={Tag} title="Gestión comercial" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    <FormField label="Estado del vehículo" required>
                                        <StatusBadge status={formData.status} />
                                    </FormField>

                                    <FormField label="Ubicación actual">
                                        {canEdit ? (
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
                                            <div className="h-9 px-2 flex items-center text-xs text-slate-700">
                                                {formData.location === 'patio' && '🏠 Patio Principal'}
                                                {formData.location === 'taller' && '🔧 Taller'}
                                                {formData.location === 'showroom' && '✨ Showroom'}
                                                {formData.location === 'conwilsonhernan' && '👥 Con Wilson Hernan'}
                                                {formData.location === 'otro' && '📍 Otro'}
                                                {!['patio', 'taller', 'showroom', 'conwilsonhernan', 'otro'].includes(formData.location) && formData.location}
                                            </div>
                                        )}
                                    </FormField>

                                    <FormField label="Precio de venta" required>
                                        {isAdmin ? (
                                            <div className="relative flex items-center">
                                                <DollarSign className="absolute left-2 text-slate-400 h-3.5 w-3.5" />
                                                <Input
                                                    type="number"
                                                    className="pl-7 font-mono font-bold"
                                                    value={formData.price}
                                                    onChange={(e) => handleChange('price', e.target.value)}
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-9 px-2 flex items-center text-xs font-mono font-bold text-blue-800 bg-blue-50">
                                                $ {Number(formData.price).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                            </div>
                                        )}
                                    </FormField>

                                    <FormField label="Kilometraje">
                                        <div className="relative flex items-center">
                                            <Gauge className="absolute left-2 text-slate-400 h-3.5 w-3.5" />
                                            <Input
                                                type="number"
                                                className="pl-7"
                                                value={formData.mileage}
                                                onChange={(e) => handleChange('mileage', e.target.value)}
                                                readOnly={!canEdit}
                                                disabled={!canEdit}
                                            />
                                        </div>
                                    </FormField>

                                    <FormField label="Color">
                                        <Input
                                            value={formData.color}
                                            onChange={(e) => handleChange('color', e.target.value)}
                                            placeholder="Ej: Rojo, Plata..."
                                            readOnly={!canEdit}
                                            disabled={!canEdit}
                                        />
                                    </FormField>

                                    <FormField label="Año modelo">
                                        <Input
                                            type="number"
                                            value={formData.year}
                                            onChange={(e) => handleChange('year', e.target.value)}
                                            readOnly={!canEdit}
                                            disabled={!canEdit}
                                        />
                                    </FormField>
                                </div>

                                <FormField label="Observaciones internas" className="md:col-span-2 lg:col-span-3">
                                    <textarea
                                        className="w-full min-h-[72px] px-2 py-2 bg-white focus:bg-blue-50/30 outline-none text-xs text-slate-800 placeholder:text-slate-400 resize-none border-0 disabled:opacity-90 disabled:cursor-not-allowed"
                                        placeholder="Detalles sobre llaves, rayones, estado mecánico..."
                                        value={formData.description}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        readOnly={!canEdit}
                                        disabled={!canEdit}
                                    />
                                </FormField>
                            </ModalPanel>

                            <ModalPanel>
                                <div className="flex items-center justify-between gap-2">
                                    <SectionTitle icon={FileText} title="Ficha técnica" />
                                    {loadingFicha && (
                                        <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
                                            <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                                            Sincronizando Oracle…
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-4">
                                        <SectionTitle icon={Tag} title="Detalles generales" />
                                        <div className="grid grid-cols-1 gap-3">
                                            <ItemDetail label="Marca" value={ficha.marca} />
                                            <ItemDetail label="Modelo" value={ficha.modelo} />
                                            <ItemDetail label="Año" value={ficha.anio} />
                                            <ItemDetail label="Color" value={ficha.color} />
                                            <ItemDetail label="Tipo" value={ficha.tipo} />
                                            <ItemDetail label="Versión" value={ficha.version} />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <SectionTitle icon={Cog} title="Mecánica" />
                                        <div className="grid grid-cols-1 gap-3">
                                            <ItemDetail label="Motor" value={ficha.motor} highlight />
                                            <ItemDetail label="Chasis" value={ficha.chasis} highlight />
                                            <ItemDetail label="Cilindraje" value={ficha.cilindraje} />
                                            <ItemDetail label="Combustible" value={ficha.combustible} />
                                            <ItemDetail label="Ejes" value={ficha.ejes} />
                                            <ItemDetail label="Llantas" value={ficha.llantas} />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <SectionTitle icon={MapPin} title="Legal" />
                                        <div className="grid grid-cols-1 gap-3">
                                            <ItemDetail label="País origen" value={ficha.paisOrigen} />
                                            <ItemDetail label="Año matrícula" value={ficha.anioMatricula} />
                                            <ItemDetail label="Lugar matrícula" value={ficha.lugarMatricula} />
                                            <ItemDetail label="Proveedor" value={ficha.proveedor} />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                        Descripción sistema
                                    </span>
                                    <p className="text-xs text-slate-700">
                                        {ficha.descripcionSistema || "Sin descripción"}
                                    </p>
                                </div>
                            </ModalPanel>
                        </div>
                    )}

                    {/* --- PESTAÑA FOTOS --- */}
                    {activeTab === 'photos' && (
                        <ModalPanel className="space-y-6">
                            <div className="space-y-2">
                                <SectionTitle icon={ImageIcon} title="Foto principal" />
                                <div 
                                    onClick={() => canEdit && mainInputRef.current?.click()}
                                    className={`relative aspect-video w-full rounded-lg border-2 border-dashed border-slate-300 bg-white overflow-hidden group ${canEdit ? 'cursor-pointer hover:border-blue-400' : 'cursor-default opacity-90'}`}
                                >
                                    {/* Mostramos la preview nueva O la URL existente (optimizada si es formato vehicle-images) */}
                                    {mainImagePreview || formData.img_main_url ? (
                                        <>
                                            {mainImagePreview ? (
                                                <img src={mainImagePreview} alt="Principal" className="w-full h-full object-cover" />
                                            ) : (
                                                <OptimizedImage
                                                    src={formData.img_main_url}
                                                    alt="Principal"
                                                    className="w-full h-full object-cover"
                                                    loading="eager"
                                                />
                                            )}
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

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <SectionTitle icon={ImageIcon} title={`Galería (${existingGallery.length + newGalleryFiles.length})`} />
                                    {canEdit && (
                                        <button 
                                            onClick={() => galleryInputRef.current?.click()}
                                            className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 shrink-0"
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
                                            <OptimizedImage src={url} alt="Galeria" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                            {canEdit && (
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
                                        <div key={`new-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border-2 border-blue-200 group">
                                            <img src={preview} alt="Nueva" className="w-full h-full object-cover" />
                                            {canEdit && (
                                                <button 
                                                    onClick={() => removeNewGalleryImage(idx)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                            <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-[10px] px-1.5 rounded font-medium">Nueva</span>
                                        </div>
                                    ))}

                                    {/* Botón "Agregar más" en la grilla (admin o marketing) */}
                                    {canEdit && (
                                        <div 
                                            onClick={() => galleryInputRef.current?.click()}
                                            className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 text-slate-300 hover:text-blue-600 transition-colors"
                                        >
                                            <Plus className="w-6 h-6 mb-1" />
                                            <span className="text-[10px] font-medium">Agregar</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ModalPanel>
                    )}

                    {/* --- PESTAÑA MARKETING --- */}
                    {activeTab === 'marketing' && (
                        <ModalPanel className="space-y-8">
                            {/* Toggle Principal */}
                            <div className="flex items-center justify-between bg-purple-50 p-4 rounded-xl border border-purple-100">
                                <div>
                                    <h3 className="font-semibold text-purple-900">Vehículo en Patio (MK T PT)</h3>
                                    <p className="text-xs text-purple-600 mt-1">Activa esto si el auto está físicamente listo para fotos.</p>
                                </div>
                                <label className={`relative inline-flex items-center ${canEdit ? 'cursor-pointer' : 'cursor-default opacity-80'}`}>
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.marketing_in_patio}
                                        onChange={(e) => handleChange('marketing_in_patio', e.target.checked)}
                                        disabled={!canEdit}
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
                                        readOnly={!canEdit}
                                        disabled={!canEdit}
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
                                        readOnly={!canEdit}
                                        disabled={!canEdit}
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
                                        readOnly={!canEdit}
                                        disabled={!canEdit}
                                    />
                                </div>
                            </div>
                        </ModalPanel>
                    )}

                    {/* --- PESTAÑA PUBLICACIONES --- */}
                    {activeTab === 'publications' && (
                        <ModalPanel>
                            <SectionTitle icon={Link} title="Publicaciones" />
                            <FormField label="URLs de publicación">
                                <textarea
                                    className="w-full min-h-[150px] px-2 py-2 bg-white focus:bg-blue-50/30 outline-none text-xs text-slate-800 placeholder:text-slate-400 resize-y font-mono border-0 disabled:opacity-90 disabled:cursor-not-allowed"
                                    placeholder="https://facebook.com/...\nhttps://instagram.com/..."
                                    value={formData.publication_url}
                                    onChange={(e) => handleChange('publication_url', e.target.value)}
                                    readOnly={!canEdit}
                                    disabled={!canEdit}
                                />
                            </FormField>
                            <p className="text-xs text-slate-500">
                                Pega aquí los enlaces a las publicaciones en redes sociales o portales.
                            </p>
                        </ModalPanel>
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
                            {canEdit ? 'Cancelar' : 'Cerrar'}
                        </button>
                        {canEdit && (
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-6 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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