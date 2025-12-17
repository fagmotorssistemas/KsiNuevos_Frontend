import { useState, useEffect } from "react";
import { XCircle, Loader2, Save, Car } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { VisitSource, CreditStatus, InventoryItem } from "./constants";

interface VisitFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function VisitFormModal({ isOpen, onClose, onSuccess }: VisitFormModalProps) {
    const { supabase, user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);

    // Estado del Formulario
    const [formData, setFormData] = useState({
        client_name: '',
        inventory_id: '', // Esto ahora guarda un UUID string
        source: 'showroom' as VisitSource,
        visit_start_time: '',
        visit_end_time: '',
        test_drive: false,
        credit_status: 'pendiente' as CreditStatus,
        observation: ''
    });

    // Cargar Inventario al abrir
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
            
            const now = new Date();
            setFormData(prev => ({
                ...prev,
                visit_start_time: now.toTimeString().slice(0, 5)
            }));
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSubmitting(true);

        const todayStr = new Date().toISOString().split('T')[0];
        const startFull = `${todayStr}T${formData.visit_start_time}:00`;
        const endFull = formData.visit_end_time ? `${todayStr}T${formData.visit_end_time}:00` : null;

        const { error } = await supabase.from('showroom_visits').insert({
            salesperson_id: user.id,
            client_name: formData.client_name,
            
            // CORRECCIÓN: No usamos parseInt aquí porque es UUID
            inventory_id: formData.inventory_id && formData.inventory_id !== '' ? formData.inventory_id : null,
            
            source: formData.source,
            visit_start: startFull,
            visit_end: endFull,
            test_drive: formData.test_drive,
            credit_status: formData.credit_status,
            observation: formData.observation
        });

        if (!error) {
            onSuccess();
            onClose();
            setFormData({ client_name: '', inventory_id: '', source: 'showroom', visit_start_time: '', visit_end_time: '', test_drive: false, credit_status: 'pendiente', observation: '' });
        } else {
            console.error(error);
            alert("Error al registrar visita");
        }
        setIsSubmitting(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <span className="bg-slate-900 text-white p-1 rounded">SR</span> 
                        Registrar Visita / Showroom
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XCircle className="h-6 w-6" /></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* Fila 1: Cliente y Origen */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label-text">Nombre del Cliente</label>
                            <input required type="text" className="input-field" placeholder="Ej: Juan Pérez" 
                                value={formData.client_name} onChange={e => setFormData({...formData, client_name: e.target.value})} />
                        </div>
                        <div>
                            <label className="label-text">Medio de Visita</label>
                            <select className="input-field" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value as VisitSource})}>
                                <option value="showroom">Pasó Caminando (Showroom)</option>
                                <option value="redes_sociales">Redes Sociales (FB/IG)</option>
                                <option value="referido">Referido</option>
                                <option value="cita">Cita Agendada</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                    </div>

                    {/* Fila 2: Inventario */}
                    <div>
                        <label className="label-text flex justify-between">
                            Vehículo de Interés
                            {isLoadingInventory && <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin"/> Cargando autos...</span>}
                        </label>
                        <div className="relative">
                            <Car className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <select 
                                className="input-field pl-9" 
                                value={formData.inventory_id} 
                                onChange={e => setFormData({...formData, inventory_id: e.target.value})}
                            >
                                <option value="">-- Seleccionar del Inventario --</option>
                                {inventory.map(car => (
                                    <option key={car.id} value={car.id}>
                                        {car.brand} {car.model} ({car.year}) - ${car.price?.toLocaleString()}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Si el cliente busca algo que no tenemos, dejar vacío y detallar en notas.</p>
                    </div>

                    {/* Fila 3: Tiempos */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                            <label className="label-text">Hora Inicio Atención</label>
                            <input type="time" required className="input-field bg-white" 
                                value={formData.visit_start_time} onChange={e => setFormData({...formData, visit_start_time: e.target.value})} />
                        </div>
                        <div>
                            <label className="label-text">Hora Fin (Opcional)</label>
                            <input type="time" className="input-field bg-white" 
                                value={formData.visit_end_time} onChange={e => setFormData({...formData, visit_end_time: e.target.value})} />
                        </div>
                    </div>

                    {/* Fila 4: Resultados */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setFormData(p => ({...p, test_drive: !p.test_drive}))}>
                            <input type="checkbox" checked={formData.test_drive} readOnly className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                            <label className="text-sm font-medium text-slate-700 cursor-pointer">¿Realizó Test Drive?</label>
                        </div>
                        
                        <div>
                            <label className="label-text">Estatus Crédito</label>
                            <select className="input-field" value={formData.credit_status} onChange={e => setFormData({...formData, credit_status: e.target.value as CreditStatus})}>
                                <option value="pendiente">Pendiente / No se habló</option>
                                <option value="aplica">Aplica / Interesado</option>
                                <option value="no_aplica">No Aplica</option>
                                <option value="no_interesa">Pago de Contado</option>
                            </select>
                        </div>
                    </div>

                    {/* Fila 5: Notas */}
                    <div>
                        <label className="label-text">Observaciones / Resultado</label>
                        <textarea 
                            rows={3} 
                            className="input-field resize-none" 
                            placeholder="Ej: Le gustó el auto pero busca color rojo. Quedamos en llamar mañana."
                            value={formData.observation} 
                            onChange={e => setFormData({...formData, observation: e.target.value})} 
                        />
                    </div>

                    <div className="pt-2">
                        <button type="submit" disabled={isSubmitting} className="w-full btn-primary flex justify-center items-center gap-2">
                            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            Registrar Visita
                        </button>
                    </div>
                </form>
            </div>
            
            <style jsx>{`
                .label-text { @apply block text-xs font-bold text-slate-500 uppercase mb-1; }
                .input-field { @apply w-full rounded-lg border-slate-200 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all; }
                .btn-primary { @apply bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-lg transition-all; }
            `}</style>
        </div>
    );
}