"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
    Search, 
    Car, 
    User, 
    Save, 
    Camera, 
    Loader2, 
    CheckCircle2,
    Fuel
} from "lucide-react";
import { useRecepcion } from "@/hooks/taller/useRecepcion";
import { ChecklistGroup } from "./ChecklistInspection";

// Definición de los campos del checklist
const CHECKLIST_ITEMS = {
    exterior: [
        { key: 'rayones', label: 'Rayones / Golpes' },
        { key: 'pintura', label: 'Desprendimiento Pintura' },
        { key: 'cristales', label: 'Cristales / Parabrisas' },
        { key: 'espejos', label: 'Espejos Laterales' },
        { key: 'faros', label: 'Faros y Luces' },
        { key: 'parachoques', label: 'Parachoques' },
        { key: 'llantas', label: 'Estado Llantas' }
    ],
    interior: [
        { key: 'asientos', label: 'Asientos / Tapicería' },
        { key: 'tablero', label: 'Tablero sin daños' },
        { key: 'audio', label: 'Equipo de Audio' },
        { key: 'aire', label: 'Aire Acondicionado' },
        { key: 'alfombras', label: 'Alfombras' }
    ],
    mecanico: [
        { key: 'motor', label: 'Motor (Ruidos)' },
        { key: 'frenos', label: 'Frenos' },
        { key: 'bateria', label: 'Batería' },
        { key: 'suspension', label: 'Suspensión' }
    ]
};

const INVENTARIO_ITEMS = [
    { key: 'llanta_repuesto', label: 'Llanta Repuesto' },
    { key: 'gata', label: 'Gata / Herramientas' },
    { key: 'documentos', label: 'Documentos Auto' },
    { key: 'llaves', label: 'Llaves' },
    { key: 'radio_panel', label: 'Panel de Radio' }
];

// Interfaz para el estado del cliente (SOLUCIÓN DEL ERROR)
interface ClienteState {
    id: string | null; // <--- Aquí permitimos que sea string o null
    cedula: string;
    nombre: string;
    telefono: string;
    email: string;
    direccion: string;
}

export function ReceptionForm() {
    const router = useRouter();
    const { buscarCliente, crearOrdenIngreso, isLoading, searchLoading } = useRecepcion();

    // Estados del Formulario con tipado explícito
    const [cliente, setCliente] = useState<ClienteState>({
        id: null,
        cedula: '',
        nombre: '',
        telefono: '',
        email: '',
        direccion: ''
    });

    const [vehiculo, setVehiculo] = useState({
        placa: '',
        marca: '',
        modelo: '',
        anio: new Date().getFullYear(),
        color: '',
        vin: '',
        kilometraje: 0,
        nivel_gasolina: 50
    });

    const [checklist, setChecklist] = useState<any>({});
    const [inventario, setInventario] = useState<any>({});
    
    const [observaciones, setObservaciones] = useState('');
    const [fotos, setFotos] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    // Manejadores
    const handleSearchCliente = async () => {
        if (cliente.cedula.length < 3) return;
        const data = await buscarCliente(cliente.cedula);
        if (data) {
            setCliente(prev => ({
                ...prev,
                id: data.id, // Ahora TypeScript acepta asignar este string
                nombre: data.nombre_completo,
                telefono: data.telefono || '',
                email: data.email || '',
                direccion: data.direccion || ''
            }));
        }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFotos(prev => [...prev, ...newFiles]);
            
            const newUrls = newFiles.map(file => URL.createObjectURL(file));
            setPreviewUrls(prev => [...prev, ...newUrls]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const payload = {
            cliente_id: cliente.id,
            cliente_cedula: cliente.cedula,
            cliente_nombre: cliente.nombre,
            cliente_telefono: cliente.telefono,
            cliente_email: cliente.email,
            cliente_direccion: cliente.direccion,
            
            vehiculo_placa: vehiculo.placa,
            vehiculo_marca: vehiculo.marca,
            vehiculo_modelo: vehiculo.modelo,
            vehiculo_anio: vehiculo.anio,
            vehiculo_color: vehiculo.color,
            vehiculo_vin: vehiculo.vin,
            kilometraje: vehiculo.kilometraje,
            nivel_gasolina: vehiculo.nivel_gasolina,
            
            checklist,
            inventario,
            observaciones
        };

        const result = await crearOrdenIngreso(payload, fotos);
        
        if (result.success) {
            // Toast de éxito o redirección
            router.push('/taller');
        } else {
            alert("Error al crear la orden: " + result.error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-8 pb-20">
            
            {/* SECCIÓN 1: CLIENTE */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><User className="h-5 w-5" /></div>
                    <h3 className="text-lg font-bold text-slate-800">Datos del Cliente</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="relative">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cédula / RUC</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                required
                                className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Ej: 0104..."
                                value={cliente.cedula}
                                onChange={(e) => setCliente({...cliente, cedula: e.target.value})}
                                onBlur={handleSearchCliente}
                            />
                            <button 
                                type="button" 
                                onClick={handleSearchCliente}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                                {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nombre Completo</label>
                        <input 
                            type="text" 
                            required
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={cliente.nombre}
                            onChange={(e) => setCliente({...cliente, nombre: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Teléfono</label>
                        <input 
                            type="tel" 
                            required
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={cliente.telefono}
                            onChange={(e) => setCliente({...cliente, telefono: e.target.value})}
                        />
                    </div>
                    
                    <div className="lg:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Dirección</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={cliente.direccion}
                            onChange={(e) => setCliente({...cliente, direccion: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            {/* SECCIÓN 2: VEHÍCULO */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Car className="h-5 w-5" /></div>
                    <h3 className="text-lg font-bold text-slate-800">Datos del Vehículo</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Placa</label>
                        <input 
                            type="text" 
                            required
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold uppercase focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                            placeholder="ABC-1234"
                            value={vehiculo.placa}
                            onChange={(e) => setVehiculo({...vehiculo, placa: e.target.value.toUpperCase()})}
                        />
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Marca</label>
                        <input 
                            type="text" 
                            required
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                            value={vehiculo.marca}
                            onChange={(e) => setVehiculo({...vehiculo, marca: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Modelo</label>
                        <input 
                            type="text" 
                            required
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                            value={vehiculo.modelo}
                            onChange={(e) => setVehiculo({...vehiculo, modelo: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Año</label>
                        <input 
                            type="number" 
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                            value={vehiculo.anio}
                            onChange={(e) => setVehiculo({...vehiculo, anio: parseInt(e.target.value)})}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Color</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                            value={vehiculo.color}
                            onChange={(e) => setVehiculo({...vehiculo, color: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Kilometraje</label>
                        <input 
                            type="number" 
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                            value={vehiculo.kilometraje}
                            onChange={(e) => setVehiculo({...vehiculo, kilometraje: parseInt(e.target.value)})}
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-2">
                            <Fuel className="h-4 w-4" /> Nivel Gasolina: {vehiculo.nivel_gasolina}%
                        </label>
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="5"
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            value={vehiculo.nivel_gasolina}
                            onChange={(e) => setVehiculo({...vehiculo, nivel_gasolina: parseInt(e.target.value)})}
                        />
                        <div className="flex justify-between text-xs text-slate-400 mt-1 font-mono">
                            <span>E</span>
                            <span>1/4</span>
                            <span>1/2</span>
                            <span>3/4</span>
                            <span>F</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 3: CHECKLIST DE ESTADO */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="p-2 bg-red-100 text-red-600 rounded-lg"><CheckCircle2 className="h-5 w-5" /></div>
                    <h3 className="text-lg font-bold text-slate-800">Inspección de Estado</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ChecklistGroup 
                        title="Exterior (Daños)" 
                        items={CHECKLIST_ITEMS.exterior} 
                        values={checklist}
                        onChange={(key, val) => setChecklist({...checklist, [key]: val})}
                    />
                    <ChecklistGroup 
                        title="Interior" 
                        items={CHECKLIST_ITEMS.interior} 
                        values={checklist}
                        onChange={(key, val) => setChecklist({...checklist, [key]: val})}
                    />
                    <ChecklistGroup 
                        title="Mecánico" 
                        items={CHECKLIST_ITEMS.mecanico} 
                        values={checklist}
                        onChange={(key, val) => setChecklist({...checklist, [key]: val})}
                    />
                </div>
            </div>

            {/* SECCIÓN 4: INVENTARIO Y OBSERVACIONES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-700 uppercase mb-4">Inventario Pertenencias</h4>
                    <ChecklistGroup 
                        title="Accesorios" 
                        items={INVENTARIO_ITEMS} 
                        values={inventario}
                        onChange={(key, val) => setInventario({...inventario, [key]: val})}
                    />
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                    <h4 className="text-sm font-bold text-slate-700 uppercase mb-4">Observaciones Adicionales</h4>
                    <textarea 
                        className="flex-1 w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        placeholder="Detalles específicos del trabajo a realizar, golpes pre-existentes no listados, etc..."
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                    ></textarea>
                </div>
            </div>

            {/* SECCIÓN 5: EVIDENCIA FOTOGRÁFICA */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Evidencia Fotográfica</h3>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md">Mínimo 4 fotos sugeridas</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {previewUrls.map((url, index) => (
                        <div key={index} className="aspect-square rounded-xl overflow-hidden border border-slate-200 relative group">
                            <img src={url} alt={`Evidencia ${index}`} className="w-full h-full object-cover" />
                        </div>
                    ))}
                    
                    <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-blue-500">
                        <Camera className="h-8 w-8 mb-2" />
                        <span className="text-xs font-bold uppercase">Agregar Foto</span>
                        <input 
                            type="file" 
                            accept="image/*" 
                            multiple 
                            className="hidden" 
                            onChange={handlePhotoChange}
                        />
                    </label>
                </div>
            </div>

            {/* BOTÓN FINAL */}
            <div className="fixed bottom-0 left-0 md:left-72 right-0 p-4 bg-white border-t border-slate-200 flex items-center justify-end gap-4 z-40">
                <button 
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    type="submit"
                    disabled={isLoading}
                    className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    Generar Orden de Ingreso
                </button>
            </div>
        </form>
    );
}