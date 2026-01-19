import { useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    X, 
    Calendar, 
    User, 
    Phone, 
    MapPin, 
    Car, 
    DollarSign, 
    CheckCircle2, 
    AlertCircle,
    Image as ImageIcon
} from 'lucide-react';
import { Button } from "@/components/ui/buttontable";
import { WebAppointmentWithDetails } from "@/types/web-appointments";

interface WebAppointmentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: WebAppointmentWithDetails | null;
    onAssign: (id: number) => void;
    onCancel: (id: number) => void;
    currentUserId?: string;
}

export function WebAppointmentDetailModal({ 
    isOpen, 
    onClose, 
    appointment, 
    onAssign, 
    onCancel,
    currentUserId
}: WebAppointmentDetailModalProps) {

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

    const isBuying = appointment.type === 'compra';
    const dateObj = new Date(appointment.appointment_date);
    
    // Extracción de datos según el tipo
    const sellRequest = appointment.vehicle_selling as any; // Usamos any para acceder flexiblemente a los campos
    const buyInventory = appointment.vehicle_buying;

    const carTitle = isBuying 
        ? `${buyInventory?.brand} ${buyInventory?.model} ${buyInventory?.year}`
        : `${sellRequest?.brand} ${sellRequest?.model} ${sellRequest?.year}`;

    // Obtener fotos para mostrar en grilla (Solo si es venta)
    const photos = !isBuying && sellRequest 
        ? (sellRequest.photos_urls || sellRequest.photos_exterior || [])
        : (buyInventory?.img_gallery_urls || []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-20">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all flex flex-col max-h-[90vh]">
                
                {/* HEADER */}
                <div className="flex justify-between items-start p-6 border-b border-slate-100 bg-white z-10">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 leading-6">
                            {isBuying ? 'Solicitud de Compra / Visita' : 'Solicitud de Venta (Trade-In)'}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Revisa los detalles antes de contactar al cliente.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* BODY CON SCROLL */}
                <div className="p-6 overflow-y-auto">
                    <div className="grid gap-6 md:grid-cols-2">
                        
                        {/* COLUMNA IZQUIERDA: CLIENTE Y CITA */}
                        <div className="space-y-6">
                            {/* Info Cita */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-indigo-500" />
                                    Datos de la Cita
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="block text-xs text-slate-500 uppercase font-semibold">Fecha</span>
                                        <span className="font-medium text-slate-800 capitalize">
                                            {format(dateObj, 'EEEE d MMMM', { locale: es })}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-slate-500 uppercase font-semibold">Hora</span>
                                        <span className="font-medium text-slate-800">
                                            {format(dateObj, 'h:mm a', { locale: es })}
                                        </span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="block text-xs text-slate-500 uppercase font-semibold">Ubicación</span>
                                        <span className="font-medium text-slate-800 flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-slate-400" />
                                            Concesionario Principal
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Info Cliente */}
                            <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3">
                                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <User className="w-4 h-4 text-indigo-500" />
                                    Datos del Cliente
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                                            {appointment.client?.full_name?.charAt(0) || 'C'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">{appointment.client?.full_name || 'Cliente Web'}</p>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-dashed border-slate-100 space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Phone className="w-4 h-4 text-slate-400" />
                                            {appointment.client?.phone || 'No registrado'}
                                        </div>
                                        {/* Email si estuviera disponible en el objeto client */}
                                    </div>
                                </div>
                            </div>

                            {/* Estado Actual */}
                            <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-bold text-yellow-800">Estado: {appointment.status?.toUpperCase()}</h4>
                                        <p className="text-xs text-yellow-700 mt-1">
                                            {appointment.status === 'pendiente' 
                                                ? 'Esta cita aún no tiene responsable. Verifica los datos y asígnatela.'
                                                : `Asignada a: ${appointment.responsible?.full_name || 'Alguien'}`
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* COLUMNA DERECHA: DATOS DEL VEHÍCULO */}
                        <div className="space-y-6">
                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
                                <Car className="w-4 h-4 text-indigo-500" />
                                {isBuying ? 'Vehículo de Interés' : 'Vehículo Ofertado por Cliente'}
                            </h4>

                            <div className="space-y-4">
                                {/* Título del Carro */}
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">{carTitle}</h2>
                                    {!isBuying && sellRequest && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                                            <DollarSign className="w-3 h-3" />
                                            Pide: ${sellRequest.client_asking_price?.toLocaleString() || 'N/A'}
                                        </span>
                                    )}
                                    {isBuying && buyInventory && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mt-2">
                                            <DollarSign className="w-3 h-3" />
                                            Precio Lista: ${buyInventory.price?.toLocaleString() || 'N/A'}
                                        </span>
                                    )}
                                </div>

                                {/* Detalles Técnicos (Grid) */}
                                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    {/* Mostrar campos dependiendo si es venta o compra */}
                                    {!isBuying && sellRequest ? (
                                        <>
                                            <div><span className="text-xs text-slate-400 block">Kilometraje</span> <span className="font-medium">{sellRequest.mileage?.toLocaleString()} km</span></div>
                                            <div><span className="text-xs text-slate-400 block">Transmisión</span> <span className="font-medium">{sellRequest.transmission || 'N/A'}</span></div>
                                            <div><span className="text-xs text-slate-400 block">Color</span> <span className="font-medium">{sellRequest.color || 'N/A'}</span></div>
                                            <div><span className="text-xs text-slate-400 block">Placa</span> <span className="font-medium">{sellRequest.plate_first_letter || '*'}-{sellRequest.plate_last_digit || '*'}</span></div>
                                            <div className="col-span-2 pt-2 border-t border-slate-200">
                                                <span className="text-xs text-slate-400 block">Condición Reportada</span>
                                                <div className="flex gap-2 mt-1">
                                                    <span className={`px-2 py-0.5 text-xs rounded ${sellRequest.has_crashes ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                        {sellRequest.has_crashes ? 'Con choques' : 'Sin choques'}
                                                    </span>
                                                    <span className={`px-2 py-0.5 text-xs rounded ${sellRequest.papers_ok ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                        {sellRequest.papers_ok ? 'Papeles al día' : 'Papeles pendientes'}
                                                    </span>
                                                </div>
                                            </div>
                                            {sellRequest.description && (
                                                <div className="col-span-2 pt-2">
                                                    <span className="text-xs text-slate-400 block mb-1">Notas del Cliente</span>
                                                    <p className="text-xs text-slate-600 italic bg-white p-2 rounded border border-slate-100">"{sellRequest.description}"</p>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        /* Campos para Compra (Inventory) */
                                        <>
                                            <div><span className="text-xs text-slate-400 block">Kilometraje</span> <span className="font-medium">{buyInventory?.mileage?.toLocaleString()} km</span></div>
                                            <div><span className="text-xs text-slate-400 block">Ubicación</span> <span className="font-medium">{buyInventory?.location || 'Patio'}</span></div>
                                            <div><span className="text-xs text-slate-400 block">Estado</span> <span className="font-medium">{buyInventory?.status || 'Disponible'}</span></div>
                                        </>
                                    )}
                                </div>

                                {/* Galería de Fotos */}
                                <div>
                                    <h5 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                        <ImageIcon className="w-3 h-3" />
                                        Fotos del Vehículo ({photos.length})
                                    </h5>
                                    {photos.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-2">
                                            {photos.slice(0, 3).map((url: string, idx: number) => (
                                                <div key={idx} className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative group">
                                                    <img src={url} alt={`Foto ${idx}`} className="w-full h-full object-cover" />
                                                </div>
                                            ))}
                                            {photos.length > 3 && (
                                                <div className="aspect-square bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-xs text-slate-500 font-medium">
                                                    +{photos.length - 3} más
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-400">
                                            No hay fotos disponibles
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER: ACCIONES */}
                <div className="bg-slate-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 border-t border-slate-200 z-10">
                    <button
                        onClick={() => {
                            if (confirm('¿Estás seguro de cancelar esta cita? Esto notificará al sistema.')) {
                                onCancel(appointment.id);
                                onClose();
                            }
                        }}
                        className="text-red-600 hover:text-red-700 text-sm font-medium px-4 py-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        Cancelar Cita
                    </button>

                    <div className="flex gap-3">
                        {/* CORREGIDO: variant="secondary" para evitar error de tipos */}
                        <Button variant="secondary" onClick={onClose}>
                            Cerrar
                        </Button>
                        
                        {/* Solo mostrar botón de asignar si nadie la tiene asignada */}
                        {!appointment.responsible_id && (
                            <Button 
                                variant="primary" 
                                className="bg-black text-white hover:bg-gray-800 shadow-lg shadow-gray-200"
                                onClick={() => {
                                    onAssign(appointment.id);
                                    onClose();
                                }}
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Confirmar y Asignarme
                            </Button>
                        )}
                        
                        {/* Si ya es mía, mostrar botón de "Ya la gestioné" */}
                        {appointment.responsible_id === currentUserId && appointment.status !== 'completada' && (
                            <Button 
                                variant="primary"
                                className="bg-green-600 text-white hover:bg-green-700"
                                onClick={() => {
                                    onAssign(appointment.id); 
                                    onClose();
                                }}
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Marcar Gestionada
                            </Button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}