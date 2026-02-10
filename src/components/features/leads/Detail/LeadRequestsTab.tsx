import { useState } from "react";
import { Car, DollarSign, Loader2, CheckCircle2, AlertCircle, Calendar, Palette, FileText, BarChart3, ChevronDown, LayoutGrid } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button, TextArea } from "./ui-components";
import type { LeadWithDetails } from "@/types/leads.types";

export function LeadRequestsTab({ lead }: { lead: LeadWithDetails }) {
    const { supabase, user } = useAuth();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    // Formulario
    const [brand, setBrand] = useState("");
    const [model, setModel] = useState("");
    const [type, setType] = useState(""); // Nuevo campo
    const [yearMin, setYearMin] = useState("");
    const [yearMax, setYearMax] = useState("");
    const [budgetMax, setBudgetMax] = useState(lead.budget?.toString() || "");
    const [color, setColor] = useState("");
    const [notes, setNotes] = useState("");
    const [priority, setPriority] = useState("media");
    

    // Estado de Errores
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Helper de Clases CSS para Inputs
    const getInputClasses = (hasError: boolean, paddingLeft: string = "pl-10") => `
        w-full ${paddingLeft} pr-4 py-3 
        bg-slate-50 border rounded-xl text-sm text-slate-700 
        transition-all duration-200 ease-in-out
        focus:bg-white focus:ring-4 outline-none
        ${hasError 
            ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
            : 'border-slate-200 focus:border-gray-500 focus:ring-gray-100 hover:border-slate-300'}
    `;

    // Validación Estricta
    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!brand.trim()) newErrors.brand = "La marca es obligatoria.";
        if (!model.trim()) newErrors.model = "El modelo es obligatorio.";
        if (!type) newErrors.type = "El tipo es obligatorio."; // Validación nueva
        
        if (!yearMin) newErrors.yearMin = "Requerido";
        if (!yearMax) newErrors.yearMax = "Requerido";
        if (yearMin && yearMax && parseInt(yearMin) > parseInt(yearMax)) {
            newErrors.yearMax = "Año Min > Max";
        }

        if (!budgetMax) newErrors.budgetMax = "Define un presupuesto máximo.";
        if (!color.trim()) newErrors.color = "Indica preferencia de color.";
        if (!notes.trim()) newErrors.notes = "Añade notas o detalles del pedido.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        if (!user) return;

        setIsSubmitting(true);
        setSuccessMessage("");

        const { error } = await supabase.from('vehicle_requests').insert({
            requested_by: user.id,
            client_name: lead.name,
            lead_id: lead.id,
            brand,
            model,
            type: type as "sedan" | "suv" | "camioneta" | "deportivo" | "hatchback" | "van",
            year_min: parseInt(yearMin),
            year_max: parseInt(yearMax),
            color_preference: color,
            budget_max: parseFloat(budgetMax),
            notes: notes,
            priority: priority as any,
            status: 'pendiente'
        });

        setIsSubmitting(false);

        if (error) {
            console.error("Error creando pedido:", error);
            setErrors({ form: "Error al guardar el pedido. Intenta nuevamente." });
        } else {
            setSuccessMessage("Pedido de vehículo creado exitosamente.");
            // Reset completo
            setBrand("");
            setModel("");
            setType(""); // Reset tipo
            setYearMin("");
            setYearMax("");
            setColor("");
            setNotes("");
            setBudgetMax("");
            setType(""); // Reset tipo
            setErrors({});
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
            <div className="max-w-xl mx-auto space-y-6">
                
                <div className="text-center mb-6">
                    <h2 className="text-lg font-bold text-slate-800">Crear Pedido de Vehículo</h2>
                    <p className="text-sm text-slate-500">Registra los requerimientos específicos del cliente.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 bg-white p-8 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50">
                    
                    {/* Marca y Modelo */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1 space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Marca <span className="text-red-500">*</span></label>
                            <div className="relative group">
                                <Car className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${errors.brand ? 'text-red-400' : 'text-slate-400 group-focus-within:text-gray-500'}`} />
                                <input 
                                    value={brand} 
                                    onChange={(e) => {
                                        setBrand(e.target.value);
                                        if(errors.brand) setErrors({...errors, brand: ''});
                                    }}
                                    placeholder="Ej: Toyota" 
                                    className={getInputClasses(!!errors.brand)}
                                />
                            </div>
                            {errors.brand && <p className="text-xs text-red-500 ml-1">{errors.brand}</p>}
                        </div>

                        <div className="col-span-2 sm:col-span-1 space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Modelo <span className="text-red-500">*</span></label>
                            <div className="relative group">
                                <Car className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${errors.model ? 'text-red-400' : 'text-slate-400 group-focus-within:text-gray-500'}`} />
                                <input 
                                    value={model} 
                                    onChange={(e) => {
                                        setModel(e.target.value);
                                        if(errors.model) setErrors({...errors, model: ''});
                                    }} 
                                    placeholder="Ej: Fortuner" 
                                    className={getInputClasses(!!errors.model)}
                                />
                            </div>
                            {errors.model && <p className="text-xs text-red-500 ml-1">{errors.model}</p>}
                        </div>
                    </div>

                    {/* NUEVO: Tipo de Vehículo */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Tipo de Vehículo <span className="text-red-500">*</span></label>
                        <div className="relative group">
                            <LayoutGrid className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${errors.type ? 'text-red-400' : 'text-slate-400 group-focus-within:text-gray-500'}`} />
                            <select 
                                value={type} 
                                onChange={(e) => {
                                    setType(e.target.value);
                                    if(errors.type) setErrors({...errors, type: ''});
                                }}
                                className={`${getInputClasses(!!errors.type)} appearance-none cursor-pointer`}
                            >
                                <option value="" disabled>Seleccione un tipo...</option>
                                <option value="sedan">sedan</option>
                                <option value="suv">suv</option>
                                <option value="camioneta">camioneta / pickup</option>
                                <option value="deportivo">deportivo</option>
                                <option value="hatchback">hatchback</option>
                                <option value="van">van</option>
                            </select>
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                        {errors.type && <p className="text-xs text-red-500 ml-1">{errors.type}</p>}
                    </div>

                    {/* Años */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Año Mín <span className="text-red-500">*</span></label>
                            <div className="relative group">
                                <Calendar className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${errors.yearMin ? 'text-red-400' : 'text-slate-400 group-focus-within:text-gray-500'}`} />
                                <input 
                                    type="number" 
                                    value={yearMin} 
                                    onChange={(e) => {
                                        setYearMin(e.target.value);
                                        if(errors.yearMin) setErrors({...errors, yearMin: ''});
                                    }} 
                                    placeholder="2015" 
                                    className={getInputClasses(!!errors.yearMin)}
                                />
                            </div>
                            {errors.yearMin && <p className="text-xs text-red-500 ml-1">{errors.yearMin}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Año Máx <span className="text-red-500">*</span></label>
                            <div className="relative group">
                                <Calendar className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${errors.yearMax ? 'text-red-400' : 'text-slate-400 group-focus-within:text-gray-500'}`} />
                                <input 
                                    type="number" 
                                    value={yearMax} 
                                    onChange={(e) => {
                                        setYearMax(e.target.value);
                                        if(errors.yearMax) setErrors({...errors, yearMax: ''});
                                    }} 
                                    placeholder="2024" 
                                    className={getInputClasses(!!errors.yearMax)}
                                />
                            </div>
                            {errors.yearMax && <p className="text-xs text-red-500 ml-1">{errors.yearMax}</p>}
                        </div>
                    </div>

                    {/* Presupuesto y Color */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Presupuesto <span className="text-red-500">*</span></label>
                            <div className="relative group">
                                <DollarSign className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${errors.budgetMax ? 'text-red-400' : 'text-slate-400 group-focus-within:text-gray-500'}`} />
                                <input 
                                    type="number" 
                                    value={budgetMax} 
                                    onChange={(e) => {
                                        setBudgetMax(e.target.value);
                                        if(errors.budgetMax) setErrors({...errors, budgetMax: ''});
                                    }} 
                                    className={getInputClasses(!!errors.budgetMax)} 
                                    placeholder="0.00" 
                                />
                            </div>
                            {errors.budgetMax && <p className="text-xs text-red-500 ml-1 truncate" title={errors.budgetMax}>{errors.budgetMax}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Color <span className="text-red-500">*</span></label>
                            <div className="relative group">
                                <Palette className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${errors.color ? 'text-red-400' : 'text-slate-400 group-focus-within:text-gray-500'}`} />
                                <input 
                                    value={color} 
                                    onChange={(e) => {
                                        setColor(e.target.value);
                                        if(errors.color) setErrors({...errors, color: ''});
                                    }} 
                                    placeholder="Ej: Blanco" 
                                    className={getInputClasses(!!errors.color)} 
                                />
                            </div>
                            {errors.color && <p className="text-xs text-red-500 ml-1">{errors.color}</p>}
                        </div>
                    </div>

                    {/* Prioridad */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Prioridad del Pedido <span className="text-red-500">*</span></label>
                        <div className="relative group">
                            <BarChart3 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-gray-500" />
                            <select 
                                value={priority} 
                                onChange={(e) => setPriority(e.target.value)}
                                className={`${getInputClasses(false)} appearance-none cursor-pointer`}
                            >
                                <option value="baja">Baja - Sin urgencia</option>
                                <option value="media">Media - Interés normal</option>
                                <option value="alta">Alta - ¡Urgente!</option>
                            </select>
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Notas */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Notas / Detalles <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <FileText className={`absolute left-3.5 top-4 h-5 w-5 transition-colors ${errors.notes ? 'text-red-400' : 'text-slate-400'}`} />
                            <TextArea 
                                value={notes} 
                                onChange={(e) => {
                                    setNotes(e.target.value);
                                    if(errors.notes) setErrors({...errors, notes: ''});
                                }} 
                                placeholder="Escribe detalles específicos (e.g. tapicería cuero, automático...)" 
                                className={`pl-10 min-h-[100px] resize-none w-full p-3 bg-slate-50 border rounded-xl text-sm focus:bg-white focus:ring-4 outline-none transition-all ${errors.notes ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-gray-500 focus:ring-gray-100'}`}
                            />
                        </div>
                        {errors.notes && (
                            <p className="text-xs text-red-500 flex items-center gap-1 ml-1 animate-in slide-in-from-top-1">
                                <AlertCircle className="h-3 w-3" /> {errors.notes}
                            </p>
                        )}
                    </div>

                    {/* Error General */}
                    {errors.form && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {errors.form}
                        </div>
                    )}

                    <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 h-auto rounded-xl shadow-lg shadow-slate-200 transition-transform active:scale-[0.99] text-base font-medium"
                    >
                        {isSubmitting ? (
                            <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Creando Pedido...</>
                        ) : (
                            "Crear Pedido"
                        )}
                    </Button>

                    {successMessage && (
                        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm animate-in fade-in slide-in-from-bottom-2">
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                            <span className="font-medium">{successMessage}</span>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}