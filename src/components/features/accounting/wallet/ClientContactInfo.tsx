import { Phone, Smartphone, PhoneCall } from "lucide-react";

interface ClientContactInfoProps {
    telefonos: {
        principal: string | null;
        secundario: string | null;
        celular: string | null;
    };
    compact?: boolean;
}

export function ClientContactInfo({ telefonos, compact = false }: ClientContactInfoProps) {
    const hasAnyPhone = telefonos.principal || telefonos.secundario || telefonos.celular;

    if (!hasAnyPhone) {
        return <span className="text-xs text-slate-400 italic">Sin contacto registrado</span>;
    }

    // Vista compacta (para tablas)
    if (compact) {
        const phoneToShow = telefonos.celular || telefonos.principal;
        const Icon = telefonos.celular ? Smartphone : Phone;

        return (
            <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs bg-slate-50 px-2 py-1 rounded border border-slate-200 w-fit">
                <Icon className="h-3 w-3 text-slate-500" />
                {phoneToShow}
            </div>
        );
    }

    // Vista detallada (para el expediente)
    return (
        <div className="flex flex-col sm:flex-row gap-4 w-full">
            {telefonos.celular && (
                <div className="flex flex-1 items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-900 shadow-sm">
                    <div className="bg-white p-2 rounded-full border border-emerald-100 shadow-sm">
                        <Smartphone className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-bold tracking-wide text-emerald-600 mb-0.5">Celular (Prioridad)</p>
                        <p className="text-lg font-bold font-mono tracking-tight">{telefonos.celular}</p>
                    </div>
                </div>
            )}
            
            {(telefonos.principal || telefonos.secundario) && (
                <div className="flex flex-1 gap-3">
                    {telefonos.principal && (
                        <div className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-sm">
                            <div className="bg-slate-50 p-2 rounded-full border border-slate-100">
                                <Phone className="h-4 w-4 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Convencional</p>
                                <p className="text-sm font-medium font-mono">{telefonos.principal}</p>
                            </div>
                        </div>
                    )}
                    {telefonos.secundario && (
                        <div className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-sm">
                            <div className="bg-slate-50 p-2 rounded-full border border-slate-100">
                                <PhoneCall className="h-4 w-4 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Alternativo</p>
                                <p className="text-sm font-medium font-mono">{telefonos.secundario}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}