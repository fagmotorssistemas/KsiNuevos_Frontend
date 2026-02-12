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
    Fuel,
    ClipboardCheck,
    Box,
    X,
    ChevronRight,
    Info,
    CalendarClock,
    Mail,
    Fingerprint // Icono para el VIN
} from "lucide-react";
import { useRecepcion } from "@/hooks/taller/useRecepcion";
import { ChecklistGroup } from "./ChecklistInspection";

const CHECKLIST_ITEMS = {
    exterior: [
        { key: 'rayones', label: 'Rayones / Golpes' },
        { key: 'pintura', label: 'Desprendimiento Pintura' },
        { key: 'oxidos', label: 'Óxidos / Corrosión' },
        { key: 'cristales', label: 'Cristales Rotos o Rajados' },
        { key: 'espejos', label: 'Espejos Laterales en buen estado' },
        { key: 'faros', label: 'Faros y Luces Funcionales' },
        { key: 'parachoques', label: 'Parachoques en Buen Estado' },

    ],
    interior: [
        { key: 'asientos', label: 'Asientos en Buen Estado' },
        { key: 'tablero', label: 'Tablero sin daños' },
        { key: 'audio', label: 'Equipo de Audio o Pantalla en Buen Estado' },
        { key: 'aire', label: 'Aire Acondicionado' },
        { key: 'alfombras', label: 'Alfombras y Tapiceria Limpia' }
    ],
    mecanico: [
        { key: 'motor', label: 'Motor en Buen Estado' },
        { key: 'frenos', label: 'Frenos Operativos' },
        { key: 'bateria', label: 'Batería en Buen Estado' },
        { key: 'suspension', label: 'Suspensión sin ruidos extraños' },
        { key: 'direccion', label: 'Dirección en Buen Estado' },
        { key: 'llantas', label: 'Neumaticos con Desgaste' }

    ]
};

const INVENTARIO_ITEMS = [
    { key: 'llanta_repuesto', label: 'Llanta Repuesto' },
    { key: 'gata', label: 'Gata y Herramientas' },
    { key: 'documentos', label: 'Documentos del Vehículo' },
    { key: 'llaves', label: 'Llaves De Seguridad' },
    { key: 'objetos', label: 'Objetos Personales' }
];

interface ClienteState {
    id: string | null;
    cedula: string;
    nombre: string;
    telefono: string;
    email: string;
    direccion: string;
}

export function ReceptionForm() {
    const router = useRouter();
    const { buscarCliente, crearOrdenIngreso, isLoading, searchLoading } = useRecepcion();

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
        vin: '', // VIN / Chasis
        kilometraje: 0,
        nivel_gasolina: 50,
        fecha_promesa: ''
    });

    const [checklist, setChecklist] = useState<any>({});
    const [inventario, setInventario] = useState<any>({});
    const [observaciones, setObservaciones] = useState('');
    const [fotos, setFotos] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    const handleSearchCliente = async () => {
        if (cliente.cedula.length < 3) return;
        const data = await buscarCliente(cliente.cedula);
        if (data) {
            setCliente(prev => ({
                ...prev,
                id: data.id,
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
            fecha_promesa_entrega: vehiculo.fecha_promesa ? new Date(vehiculo.fecha_promesa).toISOString() : null,
            checklist,
            inventario,
            observaciones
        };
        const result = await crearOrdenIngreso(payload, fotos);
        if (result.success) {
            router.push('/taller');
        } else {
            alert("Error al crear la orden: " + result.error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className=" bg-slate-50/50 mx-auto px-4 pt-8 pb-32 space-y-10">

            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Recepción de Vehículo</h1>
                    <p className="text-slate-500 mt-1 font-medium">Complete la hoja de ingreso detalladamente.</p>
                </div>
            </div>

            {/* SECCIÓN 1: CLIENTE */}
            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white font-bold text-sm">1</div>
                        <h3 className="font-bold text-white tracking-wide">DATOS DEL CLIENTE</h3>
                    </div>
                    <User className="text-slate-400 h-5 w-5" />
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-6 gap-6">
                    <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Identificación (Cédula/RUC)</label>
                        <div className="relative group">
                            <input
                                type="text"
                                required
                                className="w-full pl-4 pr-12 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-semibold"
                                placeholder="0000000000"
                                value={cliente.cedula}
                                onChange={(e) => setCliente({ ...cliente, cedula: e.target.value })}
                                onBlur={handleSearchCliente}
                            />
                            <button
                                type="button"
                                onClick={handleSearchCliente}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white rounded-xl shadow-sm text-slate-400 hover:text-blue-600 transition-all border border-slate-100"
                            >
                                {searchLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="md:col-span-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nombre del Propietario</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold"
                            placeholder="Nombre y Apellidos"
                            value={cliente.nombre}
                            onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Teléfono</label>
                        <input
                            type="tel"
                            required
                            className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold"
                            placeholder="+593 ..."
                            value={cliente.telefono}
                            onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Email</label>
                        <input
                            type="email"
                            className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold"
                            placeholder="correo@ejemplo.com"
                            value={cliente.email}
                            onChange={(e) => setCliente({ ...cliente, email: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Dirección</label>
                        <input
                            type="text"
                            className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold"
                            placeholder="Dirección completa"
                            value={cliente.direccion}
                            onChange={(e) => setCliente({ ...cliente, direccion: e.target.value })}
                        />
                    </div>
                </div>
            </section>

            {/* SECCIÓN 2: VEHÍCULO */}
            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white font-bold text-sm">2</div>
                        <h3 className="font-bold text-white tracking-wide">DATOS DEL VEHÍCULO</h3>
                    </div>
                    <Car className="text-slate-400 h-5 w-5" />
                </div>

                <div className="p-8 grid grid-cols-2 md:grid-cols-2 gap-x-6 gap-y-8">
                    <div className="col-span-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Placa</label>
                        <div className="relative pt-1">
                            <input
                                type="text"
                                required
                                className="w-full px-4 py-3 rounded-lg border-2 border-slate-900 bg-amber-50 text-slate-900 font-mono text-xl font-black text-center uppercase focus:ring-4 focus:ring-amber-500/20 outline-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                                placeholder="ABC-123"
                                value={vehiculo.placa}
                                onChange={(e) => setVehiculo({ ...vehiculo, placa: e.target.value.toUpperCase() })}
                            />
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-2 bg-slate-900 text-[8px] text-white rounded font-bold">ECUADOR</div>
                        </div>
                    </div>

                    <div className="col-span-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">VIN / Chasis</label>
                        <div className="relative">
                            <input
                                type="text"
                                className="w-full pl-4 pr-10 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-amber-500 outline-none transition-all font-mono font-semibold uppercase"
                                placeholder="17 DÍGITOS..."
                                value={vehiculo.vin}
                                onChange={(e) => setVehiculo({ ...vehiculo, vin: e.target.value.toUpperCase() })}
                            />
                            <Fingerprint className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        </div>
                    </div>

                    <div className="col-span-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Marca</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-amber-500 outline-none transition-all font-semibold"
                            value={vehiculo.marca}
                            onChange={(e) => setVehiculo({ ...vehiculo, marca: e.target.value })}
                        />
                    </div>

                    <div className="col-span-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Modelo</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-amber-500 outline-none transition-all font-semibold"
                            value={vehiculo.modelo}
                            onChange={(e) => setVehiculo({ ...vehiculo, modelo: e.target.value })}
                        />
                    </div>

                    <div className="col-span-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Año / Color</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                className="w-30 px-3 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-amber-500 outline-none transition-all font-semibold"
                                value={vehiculo.anio}
                                onChange={(e) => setVehiculo({ ...vehiculo, anio: parseInt(e.target.value) })}
                            />
                            <input
                                type="text"
                                className="flex-1 px-3 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-amber-500 outline-none transition-all font-semibold"
                                placeholder="Color"
                                value={vehiculo.color}
                                onChange={(e) => setVehiculo({ ...vehiculo, color: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="col-span-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" /> Fecha Promesa Entrega
                        </label>
                        <input
                            type="datetime-local"
                            required
                            className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-amber-500 outline-none transition-all font-semibold text-slate-700"
                            value={vehiculo.fecha_promesa}
                            onChange={(e) => setVehiculo({ ...vehiculo, fecha_promesa: e.target.value })}
                        />
                    </div>

                    <div className="col-span-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Kilometraje</label>
                        <div className="relative">
                            <input
                                type="number"
                                className="w-full pl-4 pr-12 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-amber-500 outline-none transition-all font-mono font-bold text-lg"
                                value={vehiculo.kilometraje}
                                onChange={(e) => setVehiculo({ ...vehiculo, kilometraje: parseInt(e.target.value) })}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">KM</span>
                        </div>
                    </div>

                    <div className="col-span-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Fuel className="h-3 w-3 text-amber-500" /> Nivel de Combustible ({vehiculo.nivel_gasolina}%)
                        </label>
                        <div className="px-2">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                style={{
                                    background: `linear-gradient(to right, #ef4444 0%, #f59e0b 50%, #10b981 100%)`
                                }}
                                value={vehiculo.nivel_gasolina}
                                onChange={(e) => setVehiculo({ ...vehiculo, nivel_gasolina: parseInt(e.target.value) })}
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-bold tracking-tighter uppercase px-1">
                                <span>Vacío</span>
                                <span>1/4</span>
                                <span>Medio</span>
                                <span>3/4</span>
                                <span>Lleno</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 3: INSPECCIÓN */}
            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white font-bold text-sm">3</div>
                        <h3 className="font-bold text-white tracking-wide">INSPECCIÓN FÍSICA Y MECÁNICA</h3>
                    </div>
                    <ClipboardCheck className="text-slate-400 h-5 w-5" />
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 border-b border-blue-50 pb-2">
                                <Box className="h-3.5 w-3.5" /> Estado Exterior
                            </h4>
                            <ChecklistGroup
                                title=""
                                items={CHECKLIST_ITEMS.exterior}
                                values={checklist}
                                onChange={(key, val) => setChecklist({ ...checklist, [key]: val })}
                            />
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 border-b border-emerald-50 pb-2">
                                <Info className="h-3.5 w-3.5" /> Cabina / Interior
                            </h4>
                            <ChecklistGroup
                                title=""
                                items={CHECKLIST_ITEMS.interior}
                                values={checklist}
                                onChange={(key, val) => setChecklist({ ...checklist, [key]: val })}
                            />
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-2 border-b border-amber-50 pb-2">
                                <div className="h-3.5 w-3.5 rounded-full border-2 border-amber-600" /> Funcionamiento
                            </h4>
                            <ChecklistGroup
                                title=""
                                items={CHECKLIST_ITEMS.mecanico}
                                values={checklist}
                                onChange={(key, val) => setChecklist({ ...checklist, [key]: val })}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 4: INVENTARIO Y NOTAS */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-100 px-6 py-4 flex items-center gap-3 border-b border-slate-200">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-400 text-white font-bold text-xs">4</div>
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Inventario de Objetos</h4>
                    </div>
                    <div className="p-6">
                        <ChecklistGroup
                            title=""
                            items={INVENTARIO_ITEMS}
                            values={inventario}
                            onChange={(key, val) => setInventario({ ...inventario, [key]: val })}
                        />
                    </div>
                </div>

                <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="bg-slate-100 px-6 py-4 flex items-center gap-3 border-b border-slate-200">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-400 text-white font-bold text-xs">5</div>
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Observaciones y Requerimientos Del Cliente</h4>
                    </div>
                    <div className="p-6 flex-1">
                        <textarea
                            className="w-full h-full min-h-[180px] p-5 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none resize-none font-medium text-slate-700 leading-relaxed transition-all"
                            placeholder="Escriba aquí el trabajo solicitados por el cliente, detalles del daño, peticiones especiales del cliente o cualquier nota relevante."
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                        ></textarea>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 5: FOTOS */}
            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500 text-white font-bold text-sm">6</div>
                        <h3 className="font-bold text-white tracking-wide uppercase">Evidencia Fotográfica</h3>
                    </div>
                    <Camera className="text-slate-400 h-5 w-5" />
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                        {previewUrls.map((url, index) => (
                            <div key={index} className="aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 relative group shadow-sm">
                                <img src={url} alt={`Evidencia ${index}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button type="button" className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-colors">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-all flex flex-col items-center justify-center cursor-pointer group">
                            <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform border border-slate-100">
                                <Camera className="h-6 w-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Subir Foto</span>
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
            </section>

            {/* FOOTER ACCIONES */}
            <div className="  rounded-2xl p-6 border-2 bg-white border-slate-100 shadow-sm">
                <div className="max-w-6xl w-full flex items-center justify-between gap-6">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-8 py-3.5 text-slate-500 font-bold hover:text-slate-800 transition-colors flex items-center gap-2 group"
                    >
                        <X className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        Descartar
                    </button>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-2xl shadow-slate-900/30 hover:bg-slate-800 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <Save className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                                <span>GENERAR ORDEN DE INGRESO</span>
                                <ChevronRight className="h-4 w-4 opacity-50" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
}