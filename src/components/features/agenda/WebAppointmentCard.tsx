import { WebAppointmentWithDetails } from "@/types/web-appointments";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
    Clock, 
    MapPin, 
    User, 
    Phone, 
    Car, 
    ArrowRightLeft,
    CheckCircle2,
    XCircle,
    Eye, // Icono de Ojo para "Ver"
    AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/buttontable";

interface WebAppointmentCardProps {
    appointment: WebAppointmentWithDetails;
    currentUserId?: string;
    onViewDetails: (appointment: WebAppointmentWithDetails) => void; // NUEVA PROP: Abrir modal
    onStatusChange: (id: number, status: string) => void;
}

export function WebAppointmentCard({ 
    appointment, 
    currentUserId,
    onViewDetails, 
    onStatusChange 
}: WebAppointmentCardProps) {
    
    const isBuying = appointment.type === 'compra';
    const dateObj = new Date(appointment.appointment_date);
    
    // --- LÓGICA DE DATOS DEL AUTO ---
    let carImage: string | null = null;
    let carTitle = "Vehículo no especificado";

    if (isBuying) {
        const v = appointment.vehicle_buying;
        if (v) {
            carImage = v.img_main_url || null;
            carTitle = `${v.brand} ${v.model} ${v.year}`;
        }
    } else {
        const v = appointment.vehicle_selling as any; 
        if (v) {
            if (v.photos_urls && v.photos_urls.length > 0) {
                carImage = v.photos_urls[0];
            } else if (v.photos_exterior && v.photos_exterior.length > 0) {
                carImage = v.photos_exterior[0];
            }
            carTitle = `${v.brand} ${v.model} ${v.year}`;
        }
    }

    const statusColors: Record<string, string> = {
        pendiente: "bg-yellow-100 text-yellow-700 border-yellow-200",
        confirmada: "bg-blue-100 text-blue-700 border-blue-200",
        completada: "bg-green-100 text-green-700 border-green-200",
        cancelada: "bg-red-50 text-red-500 border-red-100",
    };

    return (
        <div 
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full cursor-pointer group"
            onClick={() => onViewDetails(appointment)} // Toda la tarjeta abre el modal
        >
            {/* HEADER */}
            <div className={`px-4 py-3 border-b flex justify-between items-center ${isBuying ? 'bg-slate-50' : 'bg-orange-50'}`}>
                <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-md ${isBuying ? 'bg-slate-200 text-slate-700' : 'bg-orange-200 text-orange-700'}`}>
                        {isBuying ? <Car size={16} /> : <ArrowRightLeft size={16} />}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        {isBuying ? 'Interesado en Comprar' : 'Quiere Vendernos'}
                    </span>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${statusColors[appointment.status || 'pendiente']}`}>
                    {appointment.status}
                </div>
            </div>

            <div className="p-4 flex-1 space-y-4">
                {/* 1. INFO DE FECHA */}
                <div className="flex items-start gap-3 text-sm text-slate-600">
                    <div className="min-w-[40px] flex flex-col items-center bg-slate-100 rounded p-1 text-center">
                        <span className="text-xs uppercase font-bold text-slate-400">
                            {format(dateObj, 'MMM', { locale: es })}
                        </span>
                        <span className="text-lg font-bold text-slate-800 leading-none">
                            {format(dateObj, 'd')}
                        </span>
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5 font-medium text-slate-900">
                            <Clock className="w-4 h-4 text-slate-400" />
                            {format(dateObj, 'h:mm a', { locale: es })}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 mt-1">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span>Concesionario Principal</span>
                        </div>
                    </div>
                </div>

                {/* 2. EL VEHÍCULO */}
                <div className="flex gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100 group-hover:bg-slate-100 transition-colors">
                    <div className="w-16 h-16 bg-slate-200 rounded-md overflow-hidden flex-shrink-0 relative">
                        {carImage && carImage !== "" ? (
                            <img 
                                src={carImage} 
                                alt="Carro" 
                                className="w-full h-full object-cover" 
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <Car size={20} />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                        <span className="text-xs text-slate-400 font-medium">
                            {isBuying ? 'Vehículo de interés:' : 'Vehículo a evaluar:'}
                        </span>
                        <span className="text-sm font-bold text-slate-800 line-clamp-2" title={carTitle}>
                            {carTitle}
                        </span>
                        {!isBuying && !appointment.vehicle_selling && (
                            <span className="text-[10px] text-red-400 flex items-center gap-1 mt-1">
                                <AlertCircle size={10} /> Datos de auto no encontrados
                            </span>
                        )}
                    </div>
                </div>

                {/* 3. CLIENTE */}
                <div className="space-y-1 pt-2 border-t border-dashed border-slate-200">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        <User className="w-4 h-4 text-slate-400" />
                        {appointment.client?.full_name || 'Cliente Web'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Phone className="w-4 h-4 text-slate-400" />
                        {appointment.client?.phone || 'Sin teléfono'}
                    </div>
                </div>
            </div>

            {/* FOOTER: ACCIONES */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
                {/* Botón Principal: Ver Detalles (Abre modal) */}
                <Button 
                    size="sm" 
                    className="w-full bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    onClick={(e) => {
                        e.stopPropagation(); // Evitar doble click si la tarjeta ya tiene onClick
                        onViewDetails(appointment);
                    }}
                >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Solicitud
                </Button>
            </div>
        </div>
    );
}