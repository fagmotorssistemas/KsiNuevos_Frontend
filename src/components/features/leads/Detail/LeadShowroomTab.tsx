import { useState, useEffect } from "react";
import { MapPin, Car, Calendar, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button, Input, TextArea } from "./ui-components";
import type { LeadWithDetails } from "../../../../hooks/useLeads";

export function LeadShowroomTab({ lead }: { lead: LeadWithDetails }) {
    const { supabase, user } = useAuth();
    
    // --- ESTADOS ---
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);
    const [inventory, setInventory] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    // Formulario
    const [selectedCarId, setSelectedCarId] = useState("");
    const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 16)); // YYYY-MM-DDTHH:mm
    const [observation, setObservation] = useState("");
    const [testDrive, setTestDrive] = useState(false);

    // 1. Cargar Inventario al montar
    useEffect(() => {
        const fetchInventory = async () => {
            setIsLoadingInventory(true);
            const { data } = await supabase
                .from('inventory')
                .select('id, brand, model, year, plate_short')
                .eq('status', 'disponible') // Solo autos disponibles
                .order('brand');
            
            if (data) setInventory(data);
            setIsLoadingInventory(false);
        };
        fetchInventory();
    }, [supabase]);

    // 2. Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSubmitting(true);
        setSuccessMessage("");

        const { error } = await supabase.from('showroom_visits').insert({
            salesperson_id: user.id,
            client_name: lead.name, // <-- Dato del Lead
            phone: lead.phone,      // <-- Dato del Lead
            inventory_id: selectedCarId || null,
            visit_start: new Date(visitDate).toISOString(),
            source: 'showroom',     // O podrías poner 'lead' si prefieres trazarlo así
            test_drive: testDrive,
            observation: observation || `Visita agendada desde Lead: ${lead.name}`,
            credit_status: 'pendiente'
        });

        setIsSubmitting(false);

        if (error) {
            console.error("Error creando visita:", error);
            alert("Error al registrar la visita.");
        } else {
            setSuccessMessage("Visita registrada exitosamente en Showroom.");
            // Reset parcial
            setObservation("");
            setTestDrive(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 custom-scrollbar">
            <div className="max-w-xl mx-auto space-y-6">
                
                <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-2">
                        <MapPin className="h-5 w-5 text-purple-600" /> 
                        Registrar Visita en Showroom
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Crea un registro de tráfico para <strong>{lead.name}</strong>.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    
                    {/* Vehículo */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vehículo de Interés (Inventario)</label>
                        <div className="relative">
                            <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <select
                                value={selectedCarId}
                                onChange={(e) => setSelectedCarId(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none"
                                disabled={isLoadingInventory}
                            >
                                <option value="">-- Seleccionar Vehículo (Opcional) --</option>
                                {inventory.map(car => (
                                    <option key={car.id} value={car.id}>
                                        {car.brand} {car.model} {car.year} ({car.plate_short || 'S/P'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Fecha y Hora */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha y Hora de Visita</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="datetime-local"
                                value={visitDate}
                                onChange={(e) => setVisitDate(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                                required
                            />
                        </div>
                    </div>

                    {/* Test Drive Switch */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-sm font-medium text-slate-700">¿Realizó Test Drive?</span>
                        <button
                            type="button"
                            onClick={() => setTestDrive(!testDrive)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${testDrive ? 'bg-purple-600' : 'bg-slate-200'}`}
                        >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${testDrive ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Observaciones */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observaciones</label>
                        <TextArea
                            value={observation}
                            onChange={(e) => setObservation(e.target.value)}
                            placeholder="Comentarios sobre la visita..."
                            className="h-24 resize-none"
                        />
                    </div>

                    {/* Botón Submit */}
                    <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl shadow-md"
                    >
                        {isSubmitting ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Guardando...</>
                        ) : (
                            "Registrar Visita"
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