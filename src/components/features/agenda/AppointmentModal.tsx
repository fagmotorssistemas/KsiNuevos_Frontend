import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { 
    X, 
    Calendar, 
    MapPin, 
    AlignLeft, 
    Loader2,
    User,
    Type,
    Save,
    AlertCircle,
    Link as LinkIcon,
    Car,
    Search,
    ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { AppointmentWithDetails } from "@/hooks/useAgenda";

export type AppointmentLeadVehicle = {
    inventoryId: string | null;
    brand: string;
    model: string;
    year: number | string;
    version?: string | null;
    plateShort?: string | null;
    imageUrl?: string | null;
    status?: string | null;
};

type InterestedCarInput = {
    inventory_id?: string | null;
    brand?: string | null;
    model?: string | null;
    year?: number | string | null;
    inventoryoracle?:
        | {
              id?: string;
              brand?: string;
              model?: string;
              year?: number;
              version?: string | null;
              plate_short?: string | null;
              img_main_url?: string | null;
              status?: string | null;
          }
        | {
              id?: string;
              brand?: string;
              model?: string;
              year?: number;
              version?: string | null;
              plate_short?: string | null;
              img_main_url?: string | null;
              status?: string | null;
          }[]
        | null;
};

export function mapInterestedCarsToAppointmentVehicles(
    cars: InterestedCarInput[] | null | undefined
): AppointmentLeadVehicle[] {
    if (!cars?.length) return [];

    const seen = new Set<string>();
    const result: AppointmentLeadVehicle[] = [];

    for (const car of cars) {
        const rawInv = car.inventoryoracle;
        const inv = Array.isArray(rawInv) ? rawInv[0] : rawInv;
        const inventoryId = car.inventory_id ?? inv?.id ?? null;
        const key = inventoryId ?? `${car.brand}-${car.model}-${car.year}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const brand = inv?.brand ?? car.brand ?? "";
        const model = inv?.model ?? car.model ?? "";
        const year = inv?.year ?? car.year ?? "";
        if (!brand && !model && !year) continue;

        result.push({
            inventoryId,
            brand,
            model,
            year,
            version: inv?.version ?? null,
            plateShort: inv?.plate_short ?? null,
            imageUrl: inv?.img_main_url ?? null,
            status: inv?.status ?? null,
        });
    }

    return result;
}

function formatVehicleLabel(v: AppointmentLeadVehicle): string {
    return [v.brand, v.model, v.year, v.version].filter(Boolean).join(" ").trim();
}

const VEHICLE_NOTE_MARKER_RE = /\[vehículo:([0-9a-f-]{36})\]/i;

function parseInventoryIdFromNotes(notes: string | null | undefined): string | null {
    const m = notes?.match(VEHICLE_NOTE_MARKER_RE);
    return m?.[1] ?? null;
}

function buildNotesWithVehicle(notes: string, label: string, inventoryId: string): string {
    const marker = `[vehículo:${inventoryId}]`;
    const line = `Vehículo de interés: ${label} ${marker}`;
    const cleaned = notes
        .split("\n")
        .filter((l) => !VEHICLE_NOTE_MARKER_RE.test(l) && !l.trim().startsWith("Vehículo de interés:"))
        .join("\n")
        .trim();
    return cleaned ? `${cleaned}\n${line}` : line;
}

function mapCatalogRow(row: {
    id: string;
    brand: string;
    model: string;
    year: number;
    version?: string | null;
    plate_short?: string | null;
    img_main_url?: string | null;
    status?: string | null;
}): AppointmentLeadVehicle {
    return {
        inventoryId: row.id,
        brand: row.brand,
        model: row.model,
        year: row.year,
        version: row.version ?? null,
        plateShort: row.plate_short ?? null,
        imageUrl: row.img_main_url ?? null,
        status: row.status ?? null,
    };
}

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    
    // Props opcionales para diferentes modos
    initialLeadId?: number | null;
    appointmentToEdit?: AppointmentWithDetails | null; // MODO EDICIÓN
    initialData?: Partial<AppointmentFormData> | null; // MODO PRE-LLENADO (Desde Bot)
    /** Vehículos del lead (evita recarga si ya vienen de Agenda / sugerencia bot). */
    initialVehicles?: AppointmentLeadVehicle[] | null;
    /** Preselección en inventoryoracle. */
    initialInventoryId?: string | null;
}

interface AppointmentFormData {
    title: string;
    lead_id: number | null;
    external_client_name: string;
    start_time: string;
    location: string;
    notes: string;
}

type AppointmentStatus = "pendiente" | "confirmada" | "completada" | "cancelada" | "reprogramada" | "no_asistio";

export function AppointmentModal({ 
    isOpen, 
    onClose, 
    onSuccess, 
    initialLeadId = null,
    appointmentToEdit = null,
    initialData = null,
    initialVehicles = null,
    initialInventoryId = null,
}: AppointmentModalProps) {
    const { supabase, user } = useAuth();
    
    // Estados
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [leadVehicles, setLeadVehicles] = useState<AppointmentLeadVehicle[]>([]);
    const [vehiclesLoading, setVehiclesLoading] = useState(false);
    const [catalogVehicles, setCatalogVehicles] = useState<AppointmentLeadVehicle[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
    const [vehicleSearch, setVehicleSearch] = useState("");
    const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
    const vehiclePickerRef = useRef<HTMLDivElement>(null);
    
    const [formData, setFormData] = useState<AppointmentFormData>({
        title: "",
        lead_id: initialLeadId,
        external_client_name: "",
        start_time: "",
        location: "",
        notes: ""
    });

    const isEditing = !!appointmentToEdit;
    const modalTitle = isEditing ? "Editar Cita" : "Agendar Cita";
    const hasLeadLinked = Boolean(
        formData.lead_id ?? initialLeadId ?? appointmentToEdit?.lead_id
    );
    /** Sugerencia IA: el lead y el auto ya vienen detectados. */
    const isFromBotSuggestion = !isEditing && Boolean(initialData && hasLeadLinked);
    /** Cliente en showroom / cita manual sin lead. */
    const isWalkInNew = !isEditing && !hasLeadLinked;
    const [showVehiclePicker, setShowVehiclePicker] = useState(false);

    // Validar si todos los campos tienen datos
    const isFormValid = 
        formData.title.trim().length > 0 &&
        formData.external_client_name.trim().length > 0 &&
        formData.start_time.length > 0 &&
        formData.location.trim().length > 0 &&
        formData.notes.trim().length > 0 &&
        !!selectedInventoryId;

    const vehicleOptions = useMemo(() => {
        const byId = new Map<string, AppointmentLeadVehicle>();
        for (const v of leadVehicles) {
            if (v.inventoryId) byId.set(v.inventoryId, v);
        }
        for (const v of catalogVehicles) {
            if (v.inventoryId && !byId.has(v.inventoryId)) byId.set(v.inventoryId, v);
        }
        return [...byId.values()];
    }, [leadVehicles, catalogVehicles]);

    const selectedVehicle = useMemo(
        () => vehicleOptions.find((v) => v.inventoryId === selectedInventoryId) ?? null,
        [vehicleOptions, selectedInventoryId]
    );

    const filteredCatalog = useMemo(() => {
        const q = vehicleSearch.trim().toLowerCase();
        if (!q) return catalogVehicles;
        return catalogVehicles.filter((v) => {
            const hay = [v.brand, v.model, String(v.year), v.version, v.plateShort]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return hay.includes(q);
        });
    }, [catalogVehicles, vehicleSearch]);

    const pickVehicle = useCallback((v: AppointmentLeadVehicle) => {
        if (!v.inventoryId) return;
        setSelectedInventoryId(v.inventoryId);
        setVehicleSearch(formatVehicleLabel(v));
        setVehicleDropdownOpen(false);
    }, []);

    const loadCatalog = useCallback(async () => {
        setCatalogLoading(true);
        try {
            const { data, error: catError } = await supabase
                .from("inventoryoracle")
                .select("id, brand, model, year, version, plate_short, img_main_url, status")
                .in("status", ["disponible", "reservado", "vendido"])
                .order("updated_at", { ascending: false })
                .limit(400);
            if (catError) throw catError;
            setCatalogVehicles((data ?? []).map((row) => mapCatalogRow(row as Parameters<typeof mapCatalogRow>[0])));
        } catch (e) {
            console.error("Error cargando inventario:", e);
            setCatalogVehicles([]);
        } finally {
            setCatalogLoading(false);
        }
    }, [supabase]);

    // Efectos
    useEffect(() => {
        if (isOpen) {
            setError(null);
            setVehicleSearch("");
            setVehicleDropdownOpen(false);
            setShowVehiclePicker(false);

            const defaultInventoryId =
                initialInventoryId ??
                initialVehicles?.find((v) => v.inventoryId)?.inventoryId ??
                parseInventoryIdFromNotes(appointmentToEdit?.notes) ??
                null;
            setSelectedInventoryId(defaultInventoryId);

            if (appointmentToEdit) {
                // MODO EDICIÓN: Cargar datos existentes
                const date = new Date(appointmentToEdit.start_time);
                // Ajuste para input datetime-local que requiere formato YYYY-MM-DDTHH:MM
                // Importante: toISOString() da UTC, necesitamos hora local para el input
                const localIsoString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

                setFormData({
                    title: appointmentToEdit.title,
                    lead_id: appointmentToEdit.lead_id,
                    external_client_name: appointmentToEdit.external_client_name || "",
                    start_time: localIsoString,
                    location: appointmentToEdit.location || "",
                    notes: appointmentToEdit.notes || ""
                });
            } else if (initialData) {
                // MODO PRE-LLENADO (BOT)
                setFormData(prev => ({
                    ...prev,
                    title: initialData.title || "",
                    lead_id: initialLeadId || initialData.lead_id || null,
                    external_client_name: initialData.external_client_name || "",
                    start_time: initialData.start_time || "",
                    location: initialData.location || "",
                    notes: initialData.notes || ""
                }));

                // Si no hay fecha en initialData, poner default
                if (!initialData.start_time) setDefaultTime();

            } else {
                // MODO CREACIÓN LIMPIA
                setFormData({
                    title: "",
                    lead_id: initialLeadId || null,
                    external_client_name: "",
                    start_time: "",
                    location: "",
                    notes: ""
                });
                setDefaultTime();
            }
        }
    }, [isOpen, appointmentToEdit, initialLeadId, initialData, initialInventoryId, initialVehicles]);

    useEffect(() => {
        if (!isOpen) return;
        if (isWalkInNew || isEditing || showVehiclePicker) {
            loadCatalog();
        }
    }, [isOpen, isWalkInNew, isEditing, showVehiclePicker, loadCatalog]);

    useEffect(() => {
        if (!isOpen) return;
        const onDocClick = (e: MouseEvent) => {
            if (vehiclePickerRef.current && !vehiclePickerRef.current.contains(e.target as Node)) {
                setVehicleDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || selectedInventoryId) return;
        const first =
            initialVehicles?.find((v) => v.inventoryId)?.inventoryId ??
            leadVehicles.find((v) => v.inventoryId)?.inventoryId ??
            null;
        if (first) {
            setSelectedInventoryId(first);
            const v = [...leadVehicles, ...catalogVehicles].find((x) => x.inventoryId === first);
            if (v) setVehicleSearch(formatVehicleLabel(v));
        }
    }, [isOpen, selectedInventoryId, initialVehicles, leadVehicles, catalogVehicles]);

    useEffect(() => {
        if (selectedVehicle) {
            setVehicleSearch(formatVehicleLabel(selectedVehicle));
        }
    }, [selectedVehicle?.inventoryId]);

    useEffect(() => {
        if (!isOpen) {
            setLeadVehicles([]);
            setVehiclesLoading(false);
            return;
        }

        const leadId =
            appointmentToEdit?.lead_id ??
            initialLeadId ??
            initialData?.lead_id ??
            formData.lead_id;

        if (!leadId) {
            setLeadVehicles([]);
            return;
        }

        const fromEdit = appointmentToEdit?.lead?.interested_cars;
        if (fromEdit?.length) {
            setLeadVehicles(mapInterestedCarsToAppointmentVehicles(fromEdit));
            return;
        }

        if (initialVehicles?.length) {
            setLeadVehicles(initialVehicles);
            return;
        }

        let cancelled = false;
        setVehiclesLoading(true);

        (async () => {
            const { data, error: fetchError } = await supabase
                .from("leads")
                .select(
                    `interested_cars (
                        inventory_id,
                        inventoryoracle (
                            id, brand, model, year, version, plate_short, img_main_url, status
                        )
                    )`
                )
                .eq("id", leadId)
                .maybeSingle();

            if (cancelled) return;

            if (fetchError) {
                console.error("Error cargando vehículos del lead:", fetchError.message);
                setLeadVehicles([]);
            } else {
                const raw = (data as { interested_cars?: InterestedCarInput[] } | null)
                    ?.interested_cars;
                setLeadVehicles(mapInterestedCarsToAppointmentVehicles(raw));
            }
            setVehiclesLoading(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [
        isOpen,
        appointmentToEdit,
        initialLeadId,
        initialData?.lead_id,
        initialVehicles,
        formData.lead_id,
        supabase,
    ]);

    const setDefaultTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setFormData(prev => ({...prev, start_time: now.toISOString().slice(0, 16)}));
    };

    // Estilos reutilizables
    const inputClasses = "w-full h-12 rounded-xl border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all pl-11 placeholder:text-slate-400 shadow-sm text-slate-700";
    const iconContainerClass = "absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10";
    
    const InputLabel = ({ label }: { label: string }) => (
        <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
            {label}
            <span className="text-red-500 ml-1" title="Campo obligatorio">*</span>
        </label>
    );

    const getErrorClass = (fieldName: keyof AppointmentFormData) => {
        return error && !formData[fieldName]
            ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/10' 
            : '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setError(null);

        if (!isFormValid) {
            setError("Todos los campos son obligatorios para guardar la cita.");
            return;
        }

        setLoading(true);
        try {
            const startTime = new Date(formData.start_time);
            
            if (isNaN(startTime.getTime())) {
                throw new Error("La fecha de inicio no es válida.");
            }

            const picked =
                selectedVehicle ??
                vehicleOptions.find((v) => v.inventoryId === selectedInventoryId);
            if (!picked?.inventoryId) {
                throw new Error("Selecciona el vehículo de interés en inventario.");
            }

            const vehicleLabel = formatVehicleLabel(picked);
            const notesWithVehicle = buildNotesWithVehicle(
                formData.notes,
                vehicleLabel,
                picked.inventoryId
            );

            if (formData.lead_id) {
                const { data: existing } = await supabase
                    .from("interested_cars")
                    .select("id")
                    .eq("lead_id", formData.lead_id)
                    .eq("inventory_id", picked.inventoryId)
                    .maybeSingle();
                if (!existing) {
                    const { error: icError } = await supabase.from("interested_cars").insert({
                        lead_id: formData.lead_id,
                        inventory_id: picked.inventoryId,
                    });
                    if (icError) {
                        console.warn("No se pudo vincular vehículo al lead:", icError.message);
                    }
                }
            }

            // Datos comunes para ambos casos (Insert y Update)
            const commonData = {
                title: formData.title,
                lead_id: formData.lead_id ?? null,
                start_time: startTime.toISOString(),
                location: formData.location,
                notes: notesWithVehicle,
                external_client_name: formData.external_client_name
            };

            let dbError;

            if (isEditing && appointmentToEdit) {
                // UPDATE: No necesitamos enviar responsible_id ni status default
                const { error } = await supabase
                    .from('appointments')
                    .update(commonData)
                    .eq('id', appointmentToEdit.id);
                dbError = error;
            } else {
                // INSERT: Aquí responsible_id es OBLIGATORIO, lo construimos explícitamente
                const insertPayload = {
                    ...commonData,
                    responsible_id: user.id, // TypeScript ahora ve que esto es obligatorio
                    status: "pendiente" as AppointmentStatus
                };

                const { error } = await supabase
                    .from('appointments')
                    .insert([insertPayload]);
                dbError = error;
            }

            if (dbError) {
                throw new Error(dbError.message || "Error al guardar en base de datos");
            }

            onSuccess();
            handleClose();
            
        } catch (err: any) {
            console.error("Error gestionando cita:", err);
            setError(err.message || "Ocurrió un error al guardar la cita.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            // Limpiar form después de cerrar animación
            setFormData({
                title: "",
                lead_id: null,
                external_client_name: "",
                start_time: "",
                location: "",
                notes: ""
            });
            setSelectedInventoryId(null);
            setVehicleSearch("");
            setVehicleDropdownOpen(false);
            setShowVehiclePicker(false);
            setError(null);
        }, 300);
    };

    const showInventorySearch = isWalkInNew || isEditing || (isFromBotSuggestion && showVehiclePicker);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-white text-xs font-bold px-2 py-0.5 rounded ${isEditing ? 'bg-amber-500' : 'bg-slate-900'}`}>
                                {isEditing ? 'EDITAR' : 'NUEVA'}
                            </span>
                            <h2 className="font-bold text-xl text-slate-900">{modalTitle}</h2>
                        </div>
                        <p className="text-sm text-slate-500">
                            {isEditing ? 'Modifica los detalles del evento.' : 'Completa los campos para programar.'}
                        </p>
                    </div>
                    <button 
                        onClick={handleClose} 
                        className="p-2.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        type="button"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Body Scrollable */}
                <div className="overflow-y-auto custom-scrollbar bg-white flex-1">
                    <form id="appointment-form" onSubmit={handleSubmit} className="p-8 space-y-6">
                        
                        {/* Info Principal */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-5">
                            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/60">
                                <div className="p-2 bg-slate-200 rounded-lg text-slate-700">
                                    <Type className="w-5 h-5" />
                                </div>
                                <h4 className="text-base font-bold text-slate-800">Detalles Principales</h4>
                            </div>

                            {/* Título */}
                            <div>
                                <InputLabel label="Asunto / Título" />
                                <div className="relative">
                                    <div className={iconContainerClass}><Type className="h-5 w-5" /></div>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ej: Reunión de seguimiento..."
                                        className={`${inputClasses} ${getErrorClass('title')}`}
                                        value={formData.title}
                                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* Cliente Externo */}
                            <div>
                                <InputLabel label="Cliente / Contacto" />
                                <div className="relative">
                                    <div className={iconContainerClass}><User className="h-5 w-5" /></div>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Nombre del cliente"
                                        className={`${inputClasses} ${getErrorClass('external_client_name')}`}
                                        value={formData.external_client_name}
                                        onChange={(e) => setFormData({...formData, external_client_name: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* Vehículo */}
                            <div>
                                <InputLabel label="Vehículo de interés" />

                                {isFromBotSuggestion && selectedVehicle && !showVehiclePicker ? (
                                    <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-3">
                                        <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                                            <Car className="h-5 w-5 text-indigo-700" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-900 flex-1 min-w-0 truncate">
                                            {formatVehicleLabel(selectedVehicle)}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setShowVehiclePicker(true)}
                                            className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 shrink-0"
                                        >
                                            Cambiar
                                        </button>
                                    </div>
                                ) : showInventorySearch ? (
                                    <>
                                        {isWalkInNew && (
                                            <p className="text-xs text-slate-500 mb-2">
                                                Cliente en showroom: indica qué vehículo desea ver.
                                            </p>
                                        )}
                                        <div ref={vehiclePickerRef} className="relative">
                                            <div className="relative">
                                                <div className={iconContainerClass}>
                                                    {catalogLoading ? (
                                                        <Loader2 className="h-5 w-5 animate-spin" />
                                                    ) : (
                                                        <Search className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={vehicleSearch}
                                                    onChange={(e) => {
                                                        setVehicleSearch(e.target.value);
                                                        setVehicleDropdownOpen(true);
                                                        if (!e.target.value.trim()) setSelectedInventoryId(null);
                                                    }}
                                                    onFocus={() => setVehicleDropdownOpen(true)}
                                                    placeholder="Buscar marca, modelo o placa…"
                                                    className={`${inputClasses} ${error && !selectedInventoryId ? "border-red-300 bg-red-50" : ""}`}
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                    onClick={() => setVehicleDropdownOpen((o) => !o)}
                                                    aria-label="Abrir listado"
                                                >
                                                    <ChevronDown className="h-5 w-5" />
                                                </button>
                                            </div>
                                            {vehicleDropdownOpen && (
                                                <div className="absolute top-full left-0 right-0 z-30 mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                                                    {filteredCatalog.length === 0 ? (
                                                        <p className="px-4 py-4 text-sm text-slate-500 text-center">
                                                            {catalogLoading ? "Cargando…" : "Sin resultados"}
                                                        </p>
                                                    ) : (
                                                        <ul className="py-1">
                                                            {filteredCatalog.slice(0, 80).map((v) => (
                                                                <li key={v.inventoryId!}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            pickVehicle(v);
                                                                            if (isFromBotSuggestion) setShowVehiclePicker(false);
                                                                        }}
                                                                        className={`w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between gap-2 ${
                                                                            selectedInventoryId === v.inventoryId
                                                                                ? "bg-emerald-50"
                                                                                : ""
                                                                        }`}
                                                                    >
                                                                        <span className="text-sm font-semibold text-slate-900">
                                                                            {formatVehicleLabel(v)}
                                                                        </span>
                                                                        {v.plateShort && (
                                                                            <span className="text-[10px] text-slate-500 shrink-0">
                                                                                {v.plateShort}
                                                                            </span>
                                                                        )}
                                                                    </button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {isFromBotSuggestion && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowVehiclePicker(false);
                                                    if (selectedVehicle) {
                                                        setVehicleSearch(formatVehicleLabel(selectedVehicle));
                                                    }
                                                }}
                                                className="mt-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                                            >
                                                Usar vehículo detectado
                                            </button>
                                        )}
                                    </>
                                ) : vehiclesLoading ? (
                                    <p className="text-xs text-slate-500 flex items-center gap-1.5 py-2">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Cargando vehículo…
                                    </p>
                                ) : null}
                            </div>

                            {isFromBotSuggestion && hasLeadLinked && (
                                <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100">
                                    <LinkIcon className="h-3 w-3 shrink-0" />
                                    <span>Cita desde detección IA · Lead #{formData.lead_id ?? initialLeadId}</span>
                                </div>
                            )}
                        </div>

                        {/* Logística */}
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 gap-5">
                                {/* Fecha y Hora */}
                                <div>
                                    <InputLabel label="Fecha y Hora de Inicio" />
                                    <div className="relative">
                                        <div className={iconContainerClass}><Calendar className="h-5 w-5 text-slate-500" /></div>
                                        <input
                                            required
                                            type="datetime-local"
                                            className={`${inputClasses} ${getErrorClass('start_time')}`}
                                            value={formData.start_time}
                                            onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                                        />
                                    </div>
                                </div>

                                {/* Ubicación */}
                                <div>
                                    <InputLabel label="Ubicación" />
                                    <div className="relative">
                                        <div className={iconContainerClass}><MapPin className="h-5 w-5" /></div>
                                        <input
                                            required
                                            type="text"
                                            placeholder="Oficina, Zoom, Dirección..."
                                            className={`${inputClasses} ${getErrorClass('location')}`}
                                            value={formData.location}
                                            onChange={(e) => setFormData({...formData, location: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Notas */}
                            <div>
                                <InputLabel label="Notas Adicionales" />
                                <div className="relative">
                                    <div className="absolute left-4 top-4 text-slate-400 pointer-events-none"><AlignLeft className="h-5 w-5" /></div>
                                    <textarea
                                        required
                                        rows={3}
                                        placeholder="Detalles importantes para la cita..."
                                        className={`${inputClasses} ${getErrorClass('notes')} h-auto py-3.5 resize-none leading-relaxed`}
                                        value={formData.notes}
                                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer Actions */}
                <div className="p-8 pt-4 bg-white border-t border-slate-50 sticky bottom-0 z-10 flex flex-col gap-4">
                    
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-300">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                            <div className="text-sm">
                                <h4 className="font-bold text-red-900">Campos incompletos</h4>
                                <p className="text-red-700 mt-1 leading-relaxed">{error}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            form="appointment-form"
                            disabled={loading || !isFormValid}
                            className={`
                                flex-[2] text-white font-bold text-sm uppercase tracking-wide py-4 rounded-xl shadow-xl shadow-slate-900/10 
                                transition-all flex justify-center items-center gap-2 
                                ${!isFormValid || loading ? 'opacity-50 cursor-not-allowed bg-slate-400' : 'bg-slate-900 hover:bg-slate-800 transform active:scale-[0.99]'}
                            `}
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <Save className="h-5 w-5" />
                                    {isEditing ? "Guardar Cambios" : "Confirmar Cita"}
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}