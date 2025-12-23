import { useState, useEffect } from "react";
import { 
    MapPin, 
    Car, 
    Calendar, 
    Loader2, 
    CheckCircle2, 
    AlertCircle, 
    ChevronDown, 
    PenLine, 
    Clock, 
    CreditCard,
    Users
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button, Input, TextArea } from "./ui-components";
import type { LeadWithDetails } from "../../../../hooks/useLeads";

// Definimos los tipos literales que espera tu base de datos según el error de consola
type CreditStatus = "aplica" | "no_aplica" | "pendiente" | "no_interesa";
type VisitSource = "showroom" | "cita_telefonica" | "redes_sociales" | "referido" | "pagina_web";

export function LeadShowroomTab({ lead }: { lead: LeadWithDetails }) {
    const { supabase, user } = useAuth();
    
    // --- ESTADOS ---
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);
    const [inventory, setInventory] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    // Formulario - Datos del Vehículo
    const [selectedCarId, setSelectedCarId] = useState("");
    const [isManualVehicle, setIsManualVehicle] = useState(false);
    const [manualVehicle, setManualVehicle] = useState("");
    
    // Formulario - Tiempos y Detalles
    const [visitStart, setVisitStart] = useState(new Date().toISOString().slice(0, 16)); 
    const [visitEnd, setVisitEnd] = useState(""); 
    
    // Tipamos los estados con los literales específicos
    const [source, setSource] = useState<VisitSource>("showroom");
    const [creditStatus, setCreditStatus] = useState<CreditStatus>("pendiente"); 
    
    const [observation, setObservation] = useState("");
    const [testDrive, setTestDrive] = useState(false);

    // Estado para manejo de errores
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // 1. Cargar Inventario al montar
    useEffect(() => {
        const fetchInventory = async () => {
            setIsLoadingInventory(true);
            const { data } = await supabase
                .from('inventory')
                .select('id, brand, model, year, plate_short')
                .eq('status', 'disponible')
                .order('brand');
            
            if (data) setInventory(data);
            setIsLoadingInventory(false);
        };
        fetchInventory();
    }, [supabase]);

    // Efecto para sugerir hora de fin (1 hora después del inicio)
    useEffect(() => {
        if (visitStart && !visitEnd) {
            const startDate = new Date(visitStart);
            startDate.setHours(startDate.getHours() + 1);
            const localIsoString = new Date(startDate.getTime() - (startDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            setVisitEnd(localIsoString);
        }
    }, [visitStart]);

    // Función de Validación
    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        
        if (isManualVehicle) {
            if (!manualVehicle.trim()) newErrors.manualVehicle = "Escribe el vehículo de interés.";
        } else {
            if (!selectedCarId) newErrors.selectedCarId = "Selecciona un vehículo del inventario.";
        }

        if (!visitStart) newErrors.visitStart = "La hora de inicio es obligatoria.";
        if (visitEnd && visitStart && new Date(visitEnd) <= new Date(visitStart)) {
            newErrors.visitEnd = "La hora fin debe ser posterior al inicio.";
        }
        
        if (!observation.trim()) newErrors.observation = "Debes escribir una observación.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 2. Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        if (!user) return;

        setIsSubmitting(true);
        setSuccessMessage("");

        // Construimos el payload asegurando que los tipos coincidan con la DB
        const payload = {
            salesperson_id: user.id,
            client_name: lead.name,
            phone: lead.phone,
            inventory_id: isManualVehicle ? null : (selectedCarId || null),
            manual_vehicle_description: isManualVehicle ? manualVehicle : null,
            visit_start: new Date(visitStart).toISOString(),
            visit_end: visitEnd ? new Date(visitEnd).toISOString() : null,
            source: source as any, // Cast temporal si el enum de DB es estricto
            credit_status: creditStatus as any, // Cast para evitar el error de Overload
            test_drive: testDrive,
            observation: observation,
        };

        const { error } = await supabase.from('showroom_visits').insert(payload);

        setIsSubmitting(false);

        if (error) {
            console.error("Error creando visita:", error);
            setErrors({ form: "Hubo un error al guardar en la base de datos." });
        } else {
            setSuccessMessage("Visita registrada exitosamente.");
            setObservation("");
            setTestDrive(false);
            setSelectedCarId("");
            setManualVehicle("");
            const now = new Date();
            setVisitStart(now.toISOString().slice(0, 16));
            setCreditStatus("pendiente");
            setErrors({});
        }
    };

    const getInputClasses = (hasError: boolean) => `
        w-full pl-10 pr-4 py-3 
        bg-slate-50 border rounded-xl text-sm text-slate-700 
        transition-all duration-200 ease-in-out
        focus:bg-white focus:ring-4 outline-none
        ${hasError 
            ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
            : 'border-slate-200 focus:border-purple-500 focus:ring-purple-100 hover:border-slate-300'}
    `;

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
            <div className="max-w-xl mx-auto space-y-6">

                <div className="text-center mb-6">
                    <h2 className="text-lg font-bold text-slate-800">Agendar Visita a Showroom</h2>
                    <p className="text-sm text-slate-500">Completa los detalles de la visita.</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
                    
                    {/* Sección Vehículo */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1 mb-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Vehículo de Interés <span className="text-red-500">*</span>
                            </label>
                            
                            <label className="flex items-center gap-2 cursor-pointer text-xs select-none p-1 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200">
                                <input 
                                    type="checkbox" 
                                    checked={isManualVehicle}
                                    onChange={(e) => {
                                        setIsManualVehicle(e.target.checked);
                                        setErrors(prev => ({...prev, selectedCarId: '', manualVehicle: ''}));
                                    }}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                                />
                                <span className={`font-medium ${isManualVehicle ? 'text-slate-900' : 'text-slate-500'}`}>
                                    No está en inventario
                                </span>
                            </label>
                        </div>

                        <div className="relative group animate-in fade-in duration-200">
                            {isManualVehicle ? (
                                <>
                                    <PenLine className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${errors.manualVehicle ? 'text-red-400' : 'text-slate-400 group-focus-within:text-purple-500'}`} />
                                    <input
                                        type="text"
                                        placeholder="Escribe Marca, Modelo y Año"
                                        value={manualVehicle}
                                        onChange={(e) => {
                                            setManualVehicle(e.target.value);
                                            if(errors.manualVehicle) setErrors({...errors, manualVehicle: ''});
                                        }}
                                        className={getInputClasses(!!errors.manualVehicle)}
                                        autoFocus
                                    />
                                </>
                            ) : (
                                <>
                                    <Car className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${errors.selectedCarId ? 'text-red-400' : 'text-slate-400 group-focus-within:text-purple-500'}`} />
                                    <select
                                        value={selectedCarId}
                                        onChange={(e) => {
                                            setSelectedCarId(e.target.value);
                                            if(errors.selectedCarId) setErrors({...errors, selectedCarId: ''});
                                        }}
                                        className={`${getInputClasses(!!errors.selectedCarId)} appearance-none cursor-pointer`}
                                        disabled={isLoadingInventory}
                                    >
                                        <option value="">Seleccionar Vehículo</option>
                                        {inventory.map(car => (
                                            <option key={car.id} value={car.id}>
                                                {car.brand} {car.model} {car.year} — {car.plate_short || 'S/P'}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                </>
                            )}
                        </div>
                        {(errors.selectedCarId || errors.manualVehicle) && (
                            <p className="text-xs text-red-500 flex items-center gap-1 mt-1 ml-1">
                                <AlertCircle className="h-3 w-3" /> 
                                {isManualVehicle ? errors.manualVehicle : errors.selectedCarId}
                            </p>
                        )}
                    </div>

                    {/* Fila de Fechas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                                Hora Inicio <span className="text-red-500">*</span>
                            </label>
                            <div className="relative group">
                                <Calendar className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${errors.visitStart ? 'text-red-400' : 'text-slate-400 group-focus-within:text-purple-500'}`} />
                                <input
                                    type="datetime-local"
                                    value={visitStart}
                                    onChange={(e) => {
                                        setVisitStart(e.target.value);
                                        if(errors.visitStart) setErrors({...errors, visitStart: ''});
                                    }}
                                    className={getInputClasses(!!errors.visitStart)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                                Hora Fin
                            </label>
                            <div className="relative group">
                                <Clock className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${errors.visitEnd ? 'text-red-400' : 'text-slate-400 group-focus-within:text-purple-500'}`} />
                                <input
                                    type="datetime-local"
                                    value={visitEnd}
                                    onChange={(e) => {
                                        setVisitEnd(e.target.value);
                                        if(errors.visitEnd) setErrors({...errors, visitEnd: ''});
                                    }}
                                    className={getInputClasses(!!errors.visitEnd)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Fila: Medio y Crédito */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                                Medio de Visita
                            </label>
                            <div className="relative group">
                                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                                <select
                                    value={source}
                                    onChange={(e) => setSource(e.target.value as VisitSource)}
                                    className={`${getInputClasses(false)} appearance-none cursor-pointer`}
                                >
                                    <option value="showroom">Showroom (Walk-in)</option>
                                    <option value="cita_telefonica">Cita Telefónica</option>
                                    <option value="redes_sociales">Redes Sociales</option>
                                    <option value="referido">Referido</option>
                                    <option value="pagina_web">Página Web</option>
                                </select>
                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                                Estatus Crédito
                            </label>
                            <div className="relative group">
                                <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                                <select
                                    value={creditStatus}
                                    onChange={(e) => setCreditStatus(e.target.value as CreditStatus)}
                                    className={`${getInputClasses(false)} appearance-none cursor-pointer`}
                                >
                                    {/* Mantenemos solo los valores que tu error de TS dice que son válidos */}
                                    <option value="pendiente">Pendiente</option>
                                    <option value="aplica">Aplica / Pre-aprobado</option>
                                    <option value="no_aplica">No Aplica (Contado)</option>
                                    <option value="no_interesa">No Interesa</option>
                                </select>
                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Test Drive Switch */}
                    <div className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${testDrive ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex flex-col">
                            <span className={`text-sm font-semibold ${testDrive ? 'text-purple-800' : 'text-slate-700'}`}>Test Drive Realizado</span>
                            <span className="text-xs text-slate-500">¿El cliente condujo el auto?</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setTestDrive(!testDrive)}
                            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${testDrive ? 'bg-purple-600' : 'bg-slate-300'}`}
                        >
                            <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${testDrive ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Observaciones */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                            Observaciones <span className="text-red-500">*</span>
                        </label>
                        <TextArea
                            value={observation}
                            onChange={(e) => {
                                setObservation(e.target.value);
                                if(errors.observation) setErrors({...errors, observation: ''});
                            }}
                            placeholder="Escribe los detalles importantes de la visita..."
                            className={`min-h-[100px] resize-none w-full p-3 bg-slate-50 border rounded-xl text-sm focus:bg-white focus:ring-4 outline-none transition-all ${errors.observation ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-purple-500 focus:ring-purple-100'}`}
                        />
                        {errors.observation && (
                            <p className="text-xs text-red-500 flex items-center gap-1 mt-1 ml-1">
                                <AlertCircle className="h-3 w-3" /> {errors.observation}
                            </p>
                        )}
                    </div>

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
                            <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Guardando...</>
                        ) : (
                            "Registrar Visita"
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