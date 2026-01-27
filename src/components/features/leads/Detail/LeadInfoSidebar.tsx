import { useState } from "react";
import { Edit3, Loader2, CheckCircle2, Car, DollarSign, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TextArea, Input } from "./ui-components";
import type { LeadWithDetails } from "@/types/leads.types";

// Hemos eliminado la extensión manual de test_drive_done
type LeadWithExtension = LeadWithDetails;

export function LeadInfoSidebar({ lead }: { lead: LeadWithExtension }) {
    const { supabase } = useAuth();
    
    // --- ESTADOS ---
    const [resume, setResume] = useState(lead.resume || "");
    const [isSavingResume, setIsSavingResume] = useState(false);

    // ELIMINADO: Estados de Test Drive (testDriveDone, isUpdatingTestDrive)

    // NUEVO: Estados Financieros Editables
    const [budget, setBudget] = useState(lead.budget?.toString() || "");
    const [wantsFinancing, setWantsFinancing] = useState(lead.financing || false);
    const [isSavingFinance, setIsSavingFinance] = useState(false);

    // Guardar Resumen
    const handleSaveResume = async () => {
        if (resume === lead.resume) return;
        setIsSavingResume(true);
        await supabase.from('leads').update({ resume }).eq('id', lead.id);
        setIsSavingResume(false);
    };

    // ELIMINADO: handleToggleTestDrive

    // NUEVO: Guardar Datos Financieros (Al salir del input o cambiar toggle)
    const handleSaveFinance = async (newBudget?: string, newFinancing?: boolean) => {
        setIsSavingFinance(true);
        
        const budgetToSave = newBudget !== undefined ? (parseFloat(newBudget) || 0) : (parseFloat(budget) || 0);
        const financingToSave = newFinancing !== undefined ? newFinancing : wantsFinancing;

        await supabase.from('leads').update({ 
            budget: budgetToSave,
            financing: financingToSave
        }).eq('id', lead.id);
        
        setIsSavingFinance(false);
    };

    return (
        // CORRECCIÓN VISUAL: Quitamos "md:w-1/3" y usamos "w-full h-full"
        // Ahora llena el contenedor padre del Modal correctamente.
        <div className="w-full h-full bg-slate-50 p-6 border-r border-slate-200 overflow-y-auto custom-scrollbar">
            
            {/* 1. RESUMEN */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Edit3 className="h-3 w-3" /> Resumen Ejecutivo
                    </label>
                    <div className="flex items-center gap-1.5 h-4">
                        {isSavingResume ? (
                            <><Loader2 className="h-3 w-3 animate-spin text-brand-600" /><span className="text-[10px] text-brand-600">Guardando...</span></>
                        ) : (
                            <><CheckCircle2 className="h-3 w-3 text-emerald-500" /><span className="text-[10px] text-slate-400">Guardado</span></>
                        )}
                    </div>
                </div>
                <TextArea
                    value={resume}
                    onChange={(e) => setResume(e.target.value)}
                    onBlur={handleSaveResume}
                    placeholder="Estatus actual del cliente..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm min-h-[120px] resize-none focus:ring-2 focus:ring-brand-500/20 outline-none"
                />
            </div>

            {/* 2. TEST DRIVE - SECCIÓN ELIMINADA */}

            {/* 3. VEHÍCULOS */}
            <div className="mb-8">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Vehículos de Interés</label>
                {lead.interested_cars && lead.interested_cars.length > 0 ? (
                    <div className="space-y-3">
                        {lead.interested_cars.map((car) => (
                            <div key={car.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                                <div className="p-2 bg-slate-100 rounded-lg">
                                    <Car className="h-4 w-4 text-slate-600" />
                                </div>
                                <div>
                                    <span className="font-semibold text-sm text-slate-800 block">{car.brand} {car.model}</span>
                                    <span className="text-xs text-slate-500">{car.year} • {car.color_preference || 'Sin color'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-400 italic bg-white p-3 rounded-xl border border-dashed border-slate-200 text-center">Sin vehículos seleccionados.</p>
                )}
            </div>

            {/* 4. FINANZAS (EDITABLE) */}
            <div>
                <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <DollarSign className="h-3 w-3" /> Detalles Financieros
                    </label>
                    {isSavingFinance && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                </div>
                
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    {/* Input Presupuesto */}
                    <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold mb-1 block">Presupuesto ($)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="number"
                                value={budget}
                                onChange={(e) => setBudget(e.target.value)}
                                onBlur={() => handleSaveFinance(budget)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Switch Financiamiento */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium text-slate-700">Solicita Financiamiento</span>
                        </div>
                        <button
                            onClick={() => {
                                const newVal = !wantsFinancing;
                                setWantsFinancing(newVal);
                                handleSaveFinance(undefined, newVal);
                            }}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${wantsFinancing ? 'bg-blue-500' : 'bg-slate-200'}`}
                        >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${wantsFinancing ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}