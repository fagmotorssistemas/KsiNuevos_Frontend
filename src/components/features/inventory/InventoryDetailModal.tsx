import { useState, useRef, useEffect, useMemo } from "react";
import {
    X, Save, Car, Share2, MapPin, Tag, Cog,
    DollarSign, Gauge, Loader2,
    Image as ImageIcon, UploadCloud, Plus, Trash2, Download,
    Link, FileText, ClipboardCheck, ChevronDown, User, Check,
} from "lucide-react";
import { downloadImagesAsPngZip, sanitizeDownloadFilename, type DownloadImageItem } from "@/lib/download-image-as-png";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import type { InventoryCar } from "../../../hooks/useInventory";
import type { VehiculoInventario } from "@/types/inventario.types";
import { inventarioService } from "@/services/inventario.service";
import { compressAndConvertToWebP, compressImageForUpload } from "@/lib/image-optimization";
import { uploadOptimizedMainImage, uploadOptimizedGalleryImage } from "@/lib/vehicle-image-upload";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { ImageViewerModal } from "@/components/features/inventory/ImageViewerModal";
import { InventoryListingChecklistTab } from "@/components/features/inventory/InventoryListingChecklistTab";
import {
    mergeListingChecklistForSave,
    hasVehiclePhotos,
    resolveListingChecklist,
    type ListingChecklist,
    type ListingChecklistKey,
} from "@/types/inventory-listing-checklist";
import {
    formatInventoryPrice,
    formatRevertCountdown,
    getEffectivePublicPrice,
    isPromoPublicPriceActive,
    isVehicleAvailableForPriceRules,
    buildPromoReasonFromSeller,
} from "@/lib/inventario/inventory-pricing";
import {
    canEditInventoryPrices,
    canViewInventoryPrices,
} from "@/lib/inventario/inventory-pricing-access";

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

function sellerInitials(name: string | null | undefined): string {
    const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function SellerPicker({
    sellers,
    value,
    onChange,
    placeholder = "Seleccionar vendedor…",
}: {
    sellers: { id: string; full_name: string | null }[];
    value: string;
    onChange: (id: string) => void;
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selected = sellers.find((s) => s.id === value);
    const selectedName = selected?.full_name?.trim() || null;

    useEffect(() => {
        if (!open) return;
        const handleOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [open]);

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className={`w-full min-h-10 px-3 py-2 flex items-center gap-2.5 text-left transition-all outline-none ${
                    open ? "bg-violet-50/60" : "bg-white hover:bg-slate-50/80"
                }`}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                {selectedName ? (
                    <>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-blue-100 text-[11px] font-bold text-violet-700 ring-1 ring-violet-200/60">
                            {sellerInitials(selectedName)}
                        </span>
                        <span className="flex-1 min-w-0">
                            <span className="block text-xs font-semibold text-slate-800 truncate">
                                {selectedName}
                            </span>
                            <span className="block text-[10px] text-violet-600">Vendedor seleccionado</span>
                        </span>
                    </>
                ) : (
                    <>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 ring-1 ring-slate-200/80">
                            <User className="h-4 w-4" />
                        </span>
                        <span className="flex-1 text-xs text-slate-400">{placeholder}</span>
                    </>
                )}
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                        open ? "rotate-180 text-violet-500" : ""
                    }`}
                />
            </button>

            {open && (
                <div
                    role="listbox"
                    className="absolute z-30 left-0 right-0 top-[calc(100%+6px)] rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 py-1.5 max-h-52 overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
                >
                    {sellers.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-slate-400 italic">No hay vendedores activos</p>
                    ) : (
                        sellers.map((seller) => {
                            const name = seller.full_name?.trim() || "Sin nombre";
                            const isSelected = seller.id === value;
                            return (
                                <button
                                    key={seller.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => {
                                        onChange(seller.id);
                                        setOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                                        isSelected
                                            ? "bg-violet-50 text-violet-900"
                                            : "text-slate-700 hover:bg-slate-50"
                                    }`}
                                >
                                    <span
                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                            isSelected
                                                ? "bg-violet-200 text-violet-800"
                                                : "bg-slate-100 text-slate-600"
                                        }`}
                                    >
                                        {sellerInitials(name === "Sin nombre" ? null : name)}
                                    </span>
                                    <span className="flex-1 text-xs font-medium truncate">{name}</span>
                                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-violet-600" />}
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

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
    onUpdate: (patch: Partial<InventoryCar>) => void | Promise<void>;
    currentUserRole?: string | null;
}

export function InventoryDetailModal({ car, onClose, onUpdate, currentUserRole }: InventoryDetailModalProps) {
    const { supabase } = useAuth();
    const role = currentUserRole?.toLowerCase() || '';
    const canViewPrices = canViewInventoryPrices(role);
    const isAdmin = canEditInventoryPrices(role);
    const canEdit = canViewPrices;
    // Añadimos 'publications' a las pestañas
    const [activeTab, setActiveTab] = useState<
        'general' | 'marketing' | 'photos' | 'publications' | 'listing'
    >('general');
    const [isSaving, setIsSaving] = useState(false);
    const [isCancellingPromo, setIsCancellingPromo] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");
    const [downloadingAllPhotos, setDownloadingAllPhotos] = useState(false);
    const [photoViewerIndex, setPhotoViewerIndex] = useState<number | null>(null);
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

    const vehicleDownloadName = useMemo(
        () => `${car.brand ?? ""} ${car.model ?? ""}`.trim(),
        [car.brand, car.model]
    );

    const downloadSlug = useMemo(
        () =>
            sanitizeDownloadFilename(
                vehicleDownloadName || car.plate || car.plate_short || String(car.id)
            ),
        [vehicleDownloadName, car.plate, car.plate_short, car.id]
    );

    // Estado del Formulario
    const [formData, setFormData] = useState({
        internalFixedPrice:
            car.internal_fixed_price != null ? String(car.internal_fixed_price) : '',
        publicPrice: String(car.price ?? car.internal_fixed_price ?? 0),
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
        publication_url: (car as { publication_url?: string | null }).publication_url || '',
    });

    const [listingChecklist, setListingChecklist] = useState<ListingChecklist>(() =>
        resolveListingChecklist((car as { listing_checklist?: unknown }).listing_checklist, {
            img_main_url: car.img_main_url,
            img_gallery_urls: car.img_gallery_urls,
        })
    );

    const [activeSellers, setActiveSellers] = useState<{ id: string; full_name: string | null }[]>([]);
    const [publicPriceRequestedBySellerId, setPublicPriceRequestedBySellerId] = useState(
        car.public_price_requested_by ?? ''
    );

    useEffect(() => {
        if (!isAdmin) return;
        inventarioService
            .listActiveSellers()
            .then(setActiveSellers)
            .catch(() => setActiveSellers([]));
    }, [isAdmin]);

    useEffect(() => {
        setPublicPriceRequestedBySellerId(car.public_price_requested_by ?? '');
    }, [car.id, car.public_price_requested_by]);

    useEffect(() => {
        setFormData((prev) => ({
            ...prev,
            internalFixedPrice:
                car.internal_fixed_price != null
                    ? String(car.internal_fixed_price)
                    : prev.internalFixedPrice,
            publicPrice: String(car.price ?? car.internal_fixed_price ?? prev.publicPrice ?? 0),
        }));
    }, [car.id, car.internal_fixed_price, car.price]);

    const pricingAvailable = isVehicleAvailableForPriceRules({
        stock: car.stock,
        status: car.status,
    });
    const hasInternalFixedPrice = car.internal_fixed_price != null;
    const internalReferencePrice =
        formData.internalFixedPrice.trim() !== ''
            ? Number(formData.internalFixedPrice)
            : car.internal_fixed_price;
    const hasInternalReference =
        internalReferencePrice != null && Number.isFinite(internalReferencePrice) && internalReferencePrice > 0;
    const promoActive = isPromoPublicPriceActive({
        price: car.price,
        internal_fixed_price: car.internal_fixed_price,
        internal_fixed_price_set_at: car.internal_fixed_price_set_at,
        public_price_changed_at: car.public_price_changed_at,
        public_price_change_reason: car.public_price_change_reason,
        public_price_reverts_at: car.public_price_reverts_at,
    });
    const publicDiffersFromInternal =
        hasInternalReference &&
        Number(formData.publicPrice).toFixed(2) !== Number(internalReferencePrice).toFixed(2);
    const publicChangedInForm =
        Number(formData.publicPrice).toFixed(2) !== Number(car.price ?? 0).toFixed(2);
    const showSellerPicker =
        publicDiffersFromInternal && publicChangedInForm;

    const promoRequestedByName = useMemo(() => {
        if (!car.public_price_requested_by) return null;
        const seller = activeSellers.find((s) => s.id === car.public_price_requested_by);
        return seller?.full_name?.trim() || null;
    }, [car.public_price_requested_by, activeSellers]);

    const paginaWebFromPhotos = useMemo(
        () =>
            hasVehiclePhotos({
                img_main_url: mainImagePreview || formData.img_main_url || null,
                img_gallery_urls: [
                    ...existingGallery,
                    ...(newGalleryFiles.length > 0 ? ["pending"] : []),
                ],
            }),
        [mainImagePreview, formData.img_main_url, existingGallery, newGalleryFiles.length]
    );

    useEffect(() => {
        setListingChecklist((prev) => ({ ...prev, pagina_web: paginaWebFromPhotos }));
    }, [paginaWebFromPhotos]);

    const vehiclePhotoItems = useMemo<DownloadImageItem[]>(() => {
        const items: DownloadImageItem[] = [];
        const mainSrc = mainImagePreview || formData.img_main_url;
        if (mainSrc) {
            items.push({ src: mainSrc, filename: `${downloadSlug}-portada.png` });
        }
        existingGallery.forEach((url, idx) => {
            items.push({
                src: url,
                filename: `${downloadSlug}-galeria-${String(idx + 1).padStart(2, "0")}.png`,
            });
        });
        newGalleryPreviews.forEach((preview, idx) => {
            items.push({
                src: preview,
                filename: `${downloadSlug}-galeria-nueva-${String(idx + 1).padStart(2, "0")}.png`,
            });
        });
        return items;
    }, [mainImagePreview, formData.img_main_url, existingGallery, newGalleryPreviews, downloadSlug]);

    const photoViewerUrls = useMemo(
        () => vehiclePhotoItems.map((item) => item.src),
        [vehiclePhotoItems]
    );

    const openPhotoViewer = (src: string) => {
        const idx = photoViewerUrls.indexOf(src);
        if (idx >= 0) setPhotoViewerIndex(idx);
    };

    const handleDownloadAllPhotos = async () => {
        if (vehiclePhotoItems.length === 0) {
            toast.error("Este vehículo no tiene fotos para descargar");
            return;
        }
        setDownloadingAllPhotos(true);
        try {
            await downloadImagesAsPngZip(vehiclePhotoItems, `${downloadSlug}.zip`);
            toast.success(`Descargando ${vehiclePhotoItems.length} foto(s) en PNG`);
        } catch (error) {
            console.error("Error al descargar fotos del vehículo:", error);
            toast.error("No se pudieron descargar las fotos");
        } finally {
            setDownloadingAllPhotos(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCancelPromo = async () => {
        if (!isAdmin || !pricingAvailable || !car.plate || !promoActive) return;
        if (
            !window.confirm(
                '¿Cancelar la promo y volver el precio público al interno fijo? Quedará registrado en el historial.'
            )
        ) {
            return;
        }

        setIsCancellingPromo(true);
        try {
            const result = await inventarioService.cancelPublicPromo(car.plate);
            const patch: Partial<InventoryCar> = {
                price: result.price,
                public_price_changed_at: null,
                public_price_change_reason: null,
                public_price_reverts_at: null,
                public_price_requested_by: null,
            };
            setFormData((prev) => ({
                ...prev,
                publicPrice: String(result.price),
            }));
            setPublicPriceRequestedBySellerId('');
            await onUpdate(patch);
            toast.success('Promo cancelada. Precio público alineado al interno fijo.');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'No se pudo cancelar la promo';
            toast.error(message);
        } finally {
            setIsCancellingPromo(false);
        }
    };

    const handleListingChecklistChange = (key: ListingChecklistKey, checked: boolean) => {
        if (key === "pagina_web") return;
        setListingChecklist((prev) => ({ ...prev, [key]: checked }));
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

            let resolvedPublicPrice = Number(formData.publicPrice) || car.price || 0;
            let resolvedInternalFixed = car.internal_fixed_price;
            let pricePatch: Partial<InventoryCar> = {};

            if (car.plate) {
                const plate = car.plate.toUpperCase();

                if (isAdmin && pricingAvailable) {
                    const internalVal = formData.internalFixedPrice
                        ? Number(formData.internalFixedPrice)
                        : 0;
                    let currentFixed = Number(car.internal_fixed_price ?? 0);

                    if (!hasInternalFixedPrice) {
                        if (!internalVal) {
                            throw new Error(
                                'Debes registrar el precio interno fijo antes de guardar promociones públicas'
                            );
                        }
                        const result = await inventarioService.setInternalFixedPrice(plate, internalVal);
                        resolvedPublicPrice = result.price;
                        resolvedInternalFixed = result.internalFixedPrice;
                        currentFixed = result.internalFixedPrice;
                        pricePatch = {
                            internal_fixed_price: result.internalFixedPrice,
                            internal_fixed_price_set_at: result.internalFixedPriceSetAt,
                            price: result.price,
                            public_price_changed_at: null,
                            public_price_change_reason: null,
                            public_price_reverts_at: null,
                            public_price_requested_by: null,
                        };
                    } else {
                        const internalChanged =
                            !!internalVal &&
                            Number(internalVal.toFixed(2)) !== Number(car.internal_fixed_price!.toFixed(2));

                        if (internalChanged) {
                            const result = await inventarioService.setInternalFixedPrice(plate, internalVal);
                            resolvedPublicPrice = result.price;
                            resolvedInternalFixed = result.internalFixedPrice;
                            currentFixed = result.internalFixedPrice;
                            pricePatch = {
                                ...pricePatch,
                                internal_fixed_price: result.internalFixedPrice,
                                price: result.price,
                                ...(result.syncedPublic
                                    ? {
                                          public_price_changed_at: null,
                                          public_price_change_reason: null,
                                          public_price_reverts_at: null,
                                          public_price_requested_by: null,
                                      }
                                    : {}),
                            };
                        }

                        const publicPrice = Number(formData.publicPrice);
                        if (!publicPrice) {
                            throw new Error('Ingresa el precio público (visible al cliente)');
                        }

                        const currentPublic = Number((car.price ?? 0).toFixed(2));
                        const publicChangedInFormSave =
                            Number(publicPrice.toFixed(2)) !== currentPublic;

                        if (publicChangedInFormSave) {
                            const changingPublic =
                                Number(publicPrice.toFixed(2)) !== Number(currentFixed.toFixed(2));
                            if (changingPublic && !publicPriceRequestedBySellerId.trim()) {
                                throw new Error(
                                    'Selecciona el vendedor que solicitó el precio promocional'
                                );
                            }
                            const sellerName = activeSellers.find(
                                (s) => s.id === publicPriceRequestedBySellerId
                            )?.full_name;
                            const result = await inventarioService.updatePublicPrice(
                                plate,
                                publicPrice,
                                changingPublic
                                    ? buildPromoReasonFromSeller(sellerName)
                                    : 'Alineado al precio interno fijo',
                                changingPublic ? publicPriceRequestedBySellerId : null
                            );
                            resolvedPublicPrice = result.price;
                            pricePatch = {
                                ...pricePatch,
                                price: result.price,
                                public_price_changed_at: result.publicPriceChangedAt,
                                public_price_change_reason: result.publicPriceChangeReason,
                                public_price_reverts_at: result.publicPriceRevertsAt,
                                public_price_requested_by: result.publicPriceRequestedBy,
                            };
                        } else if (internalChanged) {
                            resolvedPublicPrice = pricePatch.price ?? resolvedPublicPrice;
                        } else {
                            resolvedPublicPrice = publicPrice;
                        }
                    }
                }

                if (canEdit) {
                    await inventarioService.updateMileage(plate, Number(formData.mileage));
                }
            }

            const updatedAt = new Date().toISOString();
            const oraclePayload: Record<string, unknown> = {
                price: isAdmin ? resolvedPublicPrice : (car.price ?? 0),
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
                img_main_url: finalMainUrl,
                img_gallery_urls: finalGalleryUrls,
                publication_url: formData.publication_url,
                listing_checklist: mergeListingChecklistForSave(listingChecklist, {
                    img_main_url: finalMainUrl,
                    img_gallery_urls: finalGalleryUrls,
                }),
                updated_at: updatedAt,
            };

            if (isAdmin && pricingAvailable && resolvedInternalFixed != null) {
                oraclePayload.internal_fixed_price = resolvedInternalFixed;
            }

            const oracleQuery = car.plate
                ? supabase.from('inventoryoracle').update(oraclePayload).eq('plate', car.plate.toUpperCase())
                : supabase.from('inventoryoracle').update(oraclePayload).eq('id', car.id);

            const { error: error2 } = await oracleQuery;
            if (error2) {
                console.warn("⚠️ Advertencia al actualizar inventoryoracle:", error2);
            }

            const savedPatch: Partial<InventoryCar> = {
                ...pricePatch,
                price: isAdmin ? resolvedPublicPrice : car.price,
                internal_fixed_price: resolvedInternalFixed,
                mileage: Number(formData.mileage),
                status: formData.status as InventoryCar['status'],
                location: formData.location as InventoryCar['location'],
                description: formData.description,
                color: formData.color,
                year: Number(formData.year),
                marketing_in_patio: formData.marketing_in_patio,
                marketing_posts_count: Number(formData.marketing_posts_count),
                marketing_videos_count: Number(formData.marketing_videos_count),
                marketing_stories_count: Number(formData.marketing_stories_count),
                img_main_url: finalMainUrl,
                img_gallery_urls: finalGalleryUrls,
                publication_url: formData.publication_url,
                listing_checklist: mergeListingChecklistForSave(listingChecklist, {
                    img_main_url: finalMainUrl,
                    img_gallery_urls: finalGalleryUrls,
                }) as InventoryCar['listing_checklist'],
                updated_at: updatedAt,
            };

            await onUpdate(savedPatch);
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
        <>
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
                        onClick={() => setActiveTab('listing')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'listing' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <ClipboardCheck className="h-4 w-4" /> Canales
                    </button>
                    <button
                        onClick={() => setActiveTab('publications')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'publications' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Link className="h-4 w-4" /> Enlaces
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

                                {canViewPrices && (
                                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                            Precios del vehículo
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                            {isAdmin ? (
                                                hasInternalFixedPrice ? (
                                                    <>
                                                        El <strong>precio interno fijo</strong> es la referencia de ventas (editable).
                                                        El <strong>precio público</strong> es el que ve el cliente en la web.
                                                        Si el público difiere del interno, indica qué vendedor lo solicitó; en 5 días vuelve al interno fijo.
                                                    </>
                                                ) : (
                                                    <>
                                                        Primero registra el <strong>precio interno fijo</strong> (referencia de ventas).
                                                        Al guardar, se habilitará el precio público para la web.
                                                    </>
                                                )
                                            ) : hasInternalFixedPrice ? (
                                                <>
                                                    Referencia de ventas (<strong>interno</strong>) y precio visible al cliente (<strong>público</strong>).
                                                    Solo lectura — contacta al administrador para cambios o promos.
                                                </>
                                            ) : (
                                                <>Aún no hay precio interno fijo registrado. Solo lectura.</>
                                            )}
                                        </p>
                                    </div>

                                    <div
                                        className={
                                            hasInternalFixedPrice
                                                ? 'grid grid-cols-1 md:grid-cols-2 gap-3'
                                                : 'max-w-md'
                                        }
                                    >
                                        <FormField label="Precio interno fijo (referencia ventas)">
                                            {isAdmin && pricingAvailable ? (
                                                <div className="relative flex items-center">
                                                    <DollarSign className="absolute left-2 text-slate-400 h-3.5 w-3.5" />
                                                    <Input
                                                        type="number"
                                                        className="pl-7 font-mono font-bold text-slate-800"
                                                        value={formData.internalFixedPrice}
                                                        onChange={(e) =>
                                                            setFormData((prev) => {
                                                                const nextInternal = e.target.value;
                                                                if (!hasInternalFixedPrice) {
                                                                    return {
                                                                        ...prev,
                                                                        internalFixedPrice: nextInternal,
                                                                    };
                                                                }
                                                                const baselineInternal =
                                                                    prev.internalFixedPrice ||
                                                                    String(car.internal_fixed_price ?? '');
                                                                const wasAligned =
                                                                    Number(prev.publicPrice).toFixed(2) ===
                                                                    Number(baselineInternal).toFixed(2);
                                                                return {
                                                                    ...prev,
                                                                    internalFixedPrice: nextInternal,
                                                                    publicPrice:
                                                                        wasAligned && nextInternal
                                                                            ? nextInternal
                                                                            : prev.publicPrice,
                                                                };
                                                            })
                                                        }
                                                        placeholder="Precio de referencia para ventas"
                                                    />
                                                </div>
                                            ) : hasInternalFixedPrice ? (
                                                <div className="h-9 px-2 flex items-center gap-2 text-xs font-mono font-bold text-slate-800 bg-slate-100">
                                                    {formatInventoryPrice(car.internal_fixed_price)}
                                                </div>
                                            ) : (
                                                <div className="h-9 px-2 flex items-center text-xs text-amber-700 bg-amber-50">
                                                    Sin precio interno fijo
                                                </div>
                                            )}
                                        </FormField>

                                        {hasInternalFixedPrice && (
                                            <FormField label="Precio público (cliente / web)">
                                                {isAdmin && pricingAvailable ? (
                                                    <div className="relative flex items-center">
                                                        <DollarSign className="absolute left-2 text-slate-400 h-3.5 w-3.5" />
                                                        <Input
                                                            type="number"
                                                            className="pl-7 font-mono font-bold text-emerald-800"
                                                            value={formData.publicPrice}
                                                            onChange={(e) =>
                                                                setFormData((prev) => ({
                                                                    ...prev,
                                                                    publicPrice: e.target.value,
                                                                }))
                                                            }
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="h-9 px-2 flex items-center text-xs font-mono font-bold text-emerald-700 bg-emerald-50">
                                                        {formatInventoryPrice(
                                                            getEffectivePublicPrice({
                                                                price: car.price,
                                                                internal_fixed_price: car.internal_fixed_price,
                                                                internal_fixed_price_set_at:
                                                                    car.internal_fixed_price_set_at,
                                                                public_price_changed_at:
                                                                    car.public_price_changed_at,
                                                                public_price_change_reason:
                                                                    car.public_price_change_reason,
                                                                public_price_reverts_at:
                                                                    car.public_price_reverts_at,
                                                            })
                                                        )}
                                                    </div>
                                                )}
                                            </FormField>
                                        )}
                                    </div>

                                    {promoActive && (
                                        <div className="relative rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 pr-10 text-[11px] text-violet-900">
                                            <span className="font-semibold">Promo activa</span>
                                            {car.public_price_reverts_at && (
                                                <span className="block text-violet-600 mt-0.5">
                                                    {formatRevertCountdown(car.public_price_reverts_at)}
                                                    {' · '}
                                                    Cambió el{' '}
                                                    {new Date(car.public_price_changed_at!).toLocaleDateString('es-EC')}
                                                </span>
                                            )}
                                            {promoRequestedByName && (
                                                <span className="block text-violet-600 mt-0.5">
                                                    Solicitado por: {promoRequestedByName}
                                                </span>
                                            )}
                                            {isAdmin && pricingAvailable && (
                                                <button
                                                    type="button"
                                                    onClick={handleCancelPromo}
                                                    disabled={isCancellingPromo || isSaving}
                                                    className="absolute top-2 right-2 p-1 rounded-md text-violet-500 hover:text-violet-900 hover:bg-violet-100/80 transition-colors disabled:opacity-50"
                                                    title="Cancelar promo y volver al precio interno fijo"
                                                    aria-label="Cancelar promo"
                                                >
                                                    {isCancellingPromo ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <X className="h-3.5 w-3.5" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {isAdmin && pricingAvailable && hasInternalReference && showSellerPicker && (
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">
                                                Vendedor que solicitó la promo
                                                <span className="text-red-500 normal-case"> *</span>
                                            </span>
                                            <div className="rounded-xl border border-slate-200 bg-white overflow-visible shadow-sm">
                                                <SellerPicker
                                                    sellers={activeSellers}
                                                    value={publicPriceRequestedBySellerId}
                                                    onChange={setPublicPriceRequestedBySellerId}
                                                />
                                            </div>
                                            <p className="text-[11px] text-slate-500 leading-relaxed flex items-start gap-1.5">
                                                <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                                                Elige al vendedor que pidió este precio. En 5 días el precio público vuelve solo al interno fijo.
                                            </p>
                                        </div>
                                    )}

                                    {!pricingAvailable && (
                                        <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                                            Vehículo no disponible: los precios promocionales no se modifican (solo lectura).
                                        </p>
                                    )}
                                </div>
                                )}

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
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleDownloadAllPhotos}
                                    disabled={downloadingAllPhotos || vehiclePhotoItems.length === 0}
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {downloadingAllPhotos ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="h-4 w-4" />
                                    )}
                                    Descargar todas ({vehiclePhotoItems.length})
                                </button>
                            </div>
                            <div className="space-y-2">
                                <SectionTitle icon={ImageIcon} title="Foto principal" />
                                <div className="relative aspect-video w-full rounded-lg border-2 border-dashed border-slate-300 bg-white overflow-hidden group">
                                    {mainImagePreview || formData.img_main_url ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openPhotoViewer(
                                                        mainImagePreview || formData.img_main_url
                                                    )
                                                }
                                                className="block w-full h-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
                                                title="Ver imagen ampliada"
                                            >
                                                {mainImagePreview ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={mainImagePreview}
                                                        alt="Principal"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <OptimizedImage
                                                        src={formData.img_main_url}
                                                        alt="Principal"
                                                        className="w-full h-full object-cover"
                                                        loading="eager"
                                                    />
                                                )}
                                            </button>
                                            {canEdit && (
                                                <button
                                                    type="button"
                                                    onClick={() => mainInputRef.current?.click()}
                                                    className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-lg bg-black/60 px-3 py-2 text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/75"
                                                >
                                                    <UploadCloud className="w-4 h-4" />
                                                    Cambiar portada
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => canEdit && mainInputRef.current?.click()}
                                            disabled={!canEdit}
                                            className={`flex flex-col items-center justify-center h-full w-full text-slate-400 ${
                                                canEdit
                                                    ? "cursor-pointer hover:text-blue-600 hover:border-blue-400"
                                                    : "cursor-default opacity-90"
                                            }`}
                                        >
                                            <ImageIcon className="w-10 h-10 mb-2" />
                                            <span>{canEdit ? "Click para subir portada" : "Sin portada"}</span>
                                        </button>
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
                                        <div
                                            key={`exist-${idx}`}
                                            className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => openPhotoViewer(url)}
                                                className="block w-full h-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                                title="Ver imagen ampliada"
                                            >
                                                <OptimizedImage
                                                    src={url}
                                                    alt="Galeria"
                                                    className="w-full h-full object-cover"
                                                />
                                            </button>
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                                            {canEdit && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeExistingGalleryImage(idx)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 transform hover:scale-110"
                                                    title="Eliminar foto"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                            <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none">
                                                Guardada
                                            </span>
                                        </div>
                                    ))}

                                    {/* 2. Fotos Nuevas (Pendientes) */}
                                    {newGalleryPreviews.map((preview, idx) => (
                                        <div
                                            key={`new-${idx}`}
                                            className="relative aspect-square rounded-lg overflow-hidden border-2 border-blue-200 group"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => openPhotoViewer(preview)}
                                                className="block w-full h-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                                title="Ver imagen ampliada"
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={preview}
                                                    alt="Nueva"
                                                    className="w-full h-full object-cover"
                                                />
                                            </button>
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
                    {activeTab === 'listing' && (
                        <ModalPanel>
                            <InventoryListingChecklistTab
                                checklist={listingChecklist}
                                canEdit={canEdit}
                                readOnlyKeys={["pagina_web"]}
                                onChange={handleListingChecklistChange}
                            />
                        </ModalPanel>
                    )}

                    {activeTab === 'publications' && (
                        <ModalPanel>
                            <SectionTitle icon={Link} title="Enlaces de publicación" />
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

        {photoViewerIndex != null && (
            <ImageViewerModal
                images={photoViewerUrls}
                title={vehicleDownloadName || "Fotos del vehículo"}
                initialIndex={photoViewerIndex}
                onClose={() => setPhotoViewerIndex(null)}
            />
        )}
        </>
    );
}