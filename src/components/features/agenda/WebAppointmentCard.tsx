import { WebAppointmentWithDetails, WebAppointmentStatus } from "@/types/web-appointments";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
    Clock, 
    MapPin, 
    User, 
    Phone, 
    Car, 
    ArrowRightLeft,
    Eye,
    AlertCircle,
    CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/buttontable";

interface WebAppointmentCardProps {
    appointment: WebAppointmentWithDetails;
    currentUserId?: string;
    onViewDetails: (appointment: WebAppointmentWithDetails) => void;
    // Promise para manejar la asincronía correctamente
    onStatusChange: (id: number, status: WebAppointmentStatus) => Promise<any>;
}

export function WebAppointmentCard({ 
    appointment, 
    onViewDetails,
    onStatusChange 
}: WebAppointmentCardProps) {
    
    const isBuying = appointment.type === 'compra';
    const dateObj = new Date(appointment.appointment_date);
    
    // --- LÓGICA DE EXTRACCIÓN DE DATOS ---
    let carImage: string | null = null;
    let carTitle = "Vehículo no especificado";

    if (isBuying) {
        const v = appointment.vehicle_buying;
        if (v) {
            carImage = v.img_main_url || null;
            carTitle = `${v.brand} ${v.model} ${v.year}`;
        }
    } else {
        const v = appointment.vehicle_selling; 
        if (v) {
            carImage = v.photos_urls && v.photos_urls.length > 0 ? v.photos_urls[0] : null;
            carTitle = `${v.brand} ${v.model} ${v.year}`;
        }
    }

    const statusColors: Record<string, string> = {
        pendiente: "bg-yellow-100 text-yellow-700 border-yellow-200",
        aceptado: "bg-blue-100 text-blue-700 border-blue-200",
        atendido: "bg-green-100 text-green-700 border-green-200",
        cancelado: "bg-red-50 text-red-500 border-red-100",
        reprogramado: "bg-purple-100 text-purple-700 border-purple-200",
    };

    return (
        <div 
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all flex flex-col h-full cursor-pointer group"
            onClick={() => onViewDetails(appointment)}
        >
            {/* HEADER: TIPO DE SOLICITUD Y ESTADO */}
            <div className={`px-4 py-3 border-b flex justify-between items-center ${isBuying ? 'bg-slate-50' : 'bg-orange-50'}`}>
                <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-md ${isBuying ? 'bg-slate-200 text-slate-700' : 'bg-orange-200 text-orange-700'}`}>
                        {isBuying ? <Car size={16} /> : <ArrowRightLeft size={16} />}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        {isBuying ? 'Compra / Visita' : 'Venta / Trade-In'}
                    </span>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${statusColors[appointment.status || 'pendiente']}`}>
                    {appointment.status}
                </div>
            </div>

            {/* BODY: INFORMACIÓN */}
            <div className="p-4 flex-1 space-y-4">
                {/* FECHA Y HORA */}
                <div className="flex items-center gap-3 text-sm">
                    <div className="bg-slate-100 rounded-lg p-2 text-center min-w-[50px]">
                        <span className="block text-[10px] uppercase font-bold text-slate-400">
                            {format(dateObj, 'MMM', { locale: es })}
                        </span>
                        <span className="block text-lg font-bold text-slate-800 leading-none">
                            {format(dateObj, 'd')}
                        </span>
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <Clock className="w-4 h-4 text-blue-500" />
                            {format(dateObj, 'h:mm a')}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin size={12} /> Concesionario Principal
                        </div>
                    </div>
                </div>

                {/* VEHÍCULO */}
                <div className="flex gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100 group-hover:bg-white transition-colors">
                    <div className="w-14 h-14 bg-slate-200 rounded-md overflow-hidden flex-shrink-0">
                        {carImage ? (
                            <img src={carImage} alt="Auto" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400"><Car size={20} /></div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{isBuying ? 'Interés' : 'Oferta'}</p>
                        <p className="text-sm font-bold text-slate-800 truncate" title={carTitle}>{carTitle}</p>
                        {!isBuying && !appointment.vehicle_selling && (
                            <span className="text-[9px] text-red-500 flex items-center gap-1 mt-0.5">
                                <AlertCircle size={10} /> Datos incompletos
                            </span>
                        )}
                    </div>
                </div>

                {/* CLIENTE */}
                <div className="pt-2 border-t border-dashed border-slate-200 space-y-1">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <User className="w-4 h-4 text-slate-400" />
                        {appointment.client?.full_name || 'Cliente Web'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Phone className="w-4 h-4 text-slate-400" />
                        {appointment.client?.phone || 'Sin número'}
                    </div>
                </div>
            </div>

            {/* FOOTER: ACCIONES */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-row gap-2">

                {/* Botón Detalles: flex-1 permite que ocupe todo el espacio si el botón de finalizar no está */}
                <Button 
                    variant="secondary" 
                    size="sm" 
                    className="flex-1 bg-white text-slate-700 border-slate-300 hover:bg-slate-50 text-[11px] px-2"
                    onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(appointment);
                    }}
                >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Detalles
                </Button>
                                
                {/* BOTÓN FINALIZAR: Solo se muestra si el estado es 'aceptado' */}
                {appointment.status === 'aceptado' && (
                    <Button 
                        variant="primary" 
                        size="sm" 
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white border-none shadow-sm text-[11px] px-2"
                        onClick={(e) => {
                            e.stopPropagation();
                            if(confirm('¿Confirmas que la cita ha sido atendida?')) {
                                onStatusChange(appointment.id, 'atendido');
                            }
                        }}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Finalizar
                    </Button>
                )}
            </div>
        </div>
    );
}