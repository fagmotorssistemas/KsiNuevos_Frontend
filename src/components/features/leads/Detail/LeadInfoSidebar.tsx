import { useState } from "react";
import { Edit3, Loader2, CheckCircle2, Car, Gauge } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TextArea } from "./ui-components";
import type { LeadWithDetails } from "../../../../hooks/useLeads";

// CORRECCIÓN: Permitimos 'null' explícitamente para evitar el error de TS(2322)
type LeadWithExtension = LeadWithDetails & { test_drive_done?: boolean | null };

export function LeadInfoSidebar({ lead }: { lead: LeadWithExtension }) {
    const { supabase } = useAuth();
    
    // --- ESTADOS RESUMEN ---
    const [resume, setResume] = useState(lead.resume || "");
    const [isSavingResume, setIsSavingResume] = useState(false);

    // --- ESTADOS TEST DRIVE ---
    // Usamos (|| false) para convertir null/undefined a false y manejarlo como booleano puro en el UI
    const [testDriveDone, setTestDriveDone] = useState(lead.test_drive_done || false);
    const [isUpdatingTestDrive, setIsUpdatingTestDrive] = useState(false);

    // Lógica Guardar Resumen
    const handleSaveResume = async () => {
        if (resume === lead.resume) return;
        setIsSavingResume(true);
        await supabase.from('leads').update({ resume }).eq('id', lead.id);
        setIsSavingResume(false);
    };

    // Lógica Toggle Test Drive
    const handleToggleTestDrive = async () => {
        const newValue = !testDriveDone;
        setTestDriveDone(newValue);
        setIsUpdatingTestDrive(true);

        const { error } = await supabase
            .from('leads')
            .update({ test_drive_done: newValue })
            .eq('id', lead.id);

        if (error) {
            console.error("Error actualizando test drive", error);
            setTestDriveDone(!newValue);
            alert("No se pudo actualizar el estado del Test Drive");
        }
        
        setIsUpdatingTestDrive(false);
    };

    return (
        <div className="w-1/3 bg-slate-50 p-6 border-r border-slate-200 overflow-y-auto custom-scrollbar">
            
            {/* --- SECCIÓN 1: RESUMEN --- */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Edit3 className="h-3 w-3" /> Resumen Ejecutivo
                    </label>
                    <div className="flex items-center gap-1.5 h-4">
                        {isSavingResume ? (
                            <><Loader2 className="h-3 w-3 animate-spin text-brand-600" /><span className="text-[10px] text-brand-600 font-medium">Guardando...</span></>
                        ) : (
                            <><CheckCircle2 className="h-3 w-3 text-emerald-500" /><span className="text-[10px] text-slate-400 font-medium">Guardado</span></>
                        )}
                    </div>
                </div>
                <TextArea
                    value={resume || ''}
                    onChange={(e) => setResume(e.target.value)}
                    onBlur={handleSaveResume}
                    placeholder="Estatus actual del cliente..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm min-h-[140px] resize-none leading-relaxed"
                />
            </div>

            {/* --- SECCIÓN 2: TEST DRIVE --- */}
            <div className="mb-8">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block flex items-center gap-2">
                    <Gauge className="h-3 w-3" /> Test Drive
                </label>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-sm font-semibold text-slate-800 block">
                            {testDriveDone ? "¡Test Drive Realizado!" : "Pendiente de Prueba"}
                        </span>
                        <span className="text-xs text-slate-400">
                            {testDriveDone ? "El cliente ya probó el vehículo." : "Aún no se ha realizado prueba."}
                        </span>
                    </div>

                    {/* SWITCH / TOGGLE BUTTON */}
                    <button
                        onClick={handleToggleTestDrive}
                        disabled={isUpdatingTestDrive}
                        className={`
                            relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2
                            ${testDriveDone ? 'bg-emerald-500' : 'bg-slate-200'}
                            ${isUpdatingTestDrive ? 'opacity-50 cursor-wait' : ''}
                        `}
                    >
                        <span className="sr-only">Toggle Test Drive</span>
                        <span
                            aria-hidden="true"
                            className={`
                                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                                ${testDriveDone ? 'translate-x-5' : 'translate-x-0'}
                            `}
                        />
                    </button>
                </div>
            </div>

            {/* --- SECCIÓN 3: VEHÍCULOS --- */}
            <div className="mb-8">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Vehículos de Interés</label>
                {lead.interested_cars && lead.interested_cars.length > 0 ? (
                    <div className="space-y-3">
                        {lead.interested_cars.map((car) => (
                            <div key={car.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <Car className="h-4 w-4 text-brand-600" />
                                    <span className="font-semibold text-slate-800">{car.brand} {car.model}</span>
                                </div>
                                <p className="text-xs text-slate-500 pl-6">{car.year} • {car.color_preference}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-400 italic">No hay vehículos seleccionados.</p>
                )}
            </div>

            {/* --- SECCIÓN 4: FINANZAS --- */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">
                    Detalles Financieros
                </label>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-baseline mb-2">
                        <span className="text-xs font-medium text-slate-500">Presupuesto Estimado</span>
                        <span className="text-xl font-mono font-bold text-slate-800">
                            ${lead.budget?.toLocaleString() || '0.00'}
                        </span>
                    </div>
                    {lead.financing && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                            <span className="text-xs font-medium text-slate-700">
                                Solicita Financiamiento
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}