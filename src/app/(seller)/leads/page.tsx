"use client";

import { useMemo, useState, useEffect, FormEvent } from "react";
// 1. IMPORTAMOS TU HOOK DE AUTENTICACIÓN
import { useAuth } from "@/hooks/useAuth";

import {
    Check,
    X,
    HelpCircle,
    Clock,
    AlertCircle,
    Thermometer,
    Phone,
    Calendar,
    MessageCircle,
    User,
    Car,
    Send,
    FileText,
    Edit3
} from "lucide-react";

import { PaginationPageMinimalCenter } from "@/components/ui/pagination";
import { Table, TableCard } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { BadgeWithIcon } from "@/components/ui/badges";
import { Button } from "@/components/ui/buttontable";

// --- TIPOS ---
import type { Database } from "@/types/supabase";

// NOTA: Eliminamos la creación manual de 'supabase' para usar la del contexto autenticado.

// Tipo extendido para incluir las relaciones
type Lead = Database['public']['Tables']['leads']['Row'] & {
    interested_cars: Database['public']['Tables']['interested_cars']['Row'][];
};

type Interaction = Database['public']['Tables']['interactions']['Row'];

type SortDescriptor = {
    column: string;
    direction: "ascending" | "descending";
};

// --- COMPONENTES UI SIMPLES (Para simular tus Inputs/Modals si no los tienes a mano) ---
const Input = ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
    />
);

const TextArea = ({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
        className="flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
    />
);

// --- COMPONENTE PRINCIPAL ---
export default function LeadsPage() {
    // 2. USAMOS EL CONTEXTO: Obtenemos el cliente 'supabase' que ya tiene la sesión del usuario
    const { supabase, user, isLoading: isAuthLoading } = useAuth();

    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null); // Para el Modal
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "created_at",
        direction: "descending",
    });

    // Función para recargar datos
    const fetchLeads = async () => {
        // Importante: Si no hay usuario, no intentamos cargar nada para evitar errores 401/403
        if (!user) return;

        setIsLoadingData(true);
        
        // La consulta ahora lleva las credenciales del usuario automáticamente
        const { data, error } = await supabase
            .from('leads')
            .select('*, interested_cars(*)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error cargando leads:", error);
        } else {
            // @ts-ignore: Supabase a veces se queja de los tipos de Joins anidados, pero los datos vienen bien
            setLeads(data || []);
        }
        setIsLoadingData(false);
    };

    // 3. EFECTO QUE DEPENDE DEL USUARIO
    useEffect(() => {
        if (!isAuthLoading && user) {
            fetchLeads();
        }
    }, [user, isAuthLoading]);

    // Manejo del Modal
    const handleOpenModal = (lead: Lead) => {
        setSelectedLead(lead);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedLead(null);
        setIsModalOpen(false);
        fetchLeads(); // Refrescamos la tabla al cerrar por si hubo cambios
    };

    // Ordenamiento
    const sortedItems = useMemo(() => {
        return [...leads].sort((a, b) => {
            const col = sortDescriptor.column as keyof Lead;
            const first = a[col];
            const second = b[col];

            if (first === null || first === undefined) return 1;
            if (second === null || second === undefined) return -1;

            if (typeof first === "string" && typeof second === "string") {
                let cmp = first.localeCompare(second);
                if (sortDescriptor.direction === "descending") cmp *= -1;
                return cmp;
            }
            // Fallback numérico/booleano
            const aNum = Number(first);
            const bNum = Number(second);
            return sortDescriptor.direction === "descending" ? bNum - aNum : aNum - bNum;
        });
    }, [sortDescriptor, leads]);

    // Helpers Visuales
    const getInitials = (name: string | null) => name ? name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() : "??";

    const getStatusConfig = (status: string | null) => {
        switch (status) {
            case 'vendido': case 'ganado': return { color: 'success' as const, icon: Check };
            case 'perdido': return { color: 'error' as const, icon: X };
            case 'nuevo': return { color: 'brand' as const, icon: AlertCircle };
            case 'negociando': return { color: 'warning' as const, icon: Clock };
            case 'interesado': return { color: 'primary' as const, icon: HelpCircle };
            case 'contactado': return { color: 'primary' as const, icon: Phone };
            default: return { color: 'gray' as const, icon: HelpCircle };
        }
    };

    const getTempColor = (temp: string | null) => {
        switch (temp) {
            case 'caliente': return 'error';
            case 'tibio': return 'warning';
            default: return 'gray';
        }
    };

    // Renderizado condicional si está cargando la sesión
    if (isAuthLoading) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-50 text-slate-500">Cargando sesión...</div>;
    }

    if (!user) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-50 text-slate-500">Debes iniciar sesión para ver este contenido.</div>;
    }

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Tablero de Leads</h1>
                    <p className="text-sm text-slate-500 mt-1">Gestión centralizada de prospectos y seguimiento.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" size="sm">Filtros</Button>
                    <Button variant="primary" size="sm" onClick={fetchLeads} disabled={isLoadingData}>
                        {isLoadingData ? 'Cargando...' : 'Actualizar'}
                    </Button>
                </div>
            </div>

            {/* Tabla Principal */}
            <TableCard.Root>
                <Table
                    aria-label="Tabla de Leads"
                    sortDescriptor={sortDescriptor}
                    onSortChange={setSortDescriptor}
                >
                    <Table.Header>
                        <Table.Head id="lead_id_kommo" label="ID" allowsSorting />
                        <Table.Head id="name" label="Cliente" allowsSorting />
                        <Table.Head id="status" label="Estado" allowsSorting />
                        <Table.Head id="vehicle" label="Interés" />
                        <Table.Head id="resume" label="Resumen / Próximo paso" className="hidden md:table-cell" />
                        <Table.Head id="temperature" label="Temp" allowsSorting />
                        <Table.Head id="actions" label="" />
                    </Table.Header>

                    <Table.Body items={sortedItems}>
                        {(item: Lead) => {
                            const statusConfig = getStatusConfig(item.status);
                            // Tomamos el primer auto de interés para mostrar en la tabla
                            const primaryCar = item.interested_cars?.[0];

                            return (
                                <Table.Row id={item.id}>
                                    <Table.Cell className="font-medium text-slate-500 text-xs">
                                        {item.lead_id_kommo || `#${item.id}`}
                                    </Table.Cell>

                                    <Table.Cell>
                                        <div className="flex items-center gap-3">
                                            <Avatar initials={getInitials(item.name)} alt={item.name || 'Lead'} size="md" />
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900">{item.name}</span>
                                                <div className="flex items-center gap-1 text-slate-500 text-xs">
                                                    {item.source === 'whatsapp' ? <MessageCircle className="h-3 w-3" /> : <User className="h-3 w-3" />}
                                                    <span className="capitalize">{item.source || 'Desconocido'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Table.Cell>

                                    <Table.Cell>
                                        <BadgeWithIcon
                                            color={statusConfig.color}
                                            iconLeading={statusConfig.icon}
                                            className="capitalize"
                                        >
                                            {item.status || 'Nuevo'}
                                        </BadgeWithIcon>
                                    </Table.Cell>

                                    <Table.Cell>
                                        {primaryCar ? (
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-800">
                                                    {primaryCar.brand} {primaryCar.model}
                                                </span>
                                                <span className="text-xs text-slate-500">{primaryCar.year}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">Sin auto definido</span>
                                        )}
                                    </Table.Cell>

                                    <Table.Cell className="hidden md:table-cell max-w-xs">
                                        <p className="truncate text-sm text-slate-600" title={item.resume || ''}>
                                            {item.resume || <span className="text-slate-400 italic">Sin resumen ejecutivo...</span>}
                                        </p>
                                    </Table.Cell>

                                    <Table.Cell>
                                        <BadgeWithIcon
                                            color={getTempColor(item.temperature) as any}
                                            iconLeading={Thermometer}
                                            className="capitalize"
                                        >
                                            {item.temperature || '-'}
                                        </BadgeWithIcon>
                                    </Table.Cell>

                                    <Table.Cell>
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleOpenModal(item)}
                                            >
                                                Gestionar
                                            </Button>
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            );
                        }}
                    </Table.Body>
                </Table>
                <PaginationPageMinimalCenter page={1} total={leads.length} className="px-6 py-4" />
            </TableCard.Root>

            {/* MODAL DE DETALLES Y GESTIÓN */}
            {isModalOpen && selectedLead && (
                <LeadDetailModal
                    lead={selectedLead}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
}


// --- SUB-COMPONENTE: MODAL DE DETALLE (Timeline + Resumen) ---
// Este componente maneja la lógica de crear interacciones y editar el resumen
function LeadDetailModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
    // 4. USAMOS EL CONTEXTO TAMBIÉN EN EL MODAL PARA INSERTAR/ACTUALIZAR
    const { supabase, user } = useAuth();
    
    const [activeTab, setActiveTab] = useState<'timeline' | 'info'>('timeline');
    const [resume, setResume] = useState(lead.resume || "");
    const [isSavingResume, setIsSavingResume] = useState(false);

    // Estado para nueva interacción
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [newInteractionNote, setNewInteractionNote] = useState("");
    const [interactionType, setInteractionType] = useState<string>("llamada");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Cargar historial al abrir
    useEffect(() => {
        const fetchInteractions = async () => {
            const { data } = await supabase
                .from('interactions')
                .select('*')
                .eq('lead_id', lead.id)
                .order('created_at', { ascending: false });

            if (data) setInteractions(data);
        };
        fetchInteractions();
    }, [lead.id, supabase]); // Añadimos supabase a dependencias

    // Guardar Resumen (Executive Summary)
    const handleSaveResume = async () => {
        setIsSavingResume(true);
        const { error } = await supabase
            .from('leads')
            .update({ resume: resume })
            .eq('id', lead.id);

        if (!error) {
            // Feedback visual simple (podrías usar un toast)
            setTimeout(() => setIsSavingResume(false), 500);
        } else {
            console.error(error);
            setIsSavingResume(false);
        }
    };

    // Crear Nueva Interacción
    const handleSubmitInteraction = async (e: FormEvent) => {
        e.preventDefault();
        if (!newInteractionNote.trim() || !user) return; // Verificamos usuario

        setIsSubmitting(true);

        // 1. Insertar la interacción
        const { data, error } = await supabase
            .from('interactions')
            .insert({
                lead_id: lead.id,
                type: interactionType as any,
                content: newInteractionNote,
                result: 'completado', // Por defecto
                responsible_id: user.id // Usamos el ID del usuario autenticado
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating interaction", error);
        } else if (data) {
            // 2. Actualizar la lista local
            setInteractions([data, ...interactions]);
            setNewInteractionNote("");
        }
        setIsSubmitting(false);
    };

    // Iconos para el timeline
    const getInteractionIcon = (type: string) => {
        switch (type) {
            case 'llamada': return <Phone className="h-4 w-4 text-blue-500" />;
            case 'whatsapp': return <MessageCircle className="h-4 w-4 text-green-500" />;
            case 'visita': return <User className="h-4 w-4 text-purple-500" />;
            default: return <FileText className="h-4 w-4 text-gray-500" />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header del Modal */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{lead.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-slate-500">{lead.phone || 'Sin teléfono'}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-sm text-slate-500 capitalize">{lead.source}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* COLUMNA IZQUIERDA: RESUMEN Y DATOS */}
                    <div className="w-1/3 bg-slate-50 p-6 border-r border-slate-200 overflow-y-auto">

                        {/* 1. Resumen Ejecutivo (Editable) */}
                        <div className="mb-6">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Edit3 className="h-3 w-3" /> Resumen Ejecutivo (Jefe)
                            </label>
                            <TextArea
                                value={resume || ''}
                                onChange={(e) => setResume(e.target.value)}
                                onBlur={handleSaveResume} // Guarda al salir del campo
                                placeholder="Escribe aquí el estatus actual del cliente..."
                                className="bg-yellow-50/50 border-yellow-200 focus:ring-yellow-400 text-slate-700 min-h-[120px]"
                            />
                            <p className="text-[10px] text-slate-400 mt-1 text-right">
                                {isSavingResume ? "Guardando..." : "Se guarda automáticamente al salir."}
                            </p>
                        </div>

                        {/* 2. Autos de Interés */}
                        <div className="mb-6">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">
                                Vehículos de Interés
                            </label>
                            {lead.interested_cars && lead.interested_cars.length > 0 ? (
                                <div className="space-y-3">
                                    {lead.interested_cars.map((car: any) => (
                                        <div key={car.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Car className="h-4 w-4 text-brand-600" />
                                                <span className="font-semibold text-slate-800">{car.brand} {car.model}</span>
                                            </div>
                                            <p className="text-xs text-slate-500">Año: {car.year} • {car.color_preference}</p>
                                            {car.notes && (
                                                <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-600 bg-slate-50 p-1 rounded">
                                                    "{car.notes}"
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic">No ha seleccionado vehículos.</p>
                            )}
                        </div>

                        {/* 3. Datos Financieros */}
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                                Presupuesto
                            </label>
                            <div className="bg-white p-3 rounded-lg border border-slate-200">
                                <span className="text-lg font-mono font-medium text-slate-700">
                                    ${lead.budget?.toLocaleString() || '0.00'}
                                </span>
                                {lead.financing && (
                                    <span className="block mt-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit">
                                        Requiere Financiamiento
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: TIMELINE DE INTERACCIONES */}
                    <div className="w-2/3 flex flex-col bg-white">

                        {/* Lista de Mensajes (Scrollable) */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {interactions.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <Clock className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                    <p>No hay interacciones registradas aún.</p>
                                </div>
                            ) : (
                                interactions.map((interaction) => (
                                    <div key={interaction.id} className="flex gap-4 group">
                                        <div className="flex flex-col items-center">
                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                                {getInteractionIcon(interaction.type)}
                                            </div>
                                            <div className="w-px h-full bg-slate-100 group-last:hidden mt-2"></div>
                                        </div>
                                        <div className="flex-1 pb-6">
                                            <div className="flex justify-between items-start">
                                                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                                                    {interaction.type}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    {interaction.created_at ? new Date(interaction.created_at).toLocaleString() : ''}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-slate-700 text-sm bg-slate-50 p-3 rounded-br-xl rounded-bl-xl rounded-tr-xl">
                                                {interaction.content}
                                            </div>
                                            <div className="mt-1">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${interaction.result === 'sin_respuesta' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                    {interaction.result?.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Input Area (Fijo abajo) */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200">
                            <form onSubmit={handleSubmitInteraction} className="flex flex-col gap-3">
                                <div className="flex gap-2">
                                    {['llamada', 'whatsapp', 'visita', 'email'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setInteractionType(type)}
                                            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${interactionType === type
                                                    ? 'bg-slate-800 text-white border-slate-800'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                                } capitalize`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder={`Registrar nueva ${interactionType}...`}
                                        value={newInteractionNote}
                                        onChange={(e) => setNewInteractionNote(e.target.value)}
                                        className="flex-1 shadow-sm"
                                        autoFocus
                                    />
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        type="submit"
                                        disabled={isSubmitting || !newInteractionNote}
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}