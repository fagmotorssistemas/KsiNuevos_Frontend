import { OrdenTrabajo } from "@/types/taller";
import { MapPin, Phone, Mail, Fuel, CheckSquare, User, Car } from "lucide-react";

interface OrderPrintViewProps {
    orden: OrdenTrabajo;
}

// Diccionario completo para el checklist
const LABELS_MAP: Record<string, string> = {
    // Exterior
    rayones: 'Rayones / Golpes',
    pintura: 'Desprendimiento Pintura',
    oxidos: 'Óxidos / Corrosión',
    cristales: 'Cristales Rotos/Rajados',
    espejos: 'Espejos Laterales',
    faros: 'Faros y Luces',
    parachoques: 'Parachoques',
    // Interior
    asientos: 'Asientos / Tapicería',
    tablero: 'Tablero',
    audio: 'Equipo de Audio',
    aire: 'Aire Acondicionado',
    alfombras: 'Alfombras',
    // Mecanico
    motor: 'Motor (Ruidos)',
    frenos: 'Frenos',
    bateria: 'Batería',
    suspension: 'Suspensión',
    direccion: 'Dirección',
    llantas: 'Neumáticos',
    // Inventario
    llanta_repuesto: 'Llanta Repuesto',
    gata: 'Gata y Herramientas',
    documentos: 'Documentos',
    llaves: 'Llaves',
    objetos: 'Objetos Personales'
};

export function OrderPrintView({ orden }: OrderPrintViewProps) {
    // Función auxiliar para renderizar items del checklist con estado
    const renderChecklistGrid = (items: Record<string, boolean>) => {
        // Parsear si viene como string
        let parsedItems = items;
        if (typeof items === 'string') {
            try {
                parsedItems = JSON.parse(items);
            } catch (e) {
                console.error("Error parsing checklist items", e);
                parsedItems = {};
            }
        }

        return (
            <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-[9px]">
                {Object.entries(parsedItems || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 flex items-center justify-center border rounded-sm ${value ? 'bg-slate-800 border-slate-800 text-white' : 'border-slate-300'}`}>
                            {value && <span className="text-[8px] font-bold">✓</span>}
                        </div>
                        <span className={`uppercase ${value ? 'font-bold text-slate-800' : 'text-slate-400'}`}>
                            {LABELS_MAP[key] || key}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div id="print-area" className="w-full h-auto bg-white">
            
            {/* CORRECCIÓN: Removido min-h-screen y flex flex-col para permitir múltiples páginas */}
            <div className="w-full max-w-none mx-auto p-10 text-slate-900 font-sans">
                
                {/* --- HEADER --- */}
                <header className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
                    <div className="flex items-center gap-5">
                        <img src="/LogoAutoNova.png" alt="Logo Auto Nova" className="h-20 w-42 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                        
                        <div className="hidden first:block">
                            <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">Auto Nova</h1>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Centro de Latonería y Pintura</p>
                        </div>

                        <div className="text-[9px] text-slate-500 font-medium  border-l pl-4 border-slate-200 space-y-1">
                            <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Av. España y Madrid</p>
                            <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> 097 956 1456</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="bg-slate-900 text-white px-4 py-2 rounded-lg mb-1">
                            <h2 className="text-[10px] font-bold uppercase tracking-widest opacity-80">Orden de Trabajo</h2>
                            <p className="text-2xl font-mono font-bold leading-none">#{orden.numero_orden.toString().padStart(6, '0')}</p>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500">
                            Ingreso: {new Date(orden.fecha_ingreso).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                    </div>
                </header>

                {/* --- GRILLA DE DATOS --- */}
                <div className="grid grid-cols-2 gap-8 mb-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                    
                    {/* Columna Cliente */}
                    <div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <User className="h-3 w-3" /> Datos del Cliente
                        </h3>
                        <table className="w-full text-[10px]">
                            <tbody>
                                <tr>
                                    <td className="font-bold text-slate-500 py-1 w-20">Propietario:</td>
                                    <td className="font-bold text-slate-900 uppercase py-1">{orden.cliente?.nombre_completo}</td>
                                </tr>
                                <tr>
                                    <td className="font-bold text-slate-500 py-1">ID / RUC:</td>
                                    <td className="text-slate-900 font-mono py-1">{orden.cliente?.cedula_ruc || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="font-bold text-slate-500 py-1">Teléfono:</td>
                                    <td className="text-slate-900 py-1">{orden.cliente?.telefono || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="font-bold text-slate-500 py-1">Email:</td>
                                    <td className="text-slate-900 py-1">{orden.cliente?.email || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="font-bold text-slate-500 py-1">Dirección:</td>
                                    <td className="text-slate-900 py-1 truncate max-w-[200px]">{orden.cliente?.direccion || '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Columna Vehículo */}
                    <div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Car className="h-3 w-3" /> Datos del Vehículo
                        </h3>
                        <table className="w-full text-[10px]">
                            <tbody>
                                <tr>
                                    <td className="font-bold text-slate-500 py-1 w-24">Vehículo:</td>
                                    <td className="font-bold text-slate-900 uppercase py-1">{orden.vehiculo_marca} {orden.vehiculo_modelo} {orden.vehiculo_anio}</td>
                                </tr>
                                <tr>
                                    <td className="font-bold text-slate-500 py-1">Placa / Color:</td>
                                    <td className="text-slate-900 font-mono font-bold uppercase py-1">{orden.vehiculo_placa} - {orden.vehiculo_color}</td>
                                </tr>
                                <tr>
                                    <td className="font-bold text-slate-500 py-1">VIN / Chasis:</td>
                                    <td className="text-slate-900 font-mono py-1">{orden.vehiculo_vin || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="font-bold text-slate-500 py-1">Kilometraje:</td>
                                    <td className="text-slate-900 py-1">{orden.kilometraje.toLocaleString()} km</td>
                                </tr>
                                <tr>
                                    <td className="font-bold text-slate-500 py-1">Combustible:</td>
                                    <td className="py-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                                                <div className="h-full bg-slate-800" style={{ width: `${orden.nivel_gasolina}%` }}></div>
                                            </div>
                                            <span className="font-bold">{orden.nivel_gasolina}%</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="font-bold text-slate-500 py-1">Promesa Entrega:</td>
                                    <td className="font-bold text-slate-900 py-1">
                                        {orden.fecha_promesa_entrega 
                                            ? new Date(orden.fecha_promesa_entrega).toLocaleDateString('es-EC') 
                                            : 'Por definir'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- CHECKLIST DETALLADO --- */}
                <div className="mb-6 border-t border-b border-slate-200 py-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <CheckSquare className="h-3 w-3" /> Inspección de Ingreso
                    </h3>
                    
                    {renderChecklistGrid(orden.checklist_ingreso || {})}
                    
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <h4 className="text-[9px] font-bold text-slate-500 uppercase mb-2">Inventario / Pertenencias</h4>
                        {renderChecklistGrid(orden.inventario_pertenencias || {})}
                    </div>
                </div>

                {/* --- OBSERVACIONES --- */}
                <div className="mb-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                        Observaciones / Solicitud del Cliente
                    </h3>
                    <div className="text-[10px] leading-relaxed text-slate-800 font-medium whitespace-pre-wrap p-3 bg-slate-50 border border-slate-200 rounded-lg min-h-[60px]">
                        {orden.observaciones_ingreso || "Ninguna observación registrada."}
                    </div>
                </div>

                {/* --- FOTOS GRANDES --- */}
                {orden.fotos_ingreso_urls && orden.fotos_ingreso_urls.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Evidencia Fotográfica</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {orden.fotos_ingreso_urls.map((url, idx) => (
                                <div key={idx} className="aspect-video rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                                    <img src={url} alt={`Evidencia ${idx}`} className="w-full h-full object-contain" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- FOOTER Y FIRMAS --- */}
                <div className="mt-8 pt-8">
                    <div className="grid grid-cols-2 gap-20">
                        <div className="border-t border-slate-900 pt-2 text-center">
                            <p className="font-bold text-[10px] uppercase text-slate-900">Firma Cliente</p>
                            <p className="text-[8px] text-slate-500 mt-0.5">Acepto recepción y condiciones</p>
                        </div>
                        <div className="border-t border-slate-900 pt-2 text-center">
                            <p className="font-bold text-[10px] uppercase text-slate-900">Recibido Por (Taller)</p>
                            <p className="text-[8px] text-slate-500 mt-0.5">Auto Nova</p>
                        </div>
                    </div>
                    
                    <div className="mt-6 text-[8px] text-justify text-slate-400 leading-tight">
                        <strong>CONDICIONES:</strong> El taller no se responsabiliza por pérdidas de objetos no declarados en el inventario. 
                        Pasados 3 días de la notificación de retiro, el vehículo causará bodegaje. 
                        La garantía aplica exclusivamente sobre la mano de obra realizada.
                    </div>
                </div>

            </div>
            
            <style jsx global>{`
                @media print {
                    @page { 
                        margin: 10mm; 
                        size: auto; 
                    }
                    
                    html, body { 
                        height: auto !important; 
                        overflow: visible !important; 
                        margin: 0 !important; 
                        padding: 0 !important;
                        background: white !important;
                    }

                    /* Permitir que el contenido fluya naturalmente entre páginas */
                    #print-area {
                        page-break-after: auto;
                    }

                    /* Solo evitar saltos de página DENTRO de elementos críticos pequeños */
                    .avoid-break {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                }
            `}</style>
        </div>
    );
}