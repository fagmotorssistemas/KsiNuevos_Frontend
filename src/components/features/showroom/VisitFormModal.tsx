import { useState, useEffect, useRef } from "react";
import { 
  X, 
  Loader2, 
  Save, 
  User, 
  Clock, 
  MapPin, 
  CreditCard, 
  FileText, 
  CheckCircle2,
  Circle,
  Search,
  ChevronDown,
  Pencil
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { VisitSource, CreditStatus, InventoryItem, ShowroomVisit } from "./constants";

interface VisitFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    visitToEdit?: ShowroomVisit | null;
}

export default function VisitFormModal({ isOpen, onClose, onSuccess, visitToEdit }: VisitFormModalProps) {
    const { supabase, user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);

    // --- ESTADOS PARA EL BUSCADOR ---
    const [searchTerm, setSearchTerm] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Estado del Formulario
    const [formData, setFormData] = useState({
        client_name: '',
        inventory_id: '',
        source: 'showroom' as VisitSource,
        visit_start_time: '',
        visit_end_time: '',
        test_drive: false,
        credit_status: 'pendiente' as CreditStatus,
        observation: ''
    });

    const isEditing = !!visitToEdit;

    useEffect(() => {
        if (isOpen) {
            const fetchInventory = async () => {
                setIsLoadingInventory(true);
                const { data } = await supabase
                    .from('inventory') 
                    .select('id, brand, model, year, price, status')
                    .eq('status', 'disponible')
                    .order('brand', { ascending: true });
                
                if (data) setInventory(data as any);
                setIsLoadingInventory(false);
            };
            fetchInventory();
            
            if (visitToEdit) {
                // MODO EDICIÓN: Extraemos la hora directamente del string para evitar desfases de Timezone
                // Asumiendo formato ISO: "YYYY-MM-DDTHH:mm:ss..."
                const startTime = visitToEdit.visit_start.split('T')[1].slice(0, 5);
                const endTime = visitToEdit.visit_end 
                    ? visitToEdit.visit_end.split('T')[1].slice(0, 5) 
                    : '';

                setFormData({
                    client_name: visitToEdit.client_name,
                    inventory_id: visitToEdit.inventory_id || '',
                    source: visitToEdit.source as VisitSource,
                    visit_start_time: startTime,
                    visit_end_time: endTime,
                    test_drive: visitToEdit.test_drive || false,
                    credit_status: (visitToEdit.credit_status as CreditStatus) || 'pendiente',
                    observation: visitToEdit.observation || ''
                });

                if (visitToEdit.inventory) {
                    setSearchTerm(`${visitToEdit.inventory.brand} ${visitToEdit.inventory.model} (${visitToEdit.inventory.year})`);
                } else {
                    setSearchTerm("");
                }

            } else {
                // MODO CREACIÓN
                const now = new Date();
                // Aquí usamos toLocaleTimeString para la hora inicial de creación
                const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
                
                setFormData({
                    client_name: '',
                    inventory_id: '',
                    source: 'showroom',
                    visit_start_time: currentTime,
                    visit_end_time: '',
                    test_drive: false,
                    credit_status: 'pendiente',
                    observation: ''
                });
                setSearchTerm("");
            }
        }
    }, [isOpen, visitToEdit, supabase]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredInventory = inventory.filter(car => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        const carString = `${car.brand} ${car.model} ${car.year}`.toLowerCase();
        return carString.includes(searchLower);
    });

    const handleSelectCar = (car: InventoryItem) => {
        setFormData({ ...formData, inventory_id: car.id });
        setSearchTerm(`${car.brand} ${car.model} (${car.year})`);
        setIsDropdownOpen(false);
    };

    const handleClearCarSelection = () => {
        setFormData({ ...formData, inventory_id: '' });
        setSearchTerm("");
        setIsDropdownOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSubmitting(true);

        // Determinamos la fecha base
        let dateBaseStr = new Date().toISOString().split('T')[0];
        if (isEditing && visitToEdit) {
             dateBaseStr = visitToEdit.visit_start.split('T')[0];
        }

        // Construimos ISO con "Z" para indicar UTC y evitar que el servidor lo mueva de nuevo
        const startFull = `${dateBaseStr}T${formData.visit_start_time}:00Z`;
        const endFull = formData.visit_end_time ? `${dateBaseStr}T${formData.visit_end_time}:00Z` : null;

        const payload = {
            salesperson_id: user.id,
            client_name: formData.client_name,
            inventory_id: formData.inventory_id && formData.inventory_id !== '' ? formData.inventory_id : null,
            source: formData.source,
            visit_start: startFull,
            visit_end: endFull,
            test_drive: formData.test_drive,
            credit_status: formData.credit_status,
            observation: formData.observation
        };

        let error;
        if (isEditing && visitToEdit) {
            const { error: updateError } = await supabase
                .from('showroom_visits')
                .update(payload)
                .eq('id', visitToEdit.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('showroom_visits')
                .insert(payload);
            error = insertError;
        }

        if (!error) {
            onSuccess();
            onClose();
        } else {
            console.error(error);
            alert("Error al guardar la visita");
        }
        setIsSubmitting(false);
    };

    const InputLabel = ({ label, required = false }: { label: string, required?: boolean }) => (
        <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
            {label}
            {required ? (
                <span className="text-red-500 ml-1">*</span>
            ) : (
                <span className="text-slate-400 font-normal text-[11px] ml-2 uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded-full">
                    Opcional
                </span>
            )}
        </label>
    );

    const inputClasses = "w-full h-12 rounded-xl border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all pl-11 placeholder:text-slate-400 shadow-sm";
    const iconContainerClass = "absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10";

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-white text-xs font-bold px-2 py-0.5 rounded ${isEditing ? 'bg-amber-500' : 'bg-slate-900'}`}>
                                {isEditing ? 'EDITAR' : 'NUEVO'}
                            </span>
                            <h3 className="font-bold text-xl text-slate-900">
                                {isEditing ? 'Editar Visita' : 'Registrar Visita'}
                            </h3>
                        </div>
                        <p className="text-sm text-slate-500">
                            {isEditing ? 'Modifica los detalles de la visita existente.' : 'Control de tráfico y prospectos en showroom'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                
                {/* Body */}
                <div className="overflow-y-auto custom-scrollbar bg-white">
                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-5">
                            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/60">
                                <div className="p-2 bg-slate-200 rounded-lg text-slate-700">
                                    <User className="w-5 h-5" />
                                </div>
                                <h4 className="text-base font-bold text-slate-800">Cliente y Origen</h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <InputLabel label="Nombre del Cliente" required />
                                    <div className="relative">
                                        <div className={iconContainerClass}><User className="h-5 w-5" /></div>
                                        <input 
                                            required 
                                            type="text" 
                                            className={inputClasses} 
                                            placeholder="Ej: Juan Pérez" 
                                            value={formData.client_name} 
                                            onChange={e => setFormData({...formData, client_name: e.target.value})} 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <InputLabel label="Medio de Visita" required />
                                    <div className="relative">
                                        <div className={iconContainerClass}><MapPin className="h-5 w-5" /></div>
                                        <select 
                                            className={`${inputClasses} appearance-none cursor-pointer`}
                                            value={formData.source} 
                                            onChange={e => setFormData({...formData, source: e.target.value as VisitSource})}
                                        >
                                            <option value="showroom">Pasó Caminando (Showroom)</option>
                                            <option value="redes_sociales">Redes Sociales (FB/IG)</option>
                                            <option value="referido">Referido</option>
                                            <option value="cita">Cita Agendada</option>
                                            <option value="otro">Otro</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div ref={dropdownRef} className="relative z-20">
                                <InputLabel label="Vehículo de Interés" />
                                <div className="relative">
                                    <div className={iconContainerClass}>
                                        {isLoadingInventory ? <Loader2 className="h-5 w-5 animate-spin"/> : <Search className="h-5 w-5" />}
                                    </div>
                                    <input 
                                        type="text"
                                        className={`${inputClasses} pr-10`}
                                        placeholder="Buscar por marca, modelo o año..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setIsDropdownOpen(true);
                                            if (e.target.value === '') setFormData(prev => ({...prev, inventory_id: ''}));
                                        }}
                                        onFocus={() => setIsDropdownOpen(true)}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600">
                                        {searchTerm ? (
                                            <X className="h-5 w-5" onClick={handleClearCarSelection} />
                                        ) : (
                                            <ChevronDown className="h-5 w-5" onClick={() => setIsDropdownOpen(!isDropdownOpen)} />
                                        )}
                                    </div>
                                </div>

                                {isDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-200">
                                        {filteredInventory.length > 0 ? (
                                            <ul className="py-2">
                                                <li className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-slate-500 text-sm border-b border-slate-50" onClick={handleClearCarSelection}>
                                                    -- Ninguno específico / Solo consultando --
                                                </li>
                                                {filteredInventory.map(car => (
                                                    <li key={car.id} onClick={() => handleSelectCar(car)} className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center group transition-colors">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-slate-800 group-hover:text-slate-900">{car.brand} {car.model}</span>
                                                            <span className="text-xs text-slate-400">Año {car.year} • {car.status}</span>
                                                        </div>
                                                        <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-1 rounded text-xs group-hover:bg-white border border-transparent group-hover:border-slate-200">
                                                            ${car.price?.toLocaleString()}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="p-4 text-center text-slate-400 text-sm">No se encontraron vehículos.</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <InputLabel label="Hora Inicio" required />
                                    <div className="relative">
                                        <div className={iconContainerClass}><Clock className="h-5 w-5" /></div>
                                        <input 
                                            type="time" 
                                            required 
                                            className={`${inputClasses} appearance-none`}
                                            value={formData.visit_start_time} 
                                            onChange={e => setFormData({...formData, visit_start_time: e.target.value})} 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <InputLabel label="Hora Fin" />
                                    <div className="relative">
                                        <div className={iconContainerClass}><Clock className="h-5 w-5 text-slate-300" /></div>
                                        <input 
                                            type="time" 
                                            className={`${inputClasses} appearance-none`}
                                            value={formData.visit_end_time} 
                                            onChange={e => setFormData({...formData, visit_end_time: e.target.value})} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">Experiencia</label>
                                    <div 
                                        onClick={() => setFormData(p => ({...p, test_drive: !p.test_drive}))}
                                        className={`h-12 w-full rounded-xl border flex items-center px-4 cursor-pointer transition-all select-none ${formData.test_drive ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}
                                    >
                                        <div className="mr-3">{formData.test_drive ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}</div>
                                        <span className="text-sm font-medium">{formData.test_drive ? 'Realizó Test Drive' : 'No realizó Test Drive'}</span>
                                    </div>
                                </div>

                                <div>
                                    <InputLabel label="Estatus Crédito" />
                                    <div className="relative">
                                        <div className={iconContainerClass}><CreditCard className="h-5 w-5" /></div>
                                        <select 
                                            className={`${inputClasses} appearance-none cursor-pointer`}
                                            value={formData.credit_status} 
                                            onChange={e => setFormData({...formData, credit_status: e.target.value as CreditStatus})}
                                        >
                                            <option value="pendiente">Pendiente / No se habló</option>
                                            <option value="aplica">Aplica / Interesado</option>
                                            <option value="no_aplica">No Aplica</option>
                                            <option value="no_interesa">Pago de Contado</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <InputLabel label="Observaciones / Resultado" />
                                <div className="relative">
                                    <div className="absolute left-4 top-4 text-slate-400 pointer-events-none"><FileText className="h-5 w-5" /></div>
                                    <textarea 
                                        rows={3} 
                                        className={`${inputClasses} h-auto py-3.5 resize-none leading-relaxed`} 
                                        placeholder="Ej: Le gustó el auto pero busca color rojo..."
                                        value={formData.observation} 
                                        onChange={e => setFormData({...formData, observation: e.target.value})} 
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer Actions */}
                <div className="p-8 pt-4 bg-white border-t border-slate-50 sticky bottom-0 z-10">
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting} 
                        className={`w-full text-white font-bold text-base py-4 rounded-xl shadow-xl shadow-slate-900/10 transition-all flex justify-center items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.99] hover:translate-y-[-1px] ${isEditing ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-900 hover:bg-slate-800'}`}
                    >
                        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : isEditing ? <Pencil className="h-5 w-5" /> : <Save className="h-5 w-5" />}
                        {isEditing ? 'Actualizar Visita' : 'Registrar Visita'}
                    </button>
                </div>
            </div>
        </div>
    );
}