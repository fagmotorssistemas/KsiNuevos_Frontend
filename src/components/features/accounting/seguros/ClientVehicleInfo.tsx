import { User, Car, MapPin, Hash } from "lucide-react";
import { ContratoDetalle } from "@/types/contratos.types";

interface ClientVehicleInfoProps {
    contrato: ContratoDetalle;
    onlyClient?: boolean;  // Nueva prop para filtrar
    onlyVehicle?: boolean; // Nueva prop para filtrar
}

export function ClientVehicleInfo({ contrato, onlyClient, onlyVehicle }: ClientVehicleInfoProps) {
    const showAll = !onlyClient && !onlyVehicle;

    return (
        <div className="w-full">
            <div className={`grid grid-cols-1 ${showAll ? 'lg:grid-cols-12 gap-12' : 'gap-8'}`}>
                
                {/* BLOQUE: DATOS DEL CLIENTE */}
                {(showAll || onlyClient) && (
                    <div className={`${showAll ? 'lg:col-span-4' : ''} space-y-6`}>
                        <div className="space-y-6 px-1">
                            <div>
                                <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter mb-1.5">Titular / Razón Social</p>
                                <p className="text-sm text-slate-900 font-bold leading-tight uppercase tracking-tight">
                                    {contrato.facturaNombre}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter mb-1.5">Identificación</p>
                                    <p className="text-xs font-mono text-slate-900 font-bold bg-slate-50 px-2 py-1 rounded inline-block">
                                        {contrato.facturaRuc}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter mb-1.5">Contacto</p>
                                    <p className="text-xs text-slate-900 font-bold">
                                        {contrato.facturaTelefono}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-2">
                                <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter mb-1.5 flex items-center gap-1.5">
                                    <MapPin size={10} className="text-[#E11D48]" /> Ubicación Registrada
                                </p>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed uppercase">
                                    {contrato.facturaDireccion}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* BLOQUE: ESPECIFICACIONES DE LA UNIDAD */}
                {(showAll || onlyVehicle) && (
                    <div className={`${showAll ? 'lg:col-span-8' : ''} space-y-6`}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6 px-1">
                            <SimpleDetail label="Marca / Modelo" value={`${contrato.marca} ${contrato.modelo}`} />
                            <SimpleDetail label="Tipo / Placa" value={`${contrato.tipoVehiculo} • ${contrato.placa || 'SIN PLACA'}`} />
                            <SimpleDetail label="Año / Fab." value={`${contrato.anio} / ${contrato.anioFabricacion}`} />
                            <SimpleDetail label="Color" value={contrato.color} />
                            
                            <div className="md:col-span-2 space-y-1.5">
                                <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter flex items-center gap-1.5">
                                    <Hash size={10} /> Número de Motor
                                </p>
                                <p className="text-xs font-mono text-slate-900 font-bold tracking-wider border-b border-slate-50 pb-1">
                                    {contrato.motor}
                                </p>
                            </div>

                            <div className="md:col-span-2 space-y-1.5">
                                <p className="text-[9px] text-[#E11D48] uppercase font-black tracking-tighter flex items-center gap-1.5">
                                    <Hash size={10} /> Número de Chasis (VIN)
                                </p>
                                <p className="text-xs font-mono text-slate-900 font-black tracking-[0.1em] bg-slate-50 px-3 py-1.5 rounded-lg inline-block border border-slate-100">
                                    {contrato.chasis}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function SimpleDetail({ label, value }: { label: string; value: string }) {
    return (
        <div className="space-y-1.5">
            <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">{label}</p>
            <p className="text-xs text-slate-900 font-bold uppercase truncate">{value || '-'}</p>
        </div>
    );
}