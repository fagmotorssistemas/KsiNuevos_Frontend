import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    X, 
    Calendar, 
    User, 
    Phone, 
    Car, 
    DollarSign, 
    CheckCircle2, 
    Image as ImageIcon,
    Loader2,
    AlertCircle,
    Save // Icono para el botón de guardar
} from 'lucide-react';
import { Button } from "@/components/ui/buttontable";
import { WebAppointmentWithDetails, WebAppointmentStatus } from "@/types/web-appointments";

interface WebAppointmentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: WebAppointmentWithDetails | null;
    onAssign: (id: number) => Promise<any>;
    onCancel: (id: number) => Promise<any>;
    onStatusChange: (id: number, status: WebAppointmentStatus) => Promise<any>;
    onUpdateNotes: (id: number, notes: string) => Promise<any>; // Nueva prop para actualizar notas
    currentUserId?: string;
}

export function WebAppointmentDetailModal({ 
    isOpen, 
    onClose, 
    appointment, 
    onAssign, 
    onStatusChange,
    onUpdateNotes, // Nueva prop inyectada
    currentUserId
}: WebAppointmentDetailModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notes, setNotes] = useState(appointment?.notes || ""); // Estado local para el texto

    // Sincronizar el estado local cuando cambia la cita seleccionada
    useEffect(() => {
        if (appointment) {
            setNotes(appointment.notes || "");
        }
    }, [appointment]);

    // Bloquear scroll del body cuando está abierto
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !appointment) return null;

    const isFinalized = appointment.status === 'atendido' || appointment.status === 'cancelado';
    const isBuying = appointment.type === 'compra';
    const dateObj = new Date(appointment.appointment_date);
    
    const sellRequest = appointment.vehicle_selling;
    const buyInventory = appointment.vehicle_buying;

    const carTitle = isBuying 
        ? `${buyInventory?.brand || ''} ${buyInventory?.model || ''} ${buyInventory?.year || ''}`
        : `${sellRequest?.brand || ''} ${sellRequest?.model || ''} ${sellRequest?.year || ''}`;

    const photos = isBuying 
        ? (buyInventory?.img_gallery_urls || [])
        : (sellRequest?.photos_urls || []);

    // Manejador para guardar las notas
    const handleSaveNotes = async () => {
        if (!appointment) return;
        setIsSubmitting(true);
        try {
            await onUpdateNotes(appointment.id, notes);
        } catch (error) {
            console.error("Error al guardar notas:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAccept = async () => {
        setIsSubmitting(true);
        try {
            await onAssign(appointment.id); 
            await onStatusChange(appointment.id, 'aceptado'); 
            onClose();
        } catch (error) {
            console.error("Error al aceptar la cita:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm('¿Estás seguro de que deseas cancelar esta cita?')) return;
        setIsSubmitting(true);
        try {
            await onStatusChange(appointment.id, 'cancelado');
            onClose();
        } catch (error) {
            console.error("Error al cancelar la cita:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-20">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all flex flex-col max-h-[90vh]">
                
                <div className="flex justify-between items-start p-6 border-b border-slate-100 bg-white z-10">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 leading-6">
                            {isBuying ? 'Solicitud de Compra / Visita' : 'Solicitud de Venta (Trade-In)'}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {isFinalized ? 'Detalles históricos de la solicitud.' : 'Revisa los detalles antes de contactar al cliente.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-indigo-500" /> Datos de la Cita
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm text-slate-800">
                                    <div>
                                        <span className="block text-xs text-slate-500 uppercase font-semibold">Fecha</span>
                                        <span className="font-medium capitalize">{format(dateObj, 'EEEE d MMMM', { locale: es })}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-slate-500 uppercase font-semibold">Hora</span>
                                        <span className="font-medium">{format(dateObj, 'h:mm a')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3">
                                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <User className="w-4 h-4 text-indigo-500" /> Datos del Cliente
                                </h4>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                                        {appointment.client?.full_name?.charAt(0) || 'C'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-slate-900 truncate">{appointment.client?.full_name || 'Cliente Web'}</p>
                                        <p className="text-sm text-slate-600 flex items-center gap-1">
                                            <Phone className="w-4 h-4 text-slate-400" />
                                            {appointment.client?.phone || 'No registrado'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* SECCIÓN DE NOTAS */}
                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-blue-500" /> Notas de Seguimiento
                                </h4>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Escribe comentarios sobre la gestión..."
                                    className="w-full h-32 p-3 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white transition-all"
                                />
                                <Button 
                                    size="sm" 
                                    className="w-full bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                                    onClick={handleSaveNotes}
                                    disabled={isSubmitting || notes === appointment.notes}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <Save className="w-3.5 h-3.5 mr-2" />
                                    )}
                                    Guardar Comentarios
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
                                <Car className="w-4 h-4 text-indigo-500" /> Vehículo
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">{carTitle}</h2>
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${isBuying ? 'bg-indigo-100 text-indigo-800' : 'bg-green-100 text-green-800'}`}>
                                        <DollarSign className="w-3 h-3" />
                                        {isBuying 
                                            ? `Precio Lista: $${buyInventory?.price?.toLocaleString() || 'N/A'}`
                                            : `Pide: $${sellRequest?.client_asking_price?.toLocaleString() || 'N/A'}`}
                                    </span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 grid grid-cols-2 gap-4 text-sm">
                                    {isBuying ? (
                                        <>
                                            <div><span className="text-xs text-slate-400 block">Kilometraje</span> <span className="font-medium">{buyInventory?.mileage?.toLocaleString()} km</span></div>
                                            <div><span className="text-xs text-slate-400 block">Ubicación</span> <span className="font-medium">{buyInventory?.location || 'Patio'}</span></div>
                                        </>
                                    ) : (
                                        <>
                                            <div><span className="text-xs text-slate-400 block">Kilometraje</span> <span className="font-medium">{sellRequest?.mileage?.toLocaleString()} km</span></div>
                                            <div><span className="text-xs text-slate-400 block">Transmisión</span> <span className="font-medium">{sellRequest?.transmission || 'N/A'}</span></div>
                                        </>
                                    )}
                                </div>
                                <div>
                                    <h5 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                        <ImageIcon className="w-3 h-3" /> Galería ({photos.length})
                                    </h5>
                                    <div className="grid grid-cols-3 gap-2">
                                        {photos.slice(0, 3).map((url: string, idx: number) => (
                                            <img key={idx} src={url} alt={`Foto ${idx}`} className="aspect-square bg-slate-100 rounded-lg object-cover border border-slate-200" />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {!isFinalized ? (
                    <div className="bg-slate-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 border-t border-slate-200 z-10">
                        <button
                            disabled={isSubmitting}
                            onClick={handleCancel}
                            className="text-red-600 hover:text-red-700 text-sm font-medium px-4 py-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Cancelar Cita
                        </button>
                        <div className="flex gap-3">
                            <Button 
                                variant="secondary" 
                                onClick={handleAccept}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Aceptar
                            </Button>
                            {!appointment.responsible_id && (
                                <Button 
                                    variant="primary" 
                                    className="bg-black text-white hover:bg-gray-800"
                                    disabled={isSubmitting}
                                    onClick={async () => { 
                                        setIsSubmitting(true);
                                        await onAssign(appointment.id); 
                                        setIsSubmitting(false);
                                        onClose(); 
                                    }}
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                    Confirmar y Asignar
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-t border-slate-200 z-10">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            {appointment.status === 'atendido' ? (
                                <span className="text-green-600 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5" />
                                    Cita atendida
                                </span>
                            ) : (
                                <span className="text-red-500 flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5" />
                                    Cita cancelada
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}