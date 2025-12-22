import { useState } from "react";
import { Search, Car, DollarSign, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button, Input, TextArea } from "./ui-components";
import type { LeadWithDetails } from "../../../../hooks/useLeads";

export function LeadRequestsTab({ lead }: { lead: LeadWithDetails }) {
    const { supabase, user } = useAuth();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    // Formulario
    const [brand, setBrand] = useState("");
    const [model, setModel] = useState("");
    const [yearMin, setYearMin] = useState("");
    const [yearMax, setYearMax] = useState("");
    const [budgetMax, setBudgetMax] = useState(lead.budget?.toString() || ""); // Precarga presupuesto
    const [color, setColor] = useState("");
    const [notes, setNotes] = useState("");
    const [priority, setPriority] = useState("media");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSubmitting(true);
        setSuccessMessage("");

        const { error } = await supabase.from('vehicle_requests').insert({
            requested_by: user.id,
            client_name: lead.name, // <-- Dato del Lead
            brand,
            model,
            year_min: yearMin ? parseInt(yearMin) : null,
            year_max: yearMax ? parseInt(yearMax) : null,
            color_preference: color,
            budget_max: budgetMax ? parseFloat(budgetMax) : null,
            notes: notes || `Pedido generado desde Lead ID: ${lead.lead_id_kommo || lead.id}`,
            priority: priority as any,
            status: 'pendiente'
        });

        setIsSubmitting(false);

        if (error) {
            console.error("Error creando pedido:", error);
            alert("Error al crear el pedido.");
        } else {
            setSuccessMessage("Pedido de vehículo creado exitosamente.");
            // Limpiar campos clave
            setBrand("");
            setModel("");
            setNotes("");
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 custom-scrollbar">
            <div className="max-w-xl mx-auto space-y-6">
                
                <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-2">
                        <Search className="h-5 w-5 text-orange-600" /> 
                        Crear Pedido de Vehículo
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Si no tenemos stock, registra lo que <strong>{lead.name}</strong> busca.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Marca *</label>
                            <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ej: Toyota" required />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Modelo *</label>
                            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ej: Fortuner" required />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Año Mínimo</label>
                            <Input type="number" value={yearMin} onChange={(e) => setYearMin(e.target.value)} placeholder="2015" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Año Máximo</label>
                            <Input type="number" value={yearMax} onChange={(e) => setYearMax(e.target.value)} placeholder="2024" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Presupuesto Máx</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <Input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} className="pl-8" placeholder="0.00" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Color Pref.</label>
                            <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Blanco, Plata..." />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prioridad</label>
                        <select 
                            value={priority} 
                            onChange={(e) => setPriority(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="baja">Baja</option>
                            <option value="media">Media</option>
                            <option value="alta">Alta (Urgente)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notas Adicionales</label>
                        <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalles específicos..." className="h-20 resize-none" />
                    </div>

                    <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl shadow-md"
                    >
                        {isSubmitting ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Guardando...</>
                        ) : (
                            "Crear Pedido"
                        )}
                    </Button>

                    {successMessage && (
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm animate-in fade-in">
                            <CheckCircle2 className="h-4 w-4" />
                            {successMessage}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}